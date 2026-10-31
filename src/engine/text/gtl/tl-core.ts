// Old: chunk.vendor.js module 367 (the GTL core: the text layout engine behind GText).
import { GObject } from "../../core/object.ts";
import { VertexCommand } from "../../geometry/vertex.ts";
import { VertexContainer } from "../../geometry/vertex-container.ts";
import { VertexInfo } from "../../geometry/vertex-info.ts";
import { Rect } from "../../math/rect.ts";
import { Transform } from "../../math/transform.ts";
import { Color } from "../../color/color.ts";
import { RGBColor } from "../../color/rgb-color.ts";
import type { Destroyable } from "../../paint/destroyable.ts";
import { Canvas2DPaintCanvas, PaintCanvas, type PaintStyle } from "../../paint/paint-canvas.ts";
import { RenderScheduler } from "../../paint/render-scheduler.ts";
import type { Font } from "../fonts/font.ts";
import type { FontManager } from "../fonts/font-manager.ts";
import { HarfBuzzFont } from "../fonts/harfbuzz.ts";
import { TLCanvasContext, emptyBounds, extendBounds } from "../tl-canvas-context.ts";
import { TLDirectionTextTransformer } from "../tl-direction-text-transformer.ts";
import { TLPathTextTransformer, type TextBasePath } from "../tl-path-text-transformer.ts";
import { defaultFontMeasure } from "./default-font-measure.ts";
import { TLDocument, type Selection } from "./document.ts";
import { Formatting, type Run } from "./formatting.ts";
import type { Frame } from "./frame.ts";
import type { Part } from "./inline.ts";
import { getStylable, type PropertySetDefaults } from "./late-bound.ts";
import type { Line } from "./line.ts";
import { openTypeMeasure } from "./measure.ts";
import type { TLNode } from "./node.ts";
import type { TLRange } from "./range.ts";
import { TLRect } from "./rect.ts";
import { RenderFlags } from "./render-flags.ts";
import { RunDraw, textMeterSlot, type TextMeter } from "./run-draw.ts";
import { TLUtil } from "./tl-util.ts";
import type { TextTransformer } from "./transformer-util.ts";
import type { Word } from "./word.ts";

/** How render paints: GText passes its fill or border settings. */
export interface TLRenderStyle {
  shapePaint?: PaintStyle | null;
  opacity?: number;
  strokeWidth?: number;
  lineCap?: string;
  lineJoin?: string;
  miterLimit?: number;
  evenodd?: boolean;
  strokeAlign?: unknown;
  /** Vertical alignment in a fixed box: "t", "m" or "b". */
  valign?: string;
  paintTransform?: Transform | null;
}

/** A selection box as getBoxes returns it: in text space, with the transform to the render bounds. */
export interface TLBox {
  box: Rect;
  transform?: Transform;
}

type Canvas = HTMLCanvasElement;

/**
 * A core canvas that serves as the fill canvas. The old code painted into
 * the core's canvas and copied the result into a separate fill canvas.
 * Until something else draws into the core's canvas that copy equals the
 * canvas, so a fill render keeps the canvas as the fill canvas, and the copy
 * is made only when the canvas is about to change (TLCore._keepFill). The
 * exporters copy a core's fields, so their cores share the adoption as they
 * shared the old fill canvas.
 */
interface AdoptedFill {
  canvas: Canvas;
  /** The fill's own canvas, once the adopted canvas was about to change. */
  copy: Canvas | null;
}

/** The adoption of each adopted core canvas. */
const adoptions = new WeakMap<Canvas, AdoptedFill>();

/** The core canvas render is drawing into, if any. */
let canvasInRender: Canvas | null = null;

/** How render copies its canvas into the fill or stroke canvas. */
function copyInto(source: Canvas, target: Canvas): void {
  if (source.width * source.height != 0) {
    target.width = source.width;
    target.height = source.height;
    // The old code set the operator on the canvas element, where it does nothing.
    Reflect.set(target, "globalCompositeOperation", PaintCanvas.CompositeOperator.Copy);
    (target.getContext("2d") as CanvasRenderingContext2D).drawImage(source, 0, 0);
  }
}

/** What render works out before it draws (TLCore._renderSetup). */
interface RenderSetup {
  /** The scale argument, 1 when none was given. */
  scale: number;
  width: number;
  height: number;
  canvasWidth: number;
  canvasHeight: number;
  offsetX: number;
  offsetY: number;
  bitmapScale: number;
  pixelWidth: number;
  pixelHeight: number;
  renderBounds: Rect;
  /** How far vertical alignment moves the text down. */
  shift: number;
  translateX: number;
  translateY: number;
  /** What render hands the document to draw. */
  viewport: TLRect;
}

/**
 * What a recording fill render (render's `onlyChanged`) left in a core
 * canvas: the settings the pixels depend on besides the lines, and what
 * every line drew. The next recording render draws only the lines that
 * differ from it again (TLCore._planRedraw). Kept per canvas, as the
 * exporters' copies of a core render into the same canvas; any other render
 * or draw into the canvas drops it.
 */
interface CanvasRecord {
  key: string;
  lines: LineRecord[];
}

/**
 * What a line drew: lines with equal records draw the same paths. `bounds`
 * are those of the points of its paths, in text space ([minX, minY, maxX,
 * maxY]), null when it drew none.
 */
interface LineRecord {
  /** Whether the document draws it (Frame.forDrawnLines); the rest is empty when not. */
  drawn: boolean;
  baseline: number;
  /** Where each word starts and what it draws (wordSignature). */
  lefts: number[];
  words: string[];
  bounds: number[] | null;
}

/** What a recording render draws again (TLCore._planRedraw). */
interface RedrawPlan {
  /** The canvas rows to clear and draw again: pairs of top and bottom (exclusive), in order. */
  rows: number[];
  /** The record of the lines after the render. */
  lines: LineRecord[];
  /** Which lines reach into the rows; render draws them again whole. */
  redraw: boolean[];
}

const records = new WeakMap<Canvas, CanvasRecord>();

/**
 * Rows added above and below the points of a line's paths: a filled path
 * colours only pixels inside the bounds of its points, rounded out, and the
 * margin covers the rounding of the canvas.
 */
const PATH_MARGIN = 2;

/** The run values drawing reads as they are (RunDraw.draw). */
const DRAWN_VALUES = [
  "script",
  "transformation",
  "ligatures",
  "stylisticSet",
  "localizedForm",
  "langScript",
  "variant",
] as const;

/** A string in a signature, after its length, so that no two different sequences read the same. */
function sigString(value: string): string {
  return value.length + ":" + value;
}

/** A run value in a signature; null for objects, which a signature can't hold. */
function sigValue(value: unknown): string | null {
  if ("string" == typeof value) return sigString(value);
  return null !== value && ("object" == typeof value || "function" == typeof value)
    ? null
    : String(value);
}

/**
 * Numbers for fonts in signatures: a font that replaced another under the
 * same CSS font draws other outlines.
 */
const fontIds = new WeakMap<Font, number>();
let nextFontId = 1;

function fontId(font: Font): number {
  let id = fontIds.get(font);
  if (undefined === id) {
    id = nextFontId++;
    fontIds.set(font, id);
  }
  return id;
}

/** canvasColor's answers, by color. */
const canvasColors = new Map<string, boolean>();
let colorProbe: CanvasRenderingContext2D | null | undefined;

/**
 * Whether the canvas takes a fill style string. For one it doesn't take
 * it keeps the fill it had, so a part would paint in the color of the part
 * drawn before it, which drawing only some of the lines can't repeat.
 */
function canvasColor(color: string): boolean {
  let taken = canvasColors.get(color);
  if (undefined === taken) {
    if (undefined === colorProbe) {
      colorProbe =
        "undefined" != typeof document
          ? (document.createElement("canvas").getContext("2d") as CanvasRenderingContext2D | null)
          : null;
    }
    if (colorProbe) {
      colorProbe.fillStyle = "#000000";
      colorProbe.fillStyle = color;
      const onBlack = colorProbe.fillStyle;
      colorProbe.fillStyle = "#ffffff";
      colorProbe.fillStyle = color;
      taken = onBlack === colorProbe.fillStyle;
    } else {
      taken = true;
    }
    canvasColors.set(color, taken);
  }
  return taken;
}

/**
 * A part's signature (partSignature) and the values it was made from: the
 * part's measures, the run values RunDraw.draw reads, the defaults it falls
 * back to, the fill of a color object, the CSS font and the font that
 * resolves it. Kept per part, and used again while every one of them is
 * the same; a run can change in place without a new layout.
 */
interface PartRecord {
  values: unknown[];
  css: string;
  font: number;
  signature: string | null;
}

/** A word's signature and the records of the parts it was made from. */
interface WordRecord {
  parts: PartRecord[];
  signature: string | null;
}

/** What signatures look up once per pass over the lines (TLCore._lineRecords). */
interface Resolve {
  /** The number of the font drawText takes for a CSS font, 0 for none. */
  font(css: string): number;
  /** The canvas style drawText fills with for a color object (TLCanvasContext._patternStyle). */
  fill(color: Color): unknown;
}

const partRecords = new WeakMap<Part, PartRecord>();
const wordRecords = new WeakMap<Word, WordRecord>();

/** Reads what partSignature depends on (besides the font) into `values`. */
function readPart(part: Part, values: unknown[], resolve: Resolve): void {
  const run = part.run;
  const defaults = Formatting.defaultFormatting;
  const color = run.fontColor || defaults.fontColor;
  values[0] = part.width;
  values[1] = part.ascent;
  values[2] = part.descent;
  values[3] = run.text;
  values[4] = run.fontColor;
  values[5] = run.fontStyle;
  values[6] = run.fontWeight;
  values[7] = run.fontSize;
  values[8] = run.fontFamily;
  values[9] = run.charSpacing;
  values[10] = run.underline;
  values[11] = run.strikeout;
  values[12] = run.fractions;
  for (let i = 0; i < DRAWN_VALUES.length; i++) values[13 + i] = run[DRAWN_VALUES[i] as string];
  values[20] = defaults.fontColor;
  values[21] = defaults.fontStyle;
  values[22] = defaults.fontWeight;
  values[23] = defaults.fontSize;
  values[24] = defaults.fontFamily;
  // A color object counts by the fill it gives now: the same object can
  // change its value, and a CMYK color's fill follows the color profile.
  values[25] = color instanceof Color ? resolve.fill(color) : undefined;
}

function sameValues(a: unknown[], b: unknown[]): boolean {
  for (let i = 0; i < b.length; i++) if (!Object.is(a[i], b[i])) return false;
  return true;
}

/**
 * What a part draws besides where: what RunDraw.draw and drawText read of
 * it (its text and measures, the CSS font and the font that resolves it,
 * the color, the run values). A color object signs as the fill drawText
 * makes of it (readPart). Null for what a signature can't describe: a code
 * (list markers draw through it), a color that isn't a color object or a
 * string the canvas takes (gradients, textures), a font that isn't
 * resolved.
 */
function partSignature(part: Part, values: unknown[], resolve: Resolve): PartRecord {
  const run = part.run;
  const text = run.text;
  const color = run.fontColor || Formatting.defaultFormatting.fontColor;
  const fill = color instanceof Color ? values[25] : color;
  if ("string" != typeof text || "string" != typeof fill || !canvasColor(fill)) {
    return { values, css: "", font: 0, signature: null };
  }
  const css = RunDraw.getFontString(run);
  const id = resolve.font(css);
  const noSignature = { values, css, font: id, signature: null };
  const charSpacing = sigValue(run.charSpacing || 0);
  if (!id || null === charSpacing) return noSignature;
  let signature =
    sigString(text) +
    sigString(css) +
    id +
    ";" +
    sigString(color instanceof Color ? "C" + fill : fill) +
    part.width +
    "," +
    part.ascent +
    "," +
    part.descent +
    "," +
    charSpacing +
    "," +
    (true === run.underline) +
    "," +
    (true === run.strikeout) +
    "," +
    (true === run.fractions);
  for (const key of DRAWN_VALUES) {
    const value = sigValue(run[key]);
    if (null === value) return noSignature;
    signature += "," + value;
  }
  return { values, css, font: id, signature: signature + ";" };
}

const readValues: unknown[] = [];

/** The part's record, the kept one while what it was made from is the same. */
function partRecord(part: Part, resolve: Resolve): PartRecord {
  readPart(part, readValues, resolve);
  const known = partRecords.get(part);
  if (
    known &&
    sameValues(known.values, readValues) &&
    (!known.css || resolve.font(known.css) === known.font)
  ) {
    return known;
  }
  const record = partSignature(part, readValues.slice(), resolve);
  partRecords.set(part, record);
  return record;
}

/**
 * What a word draws besides where: its parts in order (Word.draw). Kept
 * per word while its parts keep their records, so that unchanged words
 * compare as the same string.
 */
function wordSignature(word: Word, resolve: Resolve): string | null {
  const parts: PartRecord[] = [];
  for (const part of word.text.parts) parts.push(partRecord(part, resolve));
  for (const part of word.space.parts) parts.push(partRecord(part, resolve));
  const known = wordRecords.get(word);
  if (
    known &&
    known.parts.length === parts.length &&
    known.parts.every((record, i) => record === parts[i])
  ) {
    return known.signature;
  }
  let signature: string | null = "";
  for (const record of parts) {
    if (null === record.signature) {
      signature = null;
      break;
    }
    signature += record.signature;
  }
  wordRecords.set(word, { parts, signature });
  return signature;
}

function sameLine(a: LineRecord, b: LineRecord): boolean {
  if (a.drawn !== b.drawn) return false;
  if (!a.drawn) return true;
  if (a.baseline !== b.baseline || a.words.length !== b.words.length) return false;
  for (let i = 0; i < a.words.length; i++) {
    if (a.lefts[i] !== b.lefts[i] || a.words[i] !== b.words[i]) return false;
  }
  return true;
}

/** A line's record as one string, for TLCore._measuredLines. */
function lineKey(line: LineRecord): string {
  let key = line.baseline + ";";
  for (let i = 0; i < line.words.length; i++) {
    key += line.lefts[i] + ";" + sigString(line.words[i] as string);
  }
  return key;
}

/** Adds rows top to bottom to `rows` (pairs of top and bottom, in order and apart). */
function addRows(rows: number[], top: number, bottom: number): void {
  if (top >= bottom) return;
  let i = 0;
  while (i < rows.length && (rows[i + 1] as number) < top) i += 2;
  let j = i;
  while (j < rows.length && (rows[j] as number) <= bottom) {
    top = Math.min(top, rows[j] as number);
    bottom = Math.max(bottom, rows[j + 1] as number);
    j += 2;
  }
  rows.splice(i, j - i, top, bottom);
}

function rowsIntersect(rows: number[], top: number, bottom: number): boolean {
  for (let i = 0; i < rows.length; i += 2) {
    if ((rows[i] as number) < bottom && top < (rows[i + 1] as number)) return true;
  }
  return false;
}

function rowsContain(rows: number[], top: number, bottom: number): boolean {
  for (let i = 0; i < rows.length; i += 2) {
    if ((rows[i] as number) <= top && bottom <= (rows[i + 1] as number)) return true;
  }
  return false;
}

/**
 * The text layout engine of a GText: owns the document, lays it out at a
 * width (or automatically), maps glyphs through the path and direction
 * transformers and paints into its own canvases (fill and stroke) or
 * collects outlines.
 */
export class TLCore extends GObject implements Destroyable {
  static AUTO = -1;
  static INITIALIZATION_ERROR = "GTLCore: not initialized";

  /** The text meter shared by all cores; the first initialize installs the OpenType meter. */
  static get textMeter(): TextMeter | null {
    return textMeterSlot.meter;
  }

  static set textMeter(meter: TextMeter | null) {
    textMeterSlot.meter = meter;
  }

  _fontManager: FontManager | null = null;
  _fontCallback: ((font: Font) => void) | undefined;
  _doc: TLDocument = null as unknown as TLDocument;
  _changeLock: unknown = 0;
  _changeParam: unknown = 0;
  _canvas: Canvas | null = null;
  _fillCanvas: Canvas | null = null;
  _strokeCanvas: Canvas | null = null;
  /** Set while the fill canvas is the core's canvas (see AdoptedFill). */
  _adoptedFill: AdoptedFill | null = null;
  _ctx: TLCanvasContext = null as unknown as TLCanvasContext;
  _maxWidth = 0;
  _width = 1;
  _height = 1;
  _deferredSettings: Record<string, unknown> | null = null;
  _verticalShift = 0;
  _textTransformer: TextTransformer | null = null;
  _renderBounds: Rect | null = null;
  _padding: number | null = null;
  _wasEdited = false;
  _isInlineEdit = false;
  /**
   * The bounds _planRedraw measured on its last call, by line (lineKey):
   * GText plans a redraw when it invalidates after an edit, and the render
   * that follows plans the same lines again.
   */
  _measuredLines = new Map<string, number[] | null>();

  /**
   * Sets the engine up: the default formatting from the text style
   * defaults (once for all cores), the document, the canvas and its
   * context. Settings made before (deferred) make it throw, as the old
   * code referenced undeclared names there.
   */
  initialize(
    width: number,
    height: number,
    fontManager: FontManager,
    fontCallback?: (font: Font) => void,
  ): void {
    if (!TLCore.textMeter) {
      openTypeMeasure.fontManager = fontManager;
      defaultFontMeasure.fontManager = fontManager;
      TLCore.textMeter = openTypeMeasure;
    }
    const defaultFont = fontManager.getDefaultFont();
    if (!defaultFont) throw new Error("GTLCore: Cannot instantiate - default font unavailable");
    this._initializeDefaults(defaultFont);
    this._doc = new TLDocument();
    const context = RenderScheduler.getRenderer(true, void 0, void 0, true);
    this._canvas = context.canvas;
    this._width = width || 1;
    this._height = height || 1;
    this._ctx = new TLCanvasContext(this, context);
    this._maxWidth = 4096;
    this._fontManager = fontManager || null;
    this._fontCallback = fontCallback;
    if (this._deferredSettings) {
      // The old code tested `hasOwnProperty(text)` with an undeclared `text`
      // (QUESTIONS.md "GTL TLCore.initialize throws after deferred settings").
      throw new ReferenceError("text is not defined");
    }
  }

  destroy(): void {
    RenderScheduler.destroy(this._canvas);
    RenderScheduler.destroy(this._fillCanvas);
    RenderScheduler.destroy(this._strokeCanvas);
  }

  /** Fills the default formatting from the default font and the text and paragraph style defaults. */
  _initializeDefaults(font: Font): void {
    const defaults = Formatting.defaultFormatting;
    if (defaults.fontFamily) return;
    const css = font.toCssProperties();
    defaults.fontFamily = css["font-family"] as string;
    const weight = parseInt(css["font-weight"] as string);
    defaults.fontWeight = Number.isNaN(weight) ? (css["font-weight"] as string | null) : weight;
    defaults.fontStyle = css["font-style"] as string;
    const Stylable = getStylable();
    const info = Stylable.PropertySetInfo;
    const text = (info[Stylable.PropertySet.Text] as PropertySetDefaults)
      .geometryProperties as Record<string, unknown>;
    const paragraph = (info[Stylable.PropertySet.Paragraph] as PropertySetDefaults)
      .geometryProperties as Record<string, unknown>;
    defaults.fontSize = text._tfi as number;
    const color = text._fc && text._fc instanceof RGBColor ? text._fc.toScreenCSS() : "transparent";
    defaults.fontColor = color;
    defaults.charSpacing = text._tcs as number;
    defaults.wordSpacing = text._tws as number;
    defaults.lineSpacing = paragraph._plh as number;
    switch (paragraph._pal) {
      case Stylable.ParagraphAlignment.Left:
        defaults.align = "left";
        break;
      case Stylable.ParagraphAlignment.Center:
        defaults.align = "center";
        break;
      case Stylable.ParagraphAlignment.Right:
        defaults.align = "right";
        break;
      case Stylable.ParagraphAlignment.Justify:
        defaults.align = "justify";
    }
  }

  requireFont(font: Font): void {
    if (!this.isInitialized()) throw new Error(TLCore.INITIALIZATION_ERROR);
    if (this._fontCallback) this._fontCallback(font);
  }

  lockChangeEvents(lock: unknown): void {
    this._changeLock = lock;
  }

  paramChangeEvent(param: unknown): void {
    this._changeParam = param;
  }

  /**
   * Replaces the text. A string takes the formatting of the whole current
   * text (multipleValues where it differs); returns whether it loaded.
   */
  setText(text: unknown): boolean | undefined {
    if (this.isInitialized()) {
      let runs: Run[];
      if ("string" == typeof text) {
        const formatting = this.getDocumentRange().getFormatting();
        text = TLUtil.deCRLFify(text);
        let run: Run;
        if (formatting) {
          run = formatting;
          // The old module was sloppy, so writing a read-only `text` (a run
          // derived with Object.create and a `text` descriptor) was ignored
          // instead of throwing.
          Reflect.set(run, "text", text);
        } else {
          run = { text: text as string };
        }
        runs = [run];
      } else {
        runs = text instanceof Array ? (text as Run[]) : [text as Run];
      }
      return this._doc.load(runs, false);
    }
    this._setDeferred("text", text);
    return undefined;
  }

  transaction(perform: () => void): void {
    if (!this.isInitialized()) throw new Error(TLCore.INITIALIZATION_ERROR);
    this._doc.transaction(perform);
  }

  insert(text: unknown): void {
    if (!this.isInitialized()) throw new Error(TLCore.INITIALIZATION_ERROR);
    this._doc.insert(text);
  }

  setWrap(wrap: boolean): void {
    if (this.isInitialized()) this._doc.wrap(wrap);
    else this._setDeferred("wrap", wrap);
  }

  setInlineEdit(inlineEdit: boolean): void {
    this._isInlineEdit = inlineEdit;
  }

  isInlineEdit(): boolean {
    return this._isInlineEdit;
  }

  setPadding(padding: number | null): void {
    this._padding = padding;
  }

  getPadding(): (number | null)[] {
    return [this.getLeftPadding(), this._padding || 0, this.getRightPadding(), this._padding || 0];
  }

  /** The layout width, or AUTO: as wide as the text (at most 4096 when it has no width yet). */
  setWidth(width: number): void {
    if (this.isInitialized()) {
      this._width = width;
      if (width == TLCore.AUTO) this._doc.width(this.getActualWidth() || this._maxWidth);
      else this._doc.width(width);
    } else {
      this._setDeferred("width", width);
    }
  }

  /**
   * Sets the text direction. A direction transformer goes in front of a
   * path transformer; LTR removes it.
   */
  setDirection(direction: number | string): void {
    if (this.isInitialized()) {
      if (this._textTransformer) {
        if (this._textTransformer.getType() === TLPathTextTransformer.TYPE) {
          if (direction !== TLDirectionTextTransformer.LTR) {
            const transformer = new TLDirectionTextTransformer(this, {
              direction: parseInt(direction as string),
            });
            this._textTransformer.prepend(transformer);
            this._textTransformer = transformer;
            this._ctx.textTransformer = this._textTransformer;
          }
        } else if (this._textTransformer.getType() === TLDirectionTextTransformer.TYPE) {
          if (direction === TLDirectionTextTransformer.LTR) {
            this._textTransformer = this._textTransformer.remove();
            this._ctx.textTransformer = this._textTransformer;
          } else {
            (this._textTransformer as TLDirectionTextTransformer).setDirection(direction as number);
          }
        }
      } else if (direction !== TLDirectionTextTransformer.LTR) {
        this._textTransformer = new TLDirectionTextTransformer(this, {
          direction: parseInt(direction as string),
        });
        this._ctx.textTransformer = this._textTransformer;
      }
      this._calculateRenderBounds();
    } else {
      this._setDeferred("direction", { direction });
    }
  }

  getDirection(): number {
    if (this._textTransformer) {
      const transformer = this._textTransformer.get(TLDirectionTextTransformer.TYPE);
      if (transformer) return (transformer as TLDirectionTextTransformer).getDirection();
    }
    return TLDirectionTextTransformer.LTR;
  }

  /**
   * Puts the text on a path (or takes it off with no path). Text on a
   * path doesn't wrap and has automatic width.
   */
  setPath(
    path: TextBasePath | null,
    direction?: number | string,
    side?: number | string,
    offset?: number | string,
    distance?: number | string,
  ): void {
    if (this.isInitialized()) {
      if (this._textTransformer || path) {
        const params = () => ({
          direction: parseInt(direction as string),
          side: parseInt(side as string),
          offset: parseFloat(offset as string),
          distance: parseFloat(distance as string),
        });
        if (
          this._textTransformer &&
          this._textTransformer.getType() === TLDirectionTextTransformer.TYPE
        ) {
          const existing = this._textTransformer.get(TLPathTextTransformer.TYPE);
          if (existing) existing.remove();
          if (path) {
            this._textTransformer.append(new TLPathTextTransformer(this, path, params()));
          }
        } else {
          this._textTransformer = (path &&
            new TLPathTextTransformer(this, path, params())) as TextTransformer | null;
        }
        this.setWrap(!path);
        this._ctx.textTransformer = this._textTransformer;
        this._calculateRenderBounds();
        this.setWidth(TLCore.AUTO);
      }
    } else {
      this._setDeferred("path", { path, direction, side, offset, distance });
    }
  }

  /** The transformer of a type, or the first one of the chain. */
  getTransformer(type?: string): TextTransformer | null {
    return type
      ? this._textTransformer
        ? this._textTransformer.get(type)
        : null
      : this._textTransformer
        ? this._textTransformer.getFirst()
        : null;
  }

  getRealBounds(): TLRect {
    return (this._doc.frame as NonNullable<TLDocument["frame"]>).realBounds();
  }

  /** The ink bounds, extended by the caret of a trailing empty line. */
  getActualBounds(): TLRect | { l: number; t: number; w: number; h: number; r: number; b: number } {
    let bounds: TLRect | ReturnType<TLRect["united"]> = this.getRealBounds();
    if (bounds) {
      const lines = this._doc.frame && this._doc.frame.children();
      if (lines && lines.length && (lines[lines.length - 1] as Line).isEOF()) {
        const caret = this.getCaretCoords(
          (this._doc.frame as NonNullable<TLDocument["frame"]>).length - 1,
        );
        if (caret) bounds = (bounds as TLRect).united(caret);
      }
    }
    return bounds;
  }

  getTopMargin(): number {
    const margin = (this._doc.frame as NonNullable<TLDocument["frame"]>).topMargin();
    return Number.isNaN(margin) ? 0 : margin;
  }

  getBottomMargin(): number {
    const margin = (this._doc.frame as NonNullable<TLDocument["frame"]>).bottomMargin();
    return Number.isNaN(margin) ? 0 : margin;
  }

  setHeight(height: number): void {
    if (this.isInitialized()) this._height = height;
    else this._setDeferred("height", height);
  }

  /** The width of the widest line, rounded up. */
  getActualWidth(): number {
    return this.isInitialized() && this._doc.frame ? Math.ceil(this._doc.frame.actualWidth()) : 0;
  }

  getTopPadding(): number {
    return this._padding || 0;
  }

  /** The padding plus the ink that reaches left of 0. */
  getLeftPadding(): number | null {
    if (!this.isInitialized()) return null;
    if (this.hasPathTransformer()) return this._padding || 0;
    if (!this._doc.frame) return null;
    let padding = this._padding || 0;
    const left = this._doc.frame.leftPadding() || 0;
    if (left < 0) padding += Math.abs(left);
    return padding;
  }

  /** The padding plus the ink that reaches past the last glyph's advance. */
  getRightPadding(): number | null {
    if (!this.isInitialized()) return null;
    if (this.hasPathTransformer()) return this._padding || 0;
    if (!this._doc.frame) return null;
    let padding = this._padding || 0;
    const right = this._doc.frame.rightPadding() || 0;
    if (right > 0) padding += Math.abs(right);
    return padding;
  }

  getWidth(): number {
    return this.isInitialized()
      ? this.hasPathTransformer()
        ? (this._renderBounds as Rect).getWidth()
        : this._width == TLCore.AUTO
          ? this.getActualWidth()
          : this._width
      : 0;
  }

  /** The height of the lines; while editing inline, at least down to the caret. */
  getActualHeight(): number {
    if (!this.isInitialized()) return 0;
    if (!this._doc.frame) return 0;
    let height = this._doc.frame.bounds().h;
    if (this.isInlineEdit()) {
      const selection = this.getSelection();
      if (selection && selection.end === selection.start) {
        const caret = this.getCaretCoords(selection.start);
        if (caret && !caret.isEmpty()) height = Math.max(caret.b, height);
      }
    }
    return height;
  }

  getHeight(): number {
    return this.isInitialized()
      ? this.hasPathTransformer()
        ? (this._renderBounds as Rect).getHeight()
        : this._height == TLCore.AUTO
          ? this.getActualHeight()
          : this._height
      : 0;
  }

  getLength(): number {
    return this.isInitialized()
      ? this._doc.frame
        ? this._doc.frame.length
        : 0
      : this._deferredSettings && this._deferredSettings.text
        ? (this._deferredSettings.text as { length: number }).length - 1
        : 0;
  }

  getCaretCoords(ordinal: number): TLRect | undefined {
    if (!this.isInitialized()) throw new Error(TLCore.INITIALIZATION_ERROR);
    return this._doc.getCaretCoords(ordinal);
  }

  getSelection(): Selection | null {
    return this.isInitialized()
      ? this._doc.selection
      : this._deferredSettings && this._deferredSettings.select
        ? (this._deferredSettings.select as Selection)
        : null;
  }

  /**
   * The boxes of the characters and inlines of a range (that pass
   * `filter`), moved up by the vertical shift; with a transformer each
   * with the glyph matrix relative to the render bounds. Null for an
   * empty range.
   */
  getBoxes(range: TLRange | null | undefined, filter?: (node: TLNode) => unknown): TLBox[] | null {
    if (!this.isInitialized()) throw new Error(TLCore.INITIALIZATION_ERROR);
    if (range && range.end !== range.start) {
      const boxes: TLBox[] = [];
      const collect = (node: TLNode, add: (node: TLNode) => void): void => {
        switch (node.type) {
          case "character":
          case "inline":
            if (!(filter && !filter(node))) add(node);
            break;
          case "word":
          case "line":
          case "list":
          case "item":
          case "frame":
            node.children().forEach((child) => {
              collect(child, add);
            });
            break;
          default:
            throw new Error("Gravit Text Layout Error: unknown node type");
        }
      };
      range.parts((part) => {
        if (this._textTransformer) {
          collect(part, (node) => {
            const bounds = node.bounds(false, true);
            const box = new Rect(bounds.l, bounds.t - this.getVShift(), bounds.w, bounds.h);
            const glyphBox = new Rect(0, 0, bounds.w, bounds.h);
            const renderBounds = this._renderBounds as Rect;
            const baseline = (node as unknown as { baseline: number }).baseline;
            const matrix =
              (this._textTransformer as TextTransformer).getMatrix(
                bounds.l,
                isNaN(baseline) ? 0 : baseline,
                glyphBox,
              ) || new Transform();
            const toRenderBounds = new Transform(
              1,
              0,
              0,
              1,
              -renderBounds.getX(),
              -renderBounds.getY(),
            );
            boxes.push({ box, transform: matrix.multiplied(toRenderBounds) });
          });
        } else {
          collect(part, (node) => {
            const bounds = node.bounds(false, true);
            boxes.push({
              box: new Rect(bounds.l, bounds.t - this.getVShift(), bounds.w, bounds.h),
            });
          });
        }
      });
      return boxes;
    }
    return null;
  }

  wordContainingOrdinal(ordinal: number): ReturnType<TLDocument["wordContainingOrdinal"]> {
    if (!this.isInitialized()) throw new Error(TLCore.INITIALIZATION_ERROR);
    return this._doc.wordContainingOrdinal(ordinal);
  }

  wordOrdinal(index: number): number | undefined {
    if (!this.isInitialized()) throw new Error(TLCore.INITIALIZATION_ERROR);
    return this._doc.wordOrdinal(index);
  }

  select(start: number, end?: number): undefined | null {
    if (this.isInitialized()) {
      this._doc.select(start, end);
      return undefined;
    }
    this._setDeferred("selectAll", null);
    this._setDeferred("select", { start, end });
    return null;
  }

  undo(): void {
    if (!this.isInitialized()) throw new Error(TLCore.INITIALIZATION_ERROR);
    return this._doc.performUndo();
  }

  redo(): void {
    if (!this.isInitialized()) throw new Error(TLCore.INITIALIZATION_ERROR);
    return this._doc.performUndo(true);
  }

  getRange(start: number, end: number): TLRange | null {
    return this.isInitialized() ? this._doc.range(start, end) : null;
  }

  selectedRange(): TLRange | null {
    return this.isInitialized() ? this._doc.selectedRange() : null;
  }

  selectedParagraphRange(): TLRange | null {
    if (!this.isInitialized()) return null;
    const range = this._doc.selectedRange();
    return this._doc.paragraphRange(range.start, range.end);
  }

  selectAll(): undefined | null {
    if (this.isInitialized()) return this.select(0, this.getLength() - 1);
    this._setDeferred("select", null);
    this._setDeferred("selectAll");
    return undefined;
  }

  /** Adds a selection change handler (after removing all others with `replace`). */
  selectionChanged(handler: (...args: never[]) => unknown, replace?: boolean): void {
    if (!this.isInitialized()) throw new Error(TLCore.INITIALIZATION_ERROR);
    if (replace) this._doc.selectionChanged.clearHandlers();
    return this._doc.selectionChanged(handler);
  }

  /**
   * Adds a content change handler (after removing all others with
   * `replace`). It gets the change parameter set when it was added, is
   * skipped while change events are locked, and marks the text edited.
   */
  contentChanged(handler: (param: unknown) => unknown, replace?: boolean): void {
    if (!this.isInitialized()) throw new Error(TLCore.INITIALIZATION_ERROR);
    const param = this._changeParam;
    if (replace) this._doc.contentChanged.clearHandlers();
    this._doc.contentChanged(() => {
      let result: unknown;
      if (!this._changeLock) result = handler(param);
      this._wasEdited = true;
      return result;
    });
  }

  getDocumentRange(): TLRange {
    if (!this.isInitialized()) throw new Error(TLCore.INITIALIZATION_ERROR);
    return this._doc.documentRange();
  }

  byCoordinate(x: number, y: number): TLNode | null {
    if (!this.isInitialized()) throw new Error(TLCore.INITIALIZATION_ERROR);
    return this._doc.byCoordinate(x, y + this._verticalShift);
  }

  byOrdinal(ordinal: number): TLNode {
    if (!this.isInitialized()) throw new Error(TLCore.INITIALIZATION_ERROR);
    return this._doc.byOrdinal(ordinal);
  }

  getVShift(): number {
    return this._verticalShift;
  }

  /** Every line, also those inside lists (it walks all nodes, which realises the characters). */
  getLines(): Line[] {
    const lines: Line[] = [];
    const visit = (node: TLNode): void => {
      if ("line" === node.type) lines.push(node as Line);
      if ("function" == typeof node.children) node.children().forEach(visit);
    };
    if (this._checkFrame() && (this._doc.frame as NonNullable<TLDocument["frame"]>).lines) {
      (this._doc.frame as NonNullable<TLDocument["frame"]>).lines.forEach(visit);
    }
    return lines;
  }

  toggleCaret(): boolean {
    if (!this.isInitialized()) throw new Error(TLCore.INITIALIZATION_ERROR);
    return this._doc.toggleCaret();
  }

  isSelectionChanged(): boolean {
    return !!this.isInitialized() && this._doc.selectionJustChanged;
  }

  isCaretVisible(): boolean {
    return !!this.isInitialized() && this._doc.caretVisible;
  }

  getRenderBounds(): Rect | null {
    return this._renderBounds;
  }

  /** The bounds of the outlines (0,0 when there are none). */
  _calculateRenderBounds(): Rect {
    if (!this.isInitialized()) return new Rect(0, 0);
    const vertices = new VertexContainer();
    this.renderVertices(vertices);
    const bounds = VertexInfo.calculateBounds(vertices);
    this._renderBounds = bounds || new Rect(0, 0);
    return this._renderBounds;
  }

  /**
   * Paints the text into the core's canvas, then copies it into the fill
   * and/or the stroke canvas (getCanvas(flags) returns them). `scale`
   * scales the bitmap with RENDERFLAG_SCALEBITMAP; the selection is
   * painted with RENDERFLAG_DRAWSELECTION when `focused`.
   *
   * With `onlyChanged` a fill render records what each line drew, and when
   * the canvas still shows such a record made with the same settings, it
   * clears and draws again only the rows of the lines that changed
   * (_planRedraw). The pixels come out as those of a whole render.
   */
  render(
    focused: boolean | undefined,
    scale: number | undefined,
    style: TLRenderStyle,
    flags: number,
    onlyChanged?: boolean,
  ): void {
    if (!this.isInitialized()) throw new Error(TLCore.INITIALIZATION_ERROR);
    const setup = this._renderSetup(scale, style, flags);
    const { canvasWidth, canvasHeight, bitmapScale, pixelWidth, pixelHeight } = setup;
    this._renderBounds = setup.renderBounds;
    this._ctx.renderMode(0);
    // Before the canvas changes: a fill that is still this canvas gets its own.
    this._keepFill(!!(flags & RenderFlags.RENDERFLAG_FILL));
    const canvas = this.getCanvas() as Canvas;
    // The canvas changes now; this render records it again if it records.
    const record = records.get(canvas);
    records.delete(canvas);
    const key = onlyChanged ? this._recordKey(setup, style, flags) : null;
    const outerCanvas = canvasInRender;
    canvasInRender = canvas;
    try {
      let resized = false;
      if (canvas.width !== pixelWidth) {
        canvas.width = pixelWidth <= 0 ? 1 : pixelWidth;
        if (!RenderScheduler.isRenderPhase()) (this._canvas as Canvas).width = canvas.width;
        resized = true;
      }
      if (canvas.height !== pixelHeight) {
        canvas.height = pixelHeight <= 0 ? 1 : pixelHeight;
        if (!RenderScheduler.isRenderPhase()) (this._canvas as Canvas).height = canvas.height;
        resized = true;
      }
      const plan = key && !resized ? this._planRedraw(record, setup, key) : null;
      if (plan) {
        this._clearRows(plan.rows, setup);
      } else if (!resized) {
        this._ctx.setTranslate(0, 0);
        this._ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      }
      if (style.shapePaint) {
        if (flags & RenderFlags.RENDERFLAG_STROKE) {
          flags |= RenderFlags.RENDERFLAG_LOCKSTROKE;
          this._ctx.strokeStyle = Canvas2DPaintCanvas.prototype._convertStyle.call(
            this as never,
            style.shapePaint,
          );
        }
        if (flags & RenderFlags.RENDERFLAG_FILL) {
          this._ctx.defaultFill = Canvas2DPaintCanvas.prototype._convertStyle.call(
            this as never,
            style.shapePaint,
          );
        }
      } else if (flags & RenderFlags.RENDERFLAG_FILL) {
        this._ctx.defaultFill = "transparent";
      }
      this._ctx.globalAlpha = "number" == typeof style.opacity ? style.opacity : 1;
      this._ctx.globalCompositeOperation = PaintCanvas.CompositeOperator.SourceOver;
      if (flags & RenderFlags.RENDERFLAG_STROKE) {
        this._ctx.lineWidth = "number" == typeof style.strokeWidth ? style.strokeWidth : 1;
        this._ctx.lineCap = style.lineCap || "butt";
        this._ctx.lineJoin = style.lineJoin || "miter";
        this._ctx.miterLimit = "number" == typeof style.miterLimit ? style.miterLimit : 10;
        if (flags & RenderFlags.RENDERFLAG_VERTEX) flags |= RenderFlags.RENDERFLAG_NODRAW;
      }
      if (style.evenodd) flags |= RenderFlags.RENDERFLAG_EVENODDFILL;
      const Stylable = getStylable();
      if (style.strokeAlign === Stylable.BorderAlignment.Inside) {
        flags |= RenderFlags.RENDERFLAG_INSIDEBRD;
      } else if (style.strokeAlign === Stylable.BorderAlignment.Outside) {
        flags |= RenderFlags.RENDERFLAG_OUTSIDEBRD;
      }
      this._ctx.renderMode(flags);
      this._verticalShift = -setup.shift;
      this._ctx.setTranslate(setup.translateX, setup.translateY);
      this._ctx.setScale(bitmapScale, bitmapScale);
      const fillTransform = this._ctx.getFillTransform();
      const alpha = this._ctx.globalAlpha;
      if (style.paintTransform) this._ctx.appendFillTransform(style.paintTransform);
      if (flags & RenderFlags.RENDERFLAG_NODRAW && flags & RenderFlags.RENDERFLAG_STROKE) {
        this._ctx._canvasContext.beginPath();
      }
      if (plan) {
        this._drawLines(setup.viewport, plan.lines, plan.redraw);
        records.set(canvas, { key: key as string, lines: plan.lines });
      } else {
        const lines = key ? this._lineRecords(setup.viewport) : null;
        if (lines) {
          this._drawLines(setup.viewport, lines, null);
          records.set(canvas, { key: key as string, lines });
        } else {
          this._doc.draw(this._ctx, setup.viewport);
        }
      }
      if (flags & RenderFlags.RENDERFLAG_NODRAW && flags & RenderFlags.RENDERFLAG_STROKE) {
        this._ctx.strokeVertices();
        if (flags & RenderFlags.RENDERFLAG_INSIDEBRD) {
          this._ctx.fillVertices("#000", 1, PaintCanvas.CompositeOperator.DestinationIn);
        } else if (flags & RenderFlags.RENDERFLAG_OUTSIDEBRD) {
          this._ctx.fillVertices("#000", 1, PaintCanvas.CompositeOperator.DestinationOut);
        }
      }
      this._ctx.renderMode(0);
      if (style.paintTransform) {
        this._ctx.setFillTransform(fillTransform);
        if (flags & RenderFlags.RENDERFLAG_STROKE) {
          this._ctx.globalAlpha = alpha;
          this._ctx.globalCompositeOperation = PaintCanvas.CompositeOperator.SourceOver;
        }
      }
      if (focused && flags & RenderFlags.RENDERFLAG_DRAWSELECTION) {
        this._doc.drawSelection(this._ctx, focused || false);
      }
    } finally {
      canvasInRender = outerCanvas;
    }
    if (flags & RenderFlags.RENDERFLAG_FILL && !this._fillCanvas && !adoptions.has(canvas)) {
      // Instead of a new fill canvas and a copy: the canvas itself (see AdoptedFill).
      const adopted: AdoptedFill = { canvas, copy: null };
      adoptions.set(canvas, adopted);
      this._adoptedFill = adopted;
      this._fillCanvas = canvas;
    } else if (flags & RenderFlags.RENDERFLAG_FILL && this._fillCanvas !== canvas) {
      if (!this._fillCanvas) {
        this._fillCanvas = RenderScheduler.getRenderer(true, void 0, void 0, true).canvas;
      }
      if (!RenderScheduler.isRenderPhase() && canvas.width * canvas.height > 0) {
        this._fillCanvas.width = canvas.width;
        this._fillCanvas.height = canvas.height;
      }
      copyInto(canvas, this.getCanvas(RenderFlags.RENDERFLAG_FILL) as Canvas);
    }
    if (flags & RenderFlags.RENDERFLAG_STROKE) {
      if (flags & RenderFlags.RENDERFLAG_FILL) {
        RenderScheduler.destroy(this._strokeCanvas);
        this._strokeCanvas = this._fillCanvas;
      } else {
        if (!(this._strokeCanvas && this._fillCanvas !== this._strokeCanvas)) {
          this._strokeCanvas = RenderScheduler.getRenderer(true, void 0, void 0, true).canvas;
        }
        if (!RenderScheduler.isRenderPhase() && canvas.width * canvas.height > 0) {
          this._strokeCanvas.width = canvas.width;
          this._strokeCanvas.height = canvas.height;
        }
        copyInto(canvas, this.getCanvas(RenderFlags.RENDERFLAG_STROKE) as Canvas);
      }
    }
  }

  /**
   * The rows of the core's canvas that a fill render with these arguments
   * and `onlyChanged` would clear and draw again, as pairs of top and
   * bottom: empty when nothing changed, null when it would draw it all.
   * GText repaints only these rows after an inline edit.
   */
  changedRows(scale: number | undefined, style: TLRenderStyle, flags: number): number[] | null {
    if (!this.isInitialized() || !this._canvas) return null;
    const setup = this._renderSetup(scale, style, flags);
    const key = this._recordKey(setup, style, flags);
    const plan = key ? this._planRedraw(records.get(this._canvas), setup, key) : null;
    return plan && plan.rows;
  }

  /** The sizes, scale and placement render works out before it draws; changes nothing. */
  _renderSetup(scale: number | undefined, style: TLRenderStyle, flags: number): RenderSetup {
    const horizontalPadding = Math.max(
      this.getLeftPadding() as number,
      this.getRightPadding() as number,
    );
    const padding = this._padding || 0;
    let width = this.getWidth() + 2 * horizontalPadding;
    let height = this.getHeight() + 2 * padding;
    let offsetX = 0;
    let offsetY = 0;
    let bitmapScale = 1;
    let canvasWidth = width;
    let canvasHeight = height;
    let renderBounds: Rect;
    if (this.hasPathTransformer()) {
      const bounds = this.getRenderBounds() as Rect;
      offsetX = -bounds.getX();
      offsetY = -bounds.getY();
      canvasWidth = bounds.getWidth() + Math.max(2 * horizontalPadding, 2 * padding);
      canvasHeight = bounds.getHeight() + Math.max(2 * horizontalPadding, 2 * padding);
      renderBounds = bounds;
      width = this.getActualWidth();
      height = this.getActualHeight();
    } else {
      renderBounds = new Rect(0, 0, width, height);
    }
    if (!scale) scale = 1;
    if (flags & RenderFlags.RENDERFLAG_SCALEBITMAP) bitmapScale *= scale;
    let shift = 0;
    if (style.valign && !this.hasPathTransformer()) {
      if ("m" == style.valign) {
        shift = (height - (this._doc.frame ? this._doc.frame.bounds().h : 0)) / 2;
      } else if ("b" == style.valign) {
        shift = height - (this._doc.frame ? this._doc.frame.bounds().h : 0);
      }
    }
    const top = Math.max(0, -shift);
    return {
      scale,
      width,
      height,
      canvasWidth,
      canvasHeight,
      offsetX,
      offsetY,
      bitmapScale,
      pixelWidth: Math.ceil(bitmapScale * canvasWidth),
      pixelHeight: Math.ceil(bitmapScale * canvasHeight),
      renderBounds,
      shift,
      translateX: offsetX * bitmapScale + (this.getLeftPadding() as number) * scale,
      translateY: bitmapScale * (shift + offsetY) + padding * scale,
      viewport: new TLRect(0, top, width, height + top),
    };
  }

  /**
   * The settings a record of a render keeps (CanvasRecord.key), or null
   * when such a render isn't recorded: anything but a fill of glyph
   * outlines, a text on a path or in another direction (a transformer
   * places each glyph), a fill that isn't a color string.
   */
  _recordKey(setup: RenderSetup, style: TLRenderStyle, flags: number): string | null {
    const recorded = RenderFlags.RENDERFLAG_FILL | RenderFlags.RENDERFLAG_VERTEX;
    if ((flags & ~RenderFlags.RENDERFLAG_SCALEBITMAP) !== recorded || this._textTransformer) {
      return null;
    }
    const fill = style.shapePaint
      ? Canvas2DPaintCanvas.prototype._convertStyle.call(this as never, style.shapePaint)
      : "transparent";
    if ("string" != typeof fill || !canvasColor(fill)) return null;
    return [
      setup.pixelWidth,
      setup.pixelHeight,
      setup.canvasWidth,
      setup.canvasHeight,
      setup.bitmapScale,
      setup.translateX,
      setup.translateY,
      setup.viewport.t,
      setup.viewport.w,
      setup.viewport.h,
      flags,
      !!style.evenodd,
      "number" == typeof style.opacity ? style.opacity : 1,
      style.paintTransform ? style.paintTransform.getMatrix().join(" ") : "",
      HarfBuzzFont.variationsSet,
      sigString(fill),
    ].join(",");
  }

  /**
   * What each line of the frame draws, as a record holds it (bounds not
   * known yet), or null when they can't be recorded: lists, or a part
   * without a signature (partSignature).
   */
  _lineRecords(viewport: TLRect): LineRecord[] | null {
    const frame = this._doc.frame;
    if (!frame) return null;
    const drawn: boolean[] = [];
    frame.forDrawnLines(viewport, (_line, index) => {
      drawn[index] = true;
    });
    // The fonts and color fills drawText would take, looked up once per pass.
    const ids = new Map<string, number>();
    const fills = new Map<Color, unknown>();
    const resolve: Resolve = {
      font: (css) => {
        let id = ids.get(css);
        if (undefined === id) {
          const parsed = TLUtil.parseFont(css);
          const resolved = this._ctx._getFont(
            parsed.fontFamily,
            parsed.fontStyle as string,
            parsed.fontWeight as number,
          );
          id = resolved ? fontId(resolved) : 0;
          ids.set(css, id);
        }
        return id;
      },
      fill: (color) => {
        if (!fills.has(color)) fills.set(color, this._ctx._patternStyle(color, null));
        return fills.get(color);
      },
    };
    const lines: LineRecord[] = [];
    for (let i = 0; i < frame.lines.length; i++) {
      const item = frame.lines[i] as TLNode;
      if ("line" !== item.type) return null;
      if (!drawn[i]) {
        lines.push({ drawn: false, baseline: 0, lefts: [], words: [], bounds: null });
        continue;
      }
      const line = item as unknown as Line;
      const lefts: number[] = [];
      const words: string[] = [];
      for (const positioned of line.positionedWords) {
        const signature = wordSignature(positioned.word, resolve);
        if (null === signature) return null;
        lefts.push((line.left as number) + positioned.left);
        words.push(signature);
      }
      lines.push({ drawn: true, baseline: line.baseline, lefts, words, bounds: null });
    }
    return lines;
  }

  /**
   * What a recording render draws again when the canvas shows `record`:
   * the rows of the lines whose records differ (before and after), and of
   * the lines that reach an edge the whole clear leaves (see below), grown
   * until every line that reaches into them lies inside them. Those lines
   * are drawn again whole over the cleared rows; every pixel in them gets
   * the paths that cover it in the order a whole render draws them, and no
   * pixel outside changes. Null when the record doesn't fit: other
   * settings, another canvas size, lines that can't be recorded.
   */
  _planRedraw(
    record: CanvasRecord | undefined,
    setup: RenderSetup,
    key: string,
  ): RedrawPlan | null {
    const canvas = this._canvas as Canvas;
    if (
      !record ||
      record.key !== key ||
      canvas.width !== setup.pixelWidth ||
      canvas.height !== setup.pixelHeight
    ) {
      return null;
    }
    const lines = this._lineRecords(setup.viewport);
    if (!lines) return null;
    const frame = this._doc.frame as Frame;
    const measured = new Map<string, number[] | null>();
    const rows: number[] = [];
    const extent = (line: LineRecord): number[] | null =>
      line.drawn ? this._lineRows(line.bounds, setup) : null;
    const add = (line: LineRecord): void => {
      const lineRows = extent(line);
      if (lineRows) addRows(rows, lineRows[0] as number, lineRows[1] as number);
    };
    const count = Math.max(record.lines.length, lines.length);
    for (let i = 0; i < count; i++) {
      const before = record.lines[i];
      const after = lines[i];
      if (before && after && sameLine(before, after)) {
        after.bounds = before.bounds;
        continue;
      }
      if (before) add(before);
      if (after && after.drawn) {
        const known = lineKey(after);
        let bounds = this._measuredLines.get(known);
        if (undefined === bounds) bounds = this._measureLine(frame.lines[i] as TLNode);
        measured.set(known, bounds);
        after.bounds = bounds;
        add(after);
      }
    }
    this._measuredLines = measured;
    // The whole clear clears the canvas size at the scale of the last
    // render, rounded to whole pixels, so it can leave the last column or
    // row. A whole render draws over what is there, so the lines that
    // reach them are drawn again at every render.
    const transform = this._ctx.getTransform().getMatrix();
    const keepsColumn = (transform[0] as number) * setup.canvasWidth < setup.pixelWidth;
    const keepsRow = (transform[3] as number) * setup.canvasHeight < setup.pixelHeight;
    for (const line of lines) {
      const lineRows = extent(line);
      if (!lineRows) continue;
      const right =
        Math.ceil(setup.bitmapScale * ((line.bounds as number[])[2] as number) + setup.translateX) +
        PATH_MARGIN;
      if (
        (keepsColumn && right >= setup.pixelWidth) ||
        (keepsRow && lineRows[1] === setup.pixelHeight)
      ) {
        addRows(rows, lineRows[0] as number, lineRows[1] as number);
      }
    }
    for (let grown = true; grown;) {
      grown = false;
      for (const line of lines) {
        const lineRows = extent(line);
        if (
          lineRows &&
          rowsIntersect(rows, lineRows[0] as number, lineRows[1] as number) &&
          !rowsContain(rows, lineRows[0] as number, lineRows[1] as number)
        ) {
          addRows(rows, lineRows[0] as number, lineRows[1] as number);
          grown = true;
        }
      }
    }
    const redraw = lines.map((line) => {
      const lineRows = extent(line);
      return !!lineRows && rowsIntersect(rows, lineRows[0] as number, lineRows[1] as number);
    });
    return { rows, lines, redraw };
  }

  /** The canvas rows (top, bottom) the paths of a line with `bounds` can colour, or null for none. */
  _lineRows(bounds: number[] | null, setup: RenderSetup): number[] | null {
    if (!bounds) return null;
    const scale = setup.bitmapScale;
    const top = Math.max(
      0,
      Math.floor(scale * (bounds[1] as number) + setup.translateY) - PATH_MARGIN,
    );
    const bottom = Math.min(
      setup.pixelHeight,
      Math.ceil(scale * (bounds[3] as number) + setup.translateY) + PATH_MARGIN,
    );
    return top < bottom ? [top, bottom] : null;
  }

  /**
   * The bounds of the path points `line` draws, from its outlines collected
   * without drawing: drawText makes the same points for them as it draws
   * (a part's kept path calls were made from such outlines).
   */
  _measureLine(line: TLNode): number[] | null {
    const ctx = this._ctx;
    const mode = ctx._renderMode;
    ctx.clearVertices();
    ctx.renderMode(RenderFlags.RENDERFLAG_VERTEX);
    try {
      line.draw(ctx);
    } finally {
      ctx.renderMode(mode);
    }
    const bounds = emptyBounds();
    for (const vertex of (ctx._vstack as VertexContainer)._vertices) {
      if (vertex.command !== VertexCommand.Close) extendBounds(bounds, vertex.x, vertex.y);
    }
    ctx.clearVertices();
    return Infinity === bounds[0] ? null : bounds;
  }

  /**
   * Clears `rows` as the whole clear in render would clear them: the same
   * clearRect, under a clip to the rows, which are whole pixels.
   */
  _clearRows(rows: number[], setup: RenderSetup): void {
    if (!rows.length) return;
    const context = this._ctx._canvasContext;
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.beginPath();
    for (let i = 0; i < rows.length; i += 2) {
      const top = rows[i] as number;
      const bottom = rows[i + 1] as number;
      context.moveTo(0, top);
      context.lineTo(setup.pixelWidth, top);
      context.lineTo(setup.pixelWidth, bottom);
      context.lineTo(0, bottom);
    }
    context.clip();
    this._ctx.setTranslate(0, 0);
    this._ctx.clearRect(0, 0, setup.canvasWidth, setup.canvasHeight);
    context.restore();
  }

  /**
   * Draws the lines as the document draws them (Frame.forDrawnLines), or
   * of them only those `redraw` marks, and keeps the bounds of the points
   * each one drew in its record.
   */
  _drawLines(viewport: TLRect, lines: LineRecord[], redraw: boolean[] | null): void {
    const ctx = this._ctx;
    try {
      (this._doc.frame as Frame).forDrawnLines(viewport, (line, index) => {
        if (redraw && !redraw[index]) return;
        const bounds = emptyBounds();
        ctx._drawnBounds = bounds;
        line.draw(ctx, viewport);
        (lines[index] as LineRecord).bounds = Infinity === bounds[0] ? null : bounds;
      });
    } finally {
      ctx._drawnBounds = null;
    }
  }

  /** The path transformer, when the text is on a path. */
  hasPathTransformer(): TextTransformer | null {
    return this._textTransformer && this._textTransformer.get(TLPathTextTransformer.TYPE);
  }

  /** Collects the outlines of the text (as the transformers place them) into `target`. */
  renderVertices(target: VertexContainer): void {
    if (!this.isInitialized()) throw new Error(TLCore.INITIALIZATION_ERROR);
    this._ctx.renderMode(RenderFlags.RENDERFLAG_VERTEX);
    this._ctx.clearVertices();
    this._drawForVertices();
    this._ctx.addVertices(target);
  }

  /** Collects the outlines per run with their styles into `target` (an array). */
  renderVerticesWithStyle(target: unknown[]): void {
    if (!this.isInitialized()) throw new Error(TLCore.INITIALIZATION_ERROR);
    this._ctx.renderMode(RenderFlags.RENDERFLAG_VERTEX | RenderFlags.RENDERFLAG_RENDERSTYLES);
    this._ctx.clearVertices();
    this._drawForVertices();
    this._ctx.addStyleVertices(target);
  }

  /** Draws the document for outline collection: on a path the actual size, else the box. */
  _drawForVertices(): void {
    const shift = Math.max(0, this._verticalShift);
    if (this.hasPathTransformer()) {
      this._doc.draw(
        this._ctx,
        new TLRect(0, shift, this.getActualWidth(), this.getActualHeight() + shift),
      );
    } else {
      this._doc.draw(this._ctx, new TLRect(0, shift, this.getWidth(), this.getHeight() + shift));
    }
  }

  /**
   * Gives an adopted fill (AdoptedFill) its own canvas before something
   * draws into the core's canvas, except for a fill render of a core that
   * shares the adoption: its result is the new fill. The copy is the one
   * render would have made after the last fill render, which is the last
   * time the canvas changed.
   */
  _keepFill(fillRender: boolean): void {
    this._resolveFill();
    const canvas = this._canvas;
    const adopted = canvas && adoptions.get(canvas);
    if (!canvas || !adopted || (fillRender && adopted === this._adoptedFill)) return;
    const copy = RenderScheduler.getRenderer(true, void 0, void 0, true).canvas;
    copyInto(canvas, copy);
    adopted.copy = copy;
    adoptions.delete(canvas);
    this._resolveFill();
  }

  /** Moves the fill and stroke canvas to the fill's own canvas once it has one (see AdoptedFill). */
  _resolveFill(): void {
    const adopted = this._adoptedFill;
    if (!adopted || !adopted.copy) return;
    if (this._fillCanvas === adopted.canvas) this._fillCanvas = adopted.copy;
    if (this._strokeCanvas === adopted.canvas) this._strokeCanvas = adopted.copy;
    this._adoptedFill = null;
  }

  /**
   * Called by the drawing context before it draws into the core's canvas.
   * Within a render into that canvas (also one of a copy of this core)
   * render has kept the fill already. A draw outside a render makes the
   * canvas differ from its record.
   */
  _beforeDraw(): void {
    if (canvasInRender !== this._canvas) {
      if (this._canvas) records.delete(this._canvas);
      this._keepFill(false);
    }
  }

  /** The stroke canvas, the fill canvas or the core's canvas. */
  getCanvas(flags?: number): Canvas | null {
    if (!this.isInitialized()) throw new Error(TLCore.INITIALIZATION_ERROR);
    this._resolveFill();
    // The old code unwrapped recorder canvases outside render phases; the
    // port's canvases are always real ones.
    return flags && flags & RenderFlags.RENDERFLAG_STROKE
      ? this._strokeCanvas
      : flags && flags & RenderFlags.RENDERFLAG_FILL
        ? this._fillCanvas
        : this._canvas;
  }

  isInitialized(): boolean {
    return null !== this._fontManager;
  }

  getWasEdited(): boolean {
    return this._wasEdited;
  }

  getRichContent(): Run[] {
    if (!this.isInitialized()) throw new Error(TLCore.INITIALIZATION_ERROR);
    return this._doc.save();
  }

  /**
   * Stores a setting for later; the old code stored every one under "name"
   * (QUESTIONS.md "GTL TLCore.initialize throws after deferred settings").
   */
  _setDeferred(_name: string, value?: unknown): void {
    if (!this._deferredSettings) this._deferredSettings = {};
    this._deferredSettings.name = value;
  }

  _checkFrame(): boolean {
    return this.isInitialized() && !!this._doc.frame;
  }

  getBBoxSpacing(): number {
    return this._checkFrame()
      ? (this._doc.frame as NonNullable<TLDocument["frame"]>).getBBoxSpacing()
      : 0;
  }

  getMinX(): number {
    return this._checkFrame() ? (this._doc.frame as NonNullable<TLDocument["frame"]>).getMinX() : 0;
  }

  cloneDocument(): TLDocument {
    return this._doc.clone();
  }
}

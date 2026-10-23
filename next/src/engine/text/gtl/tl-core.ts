// Old: chunk.vendor.js module 367 (the GTL core: the text layout engine behind GText).
import { GObject } from "../../core/object.ts";
import { VertexContainer } from "../../geometry/vertex-container.ts";
import { VertexInfo } from "../../geometry/vertex-info.ts";
import { Rect } from "../../math/rect.ts";
import { Transform } from "../../math/transform.ts";
import { RGBColor } from "../../color/rgb-color.ts";
import type { Destroyable } from "../../paint/destroyable.ts";
import { Canvas2DPaintCanvas, PaintCanvas, type PaintStyle } from "../../paint/paint-canvas.ts";
import { RenderScheduler } from "../../paint/render-scheduler.ts";
import type { Font } from "../fonts/font.ts";
import type { FontManager } from "../fonts/font-manager.ts";
import { TLCanvasContext } from "../tl-canvas-context.ts";
import { TLDirectionTextTransformer } from "../tl-direction-text-transformer.ts";
import { TLPathTextTransformer, type TextBasePath } from "../tl-path-text-transformer.ts";
import { defaultFontMeasure } from "./default-font-measure.ts";
import { TLDocument, type Selection } from "./document.ts";
import { Formatting, type Run } from "./formatting.ts";
import { getStylable, type PropertySetDefaults } from "./late-bound.ts";
import type { Line } from "./line.ts";
import { openTypeMeasure } from "./measure.ts";
import type { TLNode } from "./node.ts";
import type { TLRange } from "./range.ts";
import { TLRect } from "./rect.ts";
import { RenderFlags } from "./render-flags.ts";
import { textMeterSlot, type TextMeter } from "./run-draw.ts";
import { TLUtil } from "./tl-util.ts";
import type { TextTransformer } from "./transformer-util.ts";

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
      // The old code tested `hasOwnProperty(text)` with an undeclared `text`.
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
          run.text = text as string;
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
   */
  render(
    focused: boolean | undefined,
    scale: number | undefined,
    style: TLRenderStyle,
    flags: number,
  ): void {
    if (!this.isInitialized()) throw new Error(TLCore.INITIALIZATION_ERROR);
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
    if (this.hasPathTransformer()) {
      const bounds = this.getRenderBounds() as Rect;
      offsetX = -bounds.getX();
      offsetY = -bounds.getY();
      canvasWidth = bounds.getWidth() + Math.max(2 * horizontalPadding, 2 * padding);
      canvasHeight = bounds.getHeight() + Math.max(2 * horizontalPadding, 2 * padding);
      this._renderBounds = bounds;
      width = this.getActualWidth();
      height = this.getActualHeight();
    } else {
      this._renderBounds = new Rect(0, 0, width, height);
    }
    this._ctx.renderMode(0);
    if (!scale) scale = 1;
    if (flags & RenderFlags.RENDERFLAG_SCALEBITMAP) bitmapScale *= scale;
    const pixelWidth = Math.ceil(bitmapScale * canvasWidth);
    const pixelHeight = Math.ceil(bitmapScale * canvasHeight);
    let resized = false;
    const canvas = this.getCanvas() as Canvas;
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
    if (!resized) {
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
    let shift = 0;
    if (style.valign && !this.hasPathTransformer()) {
      if ("m" == style.valign) {
        shift = (height - (this._doc.frame ? this._doc.frame.bounds().h : 0)) / 2;
      } else if ("b" == style.valign) {
        shift = height - (this._doc.frame ? this._doc.frame.bounds().h : 0);
      }
    }
    this._verticalShift = -shift;
    this._ctx.setTranslate(
      offsetX * bitmapScale + (this.getLeftPadding() as number) * scale,
      bitmapScale * (shift + offsetY) + padding * scale,
    );
    this._ctx.setScale(bitmapScale, bitmapScale);
    const fillTransform = this._ctx.getFillTransform();
    const alpha = this._ctx.globalAlpha;
    if (style.paintTransform) this._ctx.appendFillTransform(style.paintTransform);
    if (flags & RenderFlags.RENDERFLAG_NODRAW && flags & RenderFlags.RENDERFLAG_STROKE) {
      this._ctx._canvasContext.beginPath();
    }
    this._doc.draw(
      this._ctx,
      new TLRect(
        0,
        Math.max(0, this._verticalShift),
        width,
        height + Math.max(0, this._verticalShift),
      ),
    );
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
    const copyInto = (source: Canvas, target: Canvas) => {
      if (source.width * source.height != 0) {
        target.width = source.width;
        target.height = source.height;
        // The old code set the operator on the canvas element, where it does nothing.
        Reflect.set(target, "globalCompositeOperation", PaintCanvas.CompositeOperator.Copy);
        (target.getContext("2d") as CanvasRenderingContext2D).drawImage(source, 0, 0);
      }
    };
    if (flags & RenderFlags.RENDERFLAG_FILL) {
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

  /** The stroke canvas, the fill canvas or the core's canvas. */
  getCanvas(flags?: number): Canvas | null {
    if (!this.isInitialized()) throw new Error(TLCore.INITIALIZATION_ERROR);
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

  /** Stores a setting for later; the old code stored every one under "name". */
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

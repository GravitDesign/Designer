// Old: chunk.vendor.js module 655 (the GTL canvas context).
//
// The context the GTL layout draws into. It wraps a 2D context and adds
// what the layout needs on top: glyph outlines from the OpenType font
// (vertex mode), a text transformer chain (path, direction) applied per
// glyph, separate fill and stroke styles for pattern fills, a fill
// transform, and collecting outlines (and their styles) instead of
// painting them.
import { Vertex } from "../geometry/vertex.ts";
import { VertexContainer } from "../geometry/vertex-container.ts";
import { VertexInfo } from "../geometry/vertex-info.ts";
import type { VertexReader } from "../geometry/vertex-source.ts";
import { VertexTransformer } from "../geometry/vertex-transformer.ts";
import type { Rect } from "../math/rect.ts";
import { Transform } from "../math/transform.ts";
import type { Context2D } from "../paint/context-2d.ts";
import {
  Canvas2DPaintCanvas,
  PaintCanvas,
  type PaintStyle,
  type PatternPaint,
} from "../paint/paint-canvas.ts";
import { RecorderStateContext } from "../paint/recorder-state-context.ts";
import { RenderScheduler } from "../paint/render-scheduler.ts";
import { Pattern } from "../style/pattern.ts";
import type { Font, PositionedGlyph } from "./fonts/font.ts";
import type { FontManager } from "./fonts/font-manager.ts";
import { RenderFlags } from "./gtl/render-flags.ts";
import { RunDraw, type RunDrawContext } from "./gtl/run-draw.ts";
import { TLUtil } from "./gtl/tl-util.ts";
import type { GlyphPlacement, TextTransformer } from "./gtl/transformer-util.ts";
import { TLDirectionTextTransformer } from "./tl-direction-text-transformer.ts";

/** What the context needs from the core that owns it (TLCore). */
export interface TLCanvasCore {
  _fontManager: FontManager | null;
  requireFont(font: Font): void;
}

/** The font calls of the vertex text path besides the Font base. */
interface StrikeoutMetrics {
  getStrikeoutWidth(fontSize: number): number;
  getStrikeoutPosition(
    baseline: number,
    xHeight: number,
    lineWidth: number,
    fontSize: number,
  ): number;
}

type TextFont = Font & StrikeoutMetrics;

/** A glyph as the fonts return it; the layout reads its code point. */
interface GlyphLike {
  unicode?: number;
}

/** One entry of the style stack (RENDERFLAG_RENDERSTYLES): a run's outlines and how they paint. */
export interface TLStyleEntry {
  fill: unknown;
  stroke: unknown;
  textFill?: Pattern | null;
  textStroke?: Pattern | null;
  transform: Transform;
  fillTransform: Transform;
  alpha: number;
  op: string;
  vertices?: VertexContainer | null;
}

const NO_COORDINATE = undefined as unknown as number;

export class TLCanvasContext implements RunDrawContext {
  static FLAGS_DRAWING = RenderFlags.RENDERFLAG_FILL | RenderFlags.RENDERFLAG_STROKE;

  _core: TLCanvasCore | null = null;
  _defaultFill: unknown = null;
  _currentFont: Font | null = null;
  _contextFont: string | null = null;
  $canvasContext: Context2D | null = null;
  _vstack: VertexContainer | null = null;
  _sstack: TLStyleEntry[] | null = null;
  _vertexRendering = false;
  _renderMode: number = RenderFlags.RENDERFLAG_FILL;
  _textFillStyle: Pattern | null = null;
  _textStrokeStyle: Pattern | null = null;
  _fillTransform: Transform;
  _strokeTransform: Transform;
  _transform: Transform;
  charSpacing = 0;
  _textUnderline = false;
  _textStrikeout = false;
  _textTransformer: TextTransformer | null = null;
  _textLigatures: boolean | undefined = true;
  _textVariant: string | null | undefined = null;
  _langScript: string | null | undefined = null;
  _textFractions = false;
  _textStylisticSet: string | null | undefined = null;
  _textLocalizedForm: string | null | undefined = null;
  /** Set by the run drawing; nothing reads it here. */
  wordSpacing: number | undefined = undefined;

  constructor(core: TLCanvasCore, context: Context2D | HTMLCanvasElement) {
    // The old constructor also unwrapped a RendererCanvas (t.parent); that
    // canvas wrapper belonged to the dropped GRendererCtx recorder.
    if ("undefined" != typeof HTMLCanvasElement && context instanceof HTMLCanvasElement) {
      context = context.getContext("2d") as unknown as Context2D;
    }
    this._canvasContext = context as Context2D;
    if (Object.prototype.hasOwnProperty.call(this._canvasContext, "imageSmoothingQuality")) {
      this._canvasContext.imageSmoothingQuality = "high";
    }
    this._core = core;
    this._fillTransform = new Transform();
    this._strokeTransform = new Transform();
    this._transform = new Transform();
    this.clearVertices();
  }

  /**
   * The context to paint into. Outside a render phase a wrapped context
   * (the port's stand-in for the old recorder) is bypassed for its real
   * context, as the old code used the recorder's real context then.
   */
  get _canvasContext(): Context2D {
    if (RenderScheduler.isRenderPhase()) return this.$canvasContext as Context2D;
    return this.$canvasContext instanceof RecorderStateContext
      ? (this.$canvasContext.real as unknown as Context2D)
      : (this.$canvasContext as Context2D);
  }
  set _canvasContext(context: Context2D) {
    this.$canvasContext = context;
  }

  get defaultFill(): unknown {
    return this._defaultFill;
  }
  set defaultFill(fill: unknown) {
    this._defaultFill = fill;
  }

  /** The context's fill, unless a default fill other than "transparent" overrides it. */
  get fillStyle(): unknown {
    let style: unknown = this._canvasContext.fillStyle;
    if (this._defaultFill && "transparent" !== this._defaultFill) style = this._defaultFill;
    return style;
  }
  set fillStyle(style: unknown) {
    if (this._renderMode & RenderFlags.RENDERFLAG_LOCKFILL) return;
    if (style instanceof Pattern) {
      this._textFillStyle = style;
    } else {
      this._canvasContext.fillStyle = style as string;
      this._textFillStyle = null;
    }
  }

  get globalAlpha(): number {
    return this._canvasContext.globalAlpha;
  }
  set globalAlpha(alpha: number) {
    this._canvasContext.globalAlpha = alpha;
  }

  get globalCompositeOperation(): string {
    return this._canvasContext.globalCompositeOperation;
  }
  set globalCompositeOperation(operation: string) {
    this._canvasContext.globalCompositeOperation = operation as GlobalCompositeOperation;
  }

  get lineWidth(): number {
    return this._canvasContext.lineWidth;
  }
  set lineWidth(width: number) {
    this._canvasContext.lineWidth = width;
  }

  get lineCap(): string {
    return this._canvasContext.lineCap;
  }
  set lineCap(cap: string) {
    this._canvasContext.lineCap = cap as CanvasLineCap;
  }

  get lineJoin(): string {
    return this._canvasContext.lineJoin;
  }
  set lineJoin(join: string) {
    this._canvasContext.lineJoin = join as CanvasLineJoin;
  }

  get miterLimit(): number {
    return this._canvasContext.miterLimit;
  }
  set miterLimit(limit: number) {
    this._canvasContext.miterLimit = limit;
  }

  get strokeStyle(): unknown {
    return this._canvasContext.strokeStyle;
  }
  set strokeStyle(style: unknown) {
    if (this._renderMode & RenderFlags.RENDERFLAG_LOCKSTROKE) return;
    if (style instanceof Pattern) {
      this._textStrokeStyle = style;
    } else {
      this._canvasContext.strokeStyle = style as string;
      this._textStrokeStyle = null;
    }
  }

  get font(): string {
    return this._contextFont || this._canvasContext.font;
  }
  /** Sets the CSS font and remembers its font when the manager has it resolved. */
  set font(font: string) {
    const parsed = TLUtil.parseFont(font);
    const resolved = this._getFont(
      parsed.fontFamily,
      parsed.fontStyle as string,
      parsed.fontWeight as number,
    );
    if (resolved) this._currentFont = resolved;
    this._canvasContext.font = font;
    this._contextFont = font;
  }

  get textBaseline(): string {
    return this._canvasContext.textBaseline;
  }
  set textBaseline(baseline: string) {
    this._canvasContext.textBaseline = baseline as CanvasTextBaseline;
  }

  get textAlign(): string {
    return this._canvasContext.textAlign;
  }
  set textAlign(align: string) {
    this._canvasContext.textAlign = align as CanvasTextAlign;
  }

  // A 2D context has no width or height; the old accessors passed them on anyway.
  get width(): unknown {
    return (this._canvasContext as unknown as Record<string, unknown>).width;
  }
  set width(width: unknown) {
    (this._canvasContext as unknown as Record<string, unknown>).width = width;
  }

  get height(): unknown {
    return (this._canvasContext as unknown as Record<string, unknown>).height;
  }
  set height(height: unknown) {
    (this._canvasContext as unknown as Record<string, unknown>).height = height;
  }

  get textUnderline(): boolean {
    return this._textUnderline;
  }
  set textUnderline(value: boolean) {
    this._textUnderline = value;
  }

  get textStrikeout(): boolean {
    return this._textStrikeout;
  }
  set textStrikeout(value: boolean) {
    this._textStrikeout = value;
  }

  get textTransformer(): TextTransformer | null {
    return this._textTransformer;
  }
  set textTransformer(transformer: TextTransformer | null) {
    this._textTransformer = transformer;
  }

  get textLigatures(): boolean | undefined {
    return this._textLigatures;
  }
  set textLigatures(value: boolean | undefined) {
    this._textLigatures = value;
  }

  get langScript(): string | null | undefined {
    return this._langScript;
  }
  set langScript(value: string | null | undefined) {
    this._langScript = value;
  }

  get textVariant(): string | null | undefined {
    return this._textVariant;
  }
  set textVariant(value: string | null | undefined) {
    this._textVariant = value;
  }

  get textFractions(): boolean {
    return this._textFractions;
  }
  set textFractions(value: boolean) {
    this._textFractions = value;
  }

  get textStylisticSet(): string | null | undefined {
    return this._textStylisticSet;
  }
  set textStylisticSet(value: string | null | undefined) {
    this._textStylisticSet = value;
  }

  get textLocalizedForm(): string | null | undefined {
    return this._textLocalizedForm;
  }
  set textLocalizedForm(value: string | null | undefined) {
    this._textLocalizedForm = value;
  }

  renderMode(mode: number): void {
    this._renderMode = mode;
  }

  save(): void {
    this._canvasContext.save();
  }

  restore(): void {
    this._canvasContext.restore();
  }

  fill(): void {
    this._canvasContext.fill();
  }

  /** Fills a rectangle under the fill transform, optionally in another style. */
  fillRect(x: number, y: number, width: number, height: number, style?: unknown): void {
    let previous: unknown;
    if (style) {
      previous = this._canvasContext.fillStyle;
      this._canvasContext.fillStyle = style as string;
    }
    this._setMatrix(this._transform.preMultiplied(this._fillTransform));
    this._canvasContext.fillRect(x, y, width, height);
    this._setMatrix(this._transform);
    if (style) this._canvasContext.fillStyle = previous as string;
  }

  strokeRect(x: number, y: number, width: number, height: number): void {
    this._setMatrix(this._transform.preMultiplied(this._fillTransform));
    this._canvasContext.strokeRect(x, y, width, height);
    this._setMatrix(this._transform);
  }

  /**
   * The font of the current CSS font. Falls back to the default font when
   * nothing was resolved yet, and keeps the last font while the new one
   * isn't resolved.
   */
  getCurrentFont(): Font | null {
    const parsed = TLUtil.parseFont(this.font);
    let font = this._currentFont;
    if (
      null === font &&
      null ==
        (font = this._getFont(
          parsed.fontFamily,
          parsed.fontStyle as string,
          parsed.fontWeight as number,
        ))
    ) {
      this._currentFont = (
        (this._core as TLCanvasCore)._fontManager as FontManager
      ).getDefaultFont();
      return this._currentFont;
    }
    if (
      parsed.fontFamily !== font.getFamily() ||
      parsed.fontWeight !== font.getWeight() ||
      parsed.fontStyle !== font.getStyle()
    ) {
      font = this._getFont(
        parsed.fontFamily,
        parsed.fontStyle as string,
        parsed.fontWeight as number,
      );
      if (null === font) return this._currentFont;
      this._currentFont = font;
      return font;
    }
    return font;
  }

  /**
   * The resolved font, or null. An unresolved font (and an unresolved
   * default font) is requested from the core.
   */
  _getFont(family: string, style: string, weight: number): Font | null {
    const manager = (this._core as TLCanvasCore)._fontManager as FontManager;
    let font = manager.getFont(family, style, weight);
    let result = font;
    if (!font) font = manager.getDefaultFont();
    if (font && !font.isResolved()) {
      (this._core as TLCanvasCore).requireFont(font);
      result = null;
      font = manager.getDefaultFont() as Font;
      if (!font.isResolved()) (this._core as TLCanvasCore).requireFont(font);
    }
    return result;
  }

  clearVertices(): void {
    this._vstack = new VertexContainer();
    this._sstack = [];
  }

  /** Appends the collected outlines to a vertex target. */
  addVertices(target: VertexContainer): void {
    (this._vstack as VertexContainer).rewindVertices(0);
    target.appendVertices(this._vstack as VertexContainer);
  }

  /** Appends the collected style entries to an array. */
  addStyleVertices(target: unknown): void {
    if (target && target instanceof Array && this._sstack) target.push(...this._sstack);
  }

  /** Draws (or collects) a list marker outline at (x, y). Only in vertex mode. */
  drawMarker(source: VertexReader, x: number, y: number): void {
    if (!(this._renderMode & RenderFlags.RENDERFLAG_VERTEX)) return;
    let styleVertices: VertexContainer | null = null;
    if (
      !(this._renderMode & RenderFlags.RENDERFLAG_NODRAW) &&
      this._renderMode & TLCanvasContext.FLAGS_DRAWING
    ) {
      this._canvasContext.beginPath();
    }
    source = new VertexTransformer(source, new Transform(1, 0, 0, 1, x, y));
    if (this._textTransformer) {
      const bounds = VertexInfo.calculateBounds(source, true);
      source = this._textTransformer.transform(source, x, y, bounds as Rect);
    }
    if (this._renderMode & TLCanvasContext.FLAGS_DRAWING) {
      this._putVertices(source, true);
    } else if (this._renderMode & RenderFlags.RENDERFLAG_RENDERSTYLES) {
      if (!styleVertices) styleVertices = new VertexContainer();
      styleVertices.appendVertices(source);
    } else {
      (this._vstack as VertexContainer).appendVertices(source);
    }
    if (this._renderMode & RenderFlags.RENDERFLAG_NODRAW) return;
    if (this._renderMode & RenderFlags.RENDERFLAG_FILL) {
      this._canvasContext.fillStyle = this.fillStyle as string;
      this._setMatrix(this._transform.preMultiplied(this._fillTransform));
      this._canvasContext.fill(
        this._renderMode & RenderFlags.RENDERFLAG_EVENODDFILL ? "evenodd" : "nonzero",
      );
      this._setMatrix(this._transform);
    }
    if (this._renderMode & RenderFlags.RENDERFLAG_STROKE) {
      this._setMatrix(this._transform.preMultiplied(this._fillTransform));
      this._canvasContext.stroke();
      this._setMatrix(this._transform);
      this._clipBorder();
    }
    if (this._renderMode & RenderFlags.RENDERFLAG_RENDERSTYLES) {
      if (styleVertices) styleVertices.rewindVertices(0);
      (this._sstack as TLStyleEntry[]).push({
        fill: this.fillStyle,
        stroke: this.strokeStyle,
        textFill: this._textFillStyle,
        textStroke: this._textStrokeStyle,
        transform: this._transform,
        fillTransform: this._fillTransform,
        alpha: this.globalAlpha,
        op: this.globalCompositeOperation,
        vertices: styleVertices,
      });
    }
  }

  /**
   * Draws a run's text with its baseline at (x, y). In vertex mode the
   * glyphs become outlines (passed through the text transformer one by
   * one), with underline and strikeout as rectangles of `width`; otherwise
   * the context's fillText / strokeText draw it.
   */
  drawText(text: string, x: number, y: number, ascent: number, width: number): void {
    if (this._renderMode & RenderFlags.RENDERFLAG_VERTEX) {
      const font = this.getCurrentFont() as TextFont | null;
      if (!font) return;
      let rightToLeft: boolean | undefined;
      let styleVertices: VertexContainer | null = null;
      const fontSize = TLUtil.parseFont(this.font).fontSize;
      if (
        !(this._renderMode & RenderFlags.RENDERFLAG_NODRAW) &&
        this._renderMode & TLCanvasContext.FLAGS_DRAWING
      ) {
        this._canvasContext.beginPath();
      }
      const options: {
        letterSpacing: number;
        kerning: boolean;
        direction: string;
        features: {
          stylisticSet: string | null | undefined;
          liga: boolean | undefined;
          rlig: boolean | undefined;
          frac: boolean;
        };
        language?: string;
        script?: string;
        variant?: string;
      } = {
        letterSpacing: this.charSpacing,
        kerning: true,
        direction: "ltr",
        features: {
          stylisticSet: this.textStylisticSet,
          liga: this.textLigatures,
          rlig: this.textLigatures,
          frac: this.textFractions,
        },
      };
      if (this.textLocalizedForm) options.language = this.textLocalizedForm;
      if (this.langScript && "auto" !== this.langScript) options.script = this.langScript;
      if (this.textVariant) options.variant = this.textVariant;
      let lineCount = 0;
      const placement: GlyphPlacement = {};
      const glyphs = font.stringToGlyphs(text, x, y, fontSize, options);
      const count = glyphs.length - 1;
      let outline: VertexReader | null;
      let index = 0;
      for (; index < count; index++) {
        const glyph = glyphs[index] as PositionedGlyph;
        outline =
          ((glyph.glyph as GlyphLike).unicode || text.charCodeAt(index)) ===
          RunDraw.NBSP.charCodeAt(0)
            ? null
            : font.getGlyphOutline(fontSize, glyph.x, glyph.y, glyph.glyph);
        if (this._textTransformer && outline) {
          if (void 0 === rightToLeft) {
            const direction = this._textTransformer.get(
              TLDirectionTextTransformer.TYPE,
            ) as TLDirectionTextTransformer | null;
            rightToLeft = !(
              !direction || direction.getDirection() !== TLDirectionTextTransformer.RTL
            );
          }
          const bounds =
            (glyph as { bounds?: Rect }).bounds ||
            font.getGlyphBoundingRect(fontSize, glyph.glyph, true);
          placement.next = (glyphs[index + 1] as PositionedGlyph).x - glyph.x;
          placement.prev =
            index > 0 ? glyph.x - (glyphs[index - 1] as PositionedGlyph).x : glyph.x - x;
          placement.unicode = (glyph.glyph as GlyphLike).unicode;
          placement.xoff = glyph.xOff;
          outline = this._textTransformer.transform(outline, glyph.x, glyph.y, bounds, placement);
        }
        if (this._renderMode & TLCanvasContext.FLAGS_DRAWING) {
          if (outline) lineCount += this._putVertices(outline);
        } else if (this._renderMode & RenderFlags.RENDERFLAG_RENDERSTYLES) {
          if (!styleVertices) styleVertices = new VertexContainer();
          if (outline) styleVertices.appendVertices(outline);
        } else if (outline) {
          (this._vstack as VertexContainer).appendVertices(outline);
        }
      }
      if (this.textUnderline || this.textStrikeout) {
        let lines = new VertexContainer();
        const lineWidth = font.getStrikeoutWidth(fontSize);
        if (this.textUnderline) {
          lines = this._makeRect(x, lineWidth + y, width, lineWidth, rightToLeft);
        }
        if (this.textStrikeout) {
          const position = font.getStrikeoutPosition(y, ascent, lineWidth, fontSize);
          lines.appendVertices(this._makeRect(x, position, width, lineWidth, rightToLeft));
        }
        if (this._renderMode & TLCanvasContext.FLAGS_DRAWING) {
          lineCount += this._putVertices(lines);
        } else if (this._renderMode & RenderFlags.RENDERFLAG_RENDERSTYLES) {
          if (!styleVertices) styleVertices = new VertexContainer();
          styleVertices.appendVertices(lines);
        } else {
          (this._vstack as VertexContainer).appendVertices(lines);
        }
      }
      if (this._renderMode & TLCanvasContext.FLAGS_DRAWING && !lineCount) return;
      if (this._renderMode & RenderFlags.RENDERFLAG_NODRAW) return;
      // Like the old code this throws for an empty text (no glyph before the end).
      const lastText =
        (glyphs[index - 1] as PositionedGlyph).text || text.charAt(index - 1) || null;
      if (lastText && this._renderMode & RenderFlags.RENDERFLAG_FILL) {
        if (this._textFillStyle) {
          const pattern = this._textFillStyle;
          const bounds = font.getGlyphBoundingRect(fontSize, lastText);
          // The paint canvas methods run with this context as `this`, as in
          // the old code; it has the fields they read, not the class type.
          const paint = Canvas2DPaintCanvas.prototype.createPatternPaint.call(
            this as never,
            pattern,
            bounds,
          ) as PatternPaint;
          // Kept: the next line assigns this.fillStyle, whose getter reads
          // this canvas fillStyle back, so the pattern style stays unless a
          // default fill other than transparent is set (as in the old code).
          this._canvasContext.fillStyle = Canvas2DPaintCanvas.prototype._convertStyle.call(
            this as never,
            paint.paint as PaintStyle,
          ) as string;
        }
        this._canvasContext.fillStyle = this.fillStyle as string;
        this._setMatrix(this._transform.preMultiplied(this._fillTransform));
        this._canvasContext.fill(
          this._renderMode & RenderFlags.RENDERFLAG_EVENODDFILL ? "evenodd" : "nonzero",
        );
        this._setMatrix(this._transform);
      }
      if (lastText && this._renderMode & RenderFlags.RENDERFLAG_STROKE) {
        if (this._textStrokeStyle) {
          const pattern = this._textStrokeStyle;
          const bounds = font.getGlyphBoundingRect(fontSize, lastText);
          // The paint canvas methods run with this context as `this`, as in
          // the old code; it has the fields they read, not the class type.
          const paint = Canvas2DPaintCanvas.prototype.createPatternPaint.call(
            this as never,
            pattern,
            bounds,
          ) as PatternPaint;
          this._canvasContext.strokeStyle = Canvas2DPaintCanvas.prototype._convertStyle.call(
            this as never,
            paint.paint as PaintStyle,
          ) as string;
        }
        this._setMatrix(this._transform.preMultiplied(this._fillTransform));
        this._canvasContext.stroke();
        this._setMatrix(this._transform);
        this._clipBorder();
      }
      if (this._renderMode & RenderFlags.RENDERFLAG_RENDERSTYLES) {
        if (styleVertices) styleVertices.rewindVertices(0);
        (this._sstack as TLStyleEntry[]).push({
          fill: this.fillStyle,
          stroke: this._canvasContext.strokeStyle,
          textFill: this._textFillStyle,
          textStroke: this._textStrokeStyle,
          transform: this._transform,
          fillTransform: this._fillTransform,
          alpha: this.globalAlpha,
          op: this.globalCompositeOperation,
          vertices: styleVertices,
        });
      }
      return;
    }
    if (this._renderMode & RenderFlags.RENDERFLAG_RENDERSTYLES) {
      (this._sstack as TLStyleEntry[]).push({
        fill: this.fillStyle,
        stroke: this._canvasContext.strokeStyle,
        alpha: this.globalAlpha,
        op: this.globalCompositeOperation,
        transform: this._transform,
        fillTransform: this._fillTransform,
      });
    }
    if (this._renderMode & RenderFlags.RENDERFLAG_STROKE) {
      this._canvasContext.strokeText(text, x, y);
      if (this.textUnderline) this._canvasContext.strokeRect(x, 1 + y, width, 1);
      if (this.textStrikeout) this._canvasContext.strokeRect(x, 1 + y - ascent / 2, width, 1);
      // The old code tested INSIDEBRD twice here, so an outside border
      // alone never reaches the knock-out below.
      if (
        this._renderMode &
        (RenderFlags.RENDERFLAG_INSIDEBRD | RenderFlags.RENDERFLAG_INSIDEBRD)
      ) {
        const operation = this.globalCompositeOperation;
        const alpha = this.globalAlpha;
        const fill = this._canvasContext.fillStyle;
        this.globalAlpha = 1;
        this._canvasContext.fillStyle = "#000";
        if (this._renderMode & RenderFlags.RENDERFLAG_INSIDEBRD) {
          this.globalCompositeOperation = PaintCanvas.CompositeOperator.DestinationIn;
        } else if (this._renderMode & RenderFlags.RENDERFLAG_OUTSIDEBRD) {
          this.globalCompositeOperation = PaintCanvas.CompositeOperator.DestinationOut;
        }
        this._canvasContext.fillText(text, x, y);
        if (this.textUnderline) this._canvasContext.fillRect(x, 1 + y, width, 1);
        if (this.textStrikeout) this._canvasContext.fillRect(x, 1 + y - ascent / 2, width, 1);
        this.globalCompositeOperation = operation;
        this.globalAlpha = alpha;
        this._canvasContext.fillStyle = fill;
      }
    } else {
      this._setMatrix(this._transform.preMultiplied(this._fillTransform));
      this._canvasContext.fillStyle = this.fillStyle as string;
      this._canvasContext.fillText(text, x, y);
      if (this.textUnderline) this._canvasContext.fillRect(x, 1 + y, width, 1);
      if (this.textStrikeout) this._canvasContext.fillRect(x, 1 + y - ascent / 2, width, 1);
      this._setMatrix(this._transform);
    }
  }

  /** After a stroke: knocks the stroke out inside or outside the outline for border alignment. */
  private _clipBorder(): void {
    if (this._renderMode & RenderFlags.RENDERFLAG_INSIDEBRD) {
      this.fillVertices("#000", 1, PaintCanvas.CompositeOperator.DestinationIn);
    } else if (this._renderMode & RenderFlags.RENDERFLAG_OUTSIDEBRD) {
      this.fillVertices("#000", 1, PaintCanvas.CompositeOperator.DestinationOut);
    }
  }

  private _setMatrix(transform: Transform): void {
    const m = transform.getMatrix() as [number, number, number, number, number, number];
    this._canvasContext.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
  }

  /** Adds the outline to the context's path; returns the number of drawn segments. */
  _putVertices(source: VertexReader, openClose?: boolean): number {
    let segments = 0;
    if (source.rewindVertices(0)) {
      const vertex = new Vertex();
      while (source.readVertex(vertex)) {
        switch (vertex.command) {
          case Vertex.Command.Move:
            this._canvasContext.moveTo(vertex.x, vertex.y);
            break;
          case Vertex.Command.Line:
            this._canvasContext.lineTo(vertex.x, vertex.y);
            segments++;
            break;
          case Vertex.Command.Curve: {
            const endX = vertex.x;
            const endY = vertex.y;
            if (source.readVertex(vertex)) {
              this._canvasContext.quadraticCurveTo(vertex.x, vertex.y, endX, endY);
            }
            segments++;
            break;
          }
          case Vertex.Command.Curve2: {
            const endX = vertex.x;
            const endY = vertex.y;
            if (source.readVertex(vertex)) {
              const control1X = vertex.x;
              const control1Y = vertex.y;
              if (source.readVertex(vertex)) {
                this._canvasContext.bezierCurveTo(
                  control1X,
                  control1Y,
                  vertex.x,
                  vertex.y,
                  endX,
                  endY,
                );
              }
            }
            segments++;
            break;
          }
          case Vertex.Command.Close:
            // The old code passed an (ignored) argument.
            (this._canvasContext.closePath as (open: boolean) => void).call(
              this._canvasContext,
              !openClose,
            );
            break;
          default:
            throw new Error("Unknown Command Type - " + String(vertex.command));
        }
      }
    }
    return segments;
  }

  /** A closed rectangle outline; right to left runs the other way round. */
  _makeRect(
    x: number,
    y: number,
    width: number,
    height: number,
    rightToLeft?: boolean,
  ): VertexContainer {
    const rect = new VertexContainer();
    if (rightToLeft) {
      rect.addVertex(Vertex.Command.Move, x, y);
      rect.addVertex(Vertex.Command.Line, x, y + height);
      rect.addVertex(Vertex.Command.Line, x + width, y + height);
      rect.addVertex(Vertex.Command.Line, x + width, y);
    } else {
      rect.addVertex(Vertex.Command.Move, x, y);
      rect.addVertex(Vertex.Command.Line, x + width, y);
      rect.addVertex(Vertex.Command.Line, x + width, y + height);
      rect.addVertex(Vertex.Command.Line, x, y + height);
    }
    rect.addVertex(Vertex.Command.Close, NO_COORDINATE, NO_COORDINATE);
    return rect;
  }

  /** Fills the current path under the fill transform, then restores style, alpha and operator. */
  fillVertices(fill?: unknown, alpha?: number, operation?: string): void {
    const previousFill = this.fillStyle;
    const previousAlpha = this.globalAlpha;
    const previousOperation = this.globalCompositeOperation;
    this._canvasContext.fillStyle = (fill || previousFill) as string;
    this.globalAlpha = alpha || previousAlpha;
    this.globalCompositeOperation = operation || previousOperation;
    this._setMatrix(this._transform.preMultiplied(this._fillTransform));
    this._canvasContext.fill();
    this._setMatrix(this._transform);
    this._canvasContext.fillStyle = previousFill as string;
    this.globalCompositeOperation = previousOperation;
    this.globalAlpha = previousAlpha;
  }

  /** Strokes the current path; sets (and restores) the fill style, not the stroke style. */
  strokeVertices(fill?: unknown, alpha?: number, operation?: string): void {
    const previousFill = this.fillStyle;
    const previousAlpha = this.globalAlpha;
    const previousOperation = this.globalCompositeOperation;
    this._canvasContext.fillStyle = (fill || previousFill) as string;
    this.globalAlpha = alpha || previousAlpha;
    this.globalCompositeOperation = operation || previousOperation;
    this._setMatrix(this._transform.preMultiplied(this._fillTransform));
    this._canvasContext.stroke();
    this._setMatrix(this._transform);
    this._canvasContext.fillStyle = previousFill as string;
    this.globalCompositeOperation = previousOperation;
    this.globalAlpha = previousAlpha;
  }

  /** Replaces the scale entries (sx, sy) of the transform. */
  setScale(scaleX: number, scaleY: number): void {
    const m = this._transform.getMatrix() as [number, number, number, number, number, number];
    m[0] = scaleX;
    m[3] = scaleY;
    this._canvasContext.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
    this._transform = new Transform(m[0], m[1], m[2], m[3], m[4], m[5]);
  }

  scale(scaleX: number, scaleY: number): void {
    const transform = this._transform.multiplied(new Transform(scaleX, 0, 0, scaleY, 0, 0));
    this._setMatrix(transform);
    this._transform = transform;
  }

  translate(dx: number, dy: number): void {
    const transform = this._transform.multiplied(new Transform(1, 0, 0, 1, dx, dy));
    this._setMatrix(transform);
    this._transform = transform;
  }

  /** Replaces the translation entries of the transform. */
  setTranslate(x: number, y: number): void {
    const m = this._transform.getMatrix() as [number, number, number, number, number, number];
    m[4] = x;
    m[5] = y;
    this._canvasContext.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
    this._transform = new Transform(m[0], m[1], m[2], m[3], m[4], m[5]);
  }

  /** Sets a copy of the transform as the fill transform. */
  setFillTransform(transform: Transform): void {
    this._fillTransform = Transform.deserialize(Transform.serialize(transform));
  }

  appendFillTransform(transform: Transform): void {
    this._fillTransform = this._fillTransform.multiplied(transform);
  }

  prependFillTransform(transform: Transform): void {
    this._fillTransform = this._fillTransform.preMultiplied(transform);
  }

  getFillTransform(): Transform {
    return this._fillTransform;
  }

  getTransform(): Transform {
    return this._transform;
  }

  clearRect(x: number, y: number, width: number, height: number): void {
    this._canvasContext.clearRect(x, y, width, height);
  }
}

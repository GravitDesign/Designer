// Old: chunk.vendor.js module 1466 (the SVG text core and its render context).
//
// A text exports through a copy of its GTL core whose drawing context
// collects words instead of painting glyphs: drawText makes an SvgTextWord
// per run (per glyph on a text path, with the glyph's transform) and
// drawMarker keeps list markers as path data. renderSVG then writes the
// words as <text> elements, clipped to the text box, and the markers as
// paths.
import { Color } from "../../../engine/color/color.ts";
import { extend } from "../../../engine/core/util.ts";
import { VertexInfo } from "../../../engine/geometry/vertex-info.ts";
import type { VertexReader } from "../../../engine/geometry/vertex-source.ts";
import { VertexTransformer } from "../../../engine/geometry/vertex-transformer.ts";
import type { Rect } from "../../../engine/math/rect.ts";
import { Transform } from "../../../engine/math/transform.ts";
import { Gradient } from "../../../engine/style/gradient.ts";
import { LinearGradient } from "../../../engine/style/linear-gradient.ts";
import { RadialGradient } from "../../../engine/style/radial-gradient.ts";
import type { PaintLayers } from "../../../engine/style/paint-layers.ts";
import type { Font, PositionedGlyph } from "../../../engine/text/fonts/font.ts";
import { RenderFlags } from "../../../engine/text/gtl/render-flags.ts";
import { RunDraw } from "../../../engine/text/gtl/run-draw.ts";
import { TLCore } from "../../../engine/text/gtl/tl-core.ts";
import { TLUtil } from "../../../engine/text/gtl/tl-util.ts";
import type { GlyphPlacement, TextTransformer } from "../../../engine/text/gtl/transformer-util.ts";
import { TLCanvasContext } from "../../../engine/text/tl-canvas-context.ts";
import { TLPathTextTransformer } from "../../../engine/text/tl-path-text-transformer.ts";
import type { Text } from "../../../engine/text/text.ts";
import { formatNumberDetached, numberFormat } from "./number-format.ts";
import type { SvgElement } from "./svg-dom.ts";
import { createSvgLinearGradient, createSvgRadialGradient } from "./svg-gradients.ts";
import type { SvgExportOptions, SvgRenderContext } from "./svg-images.ts";
import { SvgMasks } from "./svg-masks.ts";
import { SvgText, SvgTextWord, type FontReference } from "./svg-text-attributes.ts";
import { SvgUtil } from "./svg-util.ts";

/** The text node as the render context reads it. */
type TextNode = Text;

/** A collected list marker: its outline as path data and how it paints. */
interface Marker {
  path: string;
  pattern: unknown;
  mode: number;
}

function borderLayers(node: TextNode) {
  return (node.getPaintLayers() as PaintLayers).getBorderLayers(true);
}

/** The text's GTL core, copied, with an SvgTLRender as its drawing context. */
export class SvgTLCore extends TLCore {
  _options: SvgExportOptions;
  declare _ctx: SvgTLRender;

  constructor(text: TextNode, options?: SvgExportOptions | null) {
    super();
    // The text's core is copied field by field (the old jQuery.extend):
    // layout, document and canvases are shared with the text.
    extend(this, text.getTLCore());
    this._options = options || {};
    this._ctx = new SvgTLRender(this, this._canvas as HTMLCanvasElement, text, options);
  }

  /** Starts a new collected text for every render. */
  override render(
    focused: boolean | undefined,
    scale: number | undefined,
    style: Parameters<TLCore["render"]>[2],
    flags: number,
  ): void {
    this._ctx._text = null;
    super.render(focused, scale, style, flags);
  }

  /**
   * Writes the collected words (clipped to the text's box when it has one)
   * and the list markers into the current element.
   */
  renderSVG(context: SvgRenderContext): void {
    let clipPath: SvgElement | null = null;
    const box = this._ctx._node.getSourceBBox() as Rect | null;
    if (box) {
      const rect = context.createSvgElement("rect");
      rect.setAttribute("x", numberFormat.formatNumber(0));
      rect.setAttribute("y", numberFormat.formatNumber(0));
      rect.setAttribute("width", numberFormat.formatNumber(box.getWidth()));
      rect.setAttribute("height", numberFormat.formatNumber(box.getHeight()));
      rect.setAttribute(
        "transform",
        "matrix(" +
          numberFormat
            .formatMatrix((this._ctx._transformOrigin as Transform).getMatrix())
            .join(",") +
          ")",
      );
      clipPath = SvgMasks.createMaskDefinitionFromShape(context.svgDoc, rect, false);
    }
    let defs: SvgElement | undefined;
    while (this._ctx._texts.length) {
      const text = this._ctx._texts.shift() as SvgText;
      if (clipPath) {
        const group = context.createSvgElement("g");
        const parent = context.peek();
        parent.appendChild(group);
        context.push(group);
        defs = context.createSvgElement("defs");
        defs.appendChild(clipPath);
        parent.appendChild(defs);
        group.setAttribute("clip-path", "url(#" + clipPath.getAttribute("id") + ")");
        text.renderSVG(context, this._options);
        context.pop();
      } else text.renderSVG(context, this._options);
    }
    const parent = context.peek();
    while (this._ctx._markers.length) {
      const marker = this._ctx._markers.shift() as Marker;
      let pattern = marker.pattern;
      const mode = marker.mode;
      const path = marker.path;
      if (pattern instanceof Gradient) {
        let gradient: SvgElement | undefined;
        if (pattern instanceof LinearGradient)
          gradient = createSvgLinearGradient(context, context.svgDoc, pattern);
        else if (pattern instanceof RadialGradient) {
          gradient = createSvgRadialGradient(context, context.svgDoc, pattern);
        }
        if (!gradient) continue;
        if (!defs) {
          defs = context.createSvgElement("defs");
          parent.appendChild(defs);
        }
        defs.appendChild(gradient);
        pattern = SvgUtil.createIdUrl(gradient.getAttribute("id"));
      }
      // A font color marker gets the CSS color like the text's words; the
      // old code wrote "[Object GRGBColor]" (BUGS-FIXED.md "BUG-085 Texts
      // colored by their font color export as fill:[Object GRGBColor]").
      if (pattern instanceof Color) pattern = Color.rgbToHtmlHex(pattern.toScreen());
      const element = context.createSvgElement("path");
      element.setAttribute("d", path);
      if (mode !== SvgText.Mode.STROKE) {
        element.setAttribute("fill", pattern);
        element.setAttribute("stroke", "none");
      } else {
        element.setAttribute("stroke", pattern);
        element.setAttribute("fill", "none");
      }
      context.peek().appendChild(element);
    }
  }
}

/** The drawing context of SvgTLCore: collects words and markers. */
export class SvgTLRender extends TLCanvasContext {
  _node: TextNode;
  _text: SvgText | null;
  _texts: SvgText[];
  _markers: Marker[];
  _fullFFName = false;
  _transformOrigin: Transform | null = null;

  constructor(
    core: SvgTLCore,
    canvas: HTMLCanvasElement,
    node: TextNode,
    options?: SvgExportOptions | null,
  ) {
    super(core as never, canvas);
    this._node = node;
    this._text = null;
    this._texts = [];
    this._markers = [];
    if (options && options.fullFFName) this._fullFFName = true;
  }

  /** Which of fill and stroke the node paints: -1 none, then SvgText.Mode. */
  private _paintMode(): number {
    let flags = 0;
    if (this._node.hasStyleBorder()) flags |= 1 << SvgText.Mode.STROKE;
    if (this._node.hasStyleFill() || "transparent" !== this.fillStyle)
      flags |= 1 << SvgText.Mode.FILL;
    return flags - 1;
  }

  private _fillPaint(): unknown {
    return (
      this._textFillStyle || ("transparent" === this.fillStyle ? this.defaultFill : this.fillStyle)
    );
  }

  private _strokePaint(): unknown {
    let paint: unknown = (borderLayers(this._node)[0] as { $_pt: unknown }).$_pt;
    if (paint instanceof Color) {
      paint = paint.toScreenCSS((borderLayers(this._node)[0] as { $_op: number }).$_op);
    }
    return paint;
  }

  /** A list marker (bullet or number outline) at (x, y). */
  override drawMarker(source: VertexReader, x: number, y: number): void {
    if (this._renderMode & RenderFlags.RENDERFLAG_STROKE) return;
    const mode = this._paintMode();
    if (mode < 0) return;
    let pattern: unknown;
    const objectTransform = this._node.$trf || new Transform();
    const transform = new Transform(1, 0, 0, 1, x, y).multiplied(objectTransform);
    source = new VertexTransformer(source, transform);
    if (this._textTransformer) {
      VertexInfo.calculateBounds(source, true);
      // The old code passed an undeclared `pt` here.
      throw new ReferenceError("pt is not defined");
    }
    if (mode !== SvgText.Mode.STROKE) pattern = this._fillPaint();
    if (mode >= SvgText.Mode.STROKE) pattern = this._strokePaint();
    const path = (source as VertexTransformer).toSVGPath(formatNumberDetached);
    this._markers.push({ path, pattern, mode });
  }

  /**
   * A run of text at (x, y): one word with the run's style, or on a text
   * path one word per glyph placed by the path transformer.
   */
  override drawText(text: string, x: number, y: number): void {
    if (this._renderMode & RenderFlags.RENDERFLAG_STROKE || text === RunDraw.NBSP) return;
    const mode = this._paintMode();
    if (mode < 0) return;
    let origin: Transform | undefined;
    const matrix = this._transform.getMatrix();
    let wordOrigin = this._transform
      .scaled(1 / (matrix[0] as number), 1 / (matrix[3] as number))
      .translated(x, y);
    const objectTransform = this._node.$trf || new Transform();
    let fill: unknown = null;
    let stroke: unknown = null;
    if (mode !== SvgText.Mode.STROKE) fill = this._fillPaint();
    if (mode >= SvgText.Mode.STROKE) stroke = this._strokePaint();
    if (!this._text) {
      this._text = new SvgText(this._node as never);
      this._texts.push(this._text);
    }
    const font = this.getCurrentFont() as Font & {
      _openTypeFont?: { names?: { fontFamily?: { en?: string } } };
    };
    const reference = TLUtil.parseFont(this.font) as unknown as FontReference;
    if (
      this._fullFFName &&
      font._openTypeFont &&
      font._openTypeFont.names &&
      font._openTypeFont.names.fontFamily &&
      font._openTypeFont.names.fontFamily.en
    ) {
      reference.fontFamily = font._openTypeFont.names.fontFamily.en;
    }
    const fontSize = reference.fontSize as number;
    const pathTransformer = (
      this._core as unknown as { getTransformer(type: string): TextTransformer | null }
    ).getTransformer(TLPathTextTransformer.TYPE);
    if (pathTransformer) {
      const options: {
        letterSpacing: number;
        kerning: boolean;
        direction: string;
        features: Record<string, unknown>;
        language: unknown;
        generateText: boolean;
        script?: string;
        variant?: string;
      } = {
        letterSpacing: this.charSpacing,
        kerning: true,
        direction: "ltr",
        features: {
          liga: this.textLigatures,
          rlig: this.textLigatures,
          frac: this.textFractions,
          stylisticSet: this.textStylisticSet,
        },
        language: this.textLocalizedForm,
        generateText: true,
      };
      const placement: GlyphPlacement = {};
      if (this.langScript && "auto" !== this.langScript) options.script = this.langScript;
      if (this.textVariant) options.variant = this.textVariant;
      const glyphs = font.stringToGlyphs(text, x, y, fontSize, options as never);
      const count = glyphs.length - 1;
      for (let index = 0; index < count; index++) {
        const glyph = glyphs[index] as PositionedGlyph & { text?: string };
        let outline: VertexReader | null =
          (glyph.glyph as { unicode?: number }).unicode === RunDraw.NBSP.charCodeAt(0)
            ? null
            : font.getGlyphOutline(fontSize, glyph.x, glyph.y, glyph.glyph);
        if (outline) {
          const bounds = font.getGlyphBoundingRect(fontSize, glyph.glyph, true);
          placement.next = (glyphs[index + 1] as PositionedGlyph).x - glyph.x;
          placement.prev =
            index > 0 ? glyph.x - (glyphs[index - 1] as PositionedGlyph).x : glyph.x - x;
          placement.unicode = (glyph.glyph as { unicode?: number }).unicode;
          outline = pathTransformer.transform(outline, glyph.x, glyph.y, bounds, placement);
          if (outline) {
            const placed = outline as unknown as {
              _source: { _transform: Transform };
              _transform: Transform;
            };
            wordOrigin = (
              placed._source._transform.decomposed() as NonNullable<
                ReturnType<Transform["decomposed"]>
              >
            ).translate.multiplied(placed._transform);
            this._putWord(mode, glyph.text as string, wordOrigin, fill, stroke, reference);
          }
        }
      }
      const boxOrigin = pathTransformer.getBoxOrigin();
      if (boxOrigin)
        origin = new Transform()
          .translated(boxOrigin.getX(), boxOrigin.getY())
          .multiplied(objectTransform);
    } else {
      this._putWord(mode, text, wordOrigin, fill, stroke, reference);
      origin = objectTransform;
    }
    (this._text as SvgText).setOrigin(origin);
    this._transformOrigin = origin ?? null;
  }

  /** Adds a word; whitespace only is appended to the current word instead. */
  _putWord(
    mode: number,
    text: string,
    origin: Transform,
    fill: unknown,
    stroke: unknown,
    reference: FontReference,
  ): void {
    let lineWidth: number | undefined;
    const border = borderLayers(this._node)[0];
    if (border) lineWidth = border.$_bw;
    const word = new SvgTextWord({
      text,
      mode,
      align: this._node.getProperty("_pal"),
      origin,
      charSpacing: this.charSpacing,
      wordSpacing: Math.max(this.wordSpacing || 0, 0),
      fillColor: fill,
      strokeColor: stroke,
      lineWidth,
      fontReference: reference,
      textUnderline: this.textUnderline,
      textStrikeout: this.textStrikeout,
      textLigatures: this.textLigatures,
      textFractions: this.textFractions,
      textStylisticSet: this.textStylisticSet,
      textLocalizedForm: this.textLocalizedForm,
    });
    const current = (this._text as SvgText).getCurrentWord();
    if (text.trim().length) (this._text as SvgText).add(word);
    else if (current) current.append(word);
  }
}

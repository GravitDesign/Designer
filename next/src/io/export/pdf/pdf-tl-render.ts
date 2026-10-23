// Old: chunk.vendor.js module 1446 (GPDFTLCore and GPDFTLRender, text as PDF text).
import { Vertex } from "../../../engine/geometry/vertex.ts";
import { VertexInfo } from "../../../engine/geometry/vertex-info.ts";
import type { VertexReader } from "../../../engine/geometry/vertex-source.ts";
import { VertexTransformer } from "../../../engine/geometry/vertex-transformer.ts";
import { Point } from "../../../engine/math/point.ts";
import type { Rect } from "../../../engine/math/rect.ts";
import { Transform } from "../../../engine/math/transform.ts";
import type { Font } from "../../../engine/text/fonts/font.ts";
import { RenderFlags } from "../../../engine/text/gtl/render-flags.ts";
import { RunDraw } from "../../../engine/text/gtl/run-draw.ts";
import { TLCore, type TLRenderStyle } from "../../../engine/text/gtl/tl-core.ts";
import { TLUtil } from "../../../engine/text/gtl/tl-util.ts";
import { TLCanvasContext, type TLCanvasCore } from "../../../engine/text/tl-canvas-context.ts";
import { TLPathTextTransformer } from "../../../engine/text/tl-path-text-transformer.ts";
import type { Text } from "../../../engine/text/text.ts";
import { PDFGraphics } from "./content-stream.ts";
import { PDFFillPaint } from "./fill-pattern.ts";
import { PDFFontSelection } from "./font-key.ts";
import { PDFConcatMatrix } from "./op-cm.ts";
import { PDFClipPath } from "./path-holder.ts";
import { PDFPath } from "./path-writer.ts";
import type { PDFDocument } from "./pdf-document.ts";
import type { PDFPaintContext } from "./pdf-paint-context.ts";
import type { PDFObject } from "./pdf-object.ts";
import { PDFRectangle } from "./rect-op.ts";
import { PDFStrokePaint } from "./stroke-pattern.ts";
import { PDFText, PDFTextWord, type PDFTextEncodeOptions } from "./text-writer.ts";
import { transformFields } from "./transform-fields.ts";

/** The text node calls the renderer makes. */
interface TextNode {
  $trf: Transform | null;
  hasStyleBorder(): boolean;
  hasStyleFill(): boolean;
  getGeometryBBox(): Rect;
  getSourceBBox(): Rect | null;
  getPatternBBox(): Rect | null;
  getProperty(name: string): unknown;
  getPaintLayers(): { getBorderLayers(visible: boolean): { $_pt: unknown; $_bw: number }[] };
  createShapePaint(context: unknown, pattern: unknown, box: Rect | null): { paint: unknown };
}

/** The font calls of the renderer (an OpenTypeFont). */
interface RenderFont extends Font {
  getStrikeoutWidth(fontSize: number): number;
  getStrikeoutPosition(
    baseline: number,
    xHeight: number,
    lineWidth: number,
    fontSize: number,
  ): number;
}

/** A glyph outline after the path transformer: the glyph outline moved, then mapped. */
interface TransformedOutline {
  _source: { _transform: Transform };
  _transform: Transform;
}

function textNode(node: Text): TextNode {
  return node as unknown as TextNode;
}

const NBSP = RunDraw.NBSP;

/** The text render modes (PDFText.Mode). */
const Mode = PDFText.Mode;

/**
 * Renders a text's runs as PDF text: each run becomes words in one text
 * object (BT ... ET) placed with the text's transform and clipped to its
 * box, in the document's fonts. Text on a path places each glyph with its
 * own matrix. List markers are drawn as filled or stroked paths.
 */
export class PDFTLRender extends TLCanvasContext {
  _pdfDoc: PDFDocument;
  _node: Text;
  _context: PDFPaintContext;
  _text: PDFText | null;
  _graphics: PDFGraphics | null = null;
  _fillColor: PDFFillPaint | null = null;
  _strokeColor: PDFStrokePaint | null = null;

  constructor(
    core: PDFTLCore,
    canvas: HTMLCanvasElement,
    context: PDFPaintContext,
    document: PDFDocument,
    node: Text,
  ) {
    super(core as unknown as TLCanvasCore, canvas);
    this._pdfDoc = document;
    this._node = node;
    this._context = context;
    this._text = null;
  }

  /** The outline as a PDF path (the old override of `_putVertices`, whose callers this class replaces). */
  _putPDFVertices(source: VertexReader): PDFPath {
    const path = new PDFPath(this._pdfDoc);
    if (source.rewindVertices(0)) {
      const vertex = new Vertex();
      while (source.readVertex(vertex)) {
        switch (vertex.command) {
          case Vertex.Command.Move:
            path.moveTo(vertex.x, vertex.y);
            break;
          case Vertex.Command.Line:
            path.lineTo(vertex.x, vertex.y);
            break;
          case Vertex.Command.Curve: {
            const x = vertex.x;
            const y = vertex.y;
            if (source.readVertex(vertex)) path.quadraticCurveTo(vertex.x, vertex.y, x, y);
            break;
          }
          case Vertex.Command.Curve2: {
            const x = vertex.x;
            const y = vertex.y;
            if (source.readVertex(vertex)) {
              const cx = vertex.x;
              const cy = vertex.y;
              if (source.readVertex(vertex)) path.bezierCurveTo(cx, cy, vertex.x, vertex.y, x, y);
            }
            break;
          }
          case Vertex.Command.Close:
            path.close();
            break;
          default:
            throw new Error("Unknown Command Type - " + vertex.command);
        }
      }
    }
    return path;
  }

  /** The render mode from the node's styles: -1 none, else FILL, STROKE or BOTH. */
  _textMode(): number {
    let mode = 0;
    const node = textNode(this._node);
    if (node.hasStyleBorder()) mode |= 1 << Mode.STROKE;
    if (node.hasStyleFill() || "transparent" !== this.fillStyle) mode |= 1 << Mode.FILL;
    return mode - 1;
  }

  /** The node transform without scale: skew, rotation and the box size, then the translation. */
  _paintTransform(transform: Transform): Transform {
    const parts = transform.decomposed() as NonNullable<ReturnType<Transform["decomposed"]>>;
    const box = textNode(this._node).getGeometryBBox();
    const fields = transformFields(transform);
    return parts.skew
      .multiplied(parts.rotate)
      .multiplied(new Transform(box.getWidth(), 0, 0, box.getHeight(), 0, 0))
      .translated(fields._tx, fields._ty);
  }

  override drawMarker(source: VertexReader, x: number, y: number): void {
    if (this._renderMode & RenderFlags.RENDERFLAG_STROKE) return;
    const mode = this._textMode();
    if (mode < 0) return;
    const node = textNode(this._node);
    const transform = node.$trf || new Transform();
    const position = transform.mapPoint(new Point(x, y));
    source = new VertexTransformer(
      source,
      new Transform(1, 0, 0, 1, position.getX(), position.getY()),
    );
    if (this._textTransformer) {
      const bounds = VertexInfo.calculateBounds(source, true);
      source = this._textTransformer.transform(
        source,
        position.getX(),
        position.getY(),
        bounds as Rect,
      );
    }
    const path = this._putPDFVertices(source);
    const graphics = new PDFGraphics(this._pdfDoc);
    (this._pdfDoc.getCurrentGraphics() as PDFGraphics).add(graphics);
    let paint: PDFObject | undefined;
    const paintTransform = this._paintTransform(transform);
    if (mode !== Mode.STROKE) {
      const color =
        this._textFillStyle ||
        ("transparent" === this.fillStyle ? this.defaultFill : this.fillStyle);
      paint = new PDFFillPaint({ doc: this._pdfDoc, transform: paintTransform, color });
    }
    if (mode >= Mode.STROKE) {
      const shapePaint = node.createShapePaint(
        this._context,
        (node.getPaintLayers().getBorderLayers(true)[0] as { $_pt: unknown }).$_pt,
        node.getPatternBBox(),
      );
      paint = new PDFStrokePaint({
        doc: this._pdfDoc,
        transform: paintTransform,
        color: shapePaint.paint,
      });
    }
    graphics.add(path);
    graphics.add(paint);
    if (mode !== Mode.STROKE) graphics.fill();
    else graphics.stroke();
  }

  override drawText(text: string, x: number, y: number, ascent: number, width: number): void {
    let first = false;
    if (this._renderMode & RenderFlags.RENDERFLAG_STROKE || text === NBSP) return;
    const mode = this._textMode();
    if (mode < 0) return;
    const ownFields = transformFields(this._transform);
    let origin = this._transform.scaled(1 / ownFields._sx, 1 / ownFields._sy).translated(x, y);
    origin = origin.translated(0, 2 * -transformFields(origin)._ty);
    let textTransform: Transform;
    const node = textNode(this._node);
    const nodeTransform = node.$trf || new Transform();
    const paintTransform = this._paintTransform(nodeTransform);
    let fillColor: PDFFillPaint | null = null;
    if (mode !== Mode.STROKE) {
      const color =
        this._textFillStyle ||
        ("transparent" === this.fillStyle ? this.defaultFill : this.fillStyle);
      const paint = new PDFFillPaint({ doc: this._pdfDoc, transform: paintTransform, color });
      if (!(this._fillColor && this._fillColor.equals(paint))) this._fillColor = paint;
      fillColor = this._fillColor;
    } else this._fillColor = null;
    if (mode >= Mode.STROKE) {
      if (!this._strokeColor) {
        const shapePaint = node.createShapePaint(
          this._context,
          (node.getPaintLayers().getBorderLayers(true)[0] as { $_pt: unknown }).$_pt,
          node.getPatternBBox(),
        );
        this._strokeColor = new PDFStrokePaint({
          doc: this._pdfDoc,
          transform: paintTransform,
          color: shapePaint.paint,
        });
      }
    } else this._strokeColor = null;
    if (!this._text) {
      first = true;
      this._text = new PDFText(this._pdfDoc);
      this._graphics = new PDFGraphics(this._pdfDoc);
      (this._pdfDoc.getCurrentGraphics() as PDFGraphics).add(this._graphics);
    }
    const fontResource = this._pdfDoc.body.getFontResource(this.getCurrentFont());
    const fontSize = TLUtil.parseFont(this.font).fontSize;
    const fontSelection = new PDFFontSelection(fontResource, fontSize);
    const pathTransformer = (this._core as unknown as PDFTLCore).getTransformer(
      TLPathTextTransformer.TYPE,
    );
    let script: string | undefined;
    let language: string | undefined;
    if (this.langScript && "auto" !== this.langScript) script = this.langScript;
    if (this.textLocalizedForm) language = this.textLocalizedForm;
    let font: RenderFont | null = null;
    if (pathTransformer) {
      font = this.getCurrentFont() as RenderFont;
      const options: PDFTextEncodeOptions & { script?: string; language?: string } = {
        letterSpacing: this.charSpacing,
        kerning: true,
        direction: "ltr",
        features: {
          liga: this.textLigatures,
          rlig: this.textLigatures,
          frac: this.textFractions,
          stylisticSet: this.textStylisticSet,
        },
        script,
        language,
        generateText: true,
      } as PDFTextEncodeOptions;
      const placement: { next?: number; prev?: number; unicode?: number } = {};
      if (this.langScript && "auto" !== this.langScript) options.script = this.langScript;
      if (this.textVariant) options.variant = this.textVariant;
      const glyphs = font.stringToGlyphs(
        text,
        x,
        y,
        fontSize,
        options as unknown as Parameters<Font["stringToGlyphs"]>[4],
      ) as unknown as { x: number; y: number; text: string; glyph: { unicode?: number } }[];
      const count = glyphs.length - 1;
      for (let i = 0; i < count; i++) {
        const placed = glyphs[i] as (typeof glyphs)[number];
        let outline: VertexReader | null =
          placed.glyph.unicode === NBSP.charCodeAt(0)
            ? null
            : font.getGlyphOutline(fontSize, placed.x, placed.y, placed.glyph);
        if (!outline) continue;
        const bounds = font.getGlyphBoundingRect(fontSize, placed.glyph, true);
        placement.next = (glyphs[i + 1] as (typeof glyphs)[number]).x - placed.x;
        placement.prev =
          i > 0 ? placed.x - (glyphs[i - 1] as (typeof glyphs)[number]).x : placed.x - x;
        placement.unicode = placed.glyph.unicode;
        outline = pathTransformer.transform(
          outline,
          placed.x,
          placed.y,
          bounds,
          placement as never,
        );
        if (outline) {
          const mapped = outline as unknown as TransformedOutline;
          const glyphOrigin = (
            mapped._source._transform.decomposed() as NonNullable<
              ReturnType<Transform["decomposed"]>
            >
          ).translate.multiplied(mapped._transform);
          origin = glyphOrigin.translated(0, 2 * -transformFields(glyphOrigin)._ty);
          const fields = transformFields(origin);
          fields._shx = -fields._shx;
          fields._shy = -fields._shy;
          this._putWord(mode, placed.text, origin, fillColor, fontSelection);
        }
      }
      const renderBounds = (this._core as unknown as PDFTLCore).getRenderBounds() as Rect;
      textTransform = new Transform()
        .translated(-renderBounds.getX(), -renderBounds.getY())
        .multiplied(nodeTransform);
      const fields = transformFields(textTransform);
      fields._shx = -fields._shx;
      fields._shy = -fields._shy;
      fields._ty = this._pdfDoc.relativeY(fields._ty);
    } else {
      this._putWord(mode, text, origin, fillColor, fontSelection);
      const position = nodeTransform.mapPoint(new Point(0, 0));
      textTransform = nodeTransform
        .translated(-position.getX(), -position.getY())
        .translated(position.getX(), this._pdfDoc.relativeY(position.getY()));
      const fields = transformFields(textTransform);
      fields._shx = -fields._shx;
      fields._shy = -fields._shy;
    }
    const graphics = this._graphics as PDFGraphics;
    if (first) {
      graphics.add(new PDFConcatMatrix(textTransform));
      const box = node.getSourceBBox();
      if (box && !pathTransformer) {
        graphics.add(
          new PDFClipPath(new PDFRectangle(0, -box.getHeight(), box.getWidth(), box.getHeight())),
        );
      }
      graphics.add(this._text);
    }
    const decorations = new PDFGraphics(this._pdfDoc);
    graphics.add(decorations);
    let lineWidth = 0;
    const position = origin.mapPoint(new Point(0, 0));
    if (this.textUnderline || this.textStrikeout) {
      lineWidth = (font = this.getCurrentFont() as RenderFont).getStrikeoutWidth(fontSize);
    }
    if (this.textUnderline) {
      const line = new PDFRectangle(
        position.getX(),
        position.getY() - 2 * lineWidth,
        width,
        lineWidth,
      );
      if (mode !== Mode.STROKE) {
        decorations.add(line);
        decorations.fill();
      }
      if (mode >= Mode.STROKE) {
        decorations.add(line);
        decorations.stroke();
      }
    }
    if (this.textStrikeout) {
      const top = -(font as RenderFont).getStrikeoutPosition(
        -position.getY(),
        ascent,
        lineWidth,
        fontSize,
      );
      const line = new PDFRectangle(position.getX(), top, width, lineWidth);
      if (mode !== Mode.STROKE) {
        decorations.add(line);
        decorations.fill();
      }
      if (mode >= Mode.STROKE) {
        decorations.add(line);
        decorations.stroke();
      }
    }
  }

  /** Adds a word; a word of only spaces is appended to the word before. */
  _putWord(
    mode: number,
    text: string,
    origin: Transform,
    fillColor: PDFFillPaint | null,
    fontSelection: PDFFontSelection,
  ): void {
    let lineWidth: number | undefined;
    const border = textNode(this._node).getPaintLayers().getBorderLayers(true)[0];
    if (border) lineWidth = border.$_bw;
    let script: string | undefined;
    let language: string | undefined;
    if (this.langScript && "auto" !== this.langScript) script = this.langScript;
    if (this.textLocalizedForm) language = this.textLocalizedForm;
    const spacing = "number" == typeof this.charSpacing ? this.charSpacing : 0;
    const word = new PDFTextWord({
      text,
      textEncoded: fontSelection.getFont().encode(text, {
        letterSpacing: spacing,
        kerning: true,
        features: {
          liga: this.textLigatures,
          rlig: this.textLigatures,
          frac: this.textFractions,
          stylisticSet: this.textStylisticSet,
        },
        script,
        language,
      } as PDFTextEncodeOptions),
      mode,
      align: textNode(this._node).getProperty("_pal"),
      origin,
      charSpacing: spacing,
      wordSpacing: Math.max(this.wordSpacing || 0, 0),
      fillColor,
      strokeColor: this._strokeColor,
      lineWidth,
      fontReference: fontSelection,
      script,
      textLigatures: this.textLigatures,
      textFractions: this.textFractions,
      textStylisticSet: this.textStylisticSet,
      textLocalizedForm: this.textLocalizedForm,
    });
    const current = (this._text as PDFText).getCurrentWord();
    if (text.trim().length) (this._text as PDFText).add(word);
    else if (current) current.append(word);
  }
}

/**
 * The text core used while a text is exported: a copy of the text's own
 * core (its fields copied over, as the old code did) that draws with a
 * PDFTLRender.
 */
export class PDFTLCore extends TLCore {
  _pdfDoc: PDFDocument;

  constructor(context: PDFPaintContext, document: PDFDocument, node: Text) {
    super();
    this._pdfDoc = document;
    Object.assign(this, ownEnumerable(node.getTLCore() as TLCore));
    this._ctx = new PDFTLRender(
      this,
      this._canvas as HTMLCanvasElement,
      context,
      this._pdfDoc,
      node,
    ) as unknown as TLCore["_ctx"];
  }

  override render(
    focused: boolean | undefined,
    scale: number | undefined,
    style: TLRenderStyle,
    flags: number,
  ): void {
    (this._ctx as unknown as PDFTLRender)._text = null;
    super.render(focused, scale, style, flags);
  }
}

/** The own enumerable fields of an object, as GUtil.extend copied them. */
function ownEnumerable(source: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      out[key] = (source as Record<string, unknown>)[key];
    }
  }
  return out;
}

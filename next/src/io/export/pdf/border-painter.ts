// Old: chunk.vendor.js module 1453 (the PDF border painter).
import type { VertexReader } from "../../../engine/geometry/vertex-source.ts";
import type { Rect } from "../../../engine/math/rect.ts";
import type { Transform } from "../../../engine/math/transform.ts";
import { Canvas2DPaintCanvas, type PaintStyle } from "../../../engine/paint/paint-canvas.ts";
import { Path } from "../../../engine/scene/path.ts";
import { BorderAlignment } from "../../../engine/style/stylable-sets.ts";
import { ColorSpaces } from "./color-spaces.ts";
import { PDFFill, PDFStroke } from "./content-stream.ts";
import { PDFFillPaint } from "./fill-pattern.ts";
import { PDFObjectCollection } from "./object-collection.ts";
import { PDFClipPath } from "./path-holder.ts";
import type { PDFPaintContext } from "./pdf-paint-context.ts";
import type { PDFObject } from "./pdf-object.ts";
import { PDFStrokePaint } from "./stroke-pattern.ts";

/** The border layer fields the painter reads. */
export interface BorderLayer {
  $_pt: unknown;
  $_bw: number;
  $_ba: string;
  $_bds: number[];
  $_blc: string;
  $_blj: string;
  $_op: number;
  $_bl: string;
  $_px: Transform | null;
  $_bhmo: boolean;
  $_btmo: boolean;
}

/** A border paint as the shape makes it. */
interface ShapePaint {
  paint: unknown;
  transform?: Transform | null;
}

/** The shape calls the painter makes. */
export interface BorderShape {
  $trf: Transform | null;
  hasStyleBorder(): boolean;
  makeSharp(context: unknown, canvas: unknown, source: unknown): VertexReader;
  getPatternBBox(includeInvisible?: boolean): Rect | null;
  createShapePaint(
    context: unknown,
    pattern: unknown,
    box: Rect | null,
  ): ShapePaint | null | undefined;
  getHeadMarkerVertices(border: BorderLayer): VertexReader | null;
  getTailMarkerVertices(border: BorderLayer): VertexReader | null;
  calculateMitterLimit(border: BorderLayer): number;
}

/**
 * Paints a border that isn't centered: stroked at double width, then
 * clipped to the shape (inside) or masked out of it (outside) with PDF
 * clip paths and soft masks instead of canvas compositing.
 */
export class PDFBorderPainter {
  declare _shape: BorderShape | null;

  constructor(shape: BorderShape) {
    this._shape = shape;
  }

  /**
   * With `sharp` the shape's sharp outline is stroked. Without it the old
   * code passed the painter itself as the outline, which isn't a vertex
   * source, so this throws a TypeError as it did.
   */
  paint(
    context: PDFPaintContext,
    sharp: boolean,
    withMarkers: boolean,
    _withOpacity: boolean,
    border: BorderLayer,
  ): void {
    const shape = this._shape as BorderShape;
    if (!shape.hasStyleBorder()) return;
    const canvas = context.canvas;
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- the old code passed the painter itself (see above)
    let source: unknown = this;
    if (sharp) source = shape.makeSharp(context, canvas, shape);
    let box = shape.getPatternBBox(context.isIncludingInvisible());
    if (box && border.$_ba !== BorderAlignment.Inside) {
      let reach = border.$_bw;
      if (border.$_ba === BorderAlignment.Center) reach *= 0.5;
      if (shape.$trf) reach /= shape.$trf.getScaleFactor();
      box = box.expanded(reach, reach, reach, reach);
    }
    const paint = shape.createShapePaint(context, border.$_pt, box);
    if (paint && paint.paint && void 0 !== canvas.putVertices(source as VertexReader)) {
      this._stroke(context, border, paint);
      if (border.$_ba === BorderAlignment.Inside) this._makeInsideBorder(context);
      else if (border.$_ba === BorderAlignment.Outside) this._makeOutsideBorder(context);
      if (withMarkers) this._paintBorderMarkers(context, paint, border);
    }
  }

  _paintBorderMarkers(context: PDFPaintContext, paint: ShapePaint, border: BorderLayer): void {
    const shape = this._shape as BorderShape;
    const head = shape.getHeadMarkerVertices(border);
    const tail = shape.getTailMarkerVertices(border);
    if (head) this._paintBorderMarker(context, head, paint, border, border.$_bhmo);
    if (tail) this._paintBorderMarker(context, tail, paint, border, border.$_btmo);
  }

  _paintBorderMarker(
    context: PDFPaintContext,
    vertices: VertexReader,
    paint: ShapePaint,
    border: BorderLayer,
    outlined: boolean,
  ): void {
    const canvas = context.canvas;
    const closed = canvas.putVertices(vertices);
    const transform = this._getBorderTransform(border, paint);
    let previous: Transform | null = null;
    if (transform && transform.invertible()) {
      previous = canvas.setTransform(canvas.getTransform(true).multiplied(transform));
    }
    if (outlined || false === closed) canvas.strokeVertices(paint.paint as PaintStyle, border.$_bw);
    else canvas.fillVertices(paint.paint as PaintStyle);
    if (previous) canvas.setTransform(previous);
  }

  /** Clips the stroke to its path: `q path W n path stroke Q`. */
  _makeInsideBorder(context: PDFPaintContext): void {
    const canvas = context.canvas;
    const node = canvas.getCurrentNode();
    if (node instanceof Path && node.isLine()) return;
    const canvasContext = canvas.getContext();
    const graphics = canvasContext.getGraphics();
    const stroke = (graphics.pop() as NonNullable<ReturnType<typeof graphics.pop>>).getValue();
    const path = (graphics.pop() as NonNullable<ReturnType<typeof graphics.pop>>).getValue();
    const clipped = canvasContext.createGraphics();
    clipped.add(new PDFClipPath(path as PDFObject));
    clipped.add(path);
    clipped.add(stroke);
    graphics.add(clipped);
  }

  /**
   * Masks the inside out of the stroke: a soft mask that strokes the path
   * white and fills it black.
   */
  _makeOutsideBorder(context: PDFPaintContext): void {
    const canvas = context.canvas;
    const node = canvas.getCurrentNode();
    if (node instanceof Path && node.isLine()) return;
    const canvasContext = canvas.getContext();
    const graphics = canvasContext.getGraphics();
    const stroke = (graphics.pop() as NonNullable<ReturnType<typeof graphics.pop>>).getValue();
    const path = (graphics.pop() as NonNullable<ReturnType<typeof graphics.pop>>).getValue();
    const maskStroke = new PDFStroke();
    maskStroke.lineWidth = canvasContext.lineWidth;
    maskStroke.strokeStyle = new PDFStrokePaint({
      transform: canvasContext._transform,
      doc: canvasContext._doc,
      color: "rgba(0,0,0,1)",
      colorSpace: ColorSpaces.GRAY,
    });
    const maskFill = new PDFFill();
    maskFill.fillStyle = new PDFFillPaint({
      transform: canvasContext._transform,
      doc: canvasContext._doc,
      color: "rgba(0,0,0,0)",
      colorSpace: ColorSpaces.GRAY,
    });
    const mask = new PDFObjectCollection();
    mask.add(path);
    mask.add(maskStroke);
    mask.add(path);
    mask.add(maskFill);
    const masked = canvasContext.createGraphics();
    masked.setGStateResource(canvasContext.createSMaskGStateResource(mask));
    masked.add(path);
    masked.add(stroke);
    graphics.add(masked);
  }

  /**
   * Strokes at double width (the half outside or inside is cut later).
   * The old code compared the blend mode with the blend mode table, which
   * is never equal, so the layer's blend mode always goes through.
   */
  _stroke(context: PDFPaintContext, border: BorderLayer, paint: ShapePaint): void {
    let width = border.$_bw;
    if (border.$_ba !== BorderAlignment.Center) width *= 2;
    const miterLimit = (this._shape as BorderShape).calculateMitterLimit(border);
    const canvas = context.canvas;
    let previous: Transform | null = null;
    const transform = this._getBorderTransform(border, paint);
    if (transform && transform.invertible()) {
      previous = canvas.setTransform(canvas.getTransform(true).multiplied(transform));
    }
    canvas.strokeVertices(
      paint.paint as PaintStyle,
      width,
      border.$_bds,
      border.$_blc,
      border.$_blj,
      miterLimit,
      border.$_op,
      (border.$_bl as unknown) !== Canvas2DPaintCanvas.BlendMode ? border.$_bl : null,
    );
    if (previous) canvas.setTransform(previous);
  }

  _getBorderTransform(border: BorderLayer, paint: ShapePaint): Transform | null {
    let transform: Transform | null = null;
    if (paint.transform && paint.transform.isValid()) {
      transform = paint.transform;
      const shape = this._shape as BorderShape;
      if (shape.$trf) transform = transform.multiplied(shape.$trf);
      if (border.$_px && !border.$_px.isIdentity())
        transform = transform.preMultiplied(border.$_px);
    }
    return transform;
  }
}

PDFBorderPainter.prototype._shape = null;

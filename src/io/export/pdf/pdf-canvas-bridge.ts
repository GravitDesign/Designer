// Old: chunk.vendor.js module 1445 (the PDF paint canvas).
import { CMYKColor } from "../../../engine/color/cmyk-color.ts";
import type { Color } from "../../../engine/color/color.ts";
import { GObject } from "../../../engine/core/object.ts";
import { Point } from "../../../engine/math/point.ts";
import { Rect } from "../../../engine/math/rect.ts";
import { Transform } from "../../../engine/math/transform.ts";
import { Blender } from "../../../engine/paint/blender.ts";
import type { Context2D } from "../../../engine/paint/context-2d.ts";
import {
  Canvas2DPaintCanvas,
  type PaintCanvas,
  type PaintStyle,
} from "../../../engine/paint/paint-canvas.ts";
import type { Node } from "../../../engine/scene/node.ts";
import { ColorSpaces } from "./color-spaces.ts";
import { PDFGraphics } from "./content-stream.ts";
import { PDFClipPath } from "./path-holder.ts";
import { PDFPath } from "./path-writer.ts";
import { PDFCanvasContext } from "./pdf-canvas.ts";
import type { PDFDocument } from "./pdf-document.ts";
import type { PDFPaintContext } from "./pdf-paint-context.ts";

/**
 * The paint canvas of the PDF export: the engine paints into it as into
 * any canvas, and its context (PDFCanvasContext) writes PDF. Sub-canvases
 * (effects, blends, masks) get a graphics block of their own inside the
 * current one.
 *
 * The old constructor skipped GPaintCanvas's, which takes a canvas from
 * the renderer; `PDFPaintCanvas.create` does the same (only GObject's
 * constructor runs).
 */
export class PDFPaintCanvas extends Canvas2DPaintCanvas {
  declare _canvasContext: Context2D & PDFCanvasContext;
  declare _paintContext: PDFPaintContext;
  declare _parent: PDFPaintCanvas | undefined;
  declare _children: PDFPaintCanvas[] | undefined;
  declare _width: number;
  declare _height: number;
  // The context's `canvas` is this object, so these play the canvas
  // element's size (set by resize, undefined before).
  declare width: number;
  declare height: number;

  static create(context: PDFCanvasContext): PDFPaintCanvas {
    const canvas = Reflect.construct(GObject, [], PDFPaintCanvas) as PDFPaintCanvas;
    canvas._init(context);
    return canvas;
  }

  /** Use PDFPaintCanvas.create. */
  private constructor() {
    super();
  }

  _init(context: PDFCanvasContext): void {
    this._canvasContext = context as Context2D & PDFCanvasContext;
    context.canvas = this;
    this._width = 300;
    this._height = 150;
    this.prepare(null);
    this._blender = new Blender(this);
  }

  /** Filling a path with destination-in makes it the clip of the block. */
  override fillVertices(
    paint: PaintStyle,
    opacity?: number | null,
    compositeOperator?: string | null,
    evenOdd?: boolean,
  ): void {
    if (
      (compositeOperator || Canvas2DPaintCanvas.CompositeOperator.SourceOver) ===
        Canvas2DPaintCanvas.CompositeOperator.DestinationIn &&
      this.getGraphics().peek().getValue() instanceof PDFPath
    ) {
      const path = this.getGraphics().pop()?.getValue() as PDFPath;
      this._canvasContext.setClip(new PDFClipPath(path));
    }
    super.fillVertices(paint, opacity, compositeOperator, evenOdd);
  }

  override drawCanvas(
    canvas: PaintCanvas,
    x?: number,
    y?: number,
    opacity?: number | null,
    compositeOperator?: string | null,
  ): void {
    this._canvasContext.drawCanvas(canvas as PDFPaintCanvas, x, y, opacity, compositeOperator);
  }

  getCurrentNode(): Node {
    return this._paintContext.getCurrentNode();
  }

  getGraphics(): PDFGraphics {
    return this.getContext().getGraphics();
  }

  getDocument(): PDFDocument {
    return this.getContext().getDocument();
  }

  getContext(): PDFCanvasContext {
    return this._canvasContext;
  }

  /** A context for a sub-canvas, drawing into a new block inside this one. */
  _createContext(): PDFCanvasContext {
    const graphics = new PDFGraphics(this._canvasContext._doc);
    this._canvasContext._graphics.add(graphics);
    this._canvasContext._doc.pushGraphics(graphics);
    return new PDFCanvasContext(this._canvasContext._doc, graphics);
  }

  override createCanvas(extents: Rect, clipToAreas?: boolean): PDFPaintCanvas {
    const canvas = PDFPaintCanvas.create(this._createContext());
    canvas._paintContext = this._paintContext;
    canvas._parent = this;
    this._children = this._children || [];
    this._children.push(canvas);
    const paintExtents = this.getPaintExtents(extents);
    const x = paintExtents.getX();
    const y = paintExtents.getY();
    const finalExtents = this.getFinalExtents(paintExtents);
    canvas.resize(Math.ceil(finalExtents.getWidth()), Math.ceil(finalExtents.getHeight()));
    let areas: Rect[] | null = null;
    if (clipToAreas && this._areas) {
      areas = [];
      for (let i = 0; i < this._areas.length; ++i) {
        areas.push((this._areas[i] as Rect).translated(-x, -y));
      }
    }
    const topLeft = finalExtents.getSide(Rect.Side.TOP_LEFT);
    canvas.prepare(areas);
    canvas.setOrigin(new Point(0, 0));
    canvas.setOffset(topLeft);
    canvas.setScale(this._scale as number);
    return canvas;
  }

  /** CMYK colors stay CMYK in a CMYK document. */
  override _toScreenCSS(color: Color, opacity: number): string {
    return this._canvasContext._doc.getColorSpace() === ColorSpaces.CMYK &&
      color instanceof CMYKColor
      ? "cmyk(" + (color.getValue() as number[]).join(",") + "," + opacity + ")"
      : super._toScreenCSS(color, opacity);
  }

  /** Styles reach the context as they are (colors as engine colors). */
  override _convertStyle(style: PaintStyle): string | CanvasGradient | CanvasPattern {
    return style as string;
  }

  override finish(): void {
    super.finish();
    this._canvasContext.finish();
  }
}

Object.assign(PDFPaintCanvas.prototype, {
  _paintContext: null,
  _transform: new Transform(),
  _origin: new Point(0, 0),
});

// Old: chunk.vendor.js module 1456 (GSVGPaintCanvas).
//
// The paint canvas the exporter paints through: a GPaintCanvas whose 2D
// context is an SvgContext, so shapes, borders and blends end up as
// recorded paths instead of pixels. Sub-canvases (blends, masks) are new
// SVG canvases made with the context factory the exporter installs on the
// root canvas (_createContext).
import { RGBColor } from "../../../engine/color/rgb-color.ts";
import { Point } from "../../../engine/math/point.ts";
import { Rect } from "../../../engine/math/rect.ts";
import { Blender } from "../../../engine/paint/blender.ts";
import type { Context2D } from "../../../engine/paint/context-2d.ts";
import {
  Canvas2DPaintCanvas,
  type PaintCanvas,
  type PaintStyle,
} from "../../../engine/paint/paint-canvas.ts";
import type { SvgContext } from "./svg-context.ts";

export class SvgPaintCanvas extends Canvas2DPaintCanvas {
  _width: number;
  _height: number;

  /**
   * The old constructor didn't run the GPaintCanvas constructor; this one
   * has to, so every SVG canvas (sub-canvases included) also gets a
   * canvas context from the render scheduler, a real canvas element, which
   * is dropped right away. That needs `document`; the old exporter didn't.
   * Then the SVG context and a blender go on it like in the old one.
   */
  constructor(context: SvgContext) {
    super();
    this._canvasContext = context as unknown as Context2D;
    context.canvas = this as unknown as SvgContext["canvas"];
    this._width = 300;
    this._height = 150;
    this.prepare(null);
    this._blender = new Blender(this);
  }

  get width(): number {
    return this._width;
  }

  set width(value: number) {
    this._width = value;
  }

  get height(): number {
    return this._height;
  }

  set height(value: number) {
    this._height = value;
  }

  /** The SVG context of this canvas. */
  get svgContext(): SvgContext {
    return this._canvasContext as unknown as SvgContext;
  }

  override clipRect(): void {
    console.log("clipRect is not supported");
  }

  override resetClip(): void {
    console.log("resetClip is not supported");
  }

  /**
   * The line as a stroked path. The old method read an undeclared
   * `dashed` (its signature lacks the base class's parameter), so it threw
   * a ReferenceError and the export never finished (BUGS-FIXED.md
   * "BUG-086 A broken image makes the SVG export never finish"); `dashed`
   * is now the base class's parameter.
   */
  override strokeLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    lineWidth?: number | null,
    paint?: PaintStyle | null,
    dashed?: boolean,
  ): void {
    const style = this._convertStyle(paint || RGBColor.BLACK);
    lineWidth = lineWidth || 1;
    let start = new Point(x1, y1);
    let end = new Point(x2, y2);
    start = (this._transform as NonNullable<typeof this._transform>).mapPoint(start);
    end = (this._transform as NonNullable<typeof this._transform>).mapPoint(end);
    const context = this.svgContext;
    context.globalCompositeOperation = Canvas2DPaintCanvas.CompositeOperator.SourceOver;
    context.globalAlpha = 1;
    context.strokeStyle = style as string;
    context.lineWidth = lineWidth;
    if (dashed) context.setLineDash([4]);
    context.beginPath();
    context.moveTo(start.getX(), start.getY());
    context.lineTo(end.getX(), end.getY());
    context.stroke();
    if (dashed) context.setLineDash([]);
  }

  /** Replaced by the exporter on the root canvas; sub-canvases inherit it. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature (callers pass null)
  _createContext(_options: unknown): SvgContext {
    console.log("GSVGPaintCanvas.prototype._createContext is not overridden");
    return undefined as unknown as SvgContext;
  }

  override createCanvas(extents: Rect, clipToAreas?: boolean): SvgPaintCanvas {
    const canvas = new SvgPaintCanvas(this._createContext(null));
    canvas._createContext = this._createContext;
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
    canvas.prepare(areas);
    const topLeft = finalExtents.getSide(Rect.Side.TOP_LEFT);
    canvas.setOrigin(topLeft);
    canvas.setOffset(topLeft);
    canvas.setScale(this._scale as number);
    return canvas;
  }

  drawImageSmooth(): void {
    console.log("drawImageSmooth is not supported");
  }

  override drawImage(): void {}

  /** Records the sub-canvas in the context with the opacity and operator to composite it with. */
  override drawCanvas(
    canvas: PaintCanvas,
    x?: number,
    y?: number,
    opacity?: number | null,
    compositeOperator?: string | null,
  ): void {
    const context = this.svgContext;
    context.save();
    context._dc_globalAlpha = "number" == typeof opacity ? opacity : 1;
    context._dc_globalCompositeOperation =
      compositeOperator || Canvas2DPaintCanvas.CompositeOperator.SourceOver;
    context.drawImage(canvas, x || 0, y || 0);
    context.restore();
  }
}

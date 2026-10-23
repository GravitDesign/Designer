// Old: chunk.vendor.js module 1465 (GSVGContext, the exporter's 2D context).
//
// A stand-in for CanvasRenderingContext2D that the paint code draws into
// while exporting. Path calls build SVG path data ("M x y L x y ... Z");
// every fill or stroke pushes the path with a snapshot of the drawing state
// (_svgs and _svgStyles, same index). Drawing another SVG canvas into this
// one pushes a { drawImage } entry, which the exporter unfolds into a
// nested group. Everything the exporter doesn't read is a no-op.
import type { Color } from "../../../engine/color/color.ts";
import { Point } from "../../../engine/math/point.ts";
import { Rect } from "../../../engine/math/rect.ts";
import { Transform } from "../../../engine/math/transform.ts";
import { LinearGradient } from "../../../engine/style/linear-gradient.ts";
import { RadialGradient } from "../../../engine/style/radial-gradient.ts";
import { numberFormat } from "./number-format.ts";
import { setGradientPosition, type CanvasColorStop } from "./svg-gradients.ts";

/** A fill or stroke style as the paint code sets it. */
export type SvgPaintStyle =
  string | Color | LinearGradient | RadialGradient | CanvasPattern | undefined;

/** The drawing state recorded with every path (and pushed by save()). */
export interface SvgContextStyle {
  _isStroke: boolean | undefined;
  _isClear: boolean | undefined;
  _fillRule: string | undefined;
  _transform: Transform;
  _dashArray: number[] | undefined;
  _dc_globalAlpha: number | undefined;
  _dc_globalCompositeOperation: string | undefined;
  fillStyle: SvgPaintStyle;
  lineWidth: number | undefined;
  strokeStyle: SvgPaintStyle;
  lineCap: string | undefined;
  lineJoin: string | undefined;
  miterLimit: number | string | undefined;
  globalAlpha: number | string | undefined;
  globalCompositeOperation: string;
}

/** What the context needs from the paint canvas that owns it. */
export interface SvgContextCanvas {
  width: number;
  height: number;
  _transform: Transform;
  _offset: Point | null;
  _canvasContext: SvgContext;
}

/** A canvas drawn into this one (drawImage of another SVG canvas). */
export interface SvgDrawImageEntry {
  drawImage: SvgContextCanvas;
  x: number;
  y: number;
}

/** One recorded entry: path data, or a nested canvas. */
export type SvgPathEntry = string | SvgDrawImageEntry;

function addColorStop(
  this: { _stops2?: CanvasColorStop[] },
  position: number,
  color: string,
): void {
  if (!this._stops2) this._stops2 = [];
  this._stops2.push({ position, color });
}

/** A linear gradient made through the canvas API: a line and CSS color stops. */
export class SvgCanvasLinearGradient extends LinearGradient {
  declare _x0: number | undefined;
  declare _y0: number | undefined;
  declare _x1: number | undefined;
  declare _y1: number | undefined;
  declare _stops2: CanvasColorStop[] | undefined;

  addColorStop(position: number, color: string): void {
    addColorStop.call(this, position, color);
  }
}

/** A radial gradient made through the canvas API, with CSS color stops. */
export class SvgCanvasRadialGradient extends RadialGradient {
  declare _stops2: CanvasColorStop[] | undefined;

  addColorStop(position: number, color: string): void {
    addColorStop.call(this, position, color);
  }
}

export class SvgContext {
  canvas: SvgContextCanvas | null;
  _svg: string;
  _svgs: SvgPathEntry[];
  _svgStyles: SvgContextStyle[];
  _saveRestoreStack: SvgContextStyle[];
  globalCompositeOperation: string;
  _origin: Point;
  _scale: number;
  _options: Record<string, unknown>;

  // The drawing state; unset until the paint code sets it, as in the old context.
  declare _isStroke: boolean | undefined;
  declare _isClear: boolean | undefined;
  declare _fillRule: string | undefined;
  declare _transform: Transform;
  declare _dashArray: number[] | undefined;
  declare _dc_globalAlpha: number | undefined;
  declare _dc_globalCompositeOperation: string | undefined;
  declare fillStyle: SvgPaintStyle;
  declare lineWidth: number | undefined;
  declare strokeStyle: SvgPaintStyle;
  declare lineCap: string | undefined;
  declare lineJoin: string | undefined;
  declare miterLimit: number | string | undefined;
  declare globalAlpha: number | string | undefined;

  constructor(canvas: SvgContextCanvas | null, options?: Record<string, unknown> | null) {
    this.canvas = canvas;
    this._svg = "";
    this._svgs = [];
    this._svgStyles = [];
    this._saveRestoreStack = [];
    this.globalCompositeOperation = "source-over";
    this._origin = new Point(0, 0);
    this._scale = 1;
    this._options = options || {};
  }

  /** Records the last path once more (a mask needs its target path twice). */
  _duplicateLastPath(): void {
    if (this._svgs.length > 0) {
      this._svg = this._svgs[this._svgs.length - 1] as string;
      this._push();
    }
  }

  _push(): void {
    if ("" != this._svg) {
      this._svgs.push(this._svg);
      this._pushStyles(this._svgStyles);
      this._svg = "";
    }
  }

  _pushStyles(stack: SvgContextStyle[]): void {
    stack.push({
      _isStroke: this._isStroke,
      _isClear: this._isClear,
      _fillRule: this._fillRule,
      _transform: this._transform,
      _dashArray: this._dashArray,
      _dc_globalAlpha: this._dc_globalAlpha,
      _dc_globalCompositeOperation: this._dc_globalCompositeOperation,
      fillStyle: this.fillStyle,
      lineWidth: this.lineWidth,
      strokeStyle: this.strokeStyle,
      lineCap: this.lineCap,
      lineJoin: this.lineJoin,
      miterLimit: this.miterLimit,
      globalAlpha: this.globalAlpha,
      globalCompositeOperation: this.globalCompositeOperation,
    });
  }

  _popStyles(stack: SvgContextStyle[]): void {
    const style = stack.pop() as SvgContextStyle;
    this._isStroke = style._isStroke;
    this._isClear = style._isClear;
    this._fillRule = style._fillRule;
    this._transform = style._transform;
    this._dashArray = style._dashArray;
    this._dc_globalAlpha = style._dc_globalAlpha;
    this._dc_globalCompositeOperation = style._dc_globalCompositeOperation;
    this.fillStyle = style.fillStyle;
    this.lineWidth = style.lineWidth;
    this.strokeStyle = style.strokeStyle;
    this.lineCap = style.lineCap;
    this.lineJoin = style.lineJoin;
    this.miterLimit = style.miterLimit;
    this.globalAlpha = style.globalAlpha;
    this.globalCompositeOperation = style.globalCompositeOperation;
  }

  moveTo(x: number, y: number): void {
    if (Number.isNaN(x) || Number.isNaN(y)) return;
    if (this._svg.length > 0) this._svg += " ";
    this._svg += "M " + numberFormat.formatNumber(x) + " " + numberFormat.formatNumber(y);
  }

  lineTo(x: number, y: number): void {
    if (Number.isNaN(x) || Number.isNaN(y)) return;
    if (this._svg.length > 0) this._svg += " ";
    this._svg += "L " + numberFormat.formatNumber(x) + " " + numberFormat.formatNumber(y);
  }

  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void {
    if (Number.isNaN(cx) || Number.isNaN(cy) || Number.isNaN(x) || Number.isNaN(y)) return;
    if (this._svg.length > 0) this._svg += " ";
    this._svg +=
      "Q " +
      numberFormat.formatNumber(cx) +
      " " +
      numberFormat.formatNumber(cy) +
      " " +
      numberFormat.formatNumber(x) +
      " " +
      numberFormat.formatNumber(y);
  }

  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void {
    if (
      Number.isNaN(c1x) ||
      Number.isNaN(c1y) ||
      Number.isNaN(c2x) ||
      Number.isNaN(c2y) ||
      Number.isNaN(x) ||
      Number.isNaN(y)
    ) {
      return;
    }
    if (this._svg.length > 0) this._svg += " ";
    this._svg +=
      "C " +
      numberFormat.formatNumber(c1x) +
      " " +
      numberFormat.formatNumber(c1y) +
      " " +
      numberFormat.formatNumber(c2x) +
      " " +
      numberFormat.formatNumber(c2y) +
      " " +
      numberFormat.formatNumber(x) +
      " " +
      numberFormat.formatNumber(y);
  }

  beginPath(): void {}

  closePath(): void {
    if (this._svg.length > 0) this._svg += " ";
    this._svg += "Z";
  }

  stroke(): void {
    this._isStroke = true;
    this._push();
  }

  fill(fillRule?: string): void {
    this._isStroke = false;
    this._fillRule = fillRule;
    this._push();
  }

  clearRect(): void {}

  /** A filled rectangle as its own path, mapped through the canvas transform. */
  fillRect(x: number, y: number, width: number, height: number): void {
    const pending = this._svg;
    this._svg = "";
    // The old code tested `this.getTransform`, a method, so the mapping always runs.
    let rect = new Rect(x, y, width, height);
    rect = (this.canvas as SvgContextCanvas)._transform.mapRect(rect);
    x = rect.getX();
    y = rect.getY();
    width = rect.getWidth();
    height = rect.getHeight();
    this.beginPath();
    this.moveTo(x, y);
    this.lineTo(x + width, y);
    this.lineTo(x + width, y + height);
    this.lineTo(x, y + height);
    this.lineTo(x, y);
    this.closePath();
    this.fill();
    this._svg = pending;
  }

  createPattern(): void {}

  createLinearGradient(x0: number, y0: number, x1: number, y1: number): SvgCanvasLinearGradient {
    const gradient = new SvgCanvasLinearGradient();
    setGradientPosition(gradient, x0, y0, x1, y1);
    return gradient;
  }

  createRadialGradient(
    x0: number,
    y0: number,
    _r0: number,
    x1: number,
    y1: number,
    r1: number,
  ): SvgCanvasRadialGradient {
    return new SvgCanvasRadialGradient(null, r1, x0, y0, x1, y1, null);
  }

  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this._transform = new Transform(a, b, c, d, e, f);
  }

  getTransform(raw?: boolean): Transform {
    let transform = this._transform;
    if (!raw) {
      const x = this._origin.getX();
      const y = this._origin.getY();
      const scale = this._scale;
      transform = transform.multiplied(new Transform().scaled(scale, scale).translated(-x, -y));
    }
    return transform;
  }

  /** Drawing another SVG canvas records it as a nested entry with this context's draw state. */
  drawImage(image: unknown, x: number, y: number): void {
    const source = image as { _canvasContext?: unknown } | null;
    if (!source || !source._canvasContext) return;
    if (source._canvasContext instanceof SvgContext) {
      const canvas = image as SvgContextCanvas;
      const context = source._canvasContext;
      if (
        0 == context._svg.length &&
        ("destination-out" == context.globalCompositeOperation ||
          "destination-in" == context.globalCompositeOperation)
      ) {
        context._duplicateLastPath();
      }
      this._svgs.push({ drawImage: canvas, x, y });
      context.globalAlpha = this._dc_globalAlpha;
      context.globalCompositeOperation = this._dc_globalCompositeOperation as string;
      context._pushStyles(this._svgStyles);
    } else {
      console.error("GSVGContext:drawImage does not accept type " + image);
    }
  }

  setLineDash(segments: number[]): void {
    this._dashArray = segments;
  }

  save(): void {
    this._pushStyles(this._saveRestoreStack);
  }

  restore(): void {
    this._popStyles(this._saveRestoreStack);
  }
}

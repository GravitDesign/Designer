// Old: chunk.vendor.js module 14 (GPaintCanvas).
//
// PaintCanvas is the interface the engine paints through, shaped like the
// old GPaintCanvas; Canvas2DPaintCanvas implements it on a Canvas 2D
// context. `PaintCanvas` is also exported as a value (the implementation),
// so `new PaintCanvas()` and `PaintCanvas.BlendMode` read as they did.
//
// Every Canvas 2D call, its order, the save/restore pairs, transforms and
// smoothing switches are the old ones; parity depends on them.
import { Color } from "../color/color.ts";
import { RGBColor } from "../color/rgb-color.ts";
import { GObject, registerClass } from "../core/object.ts";
import { Vertex } from "../geometry/vertex.ts";
import { GMath } from "../math/math.ts";
import { Point } from "../math/point.ts";
import { Rect } from "../math/rect.ts";
import { Transform } from "../math/transform.ts";
import { Gradient } from "../style/gradient.ts";
import { LinearGradient } from "../style/linear-gradient.ts";
import { RadialGradient } from "../style/radial-gradient.ts";
import type { Pattern } from "../style/pattern.ts";
import { Bitmap } from "./bitmap.ts";
import { Blender } from "./blender.ts";
import type { Context2D } from "./context-2d.ts";
import type { Destroyable } from "./destroyable.ts";
import { ElementData } from "./element-data.ts";
import {
  getTexturePatternClass,
  TextureRepeatMode,
  type TexturePatternLike,
} from "./late-bound.ts";
import { registerPaintCanvasClass } from "./paint-canvas-class.ts";
import { RecorderStateContext } from "./recorder-state-context.ts";
import { RenderScheduler } from "./render-scheduler.ts";

const LineCap = {
  Butt: "butt",
  Round: "round",
  Square: "square",
} as const;

const LineJoin = {
  Miter: "miter",
  Bevel: "bevel",
  Round: "round",
} as const;

const WebGLBlendMode = {
  LinearBurn: "linear_burn",
  LinearDodge: "linear_dodge",
  VividLight: "vivid_light",
  LinearLight: "linear_light",
  PinLight: "pin_light",
  Divide: "divide",
  Add: "add",
  Subtract: "subtract",
  HardMix: "hardmix",
  Power: "power",
  Harmonic: "harmonic",
  Sin: "sin",
} as const;

/** The CSS blend modes, followed by the WebGL ones (the old code merged them in). */
const BlendMode = {
  Normal: "normal",
  Multiply: "multiply",
  Screen: "screen",
  Overlay: "overlay",
  Darken: "darken",
  Lighten: "lighten",
  ColorDodge: "color-dodge",
  ColorBurn: "color-burn",
  HardLight: "hard-light",
  SoftLight: "soft-light",
  Difference: "difference",
  Exclusion: "exclusion",
  Hue: "hue",
  Saturation: "saturation",
  Color: "color",
  Luminosity: "luminosity",
  ...WebGLBlendMode,
} as const;

const CompositeOperator = {
  SourceOver: "source-over",
  SourceAtTop: "source-atop",
  SourceIn: "source-in",
  SourceOut: "source-out",
  DestinationOver: "destination-over",
  DestinationAtTop: "destination-atop",
  DestinationIn: "destination-in",
  DestinationOut: "destination-out",
  Copy: "copy",
  Xor: "xor",
  Lighter: "lighter",
  Darker: "darker",
} as const;

const FillRule = {
  NonZero: "nonzero",
  EvenOdd: "evenodd",
} as const;

const Filter = {
  Blur: "blur",
  Brightness: "brightness",
  Contrast: "contrast",
  DropShadow: "drop-shadow",
  GrayScale: "grayscale",
  HueRotate: "hue-rotate",
  Invert: "invert",
  Opacity: "opacity",
  Saturate: "saturate",
  Sepia: "sepia",
  SVG: "url",
} as const;

const RenderAlgorithm = {
  Pixelated: 0,
  Crisp: 1,
  Auto: 2,
} as const;

const SmoothingQuality = {
  Low: 0,
  Medium: 1,
  High: 2,
} as const;

/** A fill or stroke style: a color, or a canvas gradient or pattern. */
export type PaintStyle = Color | string | CanvasGradient | CanvasPattern;

/** An image the canvas can draw. */
export type PaintImage = CanvasImageSource | PaintCanvas | Bitmap;

/** What createPatternPaint returns: the style to paint with and the transform to paint it under. */
export interface PatternPaint {
  paint: CanvasGradient | CanvasPattern | Color;
  transform: Transform | null;
}

/** Options of clone(). */
export interface PaintCanvasCloneOptions {
  /** Copy as outside a render phase even while one runs (the fx cache does). */
  renderPhaseDraw?: boolean;
  dontCopyContents?: boolean;
  persistent?: boolean;
}

/** What a vertex source offers for painting: rewind, then read at a scale. */
export interface PaintVertexSource {
  rewindVertices(index: number): boolean;
  readVertex(vertex: Vertex, scale?: number): boolean;
}

/** The hit test result data: the pixel found and where. */
export interface PaintCanvasHit {
  pixel: Uint8ClampedArray;
  location: Point;
}

/** The canvas the engine paints through (the old GPaintCanvas API). */
export interface PaintCanvas extends Destroyable {
  _canvasContext: Context2D;
  _areas: Rect[] | null;
  getWidth(): number;
  getHeight(): number;
  getBitmap(): Bitmap;
  resize(width: number, height: number): void;
  getOffset(): Point | null;
  setOffset(offset: Point | null): void;
  getOrigin(): Point | null;
  setOrigin(origin: Point): void;
  getScale(): number | null;
  setScale(scale: number): void;
  getTransform(raw?: boolean): Transform;
  setTransform(transform: Transform | null | undefined): Transform | null;
  resetTransform(): Transform | null;
  prepare(areas?: Rect[] | null, debug?: boolean): void;
  getAreas(): Rect[] | null;
  isMasked(): boolean;
  setMasked(masked: number | boolean): void;
  isClipped(): boolean;
  finish(): void;
  getPaintExtents(rect: Rect, noClamp?: boolean, padding?: number | number[] | null): Rect;
  getFinalExtents(extents: Rect): Rect;
  getTranslateCorrection(source: Point, target: Point): Point;
  getScaleBoxCorrection(
    x: number,
    y: number,
    width: number,
    height: number,
    scale: number,
    up: boolean,
  ): Rect;
  createCanvas(
    extents: Rect,
    clipToAreas?: boolean,
    padding?: number | number[] | null,
  ): PaintCanvas;
  clear(): void;
  drawCanvas(
    canvas: PaintCanvas,
    x?: number,
    y?: number,
    opacity?: number | null,
    compositeOperator?: string | null,
    clearFirst?: boolean,
    width?: number,
    height?: number,
  ): void;
  createTexture(image: PaintImage | null | undefined, repeat?: string | null): CanvasPattern | null;
  createPatternPaint(
    pattern: Pattern,
    rect?: Rect | null,
    transform?: Transform | null,
  ): PatternPaint | undefined;
  hasClip(): boolean;
  clipRect(x: number, y: number, width: number, height: number): void;
  resetClip(): void;
  putVertices(vertices: Point[] | PaintVertexSource, close?: boolean): boolean | undefined;
  clipVertices(evenOdd?: boolean): void;
  strokeVertices(
    paint: PaintStyle,
    width?: number | null,
    dash?: number[] | null,
    cap?: string | null,
    join?: string | null,
    miterLimit?: number | null,
    opacity?: number | null,
    compositeOperator?: string | null,
  ): void;
  fillVertices(
    paint: PaintStyle,
    opacity?: number | null,
    compositeOperator?: string | null,
    evenOdd?: boolean,
  ): void;
  fillCanvas(
    paint?: PaintStyle | null,
    opacity?: number | null,
    compositeOperator?: string | null,
  ): void;
  fillRect(
    x: number,
    y: number,
    width: number,
    height: number,
    paint?: PaintStyle | null,
    opacity?: number | null,
    compositeOperator?: string | null,
  ): void;
  clearRect(x: number, y: number, width: number, height: number): void;
  strokeRect(
    x: number,
    y: number,
    width: number,
    height: number,
    lineWidth?: number | null,
    paint?: PaintStyle | null,
    opacity?: number | null,
    compositeOperator?: string | null,
  ): void;
  strokeLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    lineWidth?: number | null,
    paint?: PaintStyle | null,
    dashed?: boolean,
    opacity?: number | null,
  ): void;
  setImageSmoothingQuality(quality: number): void;
  setRenderAlgorithm(algorithm: number): void;
  drawImage(
    image: PaintImage,
    x?: number,
    y?: number,
    noSmooth?: boolean,
    opacity?: number | null,
    compositeOperator?: string | null,
    noMipmap?: boolean,
    width?: number,
    height?: number,
  ): void;
  drawImageFragment(
    image: PaintImage,
    sx: number,
    sy: number,
    dx: number,
    dy: number,
    width: number,
    height: number,
    noSmooth?: boolean,
    opacity?: number | null,
    compositeOperator?: string | null,
    destinationWidth?: number,
    destinationHeight?: number,
  ): void;
  putAuxilliaryText(
    text: string,
    x: number,
    y: number,
    font?: string | null,
    baseline?: string | null,
    align?: string | null,
    opacity?: number | null,
    color?: string | null,
  ): void;
  measureText(text: string, font?: string | number | null): TextMetrics;
  hitTest(point: Point, tolerance: number): ElementData<PaintCanvas, PaintCanvasHit> | null;
  setFilter(filter: string, value: unknown): void;
  clone(copyBitmap?: boolean, options?: PaintCanvasCloneOptions | null): PaintCanvas;
  getRendererContext(): RecorderStateContext | null;
  isRendered(): boolean;
}

let filterSupport = -1;
let savedFilterSupport = -1;
let screenDPI = 1;
let screenDPIKnown = false;

const SMOOTHING_PROPERTIES = [
  "imageSmoothingEnabled",
  "webkitImageSmoothingEnabled",
  "mozImageSmoothingEnabled",
] as const;

/** The CSS values tried for each RenderAlgorithm, first supported one wins. */
const IMAGE_RENDERING_VALUES = [
  ["pixelated", "nearest-neighbor"],
  ["crisp-edges", "-moz-crisp-edges", "-webkit-optimize-contrast"],
  ["auto", ""],
];

/** sqrt(2 ln 255) - 1: the old conversion from a blur radius to a CSS blur. */
function blurDivisor(): number {
  return Math.sqrt(2 * Math.log(255)) - 1;
}

export class Canvas2DPaintCanvas extends GObject implements PaintCanvas {
  static {
    registerClass(this, "GPaintCanvas");
  }

  static LineCap = LineCap;
  static LineJoin = LineJoin;
  static BlendMode = BlendMode;
  static WebGLBlendMode = WebGLBlendMode;
  static CompositeOperator = CompositeOperator;
  static FillRule = FillRule;
  static Filter = Filter;
  static RenderAlgorithm = RenderAlgorithm;
  static SmoothingQuality = SmoothingQuality;

  /** A canvas of 2x2 cells of `size`: `colorB` top left and bottom right, `colorA` elsewhere. */
  static createChessboard(size: number, colorA: string, colorB: string): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = 2 * size;
    canvas.height = 2 * size;
    const context = canvas.getContext("2d") as CanvasRenderingContext2D;
    context.fillStyle = colorA;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = colorB;
    context.fillRect(0, 0, size, size);
    context.fillRect(size, size, size, size);
    return canvas;
  }

  /** Whether the browser supports `context.filter`; asked once. */
  static hasFilters(): boolean {
    if (filterSupport < 0) {
      if ("undefined" != typeof window) {
        const context = document
          .createElement("canvas")
          .getContext("2d") as CanvasRenderingContext2D;
        filterSupport = "string" == typeof context.filter ? 1 : 0;
      } else filterSupport = 0;
    }
    return filterSupport > 0;
  }

  static disableFilters(): void {
    if (0 !== filterSupport) {
      savedFilterSupport = filterSupport;
      filterSupport = 0;
    }
  }

  static enableFilters(): void {
    if (0 === filterSupport) filterSupport = savedFilterSupport;
  }

  static getScreenDPI(): number {
    if (!screenDPIKnown) this._initScreenDPI();
    return screenDPI;
  }

  static _initScreenDPI(): void {
    if ("undefined" != typeof window && "undefined" != typeof document) {
      const context = (document.createElement("canvas").getContext("2d") || {}) as Record<
        string,
        unknown
      >;
      const backingStoreRatio =
        (context.webkitBackingStorePixelRatio as number) ||
        (context.mozBackingStorePixelRatio as number) ||
        (context.msBackingStorePixelRatio as number) ||
        (context.oBackingStorePixelRatio as number) ||
        (context.backingStorePixelRatio as number) ||
        1;
      screenDPI = window.devicePixelRatio / backingStoreRatio || 1;
    }
    screenDPIKnown = true;
  }

  _canvasContext: Context2D;
  _blender: Blender;
  declare _bitmap: Bitmap | null;
  declare _transform: Transform | null;
  declare _offset: Point | null;
  declare _origin: Point | null;
  declare _scale: number | null;
  declare _areas: Rect[] | null;
  declare _filters: Record<string, string> | null;
  declare _isMasked: number;

  /**
   * `plain2d` paints into a plain canvas. Otherwise the canvas comes from
   * the renderer, which (with `forceRecorder`, or during a render phase)
   * gives one that behaves like the old recorded canvases.
   */
  constructor(
    forceRecorder?: boolean,
    plain2d?: boolean,
    persistent?: boolean,
    multithreaded?: boolean,
  ) {
    super();
    this._canvasContext = plain2d
      ? (document.createElement("canvas").getContext("2d") as CanvasRenderingContext2D)
      : RenderScheduler.getRenderer(forceRecorder, void 0, void 0, persistent, multithreaded);
    this._blender = new Blender(this);
  }

  getWidth(): number {
    return this._canvasContext.canvas.width;
  }

  getHeight(): number {
    return this._canvasContext.canvas.height;
  }

  getBitmap(): Bitmap {
    if (!this._bitmap) this._bitmap = new Bitmap(this);
    return this._bitmap;
  }

  resize(width: number, height: number): void {
    if (width != this._canvasContext.canvas.width || height != this._canvasContext.canvas.height) {
      this._canvasContext.canvas.width = width;
      this._canvasContext.canvas.height = height;
    }
  }

  getOffset(): Point | null {
    return this._offset;
  }

  setOffset(offset: Point | null): void {
    this._offset = offset;
  }

  getOrigin(): Point | null {
    return this._origin;
  }

  setOrigin(origin: Point): void {
    if (!Point.equals(origin, this._origin)) {
      this._origin = origin;
      this._updateTransform();
    }
  }

  getScale(): number | null {
    return this._scale;
  }

  setScale(scale: number): void {
    if (scale !== this._scale) {
      this._scale = scale;
      this._updateTransform();
    }
  }

  /** The canvas transform, followed by the scale and the origin unless `raw`. */
  getTransform(raw?: boolean): Transform {
    let transform = this._transform as Transform;
    if (!raw) {
      const origin = this._origin as Point;
      const x = origin.getX();
      const y = origin.getY();
      const scale = this._scale as number;
      transform = transform.multiplied(new Transform().scaled(scale, scale).translated(-x, -y));
    }
    return transform;
  }

  /** Sets the raw transform (identity for null) and returns the previous one. */
  setTransform(transform: Transform | null | undefined): Transform | null {
    if (null == transform) transform = new Transform();
    const previous = this._transform;
    this._transform = transform;
    this._updateTransform();
    return previous;
  }

  resetTransform(): Transform | null {
    return this.setTransform(null);
  }

  /**
   * Starts a paint pass: saves the context, resets transform, origin and
   * scale, then clears and clips to `areas` (clamped to the canvas), or
   * clears the whole canvas without areas. `debug` fills the areas green.
   */
  prepare(areas?: Rect[] | null, debug?: boolean): void {
    const context = this._canvasContext;
    context.save();
    this._transform = new Transform();
    this._origin = new Point(0, 0);
    this._scale = 1;
    this._areas = areas ? areas.slice() : null;
    this._updateTransform();
    if (areas && areas.length > 0) {
      context.beginPath();
      for (let i = 0; i < areas.length; ++i) {
        const area = areas[i] as Rect;
        let left = area.getX();
        let right = left + area.getWidth();
        let top = area.getY();
        let bottom = top + area.getHeight();
        left = Math.max(0, left);
        right = Math.min(this.getWidth(), right);
        top = Math.max(0, top);
        bottom = Math.min(this.getHeight(), bottom);
        context.moveTo(left, top);
        context.lineTo(right, top);
        context.lineTo(right, bottom);
        context.lineTo(left, bottom);
        context.lineTo(left, top);
        context.clearRect(left, top, right - left, bottom - top);
        if (debug) {
          context.fillStyle = "#0f0";
          context.fill();
        }
      }
      context.clip();
    } else {
      context.clearRect(0, 0, this.getWidth(), this.getHeight());
    }
  }

  getAreas(): Rect[] | null {
    return this._areas ? this._areas.slice() : null;
  }

  isMasked(): boolean {
    return this._isMasked > 0;
  }

  /** A truthy value counts one more mask level, a negative one resets the count. */
  setMasked(masked: number | boolean): void {
    if ((masked as number) < 0) this._isMasked = 0;
    else if (masked) this._isMasked++;
  }

  isClipped(): boolean {
    if (this._areas) {
      if (this._areas.length > 1) return true;
      if (1 === this._areas.length) {
        const area = this._areas[0] as Rect;
        const whole = new Rect(0, 0, this.getWidth(), this.getHeight());
        if (!area.containsRect(whole)) return true;
      }
    }
    return false;
  }

  finish(): void {
    this._canvasContext.restore();
    this._transform = new Transform();
    this._origin = new Point(0, 0);
    this._scale = 1;
    this._areas = null;
  }

  destroy(): void {
    if (this._canvasContext instanceof RecorderStateContext) {
      RenderScheduler.destroy(this._canvasContext);
    }
    this._blender.destroy();
  }

  /**
   * `rect` mapped to canvas pixels. Unless `noClamp`, clamped to the canvas
   * plus `padding` ([left, top, right, bottom] or one number).
   */
  getPaintExtents(rect: Rect, noClamp?: boolean, padding?: number | number[] | null): Rect {
    const mapped = this.getTransform(false).mapRect(rect);
    let x = mapped.getX();
    let y = mapped.getY();
    let width = mapped.getWidth();
    let height = mapped.getHeight();
    if (!noClamp) {
      let pad: number[];
      if (padding)
        pad = "number" == typeof padding ? [padding, padding, padding, padding] : padding;
      else pad = [0, 0, 0, 0];
      const [padLeft, padTop, padRight, padBottom] = pad as [number, number, number, number];
      if (y < -padTop) {
        height += y + padTop;
        y = -padTop;
      }
      if (x < -padLeft) {
        width += x + padLeft;
        x = -padLeft;
      }
      if (x + width > this.getWidth() + padRight + padLeft) {
        width = this.getWidth() - x + padRight + padLeft;
      }
      if (y + height > this.getHeight() + padTop + padBottom) {
        height = this.getHeight() - y + padTop + padBottom;
      }
    }
    return new Rect(x, y, width, height);
  }

  /** Canvas pixel extents mapped back to scene units, times the canvas scale. */
  getFinalExtents(extents: Rect): Rect {
    const mapped = (this.getTransform(false).inverted() as Transform).mapRect(extents);
    const scale = this._scale as number;
    return new Rect(
      mapped.getX() * scale,
      mapped.getY() * scale,
      mapped.getWidth() * scale,
      mapped.getHeight() * scale,
    );
  }

  /** The sub-pixel offset that lines a sub-canvas at `source` up with this one at `target`. */
  getTranslateCorrection(source: Point, target: Point): Point {
    let dx = Math.abs(target.getX() - source.getX());
    let dy = Math.abs(target.getY() - source.getY());
    dx -= Math.floor(dx);
    dy -= Math.floor(dy);
    if (dx > 0.5) dx = 1 - dx;
    else if (dx > GMath.defaultEps) dx = -dx;
    if (dy > 0.5) dy = 1 - dy;
    else if (dy > GMath.defaultEps) dy = -dy;
    return new Point(dx, dy);
  }

  /** A box snapped to whole pixels at `scale`: inwards when scaling up, rounded otherwise. */
  getScaleBoxCorrection(
    x: number,
    y: number,
    width: number,
    height: number,
    scale: number,
    up: boolean,
  ): Rect {
    const floorAt = (value: number) => (value * Math.floor(value * scale)) / (value * scale);
    const ceilAt = (value: number) => (value * Math.ceil(value * scale)) / (value * scale);
    const roundAt = (value: number) => (value * Math.round(value * scale)) / (value * scale);
    const scaledX = x * scale;
    const scaledY = y * scale;
    if (up) {
      width = floorAt(width) || 0;
      height = floorAt(height) || 0;
      x = ceilAt(x) || 0;
      y = ceilAt(y) || 0;
    } else {
      let rounded = Math.round(scaledX);
      width = rounded < scaledX ? floorAt(width) || 0 : ceilAt(width) || 0;
      rounded = Math.round(scaledY);
      height = rounded < scaledY ? floorAt(height) || 0 : ceilAt(height) || 0;
      x = roundAt(x) || 0;
      y = roundAt(y) || 0;
    }
    return new Rect(x, y, width, height);
  }

  /**
   * A new canvas covering `extents` (scene units) at this canvas' scale,
   * with origin and offset at its top left. With `clipToAreas` it gets this
   * canvas' areas, moved and grown by `padding`.
   */
  createCanvas(
    extents: Rect,
    clipToAreas?: boolean,
    padding?: number | number[] | null,
  ): Canvas2DPaintCanvas {
    const canvas = new Canvas2DPaintCanvas();
    const paintExtents = this.getPaintExtents(extents, false, padding);
    const x = paintExtents.getX();
    const y = paintExtents.getY();
    const finalExtents = this.getFinalExtents(paintExtents).toRoundedPrecision();
    canvas.resize(Math.ceil(finalExtents.getWidth()), Math.ceil(finalExtents.getHeight()));
    let areas: Rect[] | null = null;
    if (clipToAreas && this._areas) {
      areas = [];
      for (let i = 0; i < this._areas.length; ++i) {
        if (padding) {
          if ("number" == typeof padding) padding = [padding, padding, padding, padding];
        } else padding = [0, 0, 0, 0];
        const pad = padding as number[];
        const area = (this._areas[i] as Rect)
          .translated(-x, -y)
          .expanded(pad[0] as number, pad[1] as number, pad[2] as number, pad[3] as number);
        areas.push(area);
      }
    }
    canvas.prepare(areas);
    const topLeft = finalExtents.getSide(Rect.Side.TOP_LEFT);
    canvas.setOrigin(topLeft);
    canvas.setOffset(topLeft);
    canvas.setScale(this._scale as number);
    return canvas;
  }

  /** Clears what the canvas shows, in scene coordinates. */
  clear(): void {
    const visible = (this.getTransform(false).inverted() as Transform).mapRect(
      new Rect(0, 0, this.getWidth(), this.getHeight()),
    );
    this._canvasContext.clearRect(
      visible.getX(),
      visible.getY(),
      visible.getWidth(),
      visible.getHeight(),
    );
  }

  /**
   * Composites a sub-canvas at its offset (plus x, y), snapping it to whole
   * pixels. Smoothing is on only while this canvas is scaled down.
   */
  drawCanvas(
    canvas: PaintCanvas,
    x?: number,
    y?: number,
    opacity?: number | null,
    compositeOperator?: string | null,
    clearFirst?: boolean,
    width?: number,
    height?: number,
  ): void {
    const smoothing = this._getImageSmoothingEnabled();
    const scale = this._scale as number;
    this._setImageSmoothingEnabled(scale < 1);
    if (1 !== canvas.getScale()) this.setScale(1);
    const previousTransform = this.resetTransform();
    const translation = previousTransform ? previousTransform.getTranslation() : new Point(0, 0);
    x = (x as number) | 0;
    y = (y as number) | 0;
    const offset = canvas.getOffset();
    let destX = offset ? offset.getX() : 0;
    let destY = offset ? offset.getY() : 0;
    let destWidth = width || canvas.getWidth();
    let destHeight = height || canvas.getHeight();
    let sourceScale = canvas.getScale();
    sourceScale = sourceScale || 1;
    destX += x + translation.getX() * sourceScale;
    destY += y + translation.getY() * sourceScale;
    let bleed = 0;
    const ownScale = this.getScale() as number;
    if (1 != ownScale) {
      const box = this.getScaleBoxCorrection(
        destX,
        destY,
        destWidth,
        destHeight,
        ownScale,
        ownScale > 1,
      );
      destX = box.getX();
      destY = box.getY();
      destWidth = box.getWidth();
      destHeight = box.getHeight();
      bleed = ownScale > 1 ? 0 : 1 / ownScale / 2 - 1;
    } else {
      const correction = this.getTranslateCorrection(
        canvas.getTransform().getTranslation(),
        this.getTransform().getTranslation(),
      );
      destX += correction.getX();
      destY += correction.getY();
    }
    if (clearFirst) this._canvasContext.clearRect(destX, destY, destWidth, destHeight);
    this._canvasContext.globalAlpha = "number" == typeof opacity ? opacity : 1;
    this._blender.globalCompositeOperation = compositeOperator || CompositeOperator.SourceOver;
    this._blender.drawImage(
      canvas._canvasContext.canvas,
      -bleed,
      -bleed,
      canvas.getWidth() + 2 * bleed,
      canvas.getHeight() + 2 * bleed,
      destX,
      destY,
      destWidth,
      destHeight,
    );
    this.setTransform(previousTransform);
    this.setScale(scale);
    this._setImageSmoothingEnabled(smoothing);
  }

  /** A canvas pattern of `image`; null for an image that isn't loaded or has no size. */
  createTexture(
    image: PaintImage | null | undefined,
    repeat?: string | null,
  ): CanvasPattern | null {
    if (!image) return null;
    repeat = repeat || TextureRepeatMode.Both;
    const source = this._convertImage(image);
    if (source instanceof HTMLImageElement || source instanceof Image) {
      if (source.complete && source.naturalWidth && 0 !== source.naturalWidth) {
        return this._canvasContext.createPattern(source, repeat);
      }
    } else {
      const sized = source as { width: number; height: number };
      if (sized.width && 0 !== Math.floor(sized.width) && 0 !== Math.floor(sized.height)) {
        let pattern: CanvasPattern | null = null;
        try {
          pattern = this._canvasContext.createPattern(source, repeat);
        } catch {
          console.warn("pattern couldn't have been created");
        }
        return pattern;
      }
    }
    return null;
  }

  /**
   * The canvas style for a pattern over `rect`: a color as it is, gradients
   * as canvas gradients in unit space with the transform onto `rect`,
   * angular gradients and textures as canvas patterns.
   */
  createPatternPaint(
    pattern: Pattern,
    rect?: Rect | null,
    transform?: Transform | null,
  ): PatternPaint | undefined {
    let paint: CanvasGradient | CanvasPattern | Color | null = null;
    let paintTransform: Transform | null | undefined = null;
    let gradientTransform: Transform | null | undefined;
    if (pattern instanceof Color) paint = pattern;
    else if ("[Object GAngularGradient]" === pattern.toString()) {
      const angular = pattern as unknown as {
        getTransform(): Transform | null | undefined;
        getGradient(scale: number, rect?: Rect | null): PaintImage | null;
      };
      const own = angular.getTransform();
      paintTransform =
        transform ||
        (!rect || (0 == rect.getX() && 0 == rect.getY())
          ? null
          : new Transform(1, 0, 0, 1, rect.getX(), rect.getY()));
      if (own) paintTransform = paintTransform ? paintTransform.preMultiplied(own) : own;
      const texture = angular.getGradient(1, rect);
      if (texture) paint = this.createTexture(texture, TextureRepeatMode.None);
    } else if (pattern instanceof Gradient) {
      const scale = pattern.getScale();
      let gradient: CanvasGradient;
      if (pattern instanceof LinearGradient) {
        const angle = pattern.getAngle();
        gradient = this._canvasContext.createLinearGradient(
          pattern._fx,
          pattern._fy,
          pattern._fx + Math.cos(angle) * scale,
          pattern._fy + Math.sin(angle) * scale,
        );
        gradientTransform = pattern.getTransform();
      } else {
        if (!(pattern instanceof RadialGradient)) throw new Error("Unknown pattern");
        gradient = this._canvasContext.createRadialGradient(
          pattern._fx,
          pattern._fy,
          0,
          pattern._cx,
          pattern._cy,
          scale,
        );
        gradientTransform = pattern.getTransform();
      }
      const stops = pattern.getStops();
      for (let i = 0; i < stops.length; ++i) {
        const stop = stops[i] as (typeof stops)[number];
        gradient.addColorStop(
          Math.min(1, Math.max(0, stop.position)),
          this._toScreenCSS(stop.color, stop.opacity),
        );
      }
      paint = gradient;
      if (rect) paintTransform = Transform.getNativeRectTransformation(rect);
      else if (transform) paintTransform = transform;
      if (gradientTransform) {
        paintTransform = paintTransform
          ? paintTransform.preMultiplied(gradientTransform)
          : gradientTransform;
      }
    } else {
      const TexturePattern = getTexturePatternClass();
      if (!TexturePattern || !(pattern instanceof TexturePattern))
        throw new Error("Unknown pattern.");
      const texturePattern = pattern as TexturePatternLike;
      paintTransform = transform;
      const own = texturePattern.getTransform();
      if (own) paintTransform = paintTransform ? paintTransform.preMultiplied(own) : own;
      const texture = texturePattern.getTexture(this, rect) as PaintImage | null;
      if (texture) paint = this.createTexture(texture, texturePattern.getRepeatMode());
    }
    if (paint) return { paint, transform: paintTransform as Transform | null };
    return undefined;
  }

  _toScreenCSS(color: Color, opacity: number): string {
    return color.toScreenCSS(opacity);
  }

  hasClip(): boolean {
    const clip = (this._canvasContext as unknown as { clip?: unknown }).clip;
    return !!clip && clip instanceof Function;
  }

  /** Saves the context and clips to the rectangle; resetClip restores. */
  clipRect(x: number, y: number, width: number, height: number): void {
    const context = this._canvasContext;
    context.save();
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + width, y);
    context.lineTo(x + width, y + height);
    context.lineTo(x, y + height);
    context.lineTo(x, y);
    context.clip();
  }

  resetClip(): void {
    this._canvasContext.restore();
  }

  /**
   * Builds a path from points or a vertex source (read at the canvas
   * scale). Returns whether the path ended closed; undefined for an empty
   * point list.
   */
  putVertices(vertices: Point[] | PaintVertexSource, close?: boolean): boolean | undefined {
    const context = this._canvasContext;
    let closed: boolean | undefined = void 0;
    if (vertices instanceof Array) {
      if (vertices.length) {
        context.beginPath();
        for (let i = 0; i < vertices.length; ++i) {
          const point = vertices[i] as Point;
          if (0 === i) context.moveTo(point.getX(), point.getY());
          else context.lineTo(point.getX(), point.getY());
        }
        if (close) {
          context.closePath();
          closed = true;
        } else closed = false;
      }
    } else if (vertices.rewindVertices(0)) {
      let isClosed = false;
      context.beginPath();
      const scale = this.getScale() as number;
      const vertex = new Vertex();
      while (vertices.readVertex(vertex, scale)) {
        switch (vertex.command) {
          case Vertex.Command.Move:
            isClosed = false;
            context.moveTo(vertex.x, vertex.y);
            break;
          case Vertex.Command.Line:
            context.lineTo(vertex.x, vertex.y);
            break;
          case Vertex.Command.Curve: {
            const x = vertex.x;
            const y = vertex.y;
            if (vertices.readVertex(vertex, scale))
              context.quadraticCurveTo(vertex.x, vertex.y, x, y);
            break;
          }
          case Vertex.Command.Curve2: {
            const x = vertex.x;
            const y = vertex.y;
            if (vertices.readVertex(vertex, scale)) {
              const cx = vertex.x;
              const cy = vertex.y;
              if (vertices.readVertex(vertex, scale)) {
                context.bezierCurveTo(cx, cy, vertex.x, vertex.y, x, y);
              }
            }
            break;
          }
          case Vertex.Command.Close:
            isClosed = true;
            context.closePath();
            break;
          default:
            throw new Error("Unknown Command Type - " + vertex.command);
        }
      }
      if (!isClosed && close) {
        context.closePath();
        isClosed = true;
      }
      closed = isClosed;
    }
    return closed;
  }

  /** Saves the context and clips to the current path; resetClip restores. */
  clipVertices(evenOdd?: boolean): void {
    this._canvasContext.save();
    this._canvasContext.clip(evenOdd ? FillRule.EvenOdd : FillRule.NonZero);
  }

  strokeVertices(
    paint: PaintStyle,
    width?: number | null,
    dash?: number[] | null,
    cap?: string | null,
    join?: string | null,
    miterLimit?: number | null,
    opacity?: number | null,
    compositeOperator?: string | null,
  ): void {
    const context = this._canvasContext;
    context.strokeStyle = this._convertStyle(paint);
    context.lineWidth = "number" == typeof width ? width : 1;
    context.lineCap = (cap || "butt") as CanvasLineCap;
    context.lineJoin = (join || "miter") as CanvasLineJoin;
    context.miterLimit = "number" == typeof miterLimit ? miterLimit : 10;
    context.globalAlpha = "number" == typeof opacity ? opacity : 1;
    this._blender.globalCompositeOperation = compositeOperator || CompositeOperator.SourceOver;
    const dashed = !!dash && dash instanceof Array;
    if (dashed) context.setLineDash(dash);
    this._blender.stroke();
    if (dashed) context.setLineDash([]);
  }

  fillVertices(
    paint: PaintStyle,
    opacity?: number | null,
    compositeOperator?: string | null,
    evenOdd?: boolean,
  ): void {
    this._canvasContext.fillStyle = this._convertStyle(paint);
    this._canvasContext.globalAlpha = "number" == typeof opacity ? opacity : 1;
    this._blender.globalCompositeOperation = compositeOperator || CompositeOperator.SourceOver;
    this._blender.fill(evenOdd ? FillRule.EvenOdd : FillRule.NonZero);
  }

  /** Fills what the canvas shows. */
  fillCanvas(
    paint?: PaintStyle | null,
    opacity?: number | null,
    compositeOperator?: string | null,
  ): void {
    const visible = (this.getTransform(false).inverted() as Transform).mapRect(
      new Rect(0, 0, this.getWidth(), this.getHeight()),
    );
    this.fillRect(
      visible.getX(),
      visible.getY(),
      visible.getWidth(),
      visible.getHeight(),
      paint,
      opacity,
      compositeOperator,
    );
  }

  fillRect(
    x: number,
    y: number,
    width: number,
    height: number,
    paint?: PaintStyle | null,
    opacity?: number | null,
    compositeOperator?: string | null,
  ): void {
    const style = this._convertStyle(paint || RGBColor.BLACK);
    this._blender.globalCompositeOperation = compositeOperator || CompositeOperator.SourceOver;
    this._canvasContext.globalAlpha = "number" == typeof opacity ? opacity : 1;
    this._canvasContext.fillStyle = style;
    this._blender.fillRect(x, y, width, height);
  }

  clearRect(x: number, y: number, width: number, height: number): void {
    this._canvasContext.clearRect(x, y, width, height);
  }

  strokeRect(
    x: number,
    y: number,
    width: number,
    height: number,
    lineWidth?: number | null,
    paint?: PaintStyle | null,
    opacity?: number | null,
    compositeOperator?: string | null,
  ): void {
    const style = this._convertStyle(paint || RGBColor.BLACK);
    lineWidth = lineWidth || 1;
    this._blender.globalCompositeOperation = compositeOperator || CompositeOperator.SourceOver;
    this._canvasContext.globalAlpha = "number" == typeof opacity ? opacity : 1;
    this._canvasContext.strokeStyle = style;
    this._canvasContext.lineWidth = lineWidth;
    this._blender.strokeRect(x, y, width, height);
  }

  /** A line; `dashed` uses dashes of twice the line width. Always source-over. */
  strokeLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    lineWidth?: number | null,
    paint?: PaintStyle | null,
    dashed?: boolean,
    opacity?: number | null,
  ): void {
    const context = this._canvasContext;
    const style = this._convertStyle(paint || RGBColor.BLACK);
    lineWidth = lineWidth || 1;
    this._blender.globalCompositeOperation = CompositeOperator.SourceOver;
    context.globalAlpha = "number" == typeof opacity ? opacity : 1;
    context.strokeStyle = style;
    context.lineWidth = lineWidth;
    if (dashed) context.setLineDash([2 * lineWidth]);
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    this._blender.stroke();
    if (dashed) context.setLineDash([]);
  }

  /**
   * Meant to set imageSmoothingQuality. The old code only did so when the
   * context had it as an own property, which no browser context (nor the old
   * recorder) does, so this never changes anything. Kept that way.
   */
  setImageSmoothingQuality(quality: number): void {
    const context = this._canvasContext as unknown as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(context, "imageSmoothingQuality")) {
      switch (quality) {
        case SmoothingQuality.Low:
          context.imageSmoothingQuality = "low";
          break;
        case SmoothingQuality.Medium:
          context.imageSmoothingQuality = "medium";
          break;
        case SmoothingQuality.High:
          context.imageSmoothingQuality = "high";
          break;
      }
    }
  }

  /**
   * Sets CSS image-rendering on the canvas element, trying the values for
   * the algorithm until the browser keeps one. Recorded canvases ignored it.
   */
  setRenderAlgorithm(algorithm: number): void {
    const target = (this._canvasContext instanceof RecorderStateContext
      ? this._canvasContext
      : this._canvasContext.canvas.style) as unknown as { imageRendering: unknown };
    switch (algorithm) {
      case RenderAlgorithm.Pixelated:
      case RenderAlgorithm.Crisp:
      case RenderAlgorithm.Auto: {
        const values = IMAGE_RENDERING_VALUES[algorithm] as string[];
        for (let i = 0; i < values.length; i++) {
          target.imageRendering = values[i];
          if (target.imageRendering === values[i]) break;
        }
      }
    }
  }

  /**
   * Draws an image at x, y (scaled to width, height). Chrome on a normal
   * DPI screen downscales smoothed images in halving steps first, unless
   * `noMipmap`.
   */
  drawImage(
    image: PaintImage,
    x?: number,
    y?: number,
    noSmooth?: boolean,
    opacity?: number | null,
    compositeOperator?: string | null,
    noMipmap?: boolean,
    width?: number,
    height?: number,
  ): void {
    x = x || 0;
    y = y || 0;
    const source = this._convertImage(image);
    const sized = source as { width: number; height: number };
    width = width || sized.width;
    height = height || sized.height;
    this._canvasContext.globalAlpha = "number" == typeof opacity ? opacity : 1;
    this._blender.globalCompositeOperation = compositeOperator || CompositeOperator.SourceOver;
    const smoothing = this._getImageSmoothingEnabled();
    this._setImageSmoothingEnabled(!noSmooth);
    if (!(
      !noSmooth &&
      !noMipmap &&
      "undefined" != typeof navigator &&
      navigator.userAgent.indexOf("Chrome") >= 0 &&
      Canvas2DPaintCanvas.getScreenDPI() < 2 &&
      this._drawSmoothImage(source, x, y, width, height)
    )) {
      this._blender.drawImage(source, x || 0, y || 0, width, height);
    }
    this._setImageSmoothingEnabled(smoothing);
  }

  drawImageFragment(
    image: PaintImage,
    sx: number,
    sy: number,
    dx: number,
    dy: number,
    width: number,
    height: number,
    noSmooth?: boolean,
    opacity?: number | null,
    compositeOperator?: string | null,
    destinationWidth?: number,
    destinationHeight?: number,
  ): void {
    const source = this._convertImage(image);
    destinationWidth = destinationWidth || width;
    destinationHeight = destinationHeight || height;
    this._canvasContext.globalAlpha = "number" == typeof opacity ? opacity : 1;
    this._blender.globalCompositeOperation = compositeOperator || CompositeOperator.SourceOver;
    const smoothing = this._getImageSmoothingEnabled();
    this._setImageSmoothingEnabled(!noSmooth);
    this._blender.drawImage(
      source,
      sx,
      sy,
      width,
      height,
      dx,
      dy,
      destinationWidth,
      destinationHeight,
    );
    this._setImageSmoothingEnabled(smoothing);
  }

  /** UI text (labels, rulers); defaults 10px Verdana, start, bottom, black. */
  putAuxilliaryText(
    text: string,
    x: number,
    y: number,
    font?: string | null,
    baseline?: string | null,
    align?: string | null,
    opacity?: number | null,
    color?: string | null,
  ): void {
    const context = this._canvasContext;
    context.globalAlpha = opacity || 1;
    context.fillStyle = color || RGBColor.BLACK.toScreenCSS();
    context.textAlign = (align || "start") as CanvasTextAlign;
    context.font = font || "10px Verdana";
    context.textBaseline = (baseline || "bottom") as CanvasTextBaseline;
    context.fillText(text, x, y);
  }

  /** A number as font means that many px of Verdana. */
  measureText(text: string, font?: string | number | null): TextMetrics {
    if (font && "number" == typeof font) font = font.toFixed(0) + "px Verdana";
    this._canvasContext.font = (font as string) || "10px Verdana";
    return this._canvasContext.measureText(text);
  }

  /**
   * Finds the nearest painted pixel within `tolerance` of `point` (scene
   * units). The reported location keeps the old arithmetic: x without the
   * tolerance offset and y from a fractional row.
   */
  hitTest(point: Point, tolerance: number): ElementData<PaintCanvas, PaintCanvasHit> | null {
    const offset = this.getOffset() as Point;
    const scale = this.getScale() as number;
    const position = new Transform().scaled(scale, scale).mapPoint(point).subtract(offset);
    const x = position.getX();
    const y = position.getY();
    tolerance = Math.ceil(tolerance);
    const size = 1 + 2 * tolerance;
    const data = this._canvasContext.getImageData(x - tolerance, y - tolerance, size, size).data;
    let best = Number.MAX_VALUE;
    let bestIndex = NaN;
    for (let i = 3; i < data.length; i += 4) {
      if (0 !== data[i]) {
        const column = (i >> 2) % size;
        const row = (i >> 2) / size;
        const distance =
          (tolerance - column) * (tolerance - column) + (tolerance - row) * (tolerance - row);
        if (distance < best) {
          best = distance;
          bestIndex = i;
        }
      }
    }
    return Math.sqrt(best) > tolerance
      ? null
      : new ElementData<PaintCanvas, PaintCanvasHit>(this, {
          pixel: data.slice(bestIndex - 3, bestIndex + 1),
          location: new Point(
            x + ((bestIndex >> 2) % size),
            y - tolerance + (bestIndex >> 2) / size,
          ),
        });
  }

  /**
   * Sets or (with null) removes one CSS filter and writes all of them to
   * `context.filter`. Blur radii and drop shadow blurs are converted with
   * the old divisor, amounts become percent, hue-rotate degrees.
   */
  setFilter(filter: string, value: unknown): void {
    if (!Canvas2DPaintCanvas.hasFilters()) return;
    if (!this._filters) this._filters = {};
    if (null === value) Reflect.deleteProperty(this._filters, filter);
    else {
      if (value instanceof Array) {
        if (1 === value.length) value = value[0];
      } else if ("number" != typeof value) {
        // The old code called a global parseNumber here, which doesn't exist.
        throw new ReferenceError("parseNumber is not defined");
      }
      switch (filter) {
        case Filter.Blur:
          this._filters[filter] = String((value as number) / blurDivisor()) + "px";
          break;
        case Filter.Brightness:
        case Filter.Contrast:
        case Filter.GrayScale:
        case Filter.Invert:
        case Filter.Opacity:
        case Filter.Saturate:
        case Filter.Sepia:
          this._filters[filter] = String(100 * (value as number)) + "%";
          break;
        case Filter.SVG: {
          let url = value as string;
          if (!url.startsWith("#")) url = "#".concat(url);
          this._filters[filter] = url;
          break;
        }
        case Filter.DropShadow: {
          const shadow = value as unknown[];
          if (shadow.length < 4) throw new Error("GPaintCanvas.setFilter: Invalid parameter");
          if (!(shadow[3] instanceof Color)) {
            throw new Error("GPaintCanvas.setFilter: Invalid color provided");
          }
          const blur = (shadow[2] as number) / blurDivisor();
          this._filters[filter] =
            String(shadow[0]) +
            "px " +
            String(shadow[1]) +
            "px " +
            String(blur) +
            "px " +
            shadow[3].toScreenCSS(shadow[4] as number);
          break;
        }
        case Filter.HueRotate:
          this._filters[filter] = String(GMath.toDegrees(value as number)) + "deg";
      }
    }
    let css = "";
    for (const name in this._filters)
      css = css.concat(name, "(", this._filters[name] as string, ") ");
    if (!css.length) css = "none";
    this._canvasContext.filter = css;
  }

  /**
   * A copy with the same size, context settings, areas and transforms,
   * and (unless `dontCopyContents`) the same pixels.
   */
  clone(copyBitmap?: boolean, options?: PaintCanvasCloneOptions | null): Canvas2DPaintCanvas {
    const renderPhaseDraw = options && options.renderPhaseDraw;
    const dontCopyContents = options && options.dontCopyContents;
    const copy = new Canvas2DPaintCanvas(void 0, void 0, !!(options && options.persistent));
    const source = this._canvasContext;
    if (RenderScheduler.isRenderPhase() && !renderPhaseDraw) {
      this._cloneRecorded(copy);
    } else {
      const target = copy._canvasContext;
      target.globalAlpha = source.globalAlpha;
      target.fillStyle = source.fillStyle;
      target.strokeStyle = source.strokeStyle;
      target.shadowColor = source.shadowColor;
      target.shadowBlur = source.shadowBlur;
      // The old code wrote shadowOffsetX to a misspelt property
      // ("shadowOFfsetX"), so it was never copied.
      target.shadowOffsetY = source.shadowOffsetY;
      target.lineCap = source.lineCap;
      target.lineJoin = source.lineJoin;
      target.lineWidth = source.lineWidth;
      target.miterLimit = source.miterLimit;
      target.font = source.font;
      target.textAlign = source.textAlign;
      // The old code read a "baseLine" property, which doesn't exist.
      target.textBaseline = (source as unknown as { baseLine: CanvasTextBaseline }).baseLine;
      target.imageSmoothingQuality = source.imageSmoothingQuality;
      target.canvas.width = source.canvas.width;
      target.canvas.height = source.canvas.height;
      const imageRendering =
        source instanceof RecorderStateContext
          ? source.imageRendering
          : source.canvas.style.imageRendering;
      // The old condition's second half asked about the debug recorder,
      // which never existed outside debugging.
      if (target instanceof RecorderStateContext) {
        (target as unknown as { imageRendering: unknown }).imageRendering = imageRendering;
      } else target.canvas.style.imageRendering = imageRendering as string;
      if (this._areas) {
        const areas: Rect[] = [];
        for (let i = 0; i < this._areas.length; i++) {
          const area = this._areas[i] as Rect;
          areas.push(new Rect(area.getX(), area.getY(), area.getWidth(), area.getHeight()));
        }
        copy.prepare(areas);
      }
      copy._blender.globalCompositeOperation = this._blender.globalCompositeOperation;
      copy._offset = this._offset ? new Point(this._offset.getX(), this._offset.getY()) : null;
      copy._origin = this._origin ? new Point(this._origin.getX(), this._origin.getY()) : null;
      copy._transform = this._transform
        ? Transform.deserialize(Transform.serialize(this._transform))
        : null;
      copy._scale = this._scale;
      copy._updateTransform();
      copy._setImageSmoothingEnabled(this._getImageSmoothingEnabled());
      if (!dontCopyContents) copy.drawCanvas(this, 0, 0, 1, CompositeOperator.Copy);
    }
    // The old code called a cloneFast() that GBitmap never had, so copying a
    // bitmap that exists fails the same way.
    if (copyBitmap) {
      copy._bitmap = this._bitmap
        ? (this._bitmap as unknown as { cloneFast(): Bitmap }).cloneFast()
        : null;
    }
    return copy;
  }

  /**
   * The old render-phase clone copied the recording, so replaying it gave
   * the same pixels and the same context state (clips included). The port
   * copies the pixels, the property values and the clip of the areas.
   */
  private _cloneRecorded(copy: Canvas2DPaintCanvas): void {
    const source = this._canvasContext;
    const target = copy._canvasContext;
    target.canvas.width = source.canvas.width;
    target.canvas.height = source.canvas.height;
    const real =
      target instanceof RecorderStateContext ? target.real : (target as CanvasRenderingContext2D);
    real.drawImage(source.canvas, 0, 0);
    let areas: Rect[] | null = null;
    if (this._areas) {
      areas = [];
      for (let i = 0; i < this._areas.length; i++) {
        const area = this._areas[i] as Rect;
        areas.push(new Rect(area.getX(), area.getY(), area.getWidth(), area.getHeight()));
      }
      target.save();
      target.beginPath();
      for (const area of areas) {
        const left = Math.max(0, area.getX());
        const right = Math.min(copy.getWidth(), area.getX() + area.getWidth());
        const top = Math.max(0, area.getY());
        const bottom = Math.min(copy.getHeight(), area.getY() + area.getHeight());
        target.moveTo(left, top);
        target.lineTo(right, top);
        target.lineTo(right, bottom);
        target.lineTo(left, bottom);
        target.lineTo(left, top);
      }
      target.clip();
    }
    copy._areas = areas;
    const values = target as unknown as Record<string, unknown>;
    const from = source as unknown as Record<string, unknown>;
    for (const name of [
      "imageSmoothingQuality",
      "imageSmoothingEnabled",
      "textAlign",
      "textBaseline",
      "font",
      "strokeStyle",
      "miterLimit",
      "fillStyle",
      "filter",
      "lineJoin",
      "lineCap",
      "lineWidth",
      "lineDashOffset",
      "globalAlpha",
      "globalCompositeOperation",
      "shadowColor",
      "shadowBlur",
      "shadowOffsetX",
      "shadowOffsetY",
    ]) {
      values[name] = from[name];
    }
    copy._blender.globalCompositeOperation = this._blender.globalCompositeOperation;
    copy._offset = this._offset ? new Point(this._offset.getX(), this._offset.getY()) : null;
    copy._origin = this._origin ? new Point(this._origin.getX(), this._origin.getY()) : null;
    copy._transform = this._transform
      ? Transform.deserialize(Transform.serialize(this._transform))
      : null;
    copy._scale = this._scale;
    if (copy._transform && copy._origin && null !== copy._scale) copy._updateTransform();
  }

  /** The iterative halving downscale; false when it doesn't apply (no downscale, too big). */
  _drawSmoothImage(
    image: CanvasImageSource,
    x: number,
    y: number,
    width: number,
    height: number,
  ): boolean {
    let transform = this.getTransform(false);
    if (!transform) transform = new Transform();
    const parts = transform.decomposed() as NonNullable<ReturnType<Transform["decomposed"]>>;
    const rest = parts.skew.multiplied(parts.rotate).multiplied(parts.translate);
    const scaleMatrix = parts.scale.getMatrix();
    const scaleX = scaleMatrix[0] as number;
    const scaleY = scaleMatrix[3] as number;
    const factor = Math.abs(1 - scaleX) > Math.abs(1 - scaleY) ? scaleX : scaleY;
    if (factor >= 1) return false;
    let steps = Math.ceil(Math.log(Math.max(1, factor) / Math.min(1, factor)) / Math.log(2));
    if (steps > 20) steps = 20;
    let sourceWidth = width;
    let sourceHeight = height;
    const targetWidth = sourceWidth * scaleX;
    const targetHeight = sourceHeight * scaleY;
    if (
      sourceWidth >= 32768 ||
      sourceHeight >= 32768 ||
      targetWidth >= 32768 ||
      targetHeight >= 32768
    ) {
      return false;
    }
    if (steps > 1) {
      const first = document.createElement("canvas");
      const firstContext = first.getContext("2d") as CanvasRenderingContext2D;
      const second = document.createElement("canvas");
      const secondContext = second.getContext("2d") as CanvasRenderingContext2D;
      first.width = Math.max(targetWidth, sourceWidth);
      first.height = Math.max(targetHeight, sourceHeight);
      second.width = first.width;
      second.height = first.height;
      let step: number;
      for (step = 0; step < steps - 1; step++) {
        let nextWidth = sourceWidth;
        let nextHeight = sourceHeight;
        if (sourceWidth >> 1 >= targetWidth) nextWidth = sourceWidth >> 1;
        if (sourceHeight >> 1 >= targetHeight) nextHeight = sourceHeight >> 1;
        if (0 === step) {
          firstContext.drawImage(
            image,
            0,
            0,
            sourceWidth,
            sourceHeight,
            0,
            0,
            nextWidth,
            nextHeight,
          );
        } else if (step % 2 == 0) {
          firstContext.clearRect(0, 0, sourceWidth, sourceHeight);
          firstContext.drawImage(
            second,
            0,
            0,
            sourceWidth,
            sourceHeight,
            0,
            0,
            nextWidth,
            nextHeight,
          );
        } else {
          secondContext.clearRect(0, 0, sourceWidth, sourceHeight);
          secondContext.drawImage(
            first,
            0,
            0,
            sourceWidth,
            sourceHeight,
            0,
            0,
            nextWidth,
            nextHeight,
          );
        }
        sourceWidth = nextWidth;
        sourceHeight = nextHeight;
      }
      const restMatrix = rest.getMatrix() as [number, number, number, number, number, number];
      this._canvasContext.setTransform(...restMatrix);
      this._blender.drawImage(
        step % 2 == 0 ? second : first,
        x || 0,
        y || 0,
        sourceWidth,
        sourceHeight,
        0,
        0,
        targetWidth,
        targetHeight,
      );
      // Back to the raw transform, without scale and origin (as the old code did).
      const raw = (this._transform as Transform).getMatrix() as [
        number,
        number,
        number,
        number,
        number,
        number,
      ];
      this._canvasContext.setTransform(...raw);
    } else {
      const sized = image as { width: number; height: number };
      this._blender.drawImage(image, x || 0, y || 0, sized.width, sized.height);
    }
    return true;
  }

  _updateTransform(): void {
    const matrix = this.getTransform(false).getMatrix() as [
      number,
      number,
      number,
      number,
      number,
      number,
    ];
    try {
      this._canvasContext.setTransform(...matrix);
    } catch {
      console.warn("Invalid bitmap or Transformation matrix");
    }
  }

  _convertStyle(style: PaintStyle): string | CanvasGradient | CanvasPattern {
    return style instanceof Color ? Color.rgbToHtmlHex(style.toScreen()) : style;
  }

  _convertImage(image: PaintImage): CanvasImageSource {
    if (
      image instanceof HTMLImageElement ||
      image instanceof Image ||
      image instanceof HTMLCanvasElement ||
      ("undefined" != typeof OffscreenCanvas && image instanceof OffscreenCanvas)
    ) {
      return image;
    }
    if (image instanceof Canvas2DPaintCanvas) return image._canvasContext.canvas;
    if (image instanceof Bitmap) return image._canvasContext.canvas;
    throw new Error("Not Supported.");
  }

  /** The wrapped context of a canvas the old code recorded, or null for a plain canvas. */
  getRendererContext(): RecorderStateContext | null {
    return this._canvasContext instanceof RecorderStateContext ? this._canvasContext : null;
  }

  /** Painting is synchronous now, so a canvas is always rendered. */
  isRendered(): boolean {
    return true;
  }

  _getImageSmoothingEnabled(): boolean {
    for (const name of SMOOTHING_PROPERTIES) {
      if (Object.prototype.hasOwnProperty.call(CanvasRenderingContext2D.prototype, name)) {
        return (this._canvasContext as unknown as Record<string, boolean>)[name] as boolean;
      }
    }
    return false;
  }

  _setImageSmoothingEnabled(enabled: boolean): boolean {
    for (const name of SMOOTHING_PROPERTIES) {
      if (Object.prototype.hasOwnProperty.call(CanvasRenderingContext2D.prototype, name)) {
        (this._canvasContext as unknown as Record<string, boolean>)[name] = enabled;
        break;
      }
    }
    return false;
  }
}

Object.assign(Canvas2DPaintCanvas.prototype, {
  _bitmap: null,
  _transform: null,
  _offset: null,
  _origin: null,
  _scale: null,
  _areas: null,
  _filters: null,
  _isMasked: 0,
});

/** The paint canvas class under its old name (minus the G). */
export const PaintCanvas = Canvas2DPaintCanvas;

registerPaintCanvasClass(Canvas2DPaintCanvas);

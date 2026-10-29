// Old: chunk.vendor.js module 283 (GAngularGradient).
import { registerClass } from "../core/object.ts";
import { RGBColor } from "../color/rgb-color.ts";
import { GMath } from "../math/math.ts";
import { Point } from "../math/point.ts";
import { Rect } from "../math/rect.ts";
import type { Transform } from "../math/transform.ts";
import { Canvas2DPaintCanvas } from "../paint/paint-canvas.ts";
import { freezePatternSource } from "../paint/pattern-cache.ts";
import { RenderScheduler } from "../paint/render-scheduler.ts";
import { RendererConfig } from "../paint/renderer-config.ts";
import { GLContext } from "../paint/webgl/gl-context.ts";
import { WebGLRenderer, type ShaderClass } from "../paint/webgl/webgl-renderer.ts";
import { registerAngularGradient } from "../scene/shape.ts";
import { Gradient, type GradientBlob, type GradientStop } from "./gradient.ts";
import { Pattern } from "./pattern.ts";
import {
  GLAngularGradientShader,
  type AngularGradientStop,
} from "./webgl/shaders/gl-angular-gradient-shader.ts";

/** Gradient canvases up to this many pixels (16 MB) are kept for the next paint. */
const MAX_KEPT_PIXELS = 4 * 1024 * 1024;

/**
 * A conic gradient around the focal point (fx, fy), starting at angle
 * `_a0`. Canvas 2D has no conic gradients, so it is painted by a WebGL
 * shader into a canvas (getGradient) that is then used as a texture. Its
 * scale defaults to 0.5.
 *
 * Quirk, kept: a new gradient starts at -PI, but a saved one without "a0"
 * loads with 0, and an a0 of 0 isn't written. Old files with an end angle
 * "a1" are converted by squeezing the stops and adding a transparent tail.
 */
export class AngularGradient extends WebGLRenderer(Gradient) {
  static {
    registerClass(this, "GAngularGradient");
    Pattern.register("A", this);
    // GShape maps an angular gradient fill to a square around the shape.
    registerAngularGradient(this);
  }

  static override equals(a: unknown, b: unknown, ignoreTransform?: boolean): boolean {
    return (
      !(
        !(a instanceof AngularGradient && b instanceof AngularGradient) ||
        (!ignoreTransform && a._a0 !== b._a0)
      ) && Gradient.equals(a, b, ignoreTransform)
    );
  }

  _a0: number;
  /** The last canvas getGradient painted, and what it was painted from. */
  declare _painted: { key: string; canvas: Canvas2DPaintCanvas } | null;

  constructor(
    stops?: readonly GradientStop[] | null,
    scale?: number,
    fx?: number,
    fy?: number,
    a0?: number,
    transform?: Transform | null,
  ) {
    super(stops, scale, fx, fy, transform);
    this._scale = "number" == typeof scale ? scale : 0.5;
    this._a0 = "number" == typeof a0 ? a0 : -Math.PI;
  }

  override getShaderClass(): ShaderClass {
    return GLAngularGradientShader as unknown as ShaderClass;
  }

  /** A data url of the gradient painted at `width` x `height` (default 20 x 20). */
  override asCSSBackground(opacity?: number, width?: unknown, height?: unknown): string {
    if (RenderScheduler.isDebug()) return RGBColor.WHITE.asCSSBackground();
    if (RenderScheduler.isRenderPhase()) {
      throw new Error("Cannot get CSS background, renderer is busy.");
    }
    const canvas = this.getGradient(
      opacity || 1,
      new Rect(0, 0, (width as number) || 20, (height as number) || 20),
    );
    return canvas
      ? "url(" + (canvas._canvasContext.canvas as HTMLCanvasElement).toDataURL() + ")"
      : RGBColor.WHITE.asCSSBackground();
  }

  override clone(): AngularGradient {
    return new AngularGradient(
      this.getClonedStops(),
      this._scale,
      this._fx,
      this._fy,
      this._a0,
      this._transform,
    );
  }

  destroy(): void {
    this._destroy();
  }

  override _serializeToBlob(): GradientBlob {
    const blob = super._serializeToBlob();
    if (blob && !GMath.isEqualEps(this._a0, 0)) blob.a0 = this._a0;
    return blob;
  }

  /**
   * The gradient painted over `rect`'s size with `opacity`; null without a
   * size or WebGL. Not in the old app: the canvas painted last is handed
   * out again while the size, the opacity and everything the shader reads
   * are the same (the shader paints the same pixels for them), so callers
   * must not draw into it.
   */
  getGradient(opacity: number, rect?: Rect | null): Canvas2DPaintCanvas | null {
    if (!rect || rect.isEmpty()) return null;
    // What prepareShader() checks first.
    if (!GLContext.getGLContext()) return null;
    const stops = this._getRGBStops();
    const key = this._paintKey(opacity, rect, stops);
    if (this._painted && this._painted.key === key) return this._painted.canvas;
    let canvas: Canvas2DPaintCanvas | null = null;
    if (this.prepareShader()) {
      canvas = new Canvas2DPaintCanvas();
      canvas.resize(Math.round(rect.getWidth()), Math.round(rect.getHeight()));
      canvas.prepare();
      canvas.setOrigin(new Point(0, 0));
      canvas.setOffset(new Point(0, 0));
      this.drawShader(
        canvas,
        {
          cx: this._fx,
          cy: this._fy,
          a0: this._a0,
          a1: this._a0 + GMath.PI2,
          stops,
          opacity,
        },
        this._scale,
        rect.getWidth(),
        rect.getHeight(),
      );
      if (RendererConfig.DELETE_BLEND_AND_GRADIENT_TEXTURES_AFTER_DRAW) this.destroy();
      if (canvas.getWidth() * canvas.getHeight() <= MAX_KEPT_PIXELS) {
        this._painted = { key, canvas };
        freezePatternSource(canvas._canvasContext.canvas);
      } else this._painted = null;
    }
    return canvas;
  }

  /** Everything getGradient's painting depends on, as a string. */
  _paintKey(opacity: number, rect: Rect, stops: AngularGradientStop[]): string {
    const parts: unknown[] = [
      rect.getWidth(),
      rect.getHeight(),
      opacity,
      this._fx,
      this._fy,
      this._a0,
      this._scale,
      this.renderMethod,
      Canvas2DPaintCanvas.getScreenDPI(),
    ];
    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i] as AngularGradientStop;
      parts.push(stop.position, stop.color.getValue().join(","), stop.opacity);
    }
    return parts.join(" ");
  }

  override _deserializeFromBlob(blob: GradientBlob): void {
    super._deserializeFromBlob(blob);
    this._a0 = Object.hasOwn(blob, "a0") ? (blob.a0 as number) : 0;
    if (Object.hasOwn(blob, "a1")) {
      const factor = ((blob.a1 as number) - this._a0) / GMath.PI2;
      for (let i = 0; i < this._stops.length; ++i) {
        (this._stops[i] as GradientStop).position *= factor;
      }
      const last = this._stops[this._stops.length - 1] as GradientStop;
      if (last.position < 0.999999) {
        this._stops.push({ position: last.position + 1e-6, color: last.color, opacity: 0 });
        this._stops.push({ position: 1, color: last.color, opacity: 0 });
      }
    }
  }

  override isWebGL(): boolean {
    return true;
  }

  override toString(): string {
    return "[Object GAngularGradient]";
  }

  /** Cloned stops with every color as RGB (the shader reads 0-255 channels). */
  _getRGBStops(): AngularGradientStop[] {
    const stops = this.getClonedStops();
    stops.forEach((stop) => {
      if (!(stop.color instanceof RGBColor)) stop.color = new RGBColor(stop.color.toScreen());
    });
    return stops as unknown as AngularGradientStop[];
  }
}

AngularGradient.prototype._isAffectedByGLBug = true;
AngularGradient.prototype._painted = null;

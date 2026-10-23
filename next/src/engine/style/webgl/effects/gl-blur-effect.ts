// Old: chunk.vendor.js module 282 (GGLBlurEffect).
//
// Gaussian blur on WebGL, with a CSS blur filter fast path. With `clip` the
// blur stays inside the shape (GLClipBlurShader) and adds no padding.
import { Locale } from "../../../core/locale/locale.ts";
import { registerGLBlurEffect } from "../../../paint/late-bound.ts";
import { Canvas2DPaintCanvas, type PaintCanvas } from "../../../paint/paint-canvas.ts";
import { GLContext } from "../../../paint/webgl/gl-context.ts";
import type { ShaderClass } from "../../../paint/webgl/webgl-renderer.ts";
import { registerNodeClass } from "../../../scene/node.ts";
import type { EffectPadding } from "../../effect.ts";
import type { EffectShaderHost } from "../shaders/effect-shader-host.ts";
import { GLBlurShader } from "../shaders/gl-blur-shader.ts";
import { GLClipBlurShader } from "../shaders/gl-clip-blur-shader.ts";
import { WebGLEffect, type ParameterRange } from "../webgl-effect.ts";

export type GLBlurEffectParameters = { radius: number; clip: boolean };

const GeometryProperties = {
  shp: {
    radius: 5,
    clip: false,
  },
  sh: "GGLBlurShader",
};

export class GLBlurEffect extends WebGLEffect {
  static {
    registerNodeClass(this, "GGLBlurEffect", "GGLBlurEffect");
    registerGLBlurEffect(this);
  }

  static override GeometryProperties: Record<string, unknown> = GeometryProperties;

  static RANGES: Record<string, ParameterRange> = {
    radius: [0, 50],
  };

  declare $shp: GLBlurEffectParameters;
  declare _blurShader: GLBlurShader | null;
  declare _clipBlurShader: GLClipBlurShader | null;

  constructor() {
    super();
    this._setDefaultProperties(GeometryProperties);
  }

  setAffectedByGLBug(affected: boolean): void {
    this._isAffectedByGLBug = affected;
  }

  override getEffectPadding(): EffectPadding {
    return this.$shp.clip ? 0 : this.$shp.radius;
  }

  override getAbsoluteEffectPadding(): number {
    return this.$shp.radius;
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GGLBlurEffect", "name", this.getNodeName()) as string;
  }

  /** The CSS blur filter does the same (without clip); returns the radius when it is 0. */
  override canApplyNativeEffect(): boolean {
    return (this.$shp.radius && !this.$shp.clip && Canvas2DPaintCanvas.hasFilters()) as boolean;
  }

  override applyNativeEffect(
    canvas: PaintCanvas,
    target?: unknown,
    rootCanvas?: unknown,
    scale?: number,
  ): void {
    canvas.setFilter(Canvas2DPaintCanvas.Filter.Blur, this.$shp.radius * (scale as number));
  }

  override removeNativeEffect(canvas: PaintCanvas): void {
    canvas.setFilter(Canvas2DPaintCanvas.Filter.Blur, null);
  }

  /** Keeps one shader of each kind and switches between them when `clip` changes. */
  override prepareShader(): boolean {
    if (!GLContext.getGLContext()) return false;
    const host = this as unknown as EffectShaderHost;
    if (this.$shp.clip) {
      if (!this._clipBlurShader) this._clipBlurShader = new GLClipBlurShader(host);
      if (!(this.shaderInstance instanceof GLClipBlurShader)) {
        this.shaderInstance = this._clipBlurShader;
      }
    } else {
      if (!this._blurShader) this._blurShader = new GLBlurShader(host);
      if (!(this.shaderInstance instanceof GLBlurShader)) this.shaderInstance = this._blurShader;
    }
    return super.prepareShader();
  }

  override getShaderClass(): ShaderClass {
    return (this.$shp.clip ? GLClipBlurShader : GLBlurShader) as unknown as ShaderClass;
  }

  override _destroy(): void {
    if (this._blurShader) {
      this._blurShader.destroy();
      this._blurShader = null;
    }
    if (this._clipBlurShader) {
      this._clipBlurShader.destroy();
      this._clipBlurShader = null;
    }
    this.shaderInstance = null;
    super._destroy();
  }
}

GLBlurEffect.prototype._blurShader = null;
GLBlurEffect.prototype._clipBlurShader = null;

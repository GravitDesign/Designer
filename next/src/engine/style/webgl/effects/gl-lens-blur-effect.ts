// Old: chunk.vendor.js module 1023 (GGLLensBlurEffect).
import { Locale } from "../../../core/locale/locale.ts";
import { registerNodeClass } from "../../../scene/node.ts";
import type { EffectPadding } from "../../effect.ts";
import type { LensBlurParameters } from "../shaders/gl-lens-blur-shader.ts";
import { WebGLEffect, type ParameterRange } from "../webgl-effect.ts";

const GeometryProperties = {
  shp: {
    radius: 10,
    brightness: 0,
    angle: 0,
  },
  sh: "GGLLensBlurShader",
};

export class GLLensBlurEffect extends WebGLEffect {
  static {
    registerNodeClass(this, "GGLLensBlurEffect", "GGLLensBlurEffect");
  }

  static override GeometryProperties: Record<string, unknown> = GeometryProperties;

  static RANGES: Record<string, ParameterRange> = {
    radius: [0, 50],
    brightness: [-1, 1],
    angle: [-Math.PI, Math.PI],
  };

  declare $shp: LensBlurParameters;

  constructor() {
    super();
    this._setDefaultProperties(GeometryProperties);
  }

  override getEffectPadding(): EffectPadding {
    return this.$shp.radius;
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GGLLensBlurEffect", "name", this.getNodeName()) as string;
  }
}

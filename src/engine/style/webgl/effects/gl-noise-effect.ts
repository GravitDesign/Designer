// Old: chunk.vendor.js module 661 (GGLNoiseEffect).
import { Locale } from "../../../core/locale/locale.ts";
import { registerNodeClass } from "../../../scene/node.ts";
import type { EffectPadding } from "../../effect.ts";
import type { NoiseParameters } from "../shaders/gl-noise-shader.ts";
import { WebGLEffect, type ParameterRange } from "../webgl-effect.ts";

const GeometryProperties = {
  shp: {
    amount: 0.5,
  },
  sh: "GGLNoiseShader",
};

export class GLNoiseEffect extends WebGLEffect {
  static {
    registerNodeClass(this, "GGLNoiseEffect", "GGLNoiseEffect");
  }

  static override GeometryProperties: Record<string, unknown> = GeometryProperties;

  static RANGES: Record<string, ParameterRange> = {
    amount: [0, 1],
  };

  declare $shp: NoiseParameters;

  constructor() {
    super();
    this._setDefaultProperties(GeometryProperties);
  }

  override getEffectPadding(): EffectPadding {
    return 0;
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GGLNoiseEffect", "name", this.getNodeName()) as string;
  }
}

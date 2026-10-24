// Old: chunk.vendor.js module 1021 (GGLVibranceEffect).
//
// Boosts (or lowers) the saturation of dull colours (glfx.js).
import { Locale } from "../../../core/locale/locale.ts";
import { registerNodeClass } from "../../../scene/node.ts";
import type { EffectPadding } from "../../effect.ts";
import type { VibranceParameters } from "../shaders/gl-vibrance-shader.ts";
import { WebGLEffect, type ParameterRange } from "../webgl-effect.ts";

const GeometryProperties = {
  shp: {
    amount: 0.5,
  },
  sh: "GGLVibranceShader",
};

export class GLVibranceEffect extends WebGLEffect {
  static {
    registerNodeClass(this, "GGLVibranceEffect", "GGLVibranceEffect");
  }

  static override GeometryProperties: Record<string, unknown> = GeometryProperties;

  static RANGES: Record<string, ParameterRange> = {
    amount: [-1, 1],
  };

  declare $shp: VibranceParameters;

  constructor() {
    super();
    this._setDefaultProperties(GeometryProperties);
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GGLVibranceEffect", "name", this.getNodeName()) as string;
  }

  override getEffectPadding(): EffectPadding {
    return 0;
  }
}

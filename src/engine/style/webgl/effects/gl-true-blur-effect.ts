// Old: chunk.vendor.js module 1013 (GGLTrueBlurEffect).
//
// A one-pass blur; pads by its radius.
import { Locale } from "../../../core/locale/locale.ts";
import { registerNodeClass } from "../../../scene/node.ts";
import type { EffectPadding } from "../../effect.ts";
import type { TrueBlurParameters } from "../shaders/gl-true-blur-shader.ts";
import { WebGLEffect, type ParameterRange } from "../webgl-effect.ts";

const GeometryProperties = {
  shp: {
    radius: 5,
  },
  sh: "GGLTrueBlurShader",
};

export class GLTrueBlurEffect extends WebGLEffect {
  static {
    registerNodeClass(this, "GGLTrueBlurEffect", "GGLTrueBlurEffect");
  }

  static override GeometryProperties: Record<string, unknown> = GeometryProperties;

  static RANGES: Record<string, ParameterRange> = {
    radius: [0, 50],
  };

  declare $shp: TrueBlurParameters;

  constructor() {
    super();
    this._setDefaultProperties(GeometryProperties);
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GGLTrueBlurEffect", "name", this.getNodeName()) as string;
  }

  override getEffectPadding(): EffectPadding {
    return this.$shp.radius;
  }
}

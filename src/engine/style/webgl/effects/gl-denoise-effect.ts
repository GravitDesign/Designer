// Old: chunk.vendor.js module 1014 (GGLDenoiseEffect).
import { Locale } from "../../../core/locale/locale.ts";
import { registerNodeClass } from "../../../scene/node.ts";
import type { EffectPadding } from "../../effect.ts";
import type { DenoiseParameters } from "../shaders/gl-denoise-shader.ts";
import { WebGLEffect, type ParameterRange } from "../webgl-effect.ts";

const GeometryProperties = {
  shp: {
    exponent: 10,
  },
  sh: "GGLDenoiseShader",
};

export class GLDenoiseEffect extends WebGLEffect {
  static {
    registerNodeClass(this, "GGLDenoiseEffect", "GGLDenoiseEffect");
  }

  static override GeometryProperties: Record<string, unknown> = GeometryProperties;

  static RANGES: Record<string, ParameterRange> = {
    exponent: [0, 50],
  };

  declare $shp: DenoiseParameters;

  constructor() {
    super();
    this._setDefaultProperties(GeometryProperties);
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GGLDenoiseEffect", "name", this.getNodeName()) as string;
  }

  override getEffectPadding(): EffectPadding {
    return 0;
  }

  override isAffectedByChildren(): boolean {
    return true;
  }
}

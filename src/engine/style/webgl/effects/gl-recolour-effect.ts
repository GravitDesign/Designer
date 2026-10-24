// Old: chunk.vendor.js module 1025 (GGLRecolourEffect).
import { Locale } from "../../../core/locale/locale.ts";
import { registerNodeClass } from "../../../scene/node.ts";
import type { EffectPadding } from "../../effect.ts";
import type { RecolourParameters } from "../shaders/gl-recolour-shader.ts";
import { WebGLEffect, type ParameterRange } from "../webgl-effect.ts";

const GeometryProperties = {
  shp: {
    hue: 1,
    saturation: 1,
  },
  sh: "GGLRecolourShader",
};

export class GLRecolourEffect extends WebGLEffect {
  static {
    registerNodeClass(this, "GGLRecolourEffect", "GGLRecolourEffect");
  }

  static override GeometryProperties: Record<string, unknown> = GeometryProperties;

  static RANGES: Record<string, ParameterRange> = {
    hue: [0, 1],
    saturation: [0, 1],
  };

  declare $shp: RecolourParameters;

  constructor() {
    super();
    this._setDefaultProperties(GeometryProperties);
  }

  override getEffectPadding(): EffectPadding {
    return 0;
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GGLRecolourEffect", "name", this.getNodeName()) as string;
  }
}

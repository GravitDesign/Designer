// Old: chunk.vendor.js module 1012 (GGLBloomEffect).
import { Locale } from "../../../core/locale/locale.ts";
import { registerNodeClass } from "../../../scene/node.ts";
import type { EffectPadding } from "../../effect.ts";
import type { BloomParameters } from "../shaders/gl-bloom-shader.ts";
import { WebGLEffect, type ParameterRange } from "../webgl-effect.ts";

const GeometryProperties = {
  shp: {
    bloomIntensity: 1.25,
    baseIntensity: 1,
    bloomSaturation: 1,
    baseSaturation: 1,
    blurRadius: 4,
    bloomThreshold: 0.25,
  },
  sh: "GGLBloomShader",
};

export class GLBloomEffect extends WebGLEffect {
  static {
    registerNodeClass(this, "GGLBloomEffect", "GGLBloomEffect");
  }

  static override GeometryProperties: Record<string, unknown> = GeometryProperties;

  static RANGES: Record<string, ParameterRange> = {
    bloomIntensity: [0, 2],
    baseIntensity: [0, 2],
    bloomSaturation: [0, 2],
    baseSaturation: [0, 2],
    blurRadius: [0, 50],
    bloomThreshold: [0, 0.99],
  };

  declare $shp: BloomParameters;

  constructor() {
    super();
    this._setDefaultProperties(GeometryProperties);
  }

  override getEffectPadding(): EffectPadding {
    return this.$shp.blurRadius;
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GGLBloomEffect", "name", this.getNodeName()) as string;
  }
}

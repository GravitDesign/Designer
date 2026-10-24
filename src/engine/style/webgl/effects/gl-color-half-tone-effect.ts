// Old: chunk.vendor.js module 1006 (GGLColorHalfToneEffect).
import { Locale } from "../../../core/locale/locale.ts";
import { registerNodeClass } from "../../../scene/node.ts";
import type { EffectPadding } from "../../effect.ts";
import type { ColorHalftoneParameters } from "../shaders/gl-color-halftone-shader.ts";
import { WebGLEffect, type ParameterRange } from "../webgl-effect.ts";

const GeometryProperties = {
  shp: {
    centerX: 50,
    centerY: 50,
    angle: 0,
    size: 50,
  },
  sh: "GGLColorHalfToneShader",
};

export class GLColorHalfToneEffect extends WebGLEffect {
  static {
    registerNodeClass(this, "GGLColorHalfToneEffect", "GGLColorHalfToneEffect");
  }

  static override GeometryProperties: Record<string, unknown> = GeometryProperties;

  static RANGES: Record<string, ParameterRange> = {
    centerX: [0, 100],
    centerY: [0, 100],
    angle: [0, Math.PI / 2],
    size: [3, 20],
  };

  declare $shp: ColorHalftoneParameters;

  constructor() {
    super();
    this._setDefaultProperties(GeometryProperties);
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GGLColorHalfToneEffect", "name", this.getNodeName()) as string;
  }

  override getEffectPadding(): EffectPadding {
    return 0;
  }
}

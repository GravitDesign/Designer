// Old: chunk.vendor.js module 1019 (GGLInkEffect).
//
// Darkens edges like ink (glfx.js).
import { Locale } from "../../../core/locale/locale.ts";
import { registerNodeClass } from "../../../scene/node.ts";
import type { EffectPadding } from "../../effect.ts";
import type { InkParameters } from "../shaders/gl-ink-shader.ts";
import { WebGLEffect, type ParameterRange } from "../webgl-effect.ts";

const GeometryProperties = {
  shp: {
    strength: 0.5,
  },
  sh: "GGLInkShader",
};

export class GLInkEffect extends WebGLEffect {
  static {
    registerNodeClass(this, "GGLInkEffect", "GGLInkEffect");
  }

  static override GeometryProperties: Record<string, unknown> = GeometryProperties;

  static RANGES: Record<string, ParameterRange> = {
    strength: [0, 1],
  };

  declare $shp: InkParameters;

  constructor() {
    super();
    this._setDefaultProperties(GeometryProperties);
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GGLInkEffect", "name", this.getNodeName()) as string;
  }

  override getEffectPadding(): EffectPadding {
    return 0;
  }
}

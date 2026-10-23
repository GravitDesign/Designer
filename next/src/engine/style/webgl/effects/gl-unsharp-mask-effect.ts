// Old: chunk.vendor.js module 1020 (GGLUnsharpMaskEffect).
//
// Sharpens by unsharp masking (glfx.js). The defaults do nothing.
import { Locale } from "../../../core/locale/locale.ts";
import { registerNodeClass } from "../../../scene/node.ts";
import type { EffectPadding } from "../../effect.ts";
import type { UnsharpMaskParameters } from "../shaders/gl-unsharp-mask-shader.ts";
import { WebGLEffect, type ParameterRange } from "../webgl-effect.ts";

const GeometryProperties = {
  shp: {
    radius: 0,
    strength: 0,
  },
  sh: "GGLUnsharpMaskShader",
};

export class GLUnsharpMaskEffect extends WebGLEffect {
  static {
    registerNodeClass(this, "GGLUnsharpMaskEffect", "GGLUnsharpMaskEffect");
  }

  static override GeometryProperties: Record<string, unknown> = GeometryProperties;

  static RANGES: Record<string, ParameterRange> = {
    radius: [0, 200],
    strength: [0, 5],
  };

  declare $shp: UnsharpMaskParameters;

  constructor() {
    super();
    this._setDefaultProperties(GeometryProperties);
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GGLUnsharpMaskEffect", "name", this.getNodeName()) as string;
  }

  override getEffectPadding(): EffectPadding {
    return 0;
  }
}

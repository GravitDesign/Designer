// Old: chunk.vendor.js module 1011 (GGLToonEffect).
//
// Cartoon look: black edges and fewer colours.
import { Locale } from "../../../core/locale/locale.ts";
import { registerNodeClass } from "../../../scene/node.ts";
import type { EffectPadding } from "../../effect.ts";
import type { ToonParameters } from "../shaders/gl-toon-shader.ts";
import { WebGLEffect, type ParameterRange } from "../webgl-effect.ts";

const GeometryProperties = {
  shp: {
    threshold: 0.2,
    quantization: 10,
  },
  sh: "GGLToonShader",
};

export class GLToonEffect extends WebGLEffect {
  static {
    registerNodeClass(this, "GGLToonEffect", "GGLToonEffect");
  }

  static override GeometryProperties: Record<string, unknown> = GeometryProperties;

  static RANGES: Record<string, ParameterRange> = {
    threshold: [0, 2],
    quantization: [0, 20],
  };

  declare $shp: ToonParameters;

  constructor() {
    super();
    this._setDefaultProperties(GeometryProperties);
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GGLToonEffect", "name", this.getNodeName()) as string;
  }

  override getEffectPadding(): EffectPadding {
    return 0;
  }
}

// Old: chunk.vendor.js module 1022 (GGLSketchEffect).
import { Locale } from "../../../core/locale/locale.ts";
import { registerNodeClass } from "../../../scene/node.ts";
import type { EffectPadding } from "../../effect.ts";
import type { SketchParameters } from "../shaders/gl-sketch-shader.ts";
import { WebGLEffect, type ParameterRange } from "../webgl-effect.ts";

const GeometryProperties = {
  shp: {
    strength: 0.5,
  },
  sh: "GGLSketchShader",
};

export class GLSketchEffect extends WebGLEffect {
  static {
    registerNodeClass(this, "GGLSketchEffect", "GGLSketchEffect");
  }

  static override GeometryProperties: Record<string, unknown> = GeometryProperties;

  static RANGES: Record<string, ParameterRange> = {
    strength: [0, 2],
  };

  declare $shp: SketchParameters;

  constructor() {
    super();
    this._setDefaultProperties(GeometryProperties);
  }

  override getEffectPadding(): EffectPadding {
    return 0;
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GGLSketchEffect", "name", this.getNodeName()) as string;
  }
}

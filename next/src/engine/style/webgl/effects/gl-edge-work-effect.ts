// Old: chunk.vendor.js module 1005 (GGLEdgeWorkEffect).
import { Locale } from "../../../core/locale/locale.ts";
import { registerNodeClass } from "../../../scene/node.ts";
import type { EffectPadding } from "../../effect.ts";
import type { EdgeWorkParameters } from "../shaders/gl-edge-work-shader.ts";
import { WebGLEffect, type ParameterRange } from "../webgl-effect.ts";

const GeometryProperties = {
  shp: {
    radius: 10,
  },
  sh: "GGLEdgeWorkShader",
};

export class GLEdgeWorkEffect extends WebGLEffect {
  static {
    registerNodeClass(this, "GGLEdgeWorkEffect", "GGLEdgeWorkEffect");
  }

  static override GeometryProperties: Record<string, unknown> = GeometryProperties;

  static RANGES: Record<string, ParameterRange> = {
    radius: [1, 200],
  };

  declare $shp: EdgeWorkParameters;

  constructor() {
    super();
    this._setDefaultProperties(GeometryProperties);
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GGLEdgeWorkEffect", "name", this.getNodeName()) as string;
  }

  override getEffectPadding(): EffectPadding {
    return 0;
  }

  override isAffectedByChildren(): boolean {
    return true;
  }
}

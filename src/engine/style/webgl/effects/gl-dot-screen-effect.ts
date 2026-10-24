// Old: chunk.vendor.js module 731 (GGLDotScreenEffect).
import { Locale } from "../../../core/locale/locale.ts";
import { registerNodeClass } from "../../../scene/node.ts";
import type { EffectPadding } from "../../effect.ts";
import type { DotScreenParameters } from "../shaders/gl-dot-screen-shader.ts";
import { WebGLEffect, type ParameterRange } from "../webgl-effect.ts";

const GeometryProperties = {
  shp: {
    centerX: 50,
    centerY: 50,
    angle: 0,
    size: 10,
  },
  sh: "GGLDotScreenShader",
};

export class GLDotScreenEffect extends WebGLEffect {
  static {
    registerNodeClass(this, "GGLDotScreenEffect", "GGLDotScreenEffect");
  }

  static override GeometryProperties: Record<string, unknown> = GeometryProperties;

  static RANGES: Record<string, ParameterRange> = {
    centerX: [0, 100],
    centerY: [0, 100],
    size: [0, 20],
    angle: [0, Math.PI / 2],
  };

  declare $shp: DotScreenParameters;

  constructor() {
    super();
    this._setDefaultProperties(GeometryProperties);
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GGLDotScreenEffect", "name", this.getNodeName()) as string;
  }

  override getEffectPadding(): EffectPadding {
    return 0;
  }

  override isAffectedByChildren(): boolean {
    return true;
  }
}

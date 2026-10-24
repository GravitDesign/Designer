// Old: chunk.vendor.js module 1034 (GGLFisheyeEffect).
//
// The shader name is spelled "GGLFishEyeShader"; the lookup lower-cases it.
import { Locale } from "../../../core/locale/locale.ts";
import { registerNodeClass } from "../../../scene/node.ts";
import type { EffectPadding } from "../../effect.ts";
import type { FisheyeParameters } from "../shaders/gl-fisheye-shader.ts";
import { WebGLEffect, type ParameterRange } from "../webgl-effect.ts";

const GeometryProperties = {
  shp: {
    strength: 50,
  },
  sh: "GGLFishEyeShader",
};

export class GLFisheyeEffect extends WebGLEffect {
  static {
    registerNodeClass(this, "GGLFisheyeEffect", "GGLFisheyeEffect");
  }

  static override GeometryProperties: Record<string, unknown> = GeometryProperties;

  static RANGES: Record<string, ParameterRange> = {
    strength: [-100, 100],
  };

  declare $shp: FisheyeParameters;

  constructor() {
    super();
    this._setDefaultProperties(GeometryProperties);
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GGLFisheyeEffect", "name", this.getNodeName()) as string;
  }

  override getEffectPadding(): EffectPadding {
    return 100;
  }

  override getAbsoluteEffectPadding(): number {
    return this.$shp.strength < -50 ? 100 + Math.abs(this.$shp.strength + 50) : 100;
  }

  override isAffectedByChildren(): boolean {
    return true;
  }
}

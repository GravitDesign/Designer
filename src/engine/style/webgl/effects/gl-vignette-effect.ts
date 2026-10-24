// Old: chunk.vendor.js module 1017 (GGLVignetteEffect).
//
// Darkens the corners (glfx.js).
import { Locale } from "../../../core/locale/locale.ts";
import { registerNodeClass } from "../../../scene/node.ts";
import type { EffectPadding } from "../../effect.ts";
import type { VignetteParameters } from "../shaders/gl-vignette-shader.ts";
import { WebGLEffect, type ParameterRange } from "../webgl-effect.ts";

const GeometryProperties = {
  shp: {
    size: 0.2,
    amount: 0.5,
  },
  sh: "GGLVignetteShader",
};

export class GLVignetteEffect extends WebGLEffect {
  static {
    registerNodeClass(this, "GGLVignetteEffect", "GGLVignetteEffect");
  }

  static override GeometryProperties: Record<string, unknown> = GeometryProperties;

  static RANGES: Record<string, ParameterRange> = {
    size: [0, 1],
    amount: [0, 1],
  };

  declare $shp: VignetteParameters;

  constructor() {
    super();
    this._setDefaultProperties(GeometryProperties);
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GGLVignetteEffect", "name", this.getNodeName()) as string;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature took the bounding box
  override getEffectPadding(bbox?: unknown): EffectPadding {
    return 0;
  }
}

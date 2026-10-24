// Old: chunk.vendor.js module 1024 (GGLTiltShiftEffect).
import { Locale } from "../../../core/locale/locale.ts";
import { registerNodeClass } from "../../../scene/node.ts";
import type { EffectPadding } from "../../effect.ts";
import type { TiltShiftParameters } from "../shaders/gl-tilt-shift-shader.ts";
import { WebGLEffect, type ParameterRange } from "../webgl-effect.ts";

const GeometryProperties = {
  shp: {
    startX: 25,
    startY: 50,
    endX: 75,
    endY: 50,
    blurRadius: 10,
    gradientRadius: 30,
  },
  sh: "GGLTiltShiftShader",
};

export class GLTiltShiftEffect extends WebGLEffect {
  static {
    registerNodeClass(this, "GGLTiltShiftEffect", "GGLTiltShiftEffect");
  }

  static override GeometryProperties: Record<string, unknown> = GeometryProperties;

  static RANGES: Record<string, ParameterRange> = {
    startX: [0, 100],
    startY: [0, 100],
    endX: [0, 100],
    endY: [0, 100],
    blurRadius: [0, 50],
    gradientRadius: [0, 100],
  };

  declare $shp: TiltShiftParameters;

  constructor() {
    super();
    this._setDefaultProperties(GeometryProperties);
  }

  override getEffectPadding(): EffectPadding {
    return this.$shp.blurRadius;
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GGLTiltShiftEffect", "name", this.getNodeName()) as string;
  }
}

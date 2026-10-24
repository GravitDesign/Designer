// Old: chunk.vendor.js module 1033 (GGLDrunkEffect).
//
// No padding of its own, but the absolute padding (used when an ancestor
// has the effect) covers the wobble.
import { Locale } from "../../../core/locale/locale.ts";
import { registerNodeClass } from "../../../scene/node.ts";
import type { EffectPadding } from "../../effect.ts";
import type { DrunkParameters } from "../shaders/gl-drunk-shader.ts";
import { WebGLEffect, type ParameterRange } from "../webgl-effect.ts";

const GeometryProperties = {
  shp: {
    strengthX: 0.5,
    strengthY: 0,
    radius: 50,
  },
  sh: "GGLDrunkShader",
};

export class GLDrunkEffect extends WebGLEffect {
  static {
    registerNodeClass(this, "GGLDrunkEffect", "GGLDrunkEffect");
  }

  static override GeometryProperties: Record<string, unknown> = GeometryProperties;

  static RANGES: Record<string, ParameterRange> = {
    strengthX: [-1, 1],
    strengthY: [-1, 1],
    radius: [0, 100],
  };

  declare $shp: DrunkParameters;

  constructor() {
    super();
    this._setDefaultProperties(GeometryProperties);
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GGLDrunkEffect", "name", this.getNodeName()) as string;
  }

  override getEffectPadding(): EffectPadding {
    return 0;
  }

  /** The wobble on every side. Effect types this as a number; the callers take sides too. */
  override getAbsoluteEffectPadding(): number {
    const radius = this.$shp.radius;
    const x = Math.abs(this.$shp.strengthX);
    const y = Math.abs(this.$shp.strengthY);
    return [x * radius, y * radius, x * radius, y * radius] as unknown as number;
  }

  override isAffectedByChildren(): boolean {
    return true;
  }
}

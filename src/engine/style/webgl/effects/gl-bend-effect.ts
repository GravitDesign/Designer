// Old: chunk.vendor.js module 1032 (GGLBendEffect).
//
// Bends the content along a sine (GLBendShader). The padding is on the
// side the bend pushes towards.
import { Locale } from "../../../core/locale/locale.ts";
import { registerNodeClass } from "../../../scene/node.ts";
import type { EffectPadding } from "../../effect.ts";
import type { BendParameters } from "../shaders/gl-bend-shader.ts";
import { WebGLEffect, type ParameterRange } from "../webgl-effect.ts";

const GeometryProperties = {
  shp: {
    strengthX: 0.5,
    strengthY: 0,
    radius: 50,
  },
  sh: "GGLBendShader",
};

export class GLBendEffect extends WebGLEffect {
  static {
    registerNodeClass(this, "GGLBendEffect", "GGLBendEffect");
  }

  static override GeometryProperties: Record<string, unknown> = GeometryProperties;

  static RANGES: Record<string, ParameterRange> = {
    strengthX: [-1, 1],
    strengthY: [-1, 1],
    radius: [0, 100],
  };

  declare $shp: BendParameters;

  constructor() {
    super();
    this._setDefaultProperties(GeometryProperties);
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GGLBendEffect", "name", this.getNodeName()) as string;
  }

  override getEffectPadding(): EffectPadding {
    const x = this.$shp.radius * Math.sin((this.$shp.strengthX * Math.PI) / 2);
    const y = this.$shp.radius * Math.sin((this.$shp.strengthY * Math.PI) / 2);
    return [Math.max(x, 0), Math.max(y, 0), Math.max(-x, 0), Math.max(-y, 0)];
  }

  /** The bend on both sides. Effect types this as a number; the callers take sides too. */
  override getAbsoluteEffectPadding(): number {
    const x = Math.abs(this.$shp.radius * Math.sin((this.$shp.strengthX * Math.PI) / 2));
    const y = Math.abs(this.$shp.radius * Math.sin((this.$shp.strengthY * Math.PI) / 2));
    return [x, y, x, y] as unknown as number;
  }

  override isAffectedByChildren(): boolean {
    return true;
  }
}

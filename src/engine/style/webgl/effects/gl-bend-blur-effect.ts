// Old: chunk.vendor.js module 1030 (GGLBendBlurEffect).
//
// Not in the effects menu: GCurvedShadowEffect uses it to bend and blur
// its shadow.
import { Locale } from "../../../core/locale/locale.ts";
import { registerNodeClass } from "../../../scene/node.ts";
import type { EffectPadding } from "../../effect.ts";
import { GLBendBlurShader, type BendBlurParameters } from "../shaders/gl-bend-blur-shader.ts";
import { WebGLEffect, type ParameterRange } from "../webgl-effect.ts";

const GeometryProperties = {
  shp: {
    radius: 50,
    softness: 1,
    bend: 50,
    cov: 0.8,
  },
  sh: "GGLBendBlurShader",
};

export class GLBendBlurEffect extends WebGLEffect {
  static {
    registerNodeClass(this, "GGLBendBlurEffect", "GGLBendBlurEffect");
  }

  static override GeometryProperties: Record<string, unknown> = GeometryProperties;

  static RANGES: Record<string, ParameterRange> = {
    radius: [0, 100],
    softness: [0, 50],
    bend: [0, 50],
    cov: [0, 1],
  };

  declare $shp: BendBlurParameters;

  constructor() {
    super();
    this._setDefaultProperties(GeometryProperties);
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GGLBendBlurEffect", "name", this.getNodeName()) as string;
  }

  /** [left, top, right, bottom]: the bend adds to the top (negative) or bottom (positive). */
  override getEffectPadding(): EffectPadding {
    const bend = this.$shp.bend;
    let softness = this.$shp.softness;
    const radius = this.$shp.radius;
    if (softness <= 0) softness = 0.001;
    let top = radius;
    let bottom = radius;
    const blur = softness * (GLBendBlurShader.MAX_BLUR2 + radius);
    if (bend < 0) {
      bottom += blur;
      top += -bend + blur;
    } else {
      top += blur;
      bottom += bend + blur;
    }
    top += radius * GLBendBlurShader.RADIUS_TO_BLUR;
    bottom += radius * GLBendBlurShader.RADIUS_TO_BLUR;
    return [
      blur + radius * GLBendBlurShader.RADIUS_TO_BLUR,
      top,
      blur + radius * GLBendBlurShader.RADIUS_TO_BLUR,
      bottom,
    ];
  }

  /** Like getEffectPadding with the bend on both sides; the radius start values are dropped. */
  override getAbsoluteEffectPadding(): number {
    const bend = this.$shp.bend;
    let softness = this.$shp.softness;
    const radius = this.$shp.radius;
    if (softness <= 0) softness = 0.001;
    const blur = softness * (GLBendBlurShader.MAX_BLUR2 + radius);
    let top = Math.abs(bend) + blur;
    let bottom = top;
    top += radius * GLBendBlurShader.RADIUS_TO_BLUR;
    bottom += radius * GLBendBlurShader.RADIUS_TO_BLUR;
    return [
      blur + radius * GLBendBlurShader.RADIUS_TO_BLUR,
      top,
      blur + radius * GLBendBlurShader.RADIUS_TO_BLUR,
      bottom,
    ] as unknown as number;
  }

  override isAffectedByChildren(): boolean {
    return true;
  }
}

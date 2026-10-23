// Old: chunk.vendor.js module 1015 (GGLOuterGlowEffect).
//
// A glow around the outside of the shape, painted as a post effect. The
// radius slider is quadratic.
import { Locale } from "../../../core/locale/locale.ts";
import { registerNodeClass } from "../../../scene/node.ts";
import { Effect, type EffectPadding, type EffectTypeValue } from "../../effect.ts";
import type { OuterGlowParameters } from "../shaders/gl-outer-glow-shader.ts";
import { WebGLEffect, type ParameterRange } from "../webgl-effect.ts";

const GeometryProperties = {
  shp: {
    radius: 5,
    intensity: 1,
    color: [255, 255, 224],
    opacity: {
      type: "opacity",
      value: 1,
    },
  },
  sh: "GGLOuterGlowShader",
};

export class GLOuterGlowEffect extends WebGLEffect {
  static {
    registerNodeClass(this, "GGLOuterGlowEffect", "GGLOuterGlowEffect");
  }

  static override GeometryProperties: Record<string, unknown> = GeometryProperties;

  static RANGES: Record<string, ParameterRange> = {
    radius: [0, 50],
    intensity: [0, 2],
  };

  declare $shp: OuterGlowParameters;

  constructor() {
    super();
    this._setDefaultProperties(GeometryProperties);
  }

  override getEffectType(): EffectTypeValue {
    return Effect.Type.PostEffect;
  }

  override getEffectPadding(): EffectPadding {
    return this.$shp.radius;
  }

  override propertyTransform(name: string, value: number): number {
    switch (name) {
      case "radius":
        return WebGLEffect.polynomialTransform(
          value,
          2,
          GLOuterGlowEffect.RANGES.radius as ParameterRange,
        );
    }
    return value;
  }

  override propertyInverseTransform(name: string, value: number): number {
    switch (name) {
      case "radius":
        return WebGLEffect.polynomialInverseTransform(
          value,
          2,
          GLOuterGlowEffect.RANGES.radius as ParameterRange,
        );
    }
    return value;
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GGLOuterGlowEffect", "name", this.getNodeName()) as string;
  }
}

// Old: chunk.vendor.js module 1010 (GGLInnerGlowEffect).
//
// A glow along the inside of the shape's edge. The radius slider is
// quadratic.
import { Locale } from "../../../core/locale/locale.ts";
import { registerNodeClass } from "../../../scene/node.ts";
import { Effect, type EffectPadding, type EffectTypeValue } from "../../effect.ts";
import type { InnerGlowParameters } from "../shaders/gl-inner-glow-shader.ts";
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
  sh: "GGLInnerGlowShader",
};

export class GLInnerGlowEffect extends WebGLEffect {
  static {
    registerNodeClass(this, "GGLInnerGlowEffect", "GGLInnerGlowEffect");
  }

  static override GeometryProperties: Record<string, unknown> = GeometryProperties;

  static RANGES: Record<string, ParameterRange> = {
    radius: [0, 50],
    intensity: [0, 2],
  };

  declare $shp: InnerGlowParameters;

  constructor() {
    super();
    this._setDefaultProperties(GeometryProperties);
  }

  override getEffectType(): EffectTypeValue {
    return Effect.Type.Filter;
  }

  override getEffectPadding(): EffectPadding {
    return 1;
  }

  override propertyTransform(name: string, value: number): number {
    switch (name) {
      case "radius":
        return WebGLEffect.polynomialTransform(
          value,
          2,
          GLInnerGlowEffect.RANGES.radius as ParameterRange,
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
          GLInnerGlowEffect.RANGES.radius as ParameterRange,
        );
    }
    return value;
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GGLInnerGlowEffect", "name", this.getNodeName()) as string;
  }
}

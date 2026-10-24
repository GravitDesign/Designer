// Old: chunk.vendor.js module 1018 (GGLStrokeLayerEffect).
//
// A stroke made from the rendered pixels (so it follows text, images and
// effects), outside, inside or centered on the edge. Width and softness
// sliders are quadratic.
import { Locale } from "../../../core/locale/locale.ts";
import { LocaleKey } from "../../../core/locale/locale-key.ts";
import { RGBColor } from "../../../color/rgb-color.ts";
import { registerNodeClass } from "../../../scene/node.ts";
import type { EffectPadding } from "../../effect.ts";
import type { StrokeLayerParameters } from "../shaders/gl-stroke-layer-shader.ts";
import { WebGLEffect, type ParameterRange } from "../webgl-effect.ts";

const GeometryProperties = {
  shp: {
    width: 5,
    softness: 0.5,
    shape: 0.7071,
    color: RGBColor.WHITE.getValue(),
    opacity: {
      type: "opacity",
      value: 1,
    },
    ellyptical: false,
    placement: {
      type: "dropdown",
      value: 0,
    },
  },
  sh: "GGLStrokeLayerShader",
};

export class GLStrokeLayerEffect extends WebGLEffect {
  static {
    registerNodeClass(this, "GGLStrokeLayerEffect", "GGLStrokeLayerEffect");
  }

  static override GeometryProperties: Record<string, unknown> = GeometryProperties;

  /** Slider ranges; `placement` lists the dropdown entries (outside, inside, center). */
  static RANGES: Record<string, ParameterRange | LocaleKey[]> = {
    width: [0, 100],
    softness: [0.01, 1],
    shape: [0, 2],
    placement: [
      new LocaleKey("GGLStrokeLayerEffect", "text.outside"),
      new LocaleKey("GGLStrokeLayerEffect", "text.inside"),
      new LocaleKey("GGLStrokeLayerEffect", "text.center"),
    ],
  };

  declare $shp: StrokeLayerParameters;

  constructor() {
    super();
    this._setDefaultProperties(GeometryProperties);
  }

  override getEffectPadding(): EffectPadding {
    return 0 == this.$shp.placement.value
      ? this.$shp.width + 1
      : 1 == this.$shp.placement.value
        ? 1
        : 1 + Math.ceil(this.$shp.width / 2);
  }

  override propertyTransform(name: string, value: number): number {
    switch (name) {
      case "width":
        return WebGLEffect.polynomialTransform(
          value,
          2,
          GLStrokeLayerEffect.RANGES.width as ParameterRange,
        );
      case "softness":
        return WebGLEffect.polynomialTransform(
          value,
          2,
          GLStrokeLayerEffect.RANGES.softness as ParameterRange,
        );
    }
    return value;
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GGLStrokeLayerEffect", "name", this.getNodeName()) as string;
  }

  override propertyInverseTransform(name: string, value: number): number {
    switch (name) {
      case "width":
        return WebGLEffect.polynomialInverseTransform(
          value,
          2,
          GLStrokeLayerEffect.RANGES.width as ParameterRange,
        );
      case "softness":
        return WebGLEffect.polynomialInverseTransform(
          value,
          2,
          GLStrokeLayerEffect.RANGES.softness as ParameterRange,
        );
    }
    return value;
  }
}

// Old: chunk.vendor.js module 732 (GGLHueSaturationEffect).
//
// Hue and saturation on WebGL; without a hue change and with a saturation
// of 0 or more the CSS saturate filter does it.
import { Locale } from "../../../core/locale/locale.ts";
import { GMath } from "../../../math/math.ts";
import { Canvas2DPaintCanvas, type PaintCanvas } from "../../../paint/paint-canvas.ts";
import { registerNodeClass } from "../../../scene/node.ts";
import type { EffectPadding } from "../../effect.ts";
import type { HueSaturationParameters } from "../shaders/gl-hue-saturation-shader.ts";
import { WebGLEffect, type ParameterRange } from "../webgl-effect.ts";

const GeometryProperties = {
  shp: {
    hue: 0,
    saturation: 0,
  },
  sh: "GGLHueSaturationShader",
};

export class GLHueSaturationEffect extends WebGLEffect {
  static {
    registerNodeClass(this, "GGLHueSaturationEffect", "GGLHueSaturationEffect");
  }

  static override GeometryProperties: Record<string, unknown> = GeometryProperties;

  static RANGES: Record<string, ParameterRange> = {
    hue: [-1, 1],
    saturation: [-1, 1],
  };

  declare $shp: HueSaturationParameters;

  constructor() {
    super();
    this._setDefaultProperties(GeometryProperties);
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GGLHueSaturationEffect", "name", this.getNodeName()) as string;
  }

  override getEffectPadding(): EffectPadding {
    return 0;
  }

  override canApplyNativeEffect(): boolean {
    return !!Canvas2DPaintCanvas.hasFilters() && 0 == this.$shp.hue && !(this.$shp.saturation < 0);
  }

  override applyNativeEffect(canvas: PaintCanvas): void {
    let saturation = this.$shp.saturation;
    if (saturation > 0) {
      if (saturation > 1) saturation = 1;
      saturation = 1 + saturation / (1.001 - saturation);
    } else saturation = 1 + GMath.clamp(-1, saturation, 0);
    canvas.setFilter(Canvas2DPaintCanvas.Filter.Saturate, saturation);
  }

  override removeNativeEffect(canvas: PaintCanvas): void {
    canvas.setFilter(Canvas2DPaintCanvas.Filter.Saturate, null);
  }
}

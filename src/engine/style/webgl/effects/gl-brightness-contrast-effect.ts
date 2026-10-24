// Old: chunk.vendor.js module 730 (GGLBrightnessContrastEffect).
//
// Brightness and contrast on WebGL; without a brightness change the CSS
// contrast filter does it.
import { Locale } from "../../../core/locale/locale.ts";
import { GMath } from "../../../math/math.ts";
import { Canvas2DPaintCanvas, type PaintCanvas } from "../../../paint/paint-canvas.ts";
import { registerNodeClass } from "../../../scene/node.ts";
import type { EffectPadding } from "../../effect.ts";
import type { BrightnessContrastParameters } from "../shaders/gl-brightness-contrast-shader.ts";
import { WebGLEffect, type ParameterRange } from "../webgl-effect.ts";

const GeometryProperties = {
  shp: {
    brightness: 0,
    contrast: 0,
  },
  sh: "GGLBrightnessContrastShader",
};

export class GLBrightnessContrastEffect extends WebGLEffect {
  static {
    registerNodeClass(this, "GGLBrightnessContrastEffect", "GGLBrightnessContrastEffect");
  }

  static override GeometryProperties: Record<string, unknown> = GeometryProperties;

  static RANGES: Record<string, ParameterRange> = {
    brightness: [-1, 1],
    contrast: [-1, 1],
  };

  declare $shp: BrightnessContrastParameters;

  constructor() {
    super();
    this._setDefaultProperties(GeometryProperties);
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GGLBrightnessContrastEffect", "name", this.getNodeName()) as string;
  }

  override getEffectPadding(): EffectPadding {
    return 0;
  }

  override canApplyNativeEffect(): boolean {
    return !!Canvas2DPaintCanvas.hasFilters() && 0 == this.$shp.brightness;
  }

  override applyNativeEffect(canvas: PaintCanvas): void {
    const brightness = GMath.clamp(-1, this.$shp.brightness, 1) + 1;
    let contrast = this.$shp.contrast;
    if (contrast > 0) {
      if (contrast > 1) contrast = 1;
      contrast = 1 + contrast / (1.001 - contrast);
    } else contrast = 1 + GMath.clamp(-1, contrast, 0);
    canvas.setFilter(Canvas2DPaintCanvas.Filter.Brightness, brightness);
    canvas.setFilter(Canvas2DPaintCanvas.Filter.Contrast, contrast);
  }

  override removeNativeEffect(canvas: PaintCanvas): void {
    canvas.setFilter(Canvas2DPaintCanvas.Filter.Brightness, null);
    canvas.setFilter(Canvas2DPaintCanvas.Filter.Contrast, null);
  }
}

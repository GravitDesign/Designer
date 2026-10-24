// Old: chunk.vendor.js module 728 (GGLSepiaEffect).
//
// Sepia on WebGL, or through the CSS sepia filter where the browser has it.
import { Locale } from "../../../core/locale/locale.ts";
import { GMath } from "../../../math/math.ts";
import { Canvas2DPaintCanvas, type PaintCanvas } from "../../../paint/paint-canvas.ts";
import { registerNodeClass } from "../../../scene/node.ts";
import type { EffectPadding } from "../../effect.ts";
import type { SepiaParameters } from "../shaders/gl-sepia-shader.ts";
import { WebGLEffect, type ParameterRange } from "../webgl-effect.ts";

const GeometryProperties = {
  shp: {
    amount: 0.5,
  },
  sh: "GGLSepiaShader",
};

export class GLSepiaEffect extends WebGLEffect {
  static {
    registerNodeClass(this, "GGLSepiaEffect", "GGLSepiaEffect");
  }

  static override GeometryProperties: Record<string, unknown> = GeometryProperties;

  static RANGES: Record<string, ParameterRange> = {
    amount: [0, 1],
  };

  declare $shp: SepiaParameters;

  constructor() {
    super();
    this._setDefaultProperties(GeometryProperties);
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GGLSepiaEffect", "name", this.getNodeName()) as string;
  }

  override getEffectPadding(): EffectPadding {
    return 0;
  }

  override canApplyNativeEffect(): boolean {
    return Canvas2DPaintCanvas.hasFilters();
  }

  override applyNativeEffect(canvas: PaintCanvas): void {
    canvas.setFilter(Canvas2DPaintCanvas.Filter.Sepia, GMath.clamp(0, this.$shp.amount, 1));
  }

  override removeNativeEffect(canvas: PaintCanvas): void {
    canvas.setFilter(Canvas2DPaintCanvas.Filter.Sepia, null);
  }
}

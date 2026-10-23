// Old: chunk.vendor.js module 588 (GGLColorAdjustEffect).
//
// Brightness, contrast, hue and saturation in one effect. CSS filters do
// it where they match the shader: never with more brightness, and in
// compatibility mode (`comp`, on by default) only for contrast and more
// saturation.
import { Locale } from "../../../core/locale/locale.ts";
import { GMath } from "../../../math/math.ts";
import { Canvas2DPaintCanvas, type PaintCanvas } from "../../../paint/paint-canvas.ts";
import { registerNodeClass } from "../../../scene/node.ts";
import { NodeChange } from "../../../scene/node-change.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../../../serialize/blob.ts";
import type { EffectPadding } from "../../effect.ts";
import type { ColorAdjustParameters } from "../shaders/gl-color-adjust-shader.ts";
import { WebGLEffect, type ParameterRange } from "../webgl-effect.ts";

const GeometryProperties = {
  shp: {
    brightness: 0,
    contrast: 0,
    hue: 0,
    saturation: 0,
  },
  sh: "GGLColorAdjustShader",
};

const MetaProperties = {
  comp: true,
};

/** The CSS contrast or saturate factor for a -1..1 shader value. */
function filterFactor(value: number): number {
  if (value > 0) {
    if (value > 1) value = 1;
    return 1 + value / (1.001 - value);
  }
  return 1 + GMath.clamp(-1, value, 0);
}

export class GLColorAdjustEffect extends WebGLEffect {
  static {
    registerNodeClass(this, "GGLColorAdjustEffect", "GGLColorAdjustEffect");
  }

  static override GeometryProperties: Record<string, unknown> = GeometryProperties;
  static MetaProperties: Record<string, unknown> = MetaProperties;

  static RANGES: Record<string, ParameterRange> = {
    brightness: [-1, 1],
    contrast: [-1, 1],
    hue: [-1, 1],
    saturation: [-1, 1],
  };

  declare $shp: ColorAdjustParameters;
  declare $comp: boolean;
  /** Never read; the old prototype had it. */
  declare _compatibilityMode: boolean;
  declare _lastCanvasScale: number | null;

  /** A truthy `compatibility` sets `comp` (it is on already). */
  constructor(compatibility?: boolean) {
    super();
    this._setDefaultProperties(GeometryProperties);
    this._setDefaultProperties(MetaProperties);
    if (compatibility) this.$comp = compatibility;
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GGLColorAdjustEffect", "name", this.getNodeName()) as string;
  }

  override getEffectPadding(): EffectPadding {
    return 0;
  }

  /** Cacheable when the canvas scale is the one of the last call (which records it). */
  override isCacheable(canvas?: unknown): boolean {
    const scale = (canvas as PaintCanvas).getScale() as number;
    if (this._lastCanvasScale && this._lastCanvasScale === scale) return true;
    this._lastCanvasScale = scale;
    return false;
  }

  override _handleChange(change: number, args?: unknown): void {
    if (change === NodeChange.Store) {
      this.storeProperties((args as StoreChangeArgs).blob, MetaProperties);
    } else if (change === NodeChange.Restore) {
      this.restoreProperties((args as RestoreChangeArgs).blob, MetaProperties);
    }
    super._handleChange(change, args);
  }

  override canApplyNativeEffect(): boolean {
    if (!Canvas2DPaintCanvas.hasFilters()) return false;
    if (this.$shp.brightness > 0) return false;
    if (this.$comp) {
      if (this.$shp.brightness < 0) return false;
      if (this.$shp.saturation < 0) return false;
      if (0 != this.$shp.hue) return false;
    }
    return true;
  }

  override applyNativeEffect(canvas: PaintCanvas): void {
    const saturation = filterFactor(this.$shp.saturation);
    let brightness = GMath.clamp(-1, this.$shp.brightness, 1) + 1;
    brightness *= brightness;
    const contrast = filterFactor(this.$shp.contrast);
    const hue = Math.PI * GMath.clamp(-1, this.$shp.hue, 1);
    canvas.setFilter(Canvas2DPaintCanvas.Filter.Brightness, brightness);
    canvas.setFilter(Canvas2DPaintCanvas.Filter.Contrast, contrast);
    canvas.setFilter(Canvas2DPaintCanvas.Filter.HueRotate, hue);
    canvas.setFilter(Canvas2DPaintCanvas.Filter.Saturate, saturation);
  }

  override removeNativeEffect(canvas: PaintCanvas): void {
    canvas.setFilter(Canvas2DPaintCanvas.Filter.Brightness, null);
    canvas.setFilter(Canvas2DPaintCanvas.Filter.Contrast, null);
    canvas.setFilter(Canvas2DPaintCanvas.Filter.HueRotate, null);
    canvas.setFilter(Canvas2DPaintCanvas.Filter.Saturate, null);
  }
}

GLColorAdjustEffect.prototype._compatibilityMode = false;
GLColorAdjustEffect.prototype._lastCanvasScale = null;

// Old: chunk.vendor.js module 321 (GDropShadowEffect).
import { Color } from "../../color/color.ts";
import { RGBColor } from "../../color/rgb-color.ts";
import { Locale } from "../../core/locale/locale.ts";
import type { Rect } from "../../math/rect.ts";
import { Canvas2DPaintCanvas, type PaintCanvas } from "../../paint/paint-canvas.ts";
import { registerNodeClass } from "../../scene/node.ts";
import { NodeChange } from "../../scene/node-change.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../../serialize/blob.ts";
import { Effect, type EffectPadding, type EffectTypeValue } from "../effect.ts";
import type { Pattern } from "../pattern.ts";
import { BlurEffect } from "./blur-effect.ts";
import {
  canvasUserRect,
  fillRectWithPattern,
  restorePattern,
  storePattern,
} from "./effect-paint.ts";

const GeometryProperties = {
  r: 5,
  x: 0,
  y: 0,
};

const VisualProperties = {
  pat: RGBColor.BLACK as Pattern | null,
  opc: 0.65,
};

/**
 * A shadow behind the element: the content's silhouette filled with `pat`
 * at `opc`, offset by (x, y) and blurred by `r`. A plain color uses the
 * CSS drop-shadow filter when the browser has filters.
 */
export class DropShadowEffect extends Effect {
  static {
    registerNodeClass(this, "dropShadowEffect", "GDropShadowEffect");
  }

  static override GeometryProperties: Record<string, unknown> = GeometryProperties;
  static VisualProperties: Record<string, unknown> = VisualProperties;

  static RANGES = {
    r: [0, 200],
  };

  static equals(a: unknown, b: unknown): boolean {
    return (
      a instanceof DropShadowEffect &&
      b instanceof DropShadowEffect &&
      a.arePropertiesEqual(
        b,
        Object.keys(DropShadowEffect.GeometryProperties).concat(
          Object.keys(DropShadowEffect.VisualProperties),
        ),
      )
    );
  }

  declare $r: number;
  declare $x: number;
  declare $y: number;
  declare $pat: Pattern | null;
  declare $opc: number;
  declare _blur: BlurEffect | null;

  constructor() {
    super();
    this._setDefaultProperties(
      DropShadowEffect.GeometryProperties,
      DropShadowEffect.VisualProperties,
    );
    this._blur = new BlurEffect();
  }

  override getEffectType(): EffectTypeValue {
    return Effect.Type.PreEffect;
  }

  override isOverlayEffect(): boolean {
    return true;
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GDropShadowEffect", "name", this.getNodeName()) as string;
  }

  /** 1.3 times the radius (rounded up) around the box, moved by the offset. */
  override getEffectPadding(): EffectPadding {
    const blur = Math.ceil(1.3 * this.$r);
    return [blur - this.$x, blur - this.$y, blur + this.$x, blur + this.$y];
  }

  override canApplyNativeEffect(): boolean {
    return Canvas2DPaintCanvas.hasFilters() && this.$pat instanceof Color;
  }

  override applyNativeEffect(
    _canvas: PaintCanvas,
    target?: PaintCanvas | null,
    _root?: PaintCanvas | null,
    scale?: number,
  ): void {
    const x = this.$x * (scale as number);
    const y = this.$y * (scale as number);
    const radius = this.$r * (scale as number);
    (target as PaintCanvas).setFilter(Canvas2DPaintCanvas.Filter.DropShadow, [
      x,
      y,
      radius,
      this.$pat,
      this.$opc,
    ]);
  }

  override removeNativeEffect(_canvas: PaintCanvas, target?: PaintCanvas | null): void {
    (target as PaintCanvas).setFilter(Canvas2DPaintCanvas.Filter.DropShadow, null);
  }

  /** Paints the shadow of `canvas` into `target`. */
  override render(
    canvas: PaintCanvas,
    target: PaintCanvas,
    root: PaintCanvas | null,
    scale: number,
    extents?: Rect,
    element?: unknown,
  ): void {
    if (this.$pat && this.$opc > 0) {
      if (this.canApplyNativeEffect()) {
        this.applyNativeEffect(canvas, target, root, scale);
        target.drawCanvas(canvas, 0, 0, 1, Canvas2DPaintCanvas.CompositeOperator.Copy);
        this.removeNativeEffect(canvas, target);
      } else {
        const x = this.$x * scale;
        const y = this.$y * scale;
        const radius = this.$r * scale;
        fillRectWithPattern(target, this.$pat, canvasUserRect(target), this.$opc);
        target.drawCanvas(canvas, x, y, 1, Canvas2DPaintCanvas.CompositeOperator.DestinationIn);
        if (radius > 0) {
          const blur = this._blur as BlurEffect;
          blur.$r = this.$r;
          blur.render(target, null, null, scale, extents, element);
        }
        target.drawCanvas(canvas, 0, 0, 1, Canvas2DPaintCanvas.CompositeOperator.DestinationOut);
      }
    }
  }

  override _handleChange(change: number, args?: unknown): void {
    if (change === NodeChange.Store) {
      const blob = (args as StoreChangeArgs).blob;
      this.storeProperties(blob, DropShadowEffect.GeometryProperties);
      this.storeProperties(blob, DropShadowEffect.VisualProperties, storePattern);
    } else if (change === NodeChange.Restore) {
      const blob = (args as RestoreChangeArgs).blob;
      this.restoreProperties(blob, DropShadowEffect.GeometryProperties);
      this.restoreProperties(blob, DropShadowEffect.VisualProperties, restorePattern);
    }
    this._handleGeometryChangeForProperties(change, args, DropShadowEffect.GeometryProperties);
    this._handleVisualChangeForProperties(change, args, DropShadowEffect.VisualProperties);
    super._handleChange(change, args);
  }

  override toString(): string {
    return "[Object GDropShadowEffect]";
  }

  override destroy(): void {
    if (this._blur) this._blur.destroy();
  }
}

DropShadowEffect.prototype._blur = null;

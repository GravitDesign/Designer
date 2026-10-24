// Old: chunk.vendor.js module 432 (GInnerShadowEffect).
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
  opc: 0.5,
};

/**
 * A shadow inside the element: `pat` everywhere except the content offset
 * by (x, y), blurred by `r` and cut to the content.
 */
export class InnerShadowEffect extends Effect {
  static {
    registerNodeClass(this, "innerShadowEffect", "GInnerShadowEffect");
  }

  static override GeometryProperties: Record<string, unknown> = GeometryProperties;
  static VisualProperties: Record<string, unknown> = VisualProperties;

  static RANGES = {
    r: [0, 200],
  };

  static equals(a: unknown, b: unknown): boolean {
    return (
      a instanceof InnerShadowEffect &&
      b instanceof InnerShadowEffect &&
      a.arePropertiesEqual(
        b,
        Object.keys(InnerShadowEffect.GeometryProperties).concat(
          Object.keys(InnerShadowEffect.VisualProperties),
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
      InnerShadowEffect.GeometryProperties,
      InnerShadowEffect.VisualProperties,
    );
    this._blur = new BlurEffect();
  }

  override getEffectType(): EffectTypeValue {
    return Effect.Type.PostEffect;
  }

  override isOverlayEffect(): boolean {
    return true;
  }

  override getEffectPadding(): EffectPadding {
    return 0;
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GInnerShadowEffect", "name", this.getNodeName()) as string;
  }

  /**
   * What the shadow needs from a parent's content: the radius past the
   * offset on each side. An array, which Effects.getEffectsPadding takes;
   * the base class types this as a number.
   */
  override getAbsoluteEffectPadding(): number {
    return [
      Math.max(0, this.$r + this.$x),
      Math.max(0, this.$r + this.$y),
      Math.max(0, this.$r - this.$x),
      Math.max(0, this.$r - this.$y),
    ] as unknown as number;
  }

  /**
   * Paints the shadow of `canvas` into `target`. The blur always runs
   * without CSS filters here; the WebGL blur is told it may hit the GL bug
   * then.
   */
  override render(
    canvas: PaintCanvas,
    target: PaintCanvas,
    _root: PaintCanvas | null,
    scale: number,
    extents?: Rect,
    element?: unknown,
  ): void {
    if (this.$pat && this.$opc > 0 && this.$r >= 0) {
      fillRectWithPattern(target, this.$pat, canvasUserRect(target), this.$opc);
      const x = this.$x * scale;
      const y = this.$y * scale;
      const radius = this.$r * scale;
      target.drawCanvas(canvas, x, y, 1, Canvas2DPaintCanvas.CompositeOperator.DestinationOut);
      if (radius > 0) {
        const blur = this._blur as BlurEffect;
        Canvas2DPaintCanvas.disableFilters();
        if (!Canvas2DPaintCanvas.hasFilters() && blur._glblur)
          blur._glblur._isAffectedByGLBug = true;
        blur.$r = this.$r;
        blur.render(target, null, null, scale, extents, element);
        Canvas2DPaintCanvas.enableFilters();
      }
      target.drawCanvas(canvas, 0, 0, 1, Canvas2DPaintCanvas.CompositeOperator.DestinationIn);
    }
  }

  override _handleChange(change: number, args?: unknown): void {
    if (change === NodeChange.Store) {
      const blob = (args as StoreChangeArgs).blob;
      this.storeProperties(blob, InnerShadowEffect.GeometryProperties);
      this.storeProperties(blob, InnerShadowEffect.VisualProperties, storePattern);
    } else if (change === NodeChange.Restore) {
      const blob = (args as RestoreChangeArgs).blob;
      this.restoreProperties(blob, InnerShadowEffect.GeometryProperties);
      this.restoreProperties(blob, InnerShadowEffect.VisualProperties, restorePattern);
    }
    this._handleGeometryChangeForProperties(change, args, InnerShadowEffect.GeometryProperties);
    this._handleVisualChangeForProperties(change, args, InnerShadowEffect.VisualProperties);
    super._handleChange(change, args);
  }

  override toString(): string {
    return "[Object GInnerShadowEffect]";
  }

  override destroy(): void {
    if (this._blur) this._blur.destroy();
  }
}

InnerShadowEffect.prototype._blur = null;

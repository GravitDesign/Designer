// Old: chunk.vendor.js module 1031 (GLongShadowEffect).
import { RGBColor } from "../../color/rgb-color.ts";
import { Locale } from "../../core/locale/locale.ts";
import { GMath } from "../../math/math.ts";
import { Canvas2DPaintCanvas, type PaintCanvas } from "../../paint/paint-canvas.ts";
import { registerNodeClass } from "../../scene/node.ts";
import { NodeChange } from "../../scene/node-change.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../../serialize/blob.ts";
import { Effect, type EffectPadding, type EffectTypeValue } from "../effect.ts";
import type { Pattern } from "../pattern.ts";
import {
  canvasUserRect,
  fillRectWithPattern,
  restorePattern,
  storePattern,
} from "./effect-paint.ts";

const GeometryProperties = {
  l: 60,
  a: GMath.toRadians(-45),
};

const VisualProperties = {
  pat: RGBColor.BLACK as Pattern | null,
  opc: 0.2,
  den: 1,
  fdm: true,
};

/**
 * A flat shadow `l` long in the direction `a` (radians): the content
 * stamped along the line, `den` times per screen pixel, fading out with
 * `fdm`, then filled with `pat`.
 */
export class LongShadowEffect extends Effect {
  static {
    registerNodeClass(this, "longShadowEffect", "GLongShadowEffect");
  }

  static override GeometryProperties: Record<string, unknown> = GeometryProperties;
  static VisualProperties: Record<string, unknown> = VisualProperties;

  static equals(a: unknown, b: unknown): boolean {
    return (
      a instanceof LongShadowEffect &&
      b instanceof LongShadowEffect &&
      a.arePropertiesEqual(
        b,
        Object.keys(LongShadowEffect.GeometryProperties).concat(
          Object.keys(LongShadowEffect.VisualProperties),
        ),
      )
    );
  }

  declare $l: number;
  declare $a: number;
  declare $pat: Pattern | null;
  declare $opc: number;
  declare $den: number;
  declare $fdm: boolean;

  constructor() {
    super();
    this._setDefaultProperties(
      LongShadowEffect.GeometryProperties,
      LongShadowEffect.VisualProperties,
    );
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GLongShadowEffect", "name", this.getNodeName()) as string;
  }

  override isOverlayEffect(): boolean {
    return true;
  }

  override getEffectType(): EffectTypeValue {
    return Effect.Type.PreEffect;
  }

  /** The shadow's end point on one side, its mirror on the other (so one side is negative). */
  override getEffectPadding(): EffectPadding {
    const dx = Math.cos(this.$a) * this.$l;
    const dy = -Math.sin(this.$a) * this.$l;
    return [-dx, -dy, dx, dy];
  }

  override render(canvas: PaintCanvas, target: PaintCanvas, _root: unknown, scale: number): void {
    if (this.$pat && this.$opc > 0) {
      const stamps = target.clone(false, { renderPhaseDraw: true, dontCopyContents: true });
      const cos = Math.cos(this.$a);
      const sin = -Math.sin(this.$a);
      const length = Math.round(this.$l * scale);
      const step = 1 / this.$den / Canvas2DPaintCanvas.getScreenDPI() / Math.max(scale, 1);
      for (let distance = 1; distance < length; distance += step) {
        const x = distance * cos;
        const y = distance * sin;
        const opacity = this.$fdm ? Math.max(1 - distance / length, 0) : 1;
        stamps.drawCanvas(canvas, x, y, opacity);
      }
      fillRectWithPattern(target, this.$pat, canvasUserRect(target), this.$opc);
      target.drawCanvas(stamps, 0, 0, 1, Canvas2DPaintCanvas.CompositeOperator.DestinationIn);
    }
  }

  override _handleChange(change: number, args?: unknown): void {
    if (change === NodeChange.Store) {
      const blob = (args as StoreChangeArgs).blob;
      this.storeProperties(blob, LongShadowEffect.GeometryProperties);
      this.storeProperties(blob, LongShadowEffect.VisualProperties, storePattern);
    } else if (change === NodeChange.Restore) {
      const blob = (args as RestoreChangeArgs).blob;
      this.restoreProperties(blob, LongShadowEffect.GeometryProperties);
      this.restoreProperties(blob, LongShadowEffect.VisualProperties, restorePattern);
    }
    this._handleVisualChangeForProperties(change, args, LongShadowEffect.VisualProperties);
    this._handleGeometryChangeForProperties(change, args, LongShadowEffect.GeometryProperties);
    super._handleChange(change, args);
  }

  override toString(): string {
    return "[Object GLongShadowEffect]";
  }
}

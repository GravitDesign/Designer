// Old: chunk.vendor.js module 729 (GOverlayEffect).
import { RGBColor } from "../../color/rgb-color.ts";
import { Locale } from "../../core/locale/locale.ts";
import type { Transform } from "../../math/transform.ts";
import { Canvas2DPaintCanvas, type PaintCanvas } from "../../paint/paint-canvas.ts";
import { registerNodeClass } from "../../scene/node.ts";
import { NodeChange } from "../../scene/node-change.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../../serialize/blob.ts";
import { Effect, type EffectTypeValue } from "../effect.ts";
import { LinearGradient } from "../linear-gradient.ts";
import type { Pattern } from "../pattern.ts";
import { canvasUserRect, restorePattern, storePattern } from "./effect-paint.ts";

const VisualProperties = {
  pat: new LinearGradient([
    { color: RGBColor.BLACK, position: 0, opacity: 1 },
    { color: RGBColor.WHITE, position: 1, opacity: 0 },
  ]) as Pattern | null,
  opc: 1,
  alm: false,
};

/**
 * Paints `pat` over the content (source-atop), or with `alm` (alpha mask)
 * uses it as the content's alpha (destination-in).
 */
export class OverlayEffect extends Effect {
  static {
    registerNodeClass(this, "overlayEffect", "GOverlayEffect");
  }

  static VisualProperties: Record<string, unknown> = VisualProperties;

  static equals(a: unknown, b: unknown): boolean {
    return (
      a instanceof OverlayEffect &&
      b instanceof OverlayEffect &&
      a.arePropertiesEqual(b, Object.keys(OverlayEffect.VisualProperties))
    );
  }

  declare $pat: Pattern | null;
  declare $opc: number;
  declare $alm: boolean;

  constructor() {
    super();
    this._setDefaultProperties(OverlayEffect.VisualProperties);
  }

  override getEffectType(): EffectTypeValue {
    return Effect.Type.Filter;
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GOverlayEffect", "name", this.getNodeName()) as string;
  }

  override getTrackTempPropNames(): string[] | null {
    return this.getPatternPropNames();
  }

  getPatternPropNames(): string[] {
    return ["pat"];
  }

  override render(canvas: PaintCanvas): void {
    if (this.$pat && this.$opc > 0) {
      let rect = canvasUserRect(canvas);
      const patternPaint = canvas.createPatternPaint(this.$pat, rect);
      if (patternPaint) {
        const compositeOperator = this.$alm
          ? Canvas2DPaintCanvas.CompositeOperator.DestinationIn
          : Canvas2DPaintCanvas.CompositeOperator.SourceAtTop;
        if (patternPaint.transform) {
          // The area in the pattern's space, so it covers the canvas.
          rect = (patternPaint.transform.inverted() as Transform).mapRect(rect);
          const previous = canvas.setTransform(
            canvas.getTransform(true).preMultiplied(patternPaint.transform),
          );
          canvas.fillRect(
            rect.getX(),
            rect.getY(),
            rect.getWidth(),
            rect.getHeight(),
            patternPaint.paint,
            this.$opc,
            compositeOperator,
          );
          canvas.setTransform(previous);
        } else {
          canvas.fillRect(
            rect.getX(),
            rect.getY(),
            rect.getWidth(),
            rect.getHeight(),
            patternPaint.paint,
            this.$opc,
            compositeOperator,
          );
        }
      }
    }
  }

  override _handleChange(change: number, args?: unknown): void {
    if (change === NodeChange.Store) {
      this.storeProperties(
        (args as StoreChangeArgs).blob,
        OverlayEffect.VisualProperties,
        storePattern,
      );
    } else if (change === NodeChange.Restore) {
      this.restoreProperties(
        (args as RestoreChangeArgs).blob,
        OverlayEffect.VisualProperties,
        restorePattern,
      );
    }
    this._handleVisualChangeForProperties(change, args, OverlayEffect.VisualProperties);
    super._handleChange(change, args);
  }

  override toString(): string {
    return "[Object GOverlayEffect]";
  }
}

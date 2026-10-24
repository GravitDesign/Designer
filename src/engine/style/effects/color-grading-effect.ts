// Old: chunk.vendor.js module 1008 (GColorGradingEffect).
import { Locale } from "../../core/locale/locale.ts";
import type { PaintCanvas } from "../../paint/paint-canvas.ts";
import { registerNodeClass } from "../../scene/node.ts";
import { NodeChange } from "../../scene/node-change.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../../serialize/blob.ts";
import { Effect, type EffectTypeValue } from "../effect.ts";
import { ColorCurves, type GradingCurves } from "./cubic-spline.ts";

const VisualProperties = {
  cp: null,
};

/** Maps the colors through curves (`cp`, as read from an .acv file: rgb, r, g, b). */
export class ColorGradingEffect extends Effect {
  static {
    registerNodeClass(this, "clGradingEffect", "GColorGradingEffect");
  }

  static VisualProperties: Record<string, unknown> = VisualProperties;

  static equals(a: unknown, b: unknown): boolean {
    return (
      a instanceof ColorGradingEffect &&
      b instanceof ColorGradingEffect &&
      a.arePropertiesEqual(b, Object.keys(ColorGradingEffect.VisualProperties))
    );
  }

  declare $cp: GradingCurves | null;

  constructor() {
    super();
    this._setDefaultProperties(ColorGradingEffect.VisualProperties);
  }

  override getEffectType(): EffectTypeValue {
    return Effect.Type.Filter;
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GColorGradingEffect", "name", this.getNodeName()) as string;
  }

  override render(canvas: PaintCanvas): void {
    if (this.$cp) canvas.getBitmap().applyFilter(ColorCurves, this.$cp);
  }

  override _handleChange(change: number, args?: unknown): void {
    if (change === NodeChange.Store) {
      this.storeProperties((args as StoreChangeArgs).blob, ColorGradingEffect.VisualProperties);
    } else if (change === NodeChange.Restore) {
      this.restoreProperties((args as RestoreChangeArgs).blob, ColorGradingEffect.VisualProperties);
    }
    this._handleVisualChangeForProperties(change, args, ColorGradingEffect.VisualProperties);
    super._handleChange(change, args);
  }

  override toString(): string {
    return "[Object GColorGradingEffect]";
  }
}

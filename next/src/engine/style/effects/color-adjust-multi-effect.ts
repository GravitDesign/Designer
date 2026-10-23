// Old: chunk.vendor.js module 1026 (GColorAdjustMultiEffect).
import { Locale } from "../../core/locale/locale.ts";
import type { Rect } from "../../math/rect.ts";
import type { PaintCanvas } from "../../paint/paint-canvas.ts";
import { Node, registerNodeClass } from "../../scene/node.ts";
import { NodeChange } from "../../scene/node-change.ts";
import type { PropertiesChangeArgs } from "../../scene/node-properties.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../../serialize/blob.ts";
import { Effect } from "../effect.ts";
import { GLBrightnessContrastEffect } from "../webgl/effects/gl-brightness-contrast-effect.ts";
import { GLColorAdjustEffect } from "../webgl/effects/gl-color-adjust-effect.ts";
import { GLHueSaturationEffect } from "../webgl/effects/gl-hue-saturation-effect.ts";
import { MultiEffect } from "./multi-effect.ts";

/** The shader parameters of GGLColorAdjustEffect. */
interface ColorAdjustParameters {
  brightness: number;
  contrast: number;
  hue: number;
  saturation: number;
}

/**
 * Brightness/contrast and hue/saturation, edited as two effects but
 * rendered by one GGLColorAdjustEffect in compatibility mode that gets
 * all four values.
 */
export class ColorAdjustMultiEffect extends MultiEffect {
  static {
    registerNodeClass(this, "colorAdjustMultiEffect", "GColorAdjustMultiEffect");
  }

  declare _colorAdjust: GLColorAdjustEffect;

  constructor() {
    super();
    this._colorAdjust = new GLColorAdjustEffect(true);
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GColorAdjustMultiEffect", "name", this.getNodeName()) as string;
  }

  /** Only the combined effect renders. */
  override render(
    canvas: PaintCanvas,
    target: PaintCanvas | null,
    root: PaintCanvas | null,
    scale: number,
    extents?: Rect,
    element?: unknown,
  ): void {
    this._colorAdjust.render(
      canvas,
      target,
      root,
      scale,
      extents,
      element as { getScene(): unknown } | null | undefined,
    );
  }

  /**
   * Stores all the "<effect>&shp" properties (unlike MultiEffect) and
   * copies brightness/contrast and hue/saturation into the combined
   * effect's parameters, which it changes in place.
   */
  override _handleChange(change: number, args?: unknown): void {
    const cls = ColorAdjustMultiEffect as unknown as {
      GeometryProperties: Record<string, unknown>;
    };
    if (change === NodeChange.Store) {
      this.storeProperties((args as StoreChangeArgs).blob, cls.GeometryProperties);
    } else if (change === NodeChange.Restore) {
      this.restoreProperties((args as RestoreChangeArgs).blob, cls.GeometryProperties);
    } else if (change == NodeChange.BeforePropertiesChange) {
      const changed = args as PropertiesChangeArgs;
      const names = changed.properties;
      const values = changed.values as (Partial<ColorAdjustParameters> | null | undefined)[];
      // Without parameters yet, the old code wrote into the class's
      // GeometryProperties table itself.
      const parameters = (this._colorAdjust.$shp ||
        (GLColorAdjustEffect.GeometryProperties as unknown)) as ColorAdjustParameters;
      for (let i = 0; i < names.length; i++) {
        const effectName = (names[i] as string).split("&")[0];
        const value = values[i];
        if (Node.getName(GLBrightnessContrastEffect) === effectName) {
          if (value) {
            parameters.brightness = value.brightness as number;
            parameters.contrast = value.contrast as number;
          } else {
            parameters.brightness = 0;
            parameters.contrast = 0;
          }
          (this._fx[0] as Effect).setProperty(
            "shp",
            value,
            changed.custom,
            // The old code passed the payload's `force`, which it never has.
            undefined,
            changed.temporary,
          );
        } else if (Node.getName(GLHueSaturationEffect) === effectName) {
          if (value) {
            parameters.hue = value.hue as number;
            parameters.saturation = value.saturation as number;
          } else {
            parameters.hue = 0;
            parameters.saturation = 0;
          }
          (this._fx[1] as Effect).setProperty(
            "shp",
            value,
            changed.custom,
            undefined,
            changed.temporary,
          );
        }
      }
      this._colorAdjust.setProperty(
        "shp",
        parameters,
        changed.custom,
        undefined,
        changed.temporary,
      );
    }
    this._handleGeometryChangeForProperties(change, args, cls.GeometryProperties);
    // Skips MultiEffect's handler, as the old code did.
    Effect.prototype._handleChange.call(this, change, args);
  }

  override toString(): string {
    return "[Object GColorAdjustMultiEffect]";
  }

  override destroy(): void {
    if (this._colorAdjust) this._colorAdjust.destroy();
    super.destroy();
  }
}

// Like the old module, the class tables (GeometryProperties with the
// prefixed sub-effect properties, VisualProperties, __FX) are set when the
// module loads, before any instance exists.
MultiEffect.register(ColorAdjustMultiEffect, [GLBrightnessContrastEffect, GLHueSaturationEffect]);

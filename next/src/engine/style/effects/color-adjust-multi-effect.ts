// Old: chunk.vendor.js module 1026 (GColorAdjustMultiEffect).
import { Locale } from "../../core/locale/locale.ts";
import type { Rect } from "../../math/rect.ts";
import type { PaintCanvas } from "../../paint/paint-canvas.ts";
import { Node, registerNodeClass } from "../../scene/node.ts";
import { NodeChange } from "../../scene/node-change.ts";
import type { PropertiesChangeArgs } from "../../scene/node-properties.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../../serialize/blob.ts";
import { Effect } from "../effect.ts";
import { glEffectClass, type EffectClass } from "./effect-paint.ts";
import { MultiEffect } from "./multi-effect.ts";

/** The shader parameters of GGLColorAdjustEffect. */
interface ColorAdjustParameters {
  brightness: number;
  contrast: number;
  hue: number;
  saturation: number;
}

/** What this effect uses of GGLColorAdjustEffect (engine-effects-webgl). */
interface GLColorAdjustEffectLike extends Effect {
  $shp: ColorAdjustParameters | null;
}

type GLColorAdjustEffectClass = EffectClass<GLColorAdjustEffectLike> &
  (new (compatibility?: boolean) => GLColorAdjustEffectLike);

let effectsRegistered = false;

/**
 * Registers the effects (brightness/contrast, hue/saturation). The old
 * module did this when it loaded; they belong to engine-effects-webgl, so
 * here it happens on first construction, when they are sure to be loaded.
 */
function registerEffects(): void {
  if (effectsRegistered) return;
  MultiEffect.register(ColorAdjustMultiEffect, [
    glEffectClass("GGLBrightnessContrastEffect"),
    glEffectClass("GGLHueSaturationEffect"),
  ]);
  effectsRegistered = true;
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

  declare _colorAdjust: GLColorAdjustEffectLike;

  constructor() {
    registerEffects();
    super();
    const colorAdjust = glEffectClass("GGLColorAdjustEffect") as GLColorAdjustEffectClass;
    this._colorAdjust = new colorAdjust(true);
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
    this._colorAdjust.render(canvas, target, root, scale, extents, element);
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
      const brightnessContrast = glEffectClass("GGLBrightnessContrastEffect");
      const hueSaturation = glEffectClass("GGLHueSaturationEffect");
      // Without parameters yet, the old code wrote into the class's
      // GeometryProperties table itself.
      const parameters = (this._colorAdjust.$shp ||
        (glEffectClass("GGLColorAdjustEffect")
          .GeometryProperties as unknown)) as ColorAdjustParameters;
      for (let i = 0; i < names.length; i++) {
        const effectName = (names[i] as string).split("&")[0];
        const value = values[i];
        if (Node.getName(brightnessContrast) === effectName) {
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
        } else if (Node.getName(hueSaturation) === effectName) {
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

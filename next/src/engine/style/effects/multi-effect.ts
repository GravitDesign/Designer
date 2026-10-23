// Old: chunk.vendor.js module 535 (GMultiEffect).
import { Locale } from "../../core/locale/locale.ts";
import { getTypeId } from "../../core/object.ts";
import { equals, extend } from "../../core/util.ts";
import type { Rect } from "../../math/rect.ts";
import { Canvas2DPaintCanvas, type PaintCanvas } from "../../paint/paint-canvas.ts";
import { Node, registerNodeClass } from "../../scene/node.ts";
import { NodeChange } from "../../scene/node-change.ts";
import type { PropertiesChangeArgs } from "../../scene/node-properties.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../../serialize/blob.ts";
import { Effect, type EffectPadding, type EffectTypeValue } from "../effect.ts";
import type { EffectClass } from "./effect-paint.ts";

/** The tables register() puts on a multi effect class. */
interface MultiEffectClassTables {
  GeometryProperties?: Record<string, unknown>;
  VisualProperties?: Record<string, unknown>;
  __FX: EffectClass[] | null;
}

const GeometryProperties = {
  fxP: null,
  fxN: null,
};

/**
 * Several effects run as one. A subclass names its effects with
 * register(); their properties appear on the multi effect as
 * "<effect node name>&<property>" and are passed on to the effect.
 */
export class MultiEffect extends Effect {
  static {
    registerNodeClass(this, "multiEffect", "GMultiEffect");
  }

  static override GeometryProperties: Record<string, unknown> = GeometryProperties;
  declare static VisualProperties: Record<string, unknown> | undefined;
  static __FX: EffectClass[] | null = null;

  /**
   * Gives `cls` its effects and their properties, prefixed with the
   * effect's node name. Throws for MultiEffect itself, after setting the
   * tables (as the old code did).
   */
  static register(
    cls: abstract new (...args: never[]) => MultiEffect,
    effects: EffectClass[],
  ): void {
    const target = Node.getClassFromId(
      getTypeId(cls) as number,
    ) as unknown as MultiEffectClassTables;
    target.GeometryProperties = extend(true, {}, MultiEffect.GeometryProperties) as Record<
      string,
      unknown
    >;
    target.__FX = effects.slice();
    if ("multiEffect" === Node.getName(target)) {
      throw new Error("Multi effect cannot be instantiated");
    }
    for (let i = 0; i < effects.length; i++) {
      const effect = effects[i] as EffectClass;
      const name = Node.getName(effect);
      if (effect.GeometryProperties) {
        if (!target.GeometryProperties) target.GeometryProperties = {};
        for (const key in effect.GeometryProperties) {
          target.GeometryProperties[name + "&" + key] = effect.GeometryProperties[key];
        }
      }
      if (effect.VisualProperties) {
        if (!target.VisualProperties) target.VisualProperties = {};
        for (const key in effect.VisualProperties) {
          target.VisualProperties[name + "&" + key] = effect.VisualProperties[key];
        }
      }
    }
  }

  /** Same number of effects, each equal to its counterpart. */
  static equals(a: unknown, b: unknown): boolean {
    if (a instanceof MultiEffect && b instanceof MultiEffect) {
      if (a._fx.length !== b._fx.length) return false;
      for (let i = 0; i < a._fx.length; i++) {
        if (!equals(a._fx[i], b._fx[i])) return false;
      }
      return true;
    }
    return false;
  }

  declare _fx: Effect[];

  constructor() {
    super();
    const cls = Node.getClassFromId(getTypeId(this) as number) as unknown as MultiEffectClassTables;
    const effects = cls.__FX;
    if (!effects || !effects.length) {
      throw new Error("Current multieffect has no subeffects defined");
    }
    this._fx = [];
    effects.forEach((effect) => {
      this._fx.push(new effect());
    });
    if (cls.GeometryProperties && cls.VisualProperties) {
      this._setDefaultProperties(cls.GeometryProperties, cls.VisualProperties);
    } else if (cls.VisualProperties) {
      this._setDefaultProperties(cls.VisualProperties);
    } else if (cls.GeometryProperties) {
      this._setDefaultProperties(cls.GeometryProperties);
    }
  }

  /** Whether every effect is (an `every`, so true for none). */
  override isAffectedByChildren(): boolean {
    return this._fx.every((effect) => effect.isAffectedByChildren());
  }

  override isOverlayEffect(): boolean {
    return this._fx.every((effect) => effect.isOverlayEffect());
  }

  /** The effects' common type, Multi when they differ. */
  override getEffectType(): EffectTypeValue {
    for (let i = 1; i < this._fx.length; i++) {
      if ((this._fx[i - 1] as Effect).getEffectType() !== (this._fx[i] as Effect).getEffectType()) {
        return Effect.Type.Multi;
      }
    }
    return this._fx.length ? (this._fx[0] as Effect).getEffectType() : Effect.Type.Filter;
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GMultiEffect", "name", this.getNodeName()) as string;
  }

  /**
   * The largest padding of the effects per side. Quirk: the result is
   * [left, right, top, bottom] of the maxima, not the [left, top, right,
   * bottom] the rest of the engine uses.
   */
  override getEffectPadding(): EffectPadding {
    let left = 0;
    let top = 0;
    let bottom = 0;
    let right = 0;
    for (let i = 0; i < this._fx.length; i++) {
      const padding = (this._fx[i] as Effect).getEffectPadding();
      if (padding instanceof Array) {
        left = Math.max(padding[0] as number, left);
        top = Math.max(padding[1] as number, top);
        right = Math.max(padding[2] as number, right);
        bottom = Math.max(padding[3] as number, bottom);
      } else {
        left = Math.max(padding as number, left);
        top = Math.max(padding as number, top);
        right = Math.max(padding as number, right);
        bottom = Math.max(padding as number, bottom);
      }
    }
    return [left, right, top, bottom];
  }

  /**
   * Runs the effects one after the other, or, when all of them can, as
   * CSS filters in one copy.
   */
  override render(
    canvas: PaintCanvas,
    target: PaintCanvas | null,
    root: PaintCanvas | null,
    scale: number,
    extents?: Rect,
    element?: unknown,
  ): void {
    let anyNotNative = false;
    for (let i = 0; i < this._fx.length; i++) {
      if (!(this._fx[i] as Effect).canApplyNativeEffect()) {
        anyNotNative = true;
        break;
      }
    }
    if (anyNotNative) {
      this._fx.forEach((effect) => {
        effect.render(canvas, target, root, scale, extents, element);
      });
    } else {
      this._fx.forEach((effect) => {
        effect.applyNativeEffect(canvas, target, root, scale, extents, element);
      });
      (target || canvas).drawCanvas(canvas, 0, 0, 1, Canvas2DPaintCanvas.CompositeOperator.Copy);
      this._fx.forEach((effect) => {
        effect.removeNativeEffect(canvas, target, root);
      });
    }
  }

  override _handleChange(change: number, args?: unknown): void {
    if (change === NodeChange.Store) {
      this.storeProperties((args as StoreChangeArgs).blob, MultiEffect.GeometryProperties);
    } else if (change === NodeChange.Restore) {
      this.restoreProperties((args as RestoreChangeArgs).blob, MultiEffect.GeometryProperties);
    } else if (change == NodeChange.BeforePropertiesChange) {
      // Hands "<effect>&<property>" changes on to the effect, grouped per effect.
      const changed = args as PropertiesChangeArgs;
      const names = changed.properties;
      const values = changed.values;
      const namesByEffect: Record<string, string[]> = {};
      const valuesByEffect: Record<string, unknown[]> = {};
      for (let i = 0; i < names.length; i++) {
        const parts = (names[i] as string).split("&");
        const effectName = parts[0] as string;
        for (let j = 0; j < this._fx.length; j++) {
          if (Node.getName(this._fx[j]) === effectName) {
            if (!namesByEffect[effectName]) namesByEffect[effectName] = [];
            namesByEffect[effectName].push(parts[1] as string);
            if (!valuesByEffect[effectName]) valuesByEffect[effectName] = [];
            valuesByEffect[effectName].push(values[i]);
            break;
          }
        }
      }
      for (const effectName in namesByEffect) {
        let effect: Effect | null = null;
        for (let j = 0; j < this._fx.length; j++) {
          if (Node.getName(this._fx[j]) === effectName) {
            effect = this._fx[j] as Effect;
            break;
          }
        }
        if (effect) {
          effect.setProperties(
            namesByEffect[effectName] as string[],
            valuesByEffect[effectName] as unknown[],
            changed.custom,
            // The old code passed the payload's `force`, which it never has.
            undefined,
            changed.temporary,
          );
        }
      }
    }
    const cls = Node.getClassFromId(getTypeId(this) as number) as unknown as MultiEffectClassTables;
    if (cls.GeometryProperties) {
      this._handleGeometryChangeForProperties(change, args, cls.GeometryProperties);
    }
    if (cls.VisualProperties) {
      this._handleVisualChangeForProperties(change, args, cls.VisualProperties);
    }
    super._handleChange(change, args);
  }

  getFXArray(): Effect[] {
    return this._fx;
  }

  override toString(): string {
    return "[Object GMultiEffect]";
  }

  override destroy(): void {
    if (this._fx) {
      this._fx.forEach((effect) => {
        effect.destroy();
      });
    }
  }
}

MultiEffect.prototype._fx = null as unknown as Effect[];

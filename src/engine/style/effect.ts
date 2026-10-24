// Old: chunk.vendor.js module 906 (GStylable.Effect).
import { getTypeId, registerClass } from "../core/object.ts";
import { containsObjectKey } from "../core/util.ts";
import { Node } from "../scene/node.ts";
import { NodeChange } from "../scene/node-change.ts";
import { Multireference } from "../scene/node-identity.ts";
import { Properties, type PropertiesChangeArgs } from "../scene/node-properties.ts";
import { Store } from "../scene/node-store.ts";
import type { RestoreChangeArgs, StoreChangeArgs } from "../serialize/blob.ts";
import { isStylable, type StyleOwner, type StyleSceneHooks } from "./stylable-sets.ts";

/** Where an effect runs relative to the content it applies to. */
const EffectType = {
  PreEffect: 0,
  PostEffect: 1,
  Filter: 2,
  Multi: 3,
} as const;

export type EffectTypeValue = (typeof EffectType)[keyof typeof EffectType];

/** Padding as one value or [left, top, right, bottom]. */
export type EffectPadding = number | number[] | null;

/** A class of effect, with the defaults assignFrom transfers. */
interface EffectClassTables {
  GeometryProperties?: Record<string, unknown>;
  VisualProperties?: Record<string, unknown>;
}

/** Marks the effects container class; effects.ts registers it. */
let effectsClass: (abstract new (...args: never[]) => object) | null = null;

/** Called by effects.ts so Effect can check its parent without importing it. */
export function registerEffectsClass(cls: abstract new (...args: never[]) => object): void {
  effectsClass = cls;
}

/**
 * The base of all effects (shadows, blur, WebGL filters...). `vs` turns an
 * effect off, `ly` makes it apply to the fill ("F") or border ("B") layer
 * instead of the whole element. Subclasses register a node name.
 */
export class Effect extends Multireference(Properties(Store(Node))) {
  static {
    registerClass(this, "GStylable.Effect");
  }

  static Type = EffectType;

  static GeometryProperties: Record<string, unknown> = {
    vs: true,
    ly: null,
  };

  constructor() {
    super();
    this._setDefaultProperties(Effect.GeometryProperties);
  }

  /** Base properties, plus the class tables when both are the same class. */
  override assignFrom(other: Node): void {
    const tables: Record<string, unknown>[] = [];
    if (other instanceof Effect) tables.push(Effect.GeometryProperties);
    const mine = Node.getClassFromId(
      getTypeId(this) as number,
    ) as unknown as EffectClassTables | null;
    const theirs = Node.getClassFromId(getTypeId(other) as number);
    if (mine && theirs && (mine as unknown) === theirs) {
      const geometry = mine.GeometryProperties;
      const visual = mine.VisualProperties;
      if (geometry) tables.push(geometry);
      if (visual) tables.push(visual);
    }
    if (tables.length) this.transferProperties(other as Effect, tables);
    super.assignFrom(other);
  }

  getEffectType(): EffectTypeValue {
    throw new Error("Not Supported.");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- subclasses take the scale
  getEffectPadding(scale?: number): EffectPadding {
    return null;
  }

  /** The padding as one non-negative number (the largest side). */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  getAbsoluteEffectPadding(scale?: number): number {
    const padding = this.getEffectPadding();
    return "number" == typeof padding
      ? Math.max(0, padding)
      : padding instanceof Array
        ? Math.max.apply(null, padding)
        : 0;
  }

  isOverlayEffect(): boolean {
    return false;
  }

  /**
   * Whether the effect reaches beyond the content. Returns the padding
   * number itself for a number padding, as in the old code.
   */
  isAffectedByChildren(): boolean | number {
    const padding = this.getEffectPadding();
    return (
      !!padding &&
      (padding instanceof Array
        ? Math.max.apply(this, this.getEffectPadding() as number[]) > 0
        : padding)
    );
  }

  isAffectedByContents(): boolean {
    return false;
  }

  isSingleton(): boolean {
    return false;
  }

  canApplyNativeEffect(): boolean {
    return false;
  }

  /** Paints the effect; subclasses return a blend mode for post effects. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- subclasses take canvas, target, scale, ...
  render(...args: unknown[]): unknown {
    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- subclasses take the canvas
  applyNativeEffect(...args: unknown[]): void {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- subclasses take the canvas
  removeNativeEffect(...args: unknown[]): void {}

  override validateInsertion(parent: Node): boolean {
    return !!effectsClass && parent instanceof effectsClass;
  }

  override _handleChange(change: number, args?: unknown): void {
    if (change === NodeChange.Store) {
      this.storeProperties((args as StoreChangeArgs).blob, Effect.GeometryProperties);
    } else if (change === NodeChange.Restore) {
      this.restoreProperties((args as RestoreChangeArgs).blob, Effect.GeometryProperties);
    } else if (change === NodeChange.WorkspaceAttached) {
      const scene = this.getScene();
      if (scene) scene.addDestroyable(this);
    } else if (change === NodeChange.WorkspaceDetach) {
      const scene = this.getScene();
      if (scene) scene.destroy([this]);
    }
    this._handleGeometryChangeForProperties(change, args, Effect.GeometryProperties);
    super._handleChange(change, args);
  }

  /** The stylable element whose effects container holds this effect. */
  getOwnerStylable(): StyleOwner | null {
    const parent = this.getParent();
    if (parent && effectsClass && parent instanceof effectsClass) {
      const owner = parent.getParent();
      if (owner && isStylable(owner)) return owner as unknown as StyleOwner;
    }
    return null;
  }

  getScene(): StyleSceneHooks | null {
    const owner = this.getOwnerStylable();
    return owner && owner.getScene ? owner.getScene() : null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- subclasses look at the canvas
  isCacheable(canvas?: unknown): boolean {
    return true;
  }

  _handleGeometryChangeForProperties(
    change: number,
    args: unknown,
    properties: Record<string, unknown>,
  ): boolean {
    if (
      (change == NodeChange.BeforePropertiesChange || change == NodeChange.AfterPropertiesChange) &&
      containsObjectKey((args as PropertiesChangeArgs).properties, properties)
    ) {
      const owner = this.getOwnerStylable();
      if (owner) {
        switch (change) {
          case NodeChange.BeforePropertiesChange:
            owner._stylePrepareGeometryChange(this);
            break;
          case NodeChange.AfterPropertiesChange:
            owner._styleFinishGeometryChange(this);
        }
      }
      return true;
    }
    return false;
  }

  _handleVisualChangeForProperties(
    change: number,
    args: unknown,
    properties: Record<string, unknown>,
  ): boolean {
    if (
      change == NodeChange.AfterPropertiesChange &&
      containsObjectKey((args as PropertiesChangeArgs).properties, properties)
    ) {
      const owner = this.getOwnerStylable();
      if (owner) owner._styleRepaint(this);
      return true;
    }
    return false;
  }

  override toString(): string {
    return "[Object GStylable.Effect]";
  }

  /** Releases GL resources; the scene calls it when the effect goes. */
  destroy(): void {}
}

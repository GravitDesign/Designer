// Old: chunk.vendor.js module 905 (GStylable.Effects).
import type { Rect } from "../math/rect.ts";
import { Node, registerNodeClass } from "../scene/node.ts";
import { NodeChange } from "../scene/node-change.ts";
import { Container } from "../scene/node-container.ts";
import { Multireference } from "../scene/node-identity.ts";
import { Store } from "../scene/node-store.ts";
import { Effect, registerEffectsClass } from "./effect.ts";
import { isStylable, type StyleOwner } from "./stylable-sets.ts";

/** A stylable node as the padding walk sees its ancestors. */
interface EffectsOwner {
  getEffects(): Effects | null;
}

/** Lets a caller stop the padding walk at an effect. */
export type EffectFilter = (effect: Effect) => boolean;

/**
 * The effects of a stylable element, in order. Pre effects (shadows behind
 * the element) are kept before every other effect on insert.
 */
export class Effects extends Multireference(Store(Container(Node))) {
  static {
    registerNodeClass(this, "effects", "GStylable.Effects");
    registerEffectsClass(this);
  }

  /**
   * The effects for each style layer and then the element (`layers` order
   * plus null), or just the element's when there are no layers.
   */
  getLayersEffects(
    layers?: readonly (string | null)[] | null,
    visibleOnly?: boolean,
  ): (Effect[] | null)[] {
    if (layers && layers.length) {
      const result: (Effect[] | null)[] = [];
      for (let i = 0; i <= layers.length; ++i) {
        const layer = i < layers.length ? (layers[i] as string | null) : null;
        result.push(this.getEffectsForLayer(layer, visibleOnly));
      }
      return result;
    }
    return [this.getEffectsForLayer(null, visibleOnly)];
  }

  /** The effects targeting `layer`: pre effects, then filters, then post effects; null if none. */
  getEffectsForLayer(layer?: string | null, visibleOnly?: boolean): Effect[] | null {
    layer = layer || null;
    let result: Effect[] | null = null;
    const pre: Effect[] = [];
    const filters: Effect[] = [];
    const post: Effect[] = [];
    for (let child = this.getFirstChild(); null !== child; child = child.getNext()) {
      if (child instanceof Effect) {
        const target = child.getProperty("ly");
        if (visibleOnly && false === child.getProperty("vs")) continue;
        if (target === layer) {
          switch (child.getEffectType()) {
            case Effect.Type.PreEffect:
              pre.push(child);
              break;
            case Effect.Type.Filter:
            case Effect.Type.Multi:
              filters.push(child);
              break;
            case Effect.Type.PostEffect:
              post.push(child);
          }
        }
      }
    }
    if (pre.length || filters.length || post.length) result = pre.concat(filters).concat(post);
    return result;
  }

  /**
   * Puts a pre effect after the last pre effect before `reference` (or
   * before the first post effect found walking back), so pre effects stay
   * in front.
   */
  override insertChild(child: Node, reference: Node | null | undefined): void {
    if (child instanceof Effect && child.getEffectType() === Effect.Type.PreEffect) {
      for (let node = reference || this.getLastChild(); null !== node; node = node.getPrevious()) {
        if (node instanceof Effect) {
          if (node.getEffectType() === Effect.Type.PreEffect) {
            reference = node.getNext();
            break;
          }
          if (node.getEffectType() === Effect.Type.PostEffect) reference = node;
        }
      }
    }
    super.insertChild(child, reference);
  }

  override _handleChange(change: number, args?: unknown): void {
    const owner = this.getParent();
    if (owner && isStylable(owner)) {
      const stylable = owner as unknown as StyleOwner;
      if (
        (change == NodeChange.BeforeChildInsert || change === NodeChange.BeforeChildRemove) &&
        args instanceof Effect
      ) {
        stylable._stylePrepareGeometryChange(args);
      }
      if (
        (change == NodeChange.AfterChildInsert || change === NodeChange.AfterChildRemove) &&
        args instanceof Effect
      ) {
        stylable._styleFinishGeometryChange(args);
      }
    }
    super._handleChange(change, args);
  }

  /** `box` grown by the effects' padding. */
  getEffectsBBox(box: Rect, layer?: string | null, scale?: number): Rect {
    const padding = this.getEffectsPadding(scale, layer);
    return padding ? box.expanded(padding[0], padding[1], padding[2], padding[3]) : box;
  }

  /**
   * [left, top, right, bottom] the effects add, or null without effects.
   * The ancestors' effects count with their absolute padding. Pre and post
   * effects overlap (the largest wins), filters add up on top of them.
   */
  getEffectsPadding(
    scale?: number,
    layer?: string | null,
    filter?: EffectFilter,
  ): [number, number, number, number] | null {
    let effects = this.getEffectsForLayer(layer, true) || [];
    const ownCount = effects.length;
    const parent = this.getParent();
    if (parent) {
      parent.findParent((ancestor) => {
        if (isStylable(ancestor)) {
          const ancestorEffects = (ancestor as unknown as EffectsOwner).getEffects();
          if (ancestorEffects) {
            effects = effects.concat(ancestorEffects.getEffectsForLayer(layer, true) || []);
          }
        }
        return undefined;
      });
    }
    if (!effects.length) return null;
    let total: [number, number, number, number] = [0, 0, 0, 0];
    let overlap: [number, number, number, number] = [0, 0, 0, 0];
    let previous: Effect | null = null;
    for (let i = 0; i < effects.length; ++i) {
      const effect = effects[i] as Effect;
      if (filter && !filter(effect)) break;
      let padding: number | number[] | null =
        i >= ownCount ? effect.getAbsoluteEffectPadding(scale) : effect.getEffectPadding(scale);
      if (padding) {
        if (!(padding instanceof Array)) padding = [padding, padding, padding, padding];
        const sides = padding as [number, number, number, number];
        switch (effect.getEffectType()) {
          case Effect.Type.PreEffect:
          case Effect.Type.PostEffect:
            overlap = [
              Math.max(overlap[0], sides[0]),
              Math.max(overlap[1], sides[1]),
              Math.max(overlap[2], sides[2]),
              Math.max(overlap[3], sides[3]),
            ];
            break;
          case Effect.Type.Multi:
          case Effect.Type.Filter:
            if (
              previous &&
              previous.getEffectType() !== Effect.Type.Filter &&
              previous.getEffectType() !== Effect.Type.Multi
            ) {
              total = [
                total[0] + overlap[0],
                total[1] + overlap[1],
                total[2] + overlap[2],
                total[3] + overlap[3],
              ];
              overlap = [0, 0, 0, 0];
            }
            total = [
              total[0] + sides[0],
              total[1] + sides[1],
              total[2] + sides[2],
              total[3] + sides[3],
            ];
        }
        previous = effect;
      }
    }
    if (
      previous &&
      previous.getEffectType() !== Effect.Type.Filter &&
      previous.getEffectType() !== Effect.Type.Multi
    ) {
      total = [
        total[0] + overlap[0],
        total[1] + overlap[1],
        total[2] + overlap[2],
        total[3] + overlap[3],
      ];
    }
    return total;
  }

  /** A new multi-reference id, which the element keeps as `_effId`. */
  override resetMultireference(): void {
    super.resetMultireference();
    const owner = this.getParent() as unknown as StyleOwner | null;
    if (owner) owner._effId = this.getMultireferenceId();
  }
}

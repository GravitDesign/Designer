// Old: the parts of chunk.vendor.js modules 28 (GStylable) and 911
// (GElement.Stylable) that GElement, GBlock and GItem call.
/**
 * GStylable and GElement.Stylable belong to the engine-style cluster
 * (engine/style). GElement checks for them and calls into them, so this
 * file holds the smallest interface of what it calls and a registration
 * point: engine-style calls `registerStyleMixins` when its module loads,
 * which also sets `Element.Stylable` (element.ts does that part).
 *
 * Until then no node has the mixins, and every `hasMixin` check here is
 * false.
 */
import type { PaintContext } from "../paint/paint-context.ts";
import type { Rect } from "../math/rect.ts";
import type { Node } from "./node.ts";
import type { PropertiesNode } from "./node-properties.ts";

/** An effect as the element asks it (GStylable.Effect). */
export interface StyleEffectHooks extends Node {
  isAffectedByChildren(): boolean;
}

/** The effects container of a stylable (GStylable.Effects). */
export interface StyleEffectsHooks {
  getFirstChild(): Node | null;
}

/** A border paint layer as GItem scales it. */
export interface StyleBorderLayerHooks extends PropertiesNode {
  /** Scale the border width with the element. */
  $_bs?: unknown;
  /** Border width. */
  $_bw?: unknown;
}

/** The paint layers container of a stylable (GStylable.PaintLayers). */
export interface StylePaintLayersHooks {
  getBorderLayers(): StyleBorderLayerHooks[];
}

/**
 * What GElement, GBlock and GItem call on a node with GStylable (any
 * stylable) and GElement.Stylable (a stylable element).
 */
export interface StylableHooks {
  getEffects(): StyleEffectsHooks;
  getPaintLayers(): StylePaintLayersHooks | null;
  assignStyleFrom(other: Node, arg?: unknown): void;
}

export interface ElementStylableHooks extends StylableHooks {
  _effects: StyleEffectsHooks | null;
  /** Linked shared style (a reference id). */
  $sref: unknown;
  _setStyleDefaultProperties(): void;
  _paintStyle(context: PaintContext, bbox: Rect | null): void;
  _handleStyleChange(change: number, args: unknown): void;
  _resetFxCacheAndState(): void;
}

/** The registered mixin identities; null until engine-style registers them. */
export const styleMixins: { Stylable: unknown; ElementStylable: unknown } = {
  Stylable: null,
  ElementStylable: null,
};

/** True when the node has GStylable (directly or through GElement.Stylable). */
export function isStylable(node: Node): node is Node & StylableHooks {
  return styleMixins.Stylable !== null && node.hasMixin(styleMixins.Stylable);
}

/** True when the node has GElement.Stylable. */
export function isElementStylable(node: Node): node is Node & ElementStylableHooks {
  return styleMixins.ElementStylable !== null && node.hasMixin(styleMixins.ElementStylable);
}

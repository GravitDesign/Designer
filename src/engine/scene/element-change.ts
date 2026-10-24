// Old: chunk.vendor.js module 22 (GElement.Flag, GElement.CollisionFlag, GElement._Change).
/**
 * GElement's flags and change codes, and a late-bound `isElement` check.
 * The element mixins (element-*.ts) need both, and element.ts imports the
 * mixins, so they live here instead of in element.ts.
 */
import type { Element } from "./element.ts";

/** GElement.Flag; the bits continue GNode.Flag's. */
export const ElementFlag = {
  Hidden: 1 << 21,
  PartialLocked: 1 << 22,
  FullLocked: 1 << 23,
  NoPaint: 1 << 24,
} as const;

/** GElement.CollisionFlag, for getCollisions. */
export const CollisionFlag = {
  Partial: 1,
  GeometryBBox: 1024,
  PaintBBox: 2048,
  FullyContained: 4096,
  CollisionInfo: 8192,
} as const;

/** GElement._Change (its own codes; GNode's and the scene node's stay valid). */
export const ElementChange = {
  ChildGeometryUpdate: 220,
  ChildVisualUpdate: 221,
  GeometrySizeChanged: 210,
  PrepareGeometryUpdate: 240,
  FinishGeometryUpdate: 241,
  InvalidationRequest: 250,
  InvalidationRequested: 251,
  PrepareChildAnchoring: 260,
} as const;

let elementClass: (abstract new (...args: never[]) => Element) | null = null;

/** Called once by element.ts. */
export function bindElementClass(cls: abstract new (...args: never[]) => Element): void {
  elementClass = cls;
}

/** `value instanceof GElement`. */
export function isElement(value: unknown): value is Element {
  return elementClass !== null && value instanceof elementClass;
}

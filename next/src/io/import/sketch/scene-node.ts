import type { Event } from "../../../engine/core/event.ts";
import type { Rect } from "../../../engine/math/rect.ts";
import type { Transform } from "../../../engine/math/transform.ts";

/**
 * A scene node as the Sketch importer handles it. The old code called
 * whatever the node at hand had, often without checking its class, so the
 * importer works on this loose view of the engine classes; a method a node
 * doesn't have throws a TypeError, as before.
 */
export interface SceneNodeLike {
  getParent(): SceneNodeLike | null;
  appendChild(child: SceneNodeLike): void;
  removeChild(child: SceneNodeLike): void;
  insertChild(child: SceneNodeLike, reference: SceneNodeLike | null): void;
  getFirstChild(): SceneNodeLike | null;
  getLastChild(): SceneNodeLike | null;
  getNext(): SceneNodeLike | null;
  hasMixin(mixin: unknown): boolean;
  getProperty(name: string): unknown;
  setProperty(name: string, value: unknown): void;
  setProperties(names: string[], values: unknown[]): void;
  accept(visitor: (node: SceneNodeLike) => unknown): void;
  clone(): SceneNodeLike;
  transform(transform: Transform): void;
  getTransform(): Transform | null;
  setBounds(x: number, y: number, width: number, height: number): void;
  getGeometryBBox(): Rect | null;
  getPaintLayers(): PaintLayersLike | null;
  getEffects(): SceneNodeLike | null;
  getAnchorPoints(): SceneNodeLike;
  getPaths(): SceneNodeLike;
  setSketchPath(sketch: boolean): void;
  correctClosedAttribute(): void;
  transformStyledCorners(target: SceneNodeLike, transform: Transform): void;
  validateInsertion(parent: unknown, reference?: unknown): boolean;
  beginUpdate(): void;
  endUpdate(): void;
  getStatus(): unknown;
  addEventListener(eventClass: unknown, listener: (event: never) => void, target?: unknown): void;
  removeEventListener(
    eventClass: unknown,
    listener: (event: never) => void,
    target?: unknown,
  ): void;
  trigger(event: Event): void;
  getContent(): TextRun[] | null;
  setText(text: unknown): void;
  repaint(): void;
  _requestInvalidation(): void;
  _beginBlockCompositeEvents(a: boolean, b: boolean): void;
  _endBlockCompositeEvents(a: boolean, b: boolean): void;
  _beginBlockChanges(changes: number[]): void;
  _endBlockChanges(changes: number[]): void;
  _runsDirty: boolean;
  _geometryBBox: Rect | null | undefined;
  $vis: boolean;
  $fontFamilies: string[];
  /** The importer object that made the node. */
  __sketchNode__?: unknown;
}

export interface PaintLayersLike extends SceneNodeLike {
  clearFillLayers(): void;
  getLayers(): SceneNodeLike[];
  getFillLayers(visibleOnly?: boolean): SceneNodeLike[];
}

/** A text run as GText.setText takes it (and getContent returns it). */
export interface TextRun {
  text: string;
  fontName?: string;
  fontFamily: string;
  fontWeight: number;
  fontStyle: string;
  fontSize?: unknown;
  fontColor?: string;
  align?: string;
  lineSpacing?: string;
}

/** Any engine node, seen as a SceneNodeLike. */
export function sceneNode(node: object): SceneNodeLike {
  return node as unknown as SceneNodeLike;
}

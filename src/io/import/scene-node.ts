// The node methods the PDF and EPS importers call on the scene nodes they
// build (groups, paths, rectangles, images, texts, pages). Scene node
// classes mix these in from different bases, so the importers treat the
// nodes they create through this one shape.
import type { Rect } from "../../engine/math/rect.ts";
import type { Transform } from "../../engine/math/transform.ts";

export interface ImportPaintLayers {
  appendChild(layer: unknown): void;
}

export interface SceneNodeLike {
  getParent(): SceneNodeLike | null;
  appendChild(child: SceneNodeLike): void;
  removeChild(child: SceneNodeLike): void;
  getFirstChild(): SceneNodeLike | null;
  getLastChild(): SceneNodeLike | null;
  getPrevious(): SceneNodeLike | null;
  getChildren(): SceneNodeLike[];
  hasMixin(mixin: unknown): boolean;
  setProperty(name: string, value: unknown): void;
  setProperties(names: string[], values: unknown[]): void;
  getTransform(): Transform | null;
  setTransform(transform: Transform | null): void;
  transform(transform: Transform): void;
  setBounds(x: number, y: number, width: number, height: number): void;
  getGeometryBBox(): Rect | null;
  getPaintLayers(): ImportPaintLayers | null;
  accept(visitor: (node: SceneNodeLike) => unknown): void;
  toBitmap(): unknown;
}

/** Views a scene node through SceneNodeLike. */
export function sceneNode(node: unknown): SceneNodeLike {
  return node as SceneNodeLike;
}

// Old: chunk.vendor.js module 795 (model/sketchnode).
import type { Transform } from "../../../engine/math/transform.ts";
import type { Rect } from "../../../engine/math/rect.ts";
import { Container } from "../../../engine/scene/node-container.ts";
import { Element } from "../../../engine/scene/element.ts";
import { PathBase } from "../../../engine/scene/path-base.ts";
import { sceneNode, type SceneNodeLike } from "./scene-node.ts";
import type { AsyncExecutor } from "../../../engine/core/async-executor.ts";
import type { SketchLayerData } from "./sketch-data.ts";
import type { SketchFile } from "./sketch-file.ts";
import { SketchBase } from "./sketch-base.ts";

/** A layer that makes one scene node (`_getRelatedNodeClass`) and puts its children into it. */
export class SketchNode extends SketchBase {
  /** Moves the styled corners of every path in `node` by `transform`. */
  static transformStyledCorners(node: SceneNodeLike, transform: Transform | null): void {
    if (transform && !transform.isIdentity()) {
      if (node instanceof PathBase) node.transformStyledCorners(node, transform);
      if (node.hasMixin(Container)) {
        for (let child = node.getFirstChild(); null != child; child = child.getNext())
          SketchNode.transformStyledCorners(child, transform);
      }
    }
  }

  declare _node: SceneNodeLike;

  constructor(
    data: SketchLayerData,
    file: SketchFile,
    parent: SketchBase | null,
    node?: SceneNodeLike | null,
  ) {
    super(data, file, parent);
    // The old constructor made the node before the base constructor ran;
    // nothing there reads it.
    this._node = node || sceneNode(new (this._getRelatedNodeClass())());
  }

  getNode(): SceneNodeLike {
    return this._node;
  }

  _getRelatedNodeClass(): new () => object {
    throw new Error("Not implemented");
  }

  override parse(flag?: unknown, executor?: AsyncExecutor | null): void {
    if (this._node) {
      this._node.__sketchNode__ = this;
      super.parse(flag, executor);
    }
  }

  override transform(transform: Transform | null | undefined): void {
    if (
      transform &&
      !transform.isIdentity() &&
      this._node instanceof Element &&
      this._node.hasMixin(Element.Transform)
    )
      this._node.transform(transform);
  }

  override setBounds(bounds: Rect | undefined): void {
    if (this._node.hasMixin(Element.Transform)) {
      const visible = this._node.$vis;
      try {
        if (!visible) this._node.setProperty("vis", true);
        if (this._node.getGeometryBBox()) {
          const box = bounds as Rect;
          this._node.setBounds(box.getX(), box.getY(), box.getWidth(), box.getHeight());
        }
      } finally {
        this._node.setProperty("vis", visible);
      }
    }
  }

  override appendTo(target: SceneNodeLike, executor?: AsyncExecutor | null): void {
    if (this._node) {
      target.appendChild(this._node);
      super.appendTo(this._node, executor);
    }
  }

  override clone(): this {
    const copy = super.clone();
    copy._node = this._node.clone();
    return copy;
  }
}

SketchNode.prototype._node = null as unknown as SceneNodeLike;

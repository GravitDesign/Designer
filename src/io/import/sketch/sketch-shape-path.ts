// Old: chunk.vendor.js module 563 (model/item/sketchshapepath).
import type { AsyncExecutor } from "../../../engine/core/async-executor.ts";
import { Path } from "../../../engine/scene/path.ts";
import type { SketchPathData, SketchRectData } from "./sketch-data.ts";
import { SketchElement } from "./sketch-element.ts";
import { SketchPathUtil } from "./sketch-path-util.ts";
import { SketchRect } from "./sketch-rect.ts";
import type { SceneNodeLike } from "./scene-node.ts";

/**
 * A vector layer: its points become a path already in place (frame,
 * rotation and flips mapped into the points), so the element's own
 * frame transform is skipped. Null paths leave the layer without a node.
 */
export class SketchShapePath extends SketchElement {
  override parse(_flag?: unknown, executor?: AsyncExecutor | null): void {
    const transform = this._getTransform();
    const path = this._data.path as SketchPathData;
    this._node = SketchPathUtil.generatePath(
      path,
      transform,
      path.isClosed,
      SketchRect.parse(this._data.frame as SketchRectData),
      this._data.fixedRadius,
    ) as SceneNodeLike;
    this._data.noTransform = true;
    if (this._node) {
      this._node.setProperty("csc", true);
      this._node.setProperty("evenodd", this.isEvenOdd());
      super.parse(true, executor);
    }
  }

  override _getRelatedNodeClass(): new () => object {
    return Path;
  }
}

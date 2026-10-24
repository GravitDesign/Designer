// Old: chunk.vendor.js module 1128 (model/item/sketchartboard).
import type { AsyncExecutor } from "../../../engine/core/async-executor.ts";
import { RGBColor } from "../../../engine/color/rgb-color.ts";
import { Rectangle } from "../../../engine/scene/rectangle.ts";
import { Stylable } from "../../../engine/style/stylable.ts";
import type { SceneNodeLike } from "./scene-node.ts";
import { SketchElement } from "./sketch-element.ts";

/** An artboard: a rectangle that holds its layers, white unless it has a background colour. */
export class SketchArtboard extends SketchElement {
  override parse(flag?: unknown, executor?: AsyncExecutor | null): void {
    super.parse(flag, executor);
    if (!this._data.hasBackgroundColor)
      (this._node.getPaintLayers() as SceneNodeLike).appendChild(
        new Stylable.FillPaintLayer(RGBColor.WHITE) as unknown as SceneNodeLike,
      );
  }

  override _getRelatedNodeClass(): new () => object {
    return Rectangle;
  }
}

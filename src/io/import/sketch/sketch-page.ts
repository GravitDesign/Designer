// Old: chunk.vendor.js module 1135 (model/item/sketchpage).
import { Page } from "../../../engine/scene/page.ts";
import { SketchElement } from "./sketch-element.ts";

/** A page: a GPage without the frame transform, sized 0 x 0. */
export class SketchPage extends SketchElement {
  override _postParse(): void {
    super._postParse(true);
    this._node.setProperties(["w", "h"], [0, 0]);
  }

  override _getRelatedNodeClass(): new () => object {
    return Page;
  }
}

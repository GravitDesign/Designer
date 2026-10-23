// Old: chunk.vendor.js module 1212 (model/sketchgroup).
import { Group } from "../../../engine/scene/group.ts";
import { SketchShape } from "./sketch-shape.ts";

/** A group: a GGroup that gets the group's rotation and flips once its layers are in. */
export class SketchGroup extends SketchShape {
  override _postAppendTo(): void {
    super._postAppendTo();
    this.transform(this._getTransformation());
  }

  override _getRelatedNodeClass(): new () => object {
    return Group;
  }
}

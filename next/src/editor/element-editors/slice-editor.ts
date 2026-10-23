// Old: chunk.vendor.js module 1084 (GSliceEditor).
/**
 * The editor of a slice. Slices can't rotate (no rotation handle or
 * corners); a resize previews on a rectangle of the slice's box, and
 * applying it writes the slice's `x`, `y`, `w` and `h`.
 */
import { registerClass } from "../../engine/core/object.ts";
import type { Rect } from "../../engine/math/rect.ts";
import type { Transform } from "../../engine/math/transform.ts";
import { ElementFlag } from "../../engine/scene/element-change.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Slice } from "../../engine/scene/slice.ts";
import { BoxEditor } from "./box-editor.ts";
import { ElementEditor } from "./element-editor.ts";
import { ItemEditor, type EditedItem } from "./item-editor.ts";

export class SliceEditor<E extends EditedItem = EditedItem> extends ItemEditor<E> {
  static {
    registerClass(this, "GSliceEditor");
    ElementEditor.exports(this, Slice);
  }

  constructor(element: E) {
    super(element);
    this._flags &= ~(BoxEditor.Flag.RotateCorners | BoxEditor.Flag.RotateHandle);
  }

  override createElementPreview(): void {
    if (!this._elementPreview) {
      const box = this._element.getSourceBBox() as Rect;
      this._setElementPreview(
        new Rectangle(box.getX(), box.getY(), box.getWidth(), box.getHeight()) as unknown as E,
      );
    }
  }

  override canApplyTransform(): unknown {
    return (
      (this._elementPreview && (this._elementPreview.getTransform() as Transform).invertible()) ||
      (BoxEditor.prototype.canApplyTransform.call(this) &&
        !this.getElement().hasFlag(ElementFlag.PartialLocked))
    );
  }

  /**
   * Writes the previewed move (and resize, when the scale changed) to the
   * slice; a rotated transform is dropped. Without a preview the new
   * height is `h` times the transform's vertical shear (matrix[1]), not
   * its vertical scale, so a resize through `_transform` alone sets the
   * height to 0 (see "A slice scaled without a preview gets height 0" in
   * QUESTIONS.md; pinned in slice-editor.test.ts).
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  override _applyTransform(target: unknown, ...rest: unknown[]): void {
    let transform: Transform | null;
    if (this._elementPreview) transform = this._elementPreview.getTransform();
    else {
      transform = this._transform;
      this.resetTransform();
    }
    if (transform && !transform.getRotationFactor()) {
      const matrix = transform.getMatrix();
      let x = ((this._element.getProperty("x") as number) || 0) + (matrix[4] as number);
      let y = ((this._element.getProperty("y") as number) || 0) + (matrix[5] as number);
      let width = ((this._element.getProperty("w") as number) || 0) * (matrix[0] as number);
      let height = ((this._element.getProperty("h") as number) || 0) * (matrix[1] as number);
      if (1 != transform.getScaleFactor()) {
        if (this._elementPreview) {
          const box = this._elementPreview.getGeometryBBox();
          if (box) {
            x = box.getX();
            y = box.getY();
            width = box.getWidth();
            height = box.getHeight();
          }
        }
        this._element.setProperties(["w", "h"], [width, height]);
      }
      this._element.setProperties(["x", "y"], [x, y]);
    }
  }

  override toString(): string {
    return "[Object GSliceEditor]";
  }
}

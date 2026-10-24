// Old: chunk.vendor.js module 274 (GItemEditor).
/**
 * The editor of an item. An item pasted inside a shape (its parent chain
 * holds a shape, not as a compound path's sub-path) gets a catch handle
 * at its centre: a diamond the user drags to move the content inside its
 * container.
 */
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { registerClass } from "../../engine/core/object.ts";
import { uuid } from "../../engine/core/util.ts";
import { Point } from "../../engine/math/point.ts";
import { Transform } from "../../engine/math/transform.ts";
import { Paths } from "../../engine/scene/compound-path.ts";
import { Shape } from "../../engine/scene/shape.ts";
import { EditorOptions } from "../editor-options.ts";
import { EditorAnnotation } from "../handles/editor-annotation.ts";
import { BaseEditor, PartInfo, type EditorPaintContext } from "./base-editor.ts";
import { BlockEditor } from "./block-editor.ts";
import type { EditedElement } from "./element-editor.ts";

/** An item as the item editor asks it (GItem.getCenter). */
export type EditedItem = EditedElement & { getCenter(arg?: unknown): Point | null };

export class ItemEditor<E extends EditedItem = EditedItem> extends BlockEditor<E> {
  static {
    registerClass(this, "GItemEditor");
  }

  static CATCH_HANDLE_PART_ID = uuid();

  override _getPartInfoAt(
    location: Point,
    transform: Transform,
    tolerance: number,
    extra?: unknown,
  ): PartInfo | null {
    if (
      this.hasFlag(BaseEditor.Flag.Selected) &&
      !(this.getPaintElement().getParent() instanceof Paths) &&
      this.getPaintElement().findParent(function (node) {
        return node instanceof Shape;
      })
    ) {
      const hit = this._getCatchPartInfoAt(location, transform, tolerance);
      if (hit) return hit;
    }
    return super._getPartInfoAt(location, transform, tolerance, extra);
  }

  _getCatchPartInfoAt(
    location: Point,
    transform: Transform,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
    tolerance?: number,
  ): PartInfo | null {
    const element = this.getPaintElement();
    const own = element.getTransform();
    let center = element.getCenter(false);
    center = own ? own.mapPoint(center || new Point(0, 0)) : center;
    const pick = EditorOptions.annotPickDistance;
    return EditorAnnotation.getAnnotationBBox(
      transform,
      center,
      EditorOptions.annotationHandles.catch.size,
      false,
    )
      .expanded(pick, pick, pick, pick)
      .containsPoint(location)
      ? new PartInfo(this, ItemEditor.CATCH_HANDLE_PART_ID, { point: center }, false, false)
      : null;
  }

  override _postPaint(transform: Transform, context: EditorPaintContext): void {
    if (
      this.hasFlag(BaseEditor.Flag.Selected) &&
      this._catchHandleAllowed() &&
      this.getPaintElement().findParent(function (node) {
        return node instanceof Shape;
      })
    ) {
      const element = this.getPaintElement();
      const own = element.getTransform();
      let matrix = own || new Transform(1, 0, 0, 1, 0, 0);
      matrix = transform ? matrix.multiplied(transform) : matrix;
      const center = element.getCenter(false);
      const point = center ? matrix.mapPoint(center) : null;
      if (point) {
        const options = EditorOptions.annotationHandles.catch;
        EditorAnnotation.paintAnnotation(
          context,
          null,
          point,
          options.type,
          true,
          options.size,
          RGBColor.WHITE,
          context.selectionOutlineColor,
        );
      }
    }
  }

  _catchHandleAllowed(): boolean {
    return true;
  }

  override toString(): string {
    return "[Object GItemEditor]";
  }
}

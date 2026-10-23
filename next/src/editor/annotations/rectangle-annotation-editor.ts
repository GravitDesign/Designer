// Old: chunk.vendor.js module 768 (GRectangleAnnotationEditor).
/**
 * The editor of a rectangle annotation: a rectangle editor without the rotation corners and handle.
 * See AnnotationEditorMixin for what all annotation editors share.
 */
import { registerClass } from "../../engine/core/object.ts";
import { RectangleAnnotation } from "../../engine/scene/annotations/rectangle-annotation.ts";
import { BoxEditor } from "../element-editors/box-editor.ts";
import { ElementEditor } from "../element-editors/element-editor.ts";
import { RectangleEditor, type EditedRectangle } from "../element-editors/rectangle-editor.ts";
import { AnnotationEditorMixin } from "./annotation-editor.ts";

export class RectangleAnnotationEditor extends AnnotationEditorMixin(RectangleEditor) {
  static {
    registerClass(this, "GRectangleAnnotationEditor");
    ElementEditor.exports(this, RectangleAnnotation);
  }

  constructor(element: EditedRectangle, uid?: unknown) {
    super(element);
    this._uid = uid;
    this._flags = this._flags & ~(BoxEditor.Flag.RotateCorners | BoxEditor.Flag.RotateHandle);
  }

  override toString(): string {
    return "[Object GRectangleAnnotationEditor]";
  }
}

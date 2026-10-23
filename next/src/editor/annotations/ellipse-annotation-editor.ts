// Old: chunk.vendor.js module 766 (GEllipseAnnotationEditor).
/**
 * The editor of an ellipse annotation: an ellipse editor without the rotation corners and handle.
 * See AnnotationEditorMixin for what all annotation editors share.
 */
import { registerClass } from "../../engine/core/object.ts";
import { EllipseAnnotation } from "../../engine/scene/annotations/ellipse-annotation.ts";
import { BoxEditor } from "../element-editors/box-editor.ts";
import { ElementEditor } from "../element-editors/element-editor.ts";
import { EllipseEditor, type EditedEllipse } from "../element-editors/ellipse-editor.ts";
import { AnnotationEditorMixin } from "./annotation-editor.ts";

export class EllipseAnnotationEditor extends AnnotationEditorMixin(EllipseEditor) {
  static {
    registerClass(this, "GEllipseAnnotationEditor");
    ElementEditor.exports(this, EllipseAnnotation);
  }

  constructor(element: EditedEllipse, uid?: unknown) {
    super(element);
    this._uid = uid;
    this._flags = this._flags & ~(BoxEditor.Flag.RotateCorners | BoxEditor.Flag.RotateHandle);
  }

  override toString(): string {
    return "[Object GEllipseAnnotationEditor]";
  }
}

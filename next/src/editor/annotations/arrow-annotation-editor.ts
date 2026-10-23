// Old: chunk.vendor.js module 770 (GArrowAnnotationEditor).
/**
 * The editor of an arrow annotation: a path editor.
 * See AnnotationEditorMixin for what all annotation editors share.
 */
import { registerClass } from "../../engine/core/object.ts";
import { ArrowAnnotation } from "../../engine/scene/annotations/arrow-annotation.ts";
import { ElementEditor } from "../element-editors/element-editor.ts";
import { PathEditor, type EditedPath } from "../element-editors/path-editor.ts";
import { AnnotationEditorMixin } from "./annotation-editor.ts";

export class ArrowAnnotationEditor extends AnnotationEditorMixin(PathEditor) {
  static {
    registerClass(this, "GArrowAnnotationEditor");
    ElementEditor.exports(this, ArrowAnnotation);
  }

  constructor(element: EditedPath, uid?: unknown) {
    super(element);
    this._uid = uid;
  }

  override toString(): string {
    return "[Object GArrowAnnotationEditor]";
  }
}

// Old: chunk.vendor.js module 774 (GPencilAnnotationEditor).
/**
 * The editor of a pencil annotation: a path editor that shows no point handles.
 * See AnnotationEditorMixin for what all annotation editors share.
 */
import { registerClass } from "../../engine/core/object.ts";
import { PencilAnnotation } from "../../engine/scene/annotations/pencil-annotation.ts";
import { ElementEditor } from "../element-editors/element-editor.ts";
import { PathEditor, type EditedPath } from "../element-editors/path-editor.ts";
import { AnnotationEditorMixin } from "./annotation-editor.ts";

export class PencilAnnotationEditor extends AnnotationEditorMixin(PathEditor) {
  static {
    registerClass(this, "GPencilAnnotationEditor");
    ElementEditor.exports(this, PencilAnnotation);
  }

  constructor(element: EditedPath, uid?: unknown) {
    super(element);
    this._uid = uid;
  }

  override _showAnnotations(): boolean {
    return false;
  }

  override toString(): string {
    return "[Object GPencilAnnotationEditor]";
  }
}

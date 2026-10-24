// Old: chunk.vendor.js module 776 (GHighlighterAnnotationEditor).
/**
 * The editor of a highlighter annotation: a path editor that shows no point handles.
 * See AnnotationEditorMixin for what all annotation editors share.
 */
import { registerClass } from "../../engine/core/object.ts";
import { HighlighterAnnotation } from "../../engine/scene/annotations/highlighter-annotation.ts";
import { ElementEditor } from "../element-editors/element-editor.ts";
import { PathEditor, type EditedPath } from "../element-editors/path-editor.ts";
import { AnnotationEditorMixin } from "./annotation-editor.ts";

export class HighlighterAnnotationEditor extends AnnotationEditorMixin(PathEditor) {
  static {
    registerClass(this, "GHighlighterAnnotationEditor");
    ElementEditor.exports(this, HighlighterAnnotation);
  }

  constructor(element: EditedPath, uid?: unknown) {
    super(element);
    this._uid = uid;
  }

  override _showAnnotations(): boolean {
    return false;
  }

  override toString(): string {
    return "[Object GHighlighterAnnotationEditor]";
  }
}

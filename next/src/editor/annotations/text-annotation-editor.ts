// Old: chunk.vendor.js module 783 (GTextAnnotationEditor).
/**
 * The editor of a text annotation: a text editor. The text annotation
 * tool is not registered in the tool manager, so these come from files.
 * See AnnotationEditorMixin for what all annotation editors share.
 */
import { registerClass } from "../../engine/core/object.ts";
import { TextAnnotation } from "../../engine/scene/annotations/text-annotation.ts";
import { ElementEditor } from "../element-editors/element-editor.ts";
import { TextEditor } from "../element-editors/text-editor.ts";
import { AnnotationEditorMixin } from "./annotation-editor.ts";

type EditedText = ConstructorParameters<typeof TextEditor>[0];

export class TextAnnotationEditor extends AnnotationEditorMixin(TextEditor) {
  static {
    registerClass(this, "GTextAnnotationEditor");
    ElementEditor.exports(this, TextAnnotation);
  }

  constructor(element: EditedText, uid?: unknown) {
    // The old constructor set the uid before the text editor constructor ran.
    super(element);
    this._uid = uid;
  }

  override toString(): string {
    return "[Object GTextAnnotationEditor]";
  }
}

TextAnnotationEditor.prototype._uid = null;

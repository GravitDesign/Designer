// Old: chunk.vendor.js module 1088 (GTextAnnotationTool).
/**
 * Places a text annotation like the text tool. It is not registered in
 * the tool manager.
 *
 * The old module passed GAnnotationTool to GObject.inherit, which ignores
 * mixins, so unlike the other annotation tools its insert carries no
 * add-annotation data; see "Text annotation tool without the annotation
 * tool mixin" in QUESTIONS.md.
 */
import { registerClass, type AnyConstructor } from "../../engine/core/object.ts";
import { TextAnnotation } from "../../engine/scene/annotations/text-annotation.ts";
import type { Node } from "../../engine/scene/node.ts";
import { TextTool } from "../tools/text-tool.ts";
import "./text-annotation-editor.ts";

export class TextAnnotationTool extends TextTool {
  static {
    registerClass(this, "GTextAnnotationTool");
  }

  override _getRelatedItemClass(): AnyConstructor<Node> | null {
    return TextAnnotation;
  }

  override toString(): string {
    return "[Object GTextAnnotationTool]";
  }
}

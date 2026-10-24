// Old: chunk.vendor.js module 769 (GArrowAnnotationTool).
/** Draws an arrow annotation like the line tool, without the position hint. */
import { registerClass, type AnyConstructor } from "../../engine/core/object.ts";
import { ArrowAnnotation } from "../../engine/scene/annotations/arrow-annotation.ts";
import type { Node } from "../../engine/scene/node.ts";
import { Cursor } from "../cursor.ts";
import { LineTool } from "../tools/line-tool.ts";
import "./arrow-annotation-editor.ts";
import { AnnotationToolMixin } from "./annotation-tool.ts";

export class ArrowAnnotationTool extends AnnotationToolMixin(LineTool) {
  static {
    registerClass(this, "GArrowAnnotationTool");
  }

  override _getRelatedItemClass(): AnyConstructor<Node> | null {
    return ArrowAnnotation;
  }

  override getCursor(): string {
    return Cursor.CrossArrow;
  }

  override _showMousePositionInlineHint(): boolean {
    return false;
  }

  override toString(): string {
    return "[Object GArrowAnnotationTool]";
  }
}

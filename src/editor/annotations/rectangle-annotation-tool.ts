// Old: chunk.vendor.js module 767 (GRectangleAnnotationTool).
/** Draws a rectangle annotation like the rectangle tool, without the position hint. */
import { registerClass, type AnyConstructor } from "../../engine/core/object.ts";
import { RectangleAnnotation } from "../../engine/scene/annotations/rectangle-annotation.ts";
import type { Node } from "../../engine/scene/node.ts";
import { Cursor } from "../cursor.ts";
import { RectangleTool } from "../tools/rectangle-tool.ts";
import "./rectangle-annotation-editor.ts";
import { AnnotationToolMixin } from "./annotation-tool.ts";

export class RectangleAnnotationTool extends AnnotationToolMixin(RectangleTool) {
  static {
    registerClass(this, "GRectangleAnnotationTool");
  }

  override _getRelatedItemClass(): AnyConstructor<Node> | null {
    return RectangleAnnotation;
  }

  override getCursor(): string {
    return Cursor.CrossRectangle;
  }

  override _showMousePositionInlineHint(): boolean {
    return false;
  }

  override toString(): string {
    return "[Object GRectangleAnnotationTool]";
  }
}

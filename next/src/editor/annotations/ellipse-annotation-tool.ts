// Old: chunk.vendor.js module 765 (GEllipseAnnotationTool).
/** Draws an ellipse annotation like the ellipse tool, without the position hint. */
import { registerClass, type AnyConstructor } from "../../engine/core/object.ts";
import { EllipseAnnotation } from "../../engine/scene/annotations/ellipse-annotation.ts";
import type { Node } from "../../engine/scene/node.ts";
import { Cursor } from "../cursor.ts";
import { EllipseTool } from "../tools/ellipse-tool.ts";
import "./ellipse-annotation-editor.ts";
import { AnnotationToolMixin } from "./annotation-tool.ts";

export class EllipseAnnotationTool extends AnnotationToolMixin(EllipseTool) {
  static {
    registerClass(this, "GEllipseAnnotationTool");
  }

  override _getRelatedItemClass(): AnyConstructor<Node> | null {
    return EllipseAnnotation;
  }

  override getCursor(): string {
    return Cursor.CrossEllipse;
  }

  override _showMousePositionInlineHint(): boolean {
    return false;
  }

  override toString(): string {
    return "[Object GEllipseAnnotationTool]";
  }
}

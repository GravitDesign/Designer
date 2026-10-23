// Old: chunk.vendor.js module 771 (GCommentAnnotationTool).
/**
 * Places a comment annotation (the speech bubble pin) with a click.
 * Drags do nothing; a click inserts the bubble icon at the click point.
 */
import type { MouseEvent } from "../../engine/core/mouse-event.ts";
import { registerClass, type AnyConstructor } from "../../engine/core/object.ts";
import type { Point } from "../../engine/math/point.ts";
import type { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { CommentAnnotation } from "../../engine/scene/annotations/comment-annotation.ts";
import type { Node } from "../../engine/scene/node.ts";
import { Cursor } from "../cursor.ts";
import { ShapeTool, type DrawnShape } from "../tools/shape-tool.ts";
import "./comment-annotation-editor.ts";
import { AnnotationToolMixin } from "./annotation-tool.ts";

export class CommentAnnotationTool extends AnnotationToolMixin(ShapeTool) {
  static {
    registerClass(this, "GCommentAnnotationTool");
  }

  constructor() {
    super(true, true);
  }

  override _getRelatedItemClass(): AnyConstructor<Node> | null {
    return CommentAnnotation;
  }

  /** Maps the unit square onto `area` (the old code kept it; drags never reach it). */
  override _updateShape(shape: DrawnShape, area: Rect | null, line: Point[] | null): boolean {
    void line;
    if (area) {
      const target = new Transform(
        area.getWidth() / 2,
        0,
        0,
        area.getHeight() / 2,
        area.getX() + area.getWidth() / 2,
        area.getY() + area.getHeight() / 2,
      );
      const inverse =
        ((shape.getProperty("trf") as Transform | null) || new Transform()).inverted() ||
        new Transform();
      (shape as unknown as { transform(transform: Transform): void }).transform(
        inverse.multiplied(target),
      );
      return true;
    }
    return false;
  }

  override _createShape(): DrawnShape | null {
    return null;
  }

  override _mouseDragStart(event: MouseEvent): void {
    void event;
  }

  override _mouseDrag(event: MouseEvent): void {
    void event;
  }

  override _mouseDragEnd(event: MouseEvent): void {
    void event;
  }

  /** Inserts the bubble icon at `point`. */
  override _createShapeManually(point: Point): void {
    const comment = new CommentAnnotation();
    comment.initDefaultForLimitedRestore();
    comment.initSizeAndPosition();
    comment.transform(new Transform(1, 0, 0, 1, point.getX(), point.getY()));
    this._insertShape(comment as unknown as DrawnShape);
  }

  override _showMousePositionInlineHint(): boolean {
    return false;
  }

  override _showAreaInlineHint(): boolean {
    return true;
  }

  override getCursor(): string {
    return Cursor.Comment;
  }

  override toString(): string {
    return "[Object GCommentAnnotationTool]";
  }
}

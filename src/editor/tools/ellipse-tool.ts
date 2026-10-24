// Old: chunk.vendor.js module 551 (GEllipseTool).
/** Draws an ellipse: Shift for a circle, Alt from the centre. */
import { registerClass, type AnyConstructor } from "../../engine/core/object.ts";
import type { Point } from "../../engine/math/point.ts";
import type { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { Ellipse } from "../../engine/scene/ellipse.ts";
import type { Node } from "../../engine/scene/node.ts";
import "../element-editors/ellipse-editor.ts";
import { ShapeTool, type DrawnShape } from "./shape-tool.ts";

export class EllipseTool extends ShapeTool {
  static {
    registerClass(this, "GEllipseTool");
  }

  constructor() {
    super(true, true);
  }

  override _getRelatedItemClass(): AnyConstructor<Node> | null {
    return Ellipse;
  }

  /** The unit circle mapped onto the drag area, at least 1 x 1. */
  override _updateShape(shape: DrawnShape, area: Rect | null, line: Point[] | null): boolean {
    void line;
    if (!area) return false;
    shape.setProperty(
      "trf",
      new Transform(
        Math.max(1, area.getWidth()) / 2,
        0,
        0,
        Math.max(1, area.getHeight()) / 2,
        area.getX() + area.getWidth() / 2,
        area.getY() + area.getHeight() / 2,
      ),
    );
    return true;
  }

  override _showMousePositionInlineHint(): boolean {
    return true;
  }

  override _showAreaInlineHint(): boolean {
    return true;
  }

  override _hasCenterCross(): boolean {
    return true;
  }

  override toString(): string {
    return "[Object GEllipseTool]";
  }
}

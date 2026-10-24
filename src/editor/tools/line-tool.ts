// Old: chunk.vendor.js module 550 (GLineTool).
/**
 * Draws a straight line: an open path of two anchor points. Shift snaps
 * it to 45° steps, Alt draws it from the centre. Lines get no fill.
 */
import { registerClass, type AnyConstructor } from "../../engine/core/object.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import type { Point } from "../../engine/math/point.ts";
import type { Rect } from "../../engine/math/rect.ts";
import type { Node } from "../../engine/scene/node.ts";
import { Path } from "../../engine/scene/path.ts";
import { AnchorPoint } from "../../engine/scene/path-base.ts";
import type { PaintLayers } from "../../engine/style/paint-layers.ts";
import { ShapeTool, type DrawnShape } from "./shape-tool.ts";

export class LineTool extends ShapeTool {
  static {
    registerClass(this, "GLineTool");
  }

  constructor() {
    super(true, true);
  }

  override _getRelatedItemClass(): AnyConstructor<Node> | null {
    return Path;
  }

  override _createShape(): DrawnShape | null {
    const path = new Path(false);
    path.getAnchorPoints().appendChild(new AnchorPoint());
    path.getAnchorPoints().appendChild(new AnchorPoint());
    return path;
  }

  override _updateShape(shape: DrawnShape, area: Rect | null, line: Point[] | null): boolean {
    void area;
    if (!line) return false;
    const points = (shape as Path).getAnchorPoints();
    const [start, end] = line as [Point, Point];
    (points.getChildByIndex(0) as AnchorPoint).setProperties(
      ["x", "y"],
      [start.getX(), start.getY()],
    );
    (points.getChildByIndex(1) as AnchorPoint).setProperties(["x", "y"], [end.getX(), end.getY()]);
    return true;
  }

  /** The base insert, then the fills of the default style are removed. */
  override _insertShape(
    shape: DrawnShape | null,
    preview?: boolean,
    noTransaction?: boolean,
    name?: string,
  ): boolean {
    let inserted: boolean;
    if (noTransaction) {
      inserted = super._insertShape(shape, preview, true);
      ((shape as Path).getPaintLayers() as PaintLayers).clearFillLayers();
    } else
      try {
        this._editor.beginTransaction();
        inserted = super._insertShape(shape, preview, true);
        ((shape as Path).getPaintLayers() as PaintLayers).clearFillLayers();
      } finally {
        const data = this.getAdditionalTransactionData(
          shape as unknown as Node,
          (shape as Path).getParent() as Node | null,
        );
        this._editor.commitTransaction(
          name || (Locale.get(new LocaleKey("GShapeTool", "action.insert-elements")) as string),
          data,
        );
      }
    return inserted;
  }

  override _showMousePositionInlineHint(): boolean {
    return true;
  }

  override _showAreaInlineHint(): boolean {
    return true;
  }

  override toString(): string {
    return "[Object GLineTool]";
  }
}

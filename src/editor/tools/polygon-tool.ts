// Old: chunk.vendor.js module 384 (GPolygonTool).
/**
 * Draws a regular polygon around the press point: the drag sets the
 * outer radius and the angle of the first point; Shift locks the angle to
 * 15° steps. The triangle and star tools are polygon tools with other
 * point counts and inner radius factors.
 */
import type { ModifiersChangedEvent } from "../../engine/core/modifiers-changed-event.ts";
import { registerClass, type AnyConstructor } from "../../engine/core/object.ts";
import { Platform } from "../../engine/core/platform.ts";
import { GMath } from "../../engine/math/math.ts";
import type { Point } from "../../engine/math/point.ts";
import type { Rect } from "../../engine/math/rect.ts";
import type { Node } from "../../engine/scene/node.ts";
import { Polygon } from "../../engine/scene/polygon.ts";
import "../element-editors/polygon-editor.ts";
import { ShapeTool, type DrawnShape } from "./shape-tool.ts";

export class PolygonTool extends ShapeTool {
  static {
    registerClass(this, "GPolygonTool");
  }

  constructor() {
    super(false, false);
  }

  override _getRelatedItemClass(): AnyConstructor<Node> | null {
    return Polygon;
  }

  /** Shift locks the angle, so its change redraws the polygon. */
  override _modifiersChanged(event: ModifiersChangedEvent): void {
    if (event.changed.shiftKey) this._invalidateShape();
    super._modifiersChanged(event);
  }

  override _createShape(): DrawnShape | null {
    return new Polygon();
  }

  _getNumberOfPoints(): number {
    return 6;
  }

  /** 0: the inner radius of a regular polygon (outer radius times cos(π / n)). */
  _getInnerRadiusFactor(): number {
    return 0;
  }

  override _updateShape(shape: DrawnShape, area: Rect | null, line: Point[] | null): boolean {
    void area;
    if (line) {
      const [center, end] = line as [Point, Point];
      const points = this._getNumberOfPoints();
      const dx = end.getX() - center.getX();
      const dy = end.getY() - center.getY();
      let angle = GMath.normalizeAngleRadians(Math.atan2(dy, dx));
      const distance = GMath.ptDist(end.getX(), end.getY(), center.getX(), center.getY());
      if (Platform.modifiers.shiftKey) angle = this._lockAngle(angle);
      const outerAngle = angle;
      const innerAngle = GMath.normalizeAngleRadians(angle + Math.PI / points);
      let outerRadius = distance;
      let innerRadius = distance * Math.cos(Math.PI / points);
      const innerFactor = this._getInnerRadiusFactor();
      if (innerFactor) innerRadius = distance * innerFactor;
      innerRadius = Math.max(0.5, innerRadius);
      outerRadius = Math.max(innerRadius, outerRadius);
      shape.setProperties(
        ["pts", "cx", "cy", "ir", "or", "ia", "oa"],
        [
          points,
          center.getX(),
          center.getY(),
          Math.max(0.5, innerRadius),
          outerRadius,
          innerAngle,
          outerAngle,
        ],
      );
      return true;
    }
    return false;
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

  /** Rounds to 15° steps. */
  _lockAngle(angle: number): number {
    return (Math.round((12 * angle) / Math.PI) * Math.PI) / 12;
  }

  override toString(): string {
    return "[Object GPolygonTool]";
  }
}

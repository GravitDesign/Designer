// Old: chunk.vendor.js module 754 (GStarTool).
/** The polygon tool with five points, half the inner radius and 18° angle steps. */
import { registerClass } from "../../engine/core/object.ts";
import { PolygonTool } from "./polygon-tool.ts";

export class StarTool extends PolygonTool {
  static {
    registerClass(this, "GStarTool");
  }

  override _getNumberOfPoints(): number {
    return 5;
  }

  override _getInnerRadiusFactor(): number {
    return 0.5;
  }

  override _lockAngle(angle: number): number {
    return (Math.round((10 * angle) / Math.PI) * Math.PI) / 10;
  }

  override toString(): string {
    return "[Object GStarTool]";
  }
}

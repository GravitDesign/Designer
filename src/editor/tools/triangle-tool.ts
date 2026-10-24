// Old: chunk.vendor.js module 746 (GTriangleTool).
/** The polygon tool with three points. */
import { registerClass } from "../../engine/core/object.ts";
import { PolygonTool } from "./polygon-tool.ts";

export class TriangleTool extends PolygonTool {
  static {
    registerClass(this, "GTriangleTool");
  }

  override _getNumberOfPoints(): number {
    return 3;
  }

  override toString(): string {
    return "[Object GTriangleTool]";
  }
}

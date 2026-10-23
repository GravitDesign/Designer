// Old: chunk.vendor.js module 598 (geometry/sketchpoint).
import { Point } from "../../../engine/math/point.ts";

/** Sketch's point strings: "{0.5, 1}". */
export const SketchPoint = {
  parse(text: string): Point {
    const parts = text.replace(/{|}/g, "").trim().split(",");
    return new Point(parseFloat(parts[0] as string), parseFloat(parts[1] as string));
  },
};

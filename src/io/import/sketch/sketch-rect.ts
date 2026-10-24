// Old: chunk.vendor.js module 601 (geometry/sketchrect).
import { Rect } from "../../../engine/math/rect.ts";
import { Transform } from "../../../engine/math/transform.ts";
import type { SketchRectData } from "./sketch-data.ts";

export const SketchRect = {
  parse(frame: SketchRectData): Rect {
    return new Rect(frame.x, frame.y, frame.width, frame.height);
  },

  /** Maps `from` onto `to`; an empty side of `from` scales to 0. */
  getTransformation(from: Rect, to: Rect): Transform {
    const width = from.getWidth();
    const height = from.getHeight();
    const sx = width > 0 ? to.getWidth() / width : 0;
    const sy = height > 0 ? to.getHeight() / height : 0;
    return new Transform()
      .translated(-from.getX(), -from.getY())
      .scaled(sx, sy)
      .translated(to.getX(), to.getY());
  },
};

import { Length } from "../../engine/math/length.ts";
import { GMath } from "../../engine/math/math.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";

export const engineMath = {
  GPoint: Point,
  GRect: Rect,
  GTransform: Transform,
  GMath,
  GLength: Length,
};

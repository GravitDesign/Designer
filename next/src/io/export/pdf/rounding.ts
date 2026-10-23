// Old: chunk.vendor.js module 1119 (number rounding for the exporters).
import { GMath } from "../../../engine/math/math.ts";
import { Rect } from "../../../engine/math/rect.ts";

export type Roundable = number | Rect | Roundable[];

/**
 * Rounds a number, a list or a rectangle to `digits` decimals (3 when
 * not a number). A rectangle rounds its parts to the default, ignoring
 * `digits`, as the old code did; NaN stays NaN.
 */
export const Rounding = {
  round(value: Roundable, digits?: number): Roundable {
    if (isNaN(digits as number)) digits = 3;
    if (value instanceof Rect) {
      return new Rect(
        Rounding.round(value.getX()) as number,
        Rounding.round(value.getY()) as number,
        Rounding.round(value.getWidth()) as number,
        Rounding.round(value.getHeight()) as number,
      );
    }
    if (Array.isArray(value)) return value.map((item) => Rounding.round(item, digits));
    return isNaN(value) ? value : GMath.round(value, false, digits);
  },
};

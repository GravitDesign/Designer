// Old: designer.browser.dev.js module 1724 ($.fn.gPivot).
/**
 * The nine-point pivot picker of the transform panels: a `.g-pivot` with a
 * `.borderline` and one `.side[data-side]` per GRect.Side, the chosen one
 * `g-active`. The view is pivot-view.tsx.
 */
import { Rect } from "../../engine/math/rect.ts";

/** The sides in GRect.Side order (the order the old loop created them in). */
export function pivotSides(): string[] {
  const sides: string[] = [];
  for (const name in Rect.Side) {
    if (Object.prototype.hasOwnProperty.call(Rect.Side, name)) {
      const side = (Rect.Side as Record<string, unknown>)[name];
      if ("string" == typeof side) sides.push(side);
    }
  }
  return sides;
}

/** The statistics event of a side click. */
export const PIVOT_CLICK_STATS = "pivot_click_change-button";

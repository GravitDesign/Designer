// Old: designer.browser.dev.js module 1724 ($.fn.gPivot).
/**
 * The nine-point pivot picker of the transform panels: a `.g-pivot` with a
 * `.borderline` and one `.side[data-side]` per GRect.Side, the chosen one
 * `g-active`. The transform panel builds it in code with initPivot,
 * setPivotValue and pivotValue. A click marks the side, then fires a
 * bubbling "pivotchange" CustomEvent with the side as detail (the old
 * `trigger("pivotchange", side)`).
 */
import { Rect } from "../../engine/math/rect.ts";
import { designer } from "../shell/globals.ts";

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

const pivots = new WeakMap<HTMLElement, { value: string | null }>();

function div(className: string): HTMLElement {
  const element = document.createElement("div");
  element.classList.add(className);
  return element;
}

/** `$(div).gPivot()`: builds the picker into `element`. */
export function initPivot(element: HTMLElement): HTMLElement {
  pivots.set(element, { value: null });
  element.classList.add("g-pivot");
  element.appendChild(div("borderline"));
  for (const side of pivotSides()) {
    const button = div("side");
    button.setAttribute("data-side", side);
    button.addEventListener("click", () => {
      designer().stats(PIVOT_CLICK_STATS);
      setPivotValue(element, side);
      element.dispatchEvent(new CustomEvent("pivotchange", { detail: side, bubbles: true }));
    });
    element.appendChild(button);
  }
  return element;
}

/** `gPivot("value", side)`: marks `side` (null marks none). */
export function setPivotValue(element: HTMLElement, side: string | null): void {
  const data = pivots.get(element);
  if (data) data.value = side;
  for (const button of element.querySelectorAll("div[data-side]"))
    button.classList.toggle("g-active", button.getAttribute("data-side") === side);
}

/** `gPivot("value")`. */
export function pivotValue(element: HTMLElement | null): string | null {
  const data = element ? pivots.get(element) : undefined;
  return data ? data.value : null;
}

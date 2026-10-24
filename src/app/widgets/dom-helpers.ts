/**
 * The jQuery traversal and measuring calls the widgets and dialogs used,
 * with jQuery 3.6's results. The shell's own helpers (css, outerWidth,
 * outerHeight) are in shell/dom.ts; these are the rest.
 */

/** `$(el).offset()`: the border box relative to the document. */
export function offset(element: Element): { top: number; left: number } {
  if (!element.getClientRects().length) return { top: 0, left: 0 };
  const rect = element.getBoundingClientRect();
  const view = element.ownerDocument.defaultView;
  return {
    top: rect.top + (view ? view.pageYOffset : 0),
    left: rect.left + (view ? view.pageXOffset : 0),
  };
}

/** `$(window).width()`. */
export function windowWidth(): number {
  return document.documentElement.clientWidth;
}

/** `$(window).height()`. */
export function windowHeight(): number {
  return document.documentElement.clientHeight;
}

/**
 * `$(el).index()`: the position among the element siblings, -1 for no
 * element (an empty jQuery set) or one without a parent.
 */
export function elementIndex(element: Element | null | undefined): number {
  if (!element || !element.parentNode) return -1;
  let index = 0;
  for (
    let sibling = element.previousElementSibling;
    sibling;
    sibling = sibling.previousElementSibling
  )
    index++;
  return index;
}

/** `$(target).closest(selector)[0]`, for any event target. */
export function closestOf(target: unknown, selector: string): Element | null {
  return target instanceof Element ? target.closest(selector) : null;
}

/** `$(el).is(":input")`: input, select, textarea or button. */
export function isFormControl(element: unknown): boolean {
  if (!(element instanceof Element)) return false;
  const name = element.nodeName.toLowerCase();
  return name === "input" || name === "select" || name === "textarea" || name === "button";
}

/** `$(el).is(":focus")`. */
export function hasFocus(element: Element): boolean {
  return element.ownerDocument.activeElement === element;
}

/**
 * `$(el).scrollParent()` (jQuery UI): the nearest ancestor that scrolls,
 * or the document when there is none.
 */
export function scrollParent(element: HTMLElement): HTMLElement | Document {
  const position = getComputedStyle(element).position;
  const excludeStatic = position === "absolute";
  const overflowRegex = /(auto|scroll)/;
  if (position === "fixed") return element.ownerDocument;
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    const style = getComputedStyle(parent);
    if (excludeStatic && style.position === "static") continue;
    if (overflowRegex.test(style.overflow + style.overflowY + style.overflowX)) return parent;
  }
  return element.ownerDocument;
}

/** A tiny listener list for the jQuery events a widget triggered on itself. */
export class Listeners<A extends unknown[]> {
  private _list: ((...args: A) => void)[] = [];

  add(listener: (...args: A) => void): void {
    this._list.push(listener);
  }

  remove(listener: (...args: A) => void): void {
    const index = this._list.indexOf(listener);
    if (index >= 0) this._list.splice(index, 1);
  }

  /** Calls every listener in the order they were added. */
  fire(...args: A): void {
    for (const listener of this._list.slice()) listener(...args);
  }

  get size(): number {
    return this._list.length;
  }
}

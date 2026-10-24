/**
 * The focus tests the edit actions make before they act on the document:
 * jQuery's `:editable` and `:textSelectable` pseudo selectors, which the
 * old app defined in designer.browser.dev.js module 1689 (ported with
 * the widgets as widgets/debounce.ts), and jQuery's own `:button`.
 *
 * :editable and :textSelectable come from widgets/debounce.ts, so there
 * is one copy of module 1689.
 */

import { isEditable, isTextSelectable as isTextSelectableElement } from "../widgets/debounce.ts";

export { isEditable };

/**
 * `$(target).is(":textSelectable")` for an event target: false for
 * anything that is not an element (the document, the window).
 */
export function isTextSelectable(target: unknown): boolean {
  return target instanceof Element && isTextSelectableElement(target);
}

/** `$(element).is("button")`. */
export function isButtonElement(element: Element | null | undefined): boolean {
  return !!element && element.nodeName.toLowerCase() === "button";
}

/** `$(element).is(":button")`: a button, or an input of type button. */
export function isButtonLike(element: Element | null | undefined): boolean {
  if (!element) return false;
  const name = element.nodeName.toLowerCase();
  return name === "button" || (name === "input" && (element as HTMLInputElement).type === "button");
}

/** `$(element).is("select")`. */
export function isSelectElement(element: Element | null | undefined): boolean {
  return !!element && element.nodeName.toLowerCase() === "select";
}

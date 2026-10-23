/**
 * The focus tests the edit actions make before they act on the document:
 * jQuery's `:editable` and `:textSelectable` pseudo selectors, which the
 * old app defined in designer.browser.dev.js module 1689 (ported with
 * the widgets as widgets/debounce.ts), and jQuery's own `:button`.
 *
 * Kept here as plain functions so the actions need no jQuery. They must
 * stay in step with module 1689.
 */

/** Input types `:editable` accepted ("" and a missing type count as text). */
const EDITABLE_INPUT_TYPES = [
  "",
  "text",
  "password",
  "email",
  "number",
  "month",
  "search",
  "tel",
  "week",
  "url",
  "time",
  "datetime",
  "datetime-local",
  "date",
];

/** `$(element).is(":editable")`. */
export function isEditable(element: Element | null | undefined): boolean {
  if (!element) return false;
  if (
    "true" === element.getAttribute("contenteditable") ||
    (element as HTMLElement).isContentEditable
  ) {
    return true;
  }
  if (element.nodeName.toLowerCase() === "input") {
    const type = element.getAttribute("type");
    return !type || EDITABLE_INPUT_TYPES.includes(type);
  }
  return element.nodeName.toLowerCase() === "textarea";
}

/** `$(element).is(":textSelectable")`: the element's computed user-select is "text". */
export function isTextSelectable(element: unknown): boolean {
  if (!(element instanceof Element)) return false;
  return "text" === getComputedStyle(element).userSelect;
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

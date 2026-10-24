// Old: designer.browser.dev.js module 1689 ($.fn.debounce and the
// :editable and :textSelectable selectors).
/**
 * The two focus tests the shortcuts, the edit actions and the designer's
 * key and context menu handlers make. The old module added them to
 * jQuery as the `:editable` and `:textSelectable` selectors; here they
 * are plain functions, and the callers import them from here.
 *
 * The module also added `$.fn.debounce`, which nothing in the old app
 * called; it is left out.
 */

/** Input types `:editable` accepts ("" and a missing type count as text). */
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

/** `$(el).is(":editable")`: contenteditable, a text-like input or a textarea. */
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

/** `$(el).is(":textSelectable")`: the computed user-select is "text". */
export function isTextSelectable(element: Element | null | undefined): boolean {
  if (!element) return false;
  return "text" === getComputedStyle(element).userSelect;
}

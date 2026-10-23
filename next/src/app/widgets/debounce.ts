// Old: designer.browser.dev.js module 1689 ($.fn.debounce and the
// :editable and :textSelectable selectors).
/**
 * A debounced event binding and the two focus tests the shortcuts and
 * the edit actions make. The old module added them to jQuery; here they
 * are plain functions. actions/focus.ts keeps its own copy of the two
 * tests, which must stay the same as these.
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

/**
 * Wraps `callback` so that it runs `wait` ms after the last call, with that
 * call's arguments and `this`.
 */
export function debounce<A extends unknown[]>(
  callback: (...args: A) => void,
  wait: number,
): (...args: A) => void {
  let timer: ReturnType<typeof setTimeout> | 0 | undefined;
  return function (this: unknown, ...args: A): void {
    clearTimeout(timer);
    timer = setTimeout(() => {
      callback.apply(this, args);
      timer = 0;
    }, wait);
  };
}

/**
 * `$(el).debounce(type, callback, wait)`: listens for `type` and calls
 * `callback` debounced. Returns a function that removes the listener.
 */
export function bindDebounced<E extends Event>(
  target: EventTarget,
  type: string,
  callback: (event: E) => void,
  wait: number,
): () => void {
  const handler = debounce(callback, wait) as (event: Event) => void;
  target.addEventListener(type, handler);
  return () => target.removeEventListener(type, handler);
}

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

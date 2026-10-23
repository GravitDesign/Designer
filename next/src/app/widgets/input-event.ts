// Old: designer.browser.dev.js module 1714 (the jQuery "input" special
// event and $.fn.input).
/**
 * The old module taught jQuery an "input" event for browsers without
 * `oninput`: it polled the value on focus, key, paste, cut and drop. Its
 * setup first checked `"oninput" in element` and, where that held, let
 * jQuery bind the native event instead. Every browser the app runs in has
 * `oninput`, so the poller never ran; what is left is `$.fn.input`.
 */

/** Whether elements with this tag have a native input event (always, today). */
export function hasNativeInputEvent(tagName: string): boolean {
  return "oninput" in document.createElement(tagName);
}

/** `$(el).input(callback)`: listens for input. Returns the remover. */
export function onInput(element: EventTarget, callback: (event: Event) => void): () => void {
  element.addEventListener("input", callback);
  return () => element.removeEventListener("input", callback);
}

/** `$(el).input()`: triggers an input event on the element. */
export function triggerInput(element: EventTarget): void {
  element.dispatchEvent(new Event("input", { bubbles: true }));
}

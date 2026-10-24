/**
 * The DOM helpers of the paint and effect panels (fill, border,
 * appearance, effects). Those panels build their rows in code into the
 * elements the inspector sidebar hands them, and the sidebar moves
 * elements between panels afterwards (InspectorSidebar._updateUI), so the
 * panels own plain DOM, as docs/rewrite/UI.md allows for panels. These
 * helpers are the few jQuery calls the old panels made, with jQuery's
 * results (class order, inline style order, `:input`, `.val`).
 */
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { css } from "../shell/dom.ts";

// The panels share one `el`, `isVisible` and DOM property row.
export { el, isVisible, propertyRow } from "./properties.ts";

/** `GLocale.get(new GLocaleKey(className, key))`. */
export function str(className: string, key: string): string {
  return Locale.get(new LocaleKey(className, key)) ?? "";
}

/** `$(el).addClass(classes)`: every whitespace separated name, in order, once. */
export function addClass<T extends Element>(element: T, classes: string | null | undefined): T {
  if (!classes) return element;
  for (const name of classes.split(/\s+/)) if (name) element.classList.add(name);
  return element;
}

/** `$(el).removeClass(classes)`. */
export function removeClass<T extends Element>(element: T, classes: string): T {
  for (const name of classes.split(/\s+/)) if (name) element.classList.remove(name);
  return element;
}

/** `$(el).toggleClass(name, state)`. */
export function toggleClass<T extends Element>(element: T, name: string, state: boolean): T {
  if (state) element.classList.add(name);
  else element.classList.remove(name);
  return element;
}

/** `$(el).attr(name, value)` for a set of attributes, in order. */
export function attrs<T extends Element>(element: T, values: Record<string, string | number>): T {
  for (const name of Object.keys(values)) element.setAttribute(name, String(values[name]));
  return element;
}

/** `$(el).text(value)`. */
export function setText<T extends Element>(element: T, value: unknown): T {
  element.textContent = value === null || value === undefined ? "" : String(value);
  return element;
}

/** `$(el).append(children...)`, skipping null. */
export function append<T extends Element>(element: T, ...children: (Node | null | undefined)[]): T {
  for (const child of children) if (child) element.appendChild(child);
  return element;
}

/** `$(el).css("display", visible ? "" : "none")`. */
export function setShown(element: HTMLElement, visible: boolean): void {
  css(element, "display", visible ? "" : "none");
}

/**
 * `$(select).val(value)`: null and undefined select the empty value; a
 * value no option has leaves nothing selected.
 */
export function setValue(element: HTMLSelectElement | HTMLInputElement, value: unknown): void {
  element.value = value === null || value === undefined ? "" : String(value);
}

/** `$(el).parents(selector)`: the ancestors that match, nearest first. */
export function parents(element: Element, selector: string): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (let node = element.parentElement; node; node = node.parentElement)
    if (node.matches(selector)) out.push(node);
  return out;
}

/** `$(el).find(selector)` as an array. */
export function findAll<T extends Element = HTMLElement>(root: ParentNode, selector: string): T[] {
  return Array.from(root.querySelectorAll<T>(selector) as unknown as ArrayLike<T>);
}

/**
 * Data the old panels kept with `$(el).data(name, value)` (the paint
 * layer or effect of a row).
 */
const elementData = new WeakMap<Element, Map<string, unknown>>();

export function setData(element: Element, name: string, value: unknown): void {
  let map = elementData.get(element);
  if (!map) {
    map = new Map();
    elementData.set(element, map);
  }
  map.set(name, value);
}

export function getData<T = unknown>(
  element: Element | null | undefined,
  name: string,
): T | undefined {
  if (!element) return undefined;
  const map = elementData.get(element);
  return map ? (map.get(name) as T | undefined) : undefined;
}

/**
 * `$(el).trigger("change", [extra])`: a bubbling change event whose
 * `detail` carries the extra arguments the old handlers received.
 */
export function triggerChange(element: Element, ...extra: unknown[]): void {
  element.dispatchEvent(new CustomEvent("change", { bubbles: true, detail: extra }));
}

/** The extra arguments of a triggerChange event (empty for a native one). */
export function changeArgs(event: Event): unknown[] {
  return event instanceof CustomEvent && Array.isArray(event.detail)
    ? (event.detail as unknown[])
    : [];
}

/** jQuery's default easing. */
function swing(p: number): number {
  return 0.5 - Math.cos(p * Math.PI) / 2;
}

/** jQuery 3's frame timer: animation frames while the page is shown, else 13 ms timeouts. */
function nextFrame(step: () => void): void {
  if (document.hidden === false && typeof requestAnimationFrame === "function")
    requestAnimationFrame(step);
  else setTimeout(step, 13);
}

/**
 * The fade of the "copied" hints of the fill, border and effect panels:
 * the old `$(hint).animate({ opacity: 0, top: "+=20" }, 500, hint.remove)`
 * over 500 ms with jQuery's swing easing. The complete callback was
 * jQuery's remove called on the bare element, which removes nothing, so
 * the hint stays in the panel, transparent and 20 px lower, until the next
 * copy replaces it (see "Copy hint stays in the panel after its fade" in
 * QUESTIONS.md).
 */
export function fadeCopyHint(element: HTMLElement): void {
  const top = parseFloat(element.style.top) || 0;
  const start = Date.now();
  const step = (): void => {
    const p = Math.min(1, (Date.now() - start) / 500);
    const eased = swing(p);
    css(element, "opacity", String(1 - eased));
    css(element, "top", top + 20 * eased);
    if (p < 1) nextFrame(step);
  };
  nextFrame(step);
}

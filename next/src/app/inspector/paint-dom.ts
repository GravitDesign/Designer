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

/** `$("<tag></tag>").addClass(classes)`. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  classes?: string | null,
): HTMLElementTagNameMap[K] {
  return addClass(document.createElement(tag), classes);
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

/** jQuery's `:input`: input, select, textarea and button elements. */
export function isInput(element: unknown): boolean {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLButtonElement
  );
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

/** `$(el).is(":visible")`: has a layout box (jQuery 3). */
export function isVisible(element: HTMLElement): boolean {
  return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
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

/** A column of `propertyRow` (the old gPropertyRow options). */
export interface DomPropertyRowColumn {
  content?: Element | null;
  /** Markup (from the panel's own code) instead of content. */
  html?: string;
  clazz?: string;
  width?: string | number;
  prefix?: string | { label: string; width?: string | number | null };
  padding?: boolean;
  label?: string | Element;
  labelClass?: string;
}

export interface DomPropertyRowOptions {
  clazz?: string;
  label?: string | Element;
  icon?: string | Element;
  click?: (event: MouseEvent) => void;
  justified?: boolean;
  clickable?: boolean;
  hoverable?: boolean;
  height?: string | number;
  columns: DomPropertyRowColumn[];
  isMenu?: boolean;
  rawClick?: (event: MouseEvent) => void;
  noPaddingRight?: boolean;
}

function has(options: object, name: string): boolean {
  return Object.prototype.hasOwnProperty.call(options, name);
}

function setWidth(element: HTMLElement, width: string | number): void {
  css(element, "width", width);
}

/**
 * `$(target).gPropertyRow(options)` (module 1725): makes `target` a
 * property row and appends its label, columns and captions. Called twice
 * on one element it appends a second set, as the old plugin did.
 */
export function propertyRow<T extends HTMLElement>(target: T, options: DomPropertyRowOptions): T {
  target.classList.add("g-property-row");
  if (has(options, "clazz")) addClass(target, options.clazz);
  if (has(options, "label") || has(options, "icon")) {
    const label = el("label", "property-label");
    target.appendChild(label);
    if (has(options, "icon")) {
      target.classList.add("icon-label");
      label.classList.add("strict-line-height");
      if ("string" == typeof options.icon) label.appendChild(el("span", options.icon));
      else if (options.icon) label.appendChild(options.icon);
    } else {
      const span = el("span", "vertical-align");
      label.appendChild(span);
      if ("string" == typeof options.label) span.textContent = options.label;
      else if (options.label) span.appendChild(options.label);
    }
    if (options.click) {
      label.classList.add("clickable");
      const click = options.click;
      for (const span of findAll(label, "span")) {
        span.appendChild(el("span", "gravit-icon-down click-arrow"));
        span.addEventListener("click", click as EventListener);
      }
    }
  } else target.classList.add("no-label");
  if (has(options, "justified") && true === options.justified) target.classList.add("justified");
  const columns = el("div", "columns");
  target.appendChild(columns);
  if (has(options, "clickable") && options.clickable) columns.classList.add("clickable");
  if (has(options, "hoverable") && options.hoverable) columns.classList.add("hoverable");
  if (has(options, "height") && options.height !== undefined)
    css(columns, "height", options.height);
  let captions = false;
  for (const column of options.columns) {
    const cell = column.content && isInput(column.content) ? el("label") : el("div");
    cell.classList.add("column");
    if (has(column, "clazz")) addClass(cell, column.clazz);
    if ("auto" === column.width) cell.classList.add("auto-grow");
    else if (column.width) setWidth(cell, column.width);
    if (column.prefix) {
      let html: string;
      let width: string | number | null = null;
      if ("string" == typeof column.prefix) html = column.prefix + "&nbsp;";
      else {
        html = column.prefix.label;
        width = column.prefix.width || null;
      }
      const prefix = el("div", "prefix");
      if (width !== null) setWidth(prefix, width);
      // Markup from the panels' own code, as the old .html(prefix).
      prefix.innerHTML = html;
      cell.appendChild(prefix);
    }
    if (column.content) {
      const content = el("div", "content");
      content.appendChild(column.content);
      cell.appendChild(content);
    } else if (column.html) {
      const holder = document.createElement("div");
      holder.innerHTML = column.html;
      while (holder.firstChild) cell.appendChild(holder.firstChild);
    } else cell.innerHTML = "&nbsp;";
    if (!column.content || (has(column, "padding") && false === column.padding))
      cell.classList.add("no-padding");
    if (column.label) captions = true;
    if (options.isMenu) {
      const arrow = el("div", "gravit-icon-right");
      const content = column.content;
      arrow.addEventListener("click", () => {
        if (content instanceof HTMLElement) content.click();
      });
      cell.appendChild(arrow);
      columns.classList.add("no-padding-left");
    }
    if (has(options, "rawClick") && options.rawClick)
      cell.addEventListener("click", options.rawClick as EventListener);
    if (options.noPaddingRight) columns.classList.add("no-padding-right");
    columns.appendChild(cell);
  }
  if (captions) {
    const labels = el("div", "labels");
    target.appendChild(labels);
    for (const column of options.columns) {
      const caption = el("label");
      if (column.label) {
        if ("string" == typeof column.label) {
          const span = el("span", column.labelClass ? column.labelClass : "");
          span.textContent = column.label;
          caption.appendChild(span);
        } else caption.appendChild(column.label);
      } else caption.innerHTML = "&nbsp;";
      if ("auto" === column.width) caption.classList.add("auto-grow");
      else if (column.width) setWidth(caption, column.width);
      if (!column.content || (has(column, "padding") && false === column.padding))
        caption.classList.add("no-padding");
      labels.appendChild(caption);
    }
  }
  return target;
}

// Old: designer.browser.dev.js module 123 (GProperties).
/**
 * The base of every inspector panel. The inspector sidebar
 * (inspector-sidebar.ts) creates one instance of each panel in the old
 * gravit.properties order (PROPERTIES_TABLE there), calls
 * `init(panel, toolbar)` once with the panel's container and toolbar
 * element, and then `update(document, elements, data)` on every
 * selection, tool, transform-mode or storage change. `update` returns
 * whether the panel is shown; the sidebar shows or hides the panel and
 * the toolbar (display none) from it.
 *
 * Registration contract for the other inspector clusters: export the
 * subclass under the name PROPERTIES_TABLE in inspector-sidebar.ts gives
 * (the old name minus G) from the port-map file, construct it without
 * arguments, and keep `toString()` returning the old "[Object G...]"
 * string, because the sidebar sorts panels into the appearance group and
 * the accordions by that string, as before.
 */
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import type { Node } from "../../engine/scene/node.ts";
import type { Scene } from "../../engine/scene/scene.ts";
import type { Editor } from "../../editor/editor.ts";
import type { Document } from "../document/document.ts";
import type { SidebarTouchTool } from "../shell/layout.ts";

/** What the sidebar hands to update(): the selection, a tool's default style or the page. */
export type InspectedElements = Node[];

export class Properties {
  protected _touchTools: SidebarTouchTool[] | null = null;

  /** Builds the panel into `panel`; header buttons go into `toolbar`. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- subclasses take both elements
  init(_panel: HTMLElement, _toolbar: HTMLElement): void {
    throw new Error("Not Supported.");
  }

  /**
   * Whether a divider is shown between the previous visible panel and
   * this one (the previous panel is passed, null for the first one).
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- subclasses look at it
  isGroup(_previous: Properties | null): boolean {
    return true;
  }

  /** Sticky panels go below the scrolling ones (none of the old panels was). */
  isSticky(): boolean {
    return false;
  }

  /** Whether the panel can show at all in this edit mode (transform mode of the select tool). */
  isAvailable(transformMode: boolean): boolean {
    return !transformMode;
  }

  /**
   * Shows `elements` of `document` (null when no document is active);
   * `data` is the storage item of a StorageItemUpdated event, else null.
   * Returns whether the panel is visible. The base only clears the
   * document's active styles list and returns nothing (falsy), as before.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- subclasses use all three
  update(document: Document | null, _elements: InspectedElements | null, _data?: unknown): boolean {
    const target = document || this._document;
    if (target) target.clearActiveStylesList();
    return false;
  }

  /** The document of the last update; set by subclasses that keep it (the old `this._document`). */
  protected _document: Document | null = null;

  openPatternChooser(): void {
    throw new Error("Not Supported.");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- subclasses take both
  openEyeDropper(_event?: unknown, _options?: unknown): void {
    throw new Error("Not Supported.");
  }

  setTouchTools(tools: SidebarTouchTool[] | null): void {
    this._touchTools = tools;
  }

  getTouchTools(): SidebarTouchTool[] | null {
    return this._touchTools;
  }

  toString(): string {
    return "[Object GProperties]";
  }
}

/** jQuery's `:visible`: the element has a layout box. */
export function isVisible(element: Element): boolean {
  const html = element as HTMLElement;
  return !!(html.offsetWidth || html.offsetHeight || element.getClientRects().length);
}

/** Old display values hide() saved, which show() puts back (jQuery's data "display"). */
const savedDisplay = new WeakMap<HTMLElement, string>();

/**
 * jQuery 3's show() for one element: clears an inline "none" (or puts
 * back what hide() saved); when the stylesheet still hides it, writes
 * the tag's default display.
 */
export function show(element: HTMLElement): void {
  let value: string | null = null;
  if (element.style.display === "none") {
    value = savedDisplay.get(element) || null;
    if (!value) element.style.display = "";
  }
  if (
    element.style.display === "" &&
    element.isConnected &&
    getComputedStyle(element).display === "none"
  ) {
    value = defaultDisplay(element);
  }
  if (value !== null) element.style.display = value;
}

/** jQuery 3's hide() for one element. */
export function hide(element: HTMLElement): void {
  const display = element.style.display;
  if (display !== "none") {
    if (display) savedDisplay.set(element, display);
    element.style.display = "none";
  }
}

/** jQuery's getDefaultDisplay: the display of a fresh element of the same tag in body. */
function defaultDisplay(element: HTMLElement): string {
  const probe = element.ownerDocument.createElement(element.nodeName);
  element.ownerDocument.body.appendChild(probe);
  let display = getComputedStyle(probe).display;
  probe.remove();
  if (display === "none") display = "block";
  return display;
}

/** `$(el).css("display", shown ? "" : "none")`. */
export function setDisplayed(element: HTMLElement, shown: boolean): void {
  element.style.setProperty("display", shown ? "" : "none");
}

/** `$(element).insertAfter(target)` for one element and one target. */
export function insertAfter(element: Element | null, target: Element | null): void {
  if (!element || !target || !target.parentNode) return;
  target.parentNode.insertBefore(element, target.nextSibling);
}

/** `$(html)`: one element from markup. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  return element;
}

/** A column of propertyRow (the old gPropertyRow column options, with DOM content). */
export interface RowColumn {
  /** The field (one element or several, as a jQuery set appended). */
  content?: Element | Element[] | null;
  /** Markup appended instead of content. */
  html?: string | Element;
  clazz?: string;
  /** "auto" grows the column; a number is pixels; a string is CSS. */
  width?: string | number;
  prefix?: string | { label: string; width?: string | number | null };
  padding?: boolean;
  /** The caption under the column: text, or an element. */
  label?: string | Element | null;
  labelClass?: string;
}

/** The old gPropertyRow options, with DOM content. */
export interface RowOptions {
  clazz?: string;
  label?: string | Element | Element[];
  icon?: string | Element;
  click?: (event: MouseEvent) => void;
  justified?: boolean;
  clickable?: boolean;
  hoverable?: boolean;
  height?: string | number;
  columns: RowColumn[];
  isMenu?: boolean;
  rawClick?: (event: MouseEvent) => void;
  noPaddingRight?: boolean;
}

const has = (object: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(object, key);

/** jQuery's `.css("width", value)`: numbers get px, null and undefined change nothing. */
function cssWidth(element: HTMLElement, value: string | number | null | undefined): void {
  if (value === null || value === undefined) return;
  element.style.width = typeof value === "number" ? value + "px" : value;
}

function appendContent(target: Element, content: Element | Element[]): void {
  if (Array.isArray(content)) for (const c of content) target.appendChild(c);
  else target.appendChild(content);
}

/** `$(content).is(":input")`: any of the elements is a form control. */
function isInput(content: Element | Element[]): boolean {
  const list = Array.isArray(content) ? content : [content];
  return list.some((c) => /^(input|select|textarea|button)$/i.test(c.nodeName));
}

/** `addClass` with a space-separated list (empty adds nothing). */
export function addClasses(element: Element, classes: string | null | undefined): void {
  if (!classes) return;
  const list = classes.split(/\s+/).filter(Boolean);
  if (list.length) element.classList.add(...list);
}

/**
 * `$(row).gPropertyRow(options)` (old module 1725) on plain DOM: adds
 * g-property-row to `row` and builds the label, the columns and the
 * captions in the old order. Returns `row`. Shared by the inspector
 * panels that build their rows in code.
 */
export function propertyRow<T extends HTMLElement>(row: T, options: RowOptions): T {
  row.classList.add("g-property-row");
  if (has(options, "clazz")) addClasses(row, options.clazz);
  if (has(options, "label") || has(options, "icon")) {
    const label = el("label", "property-label");
    row.appendChild(label);
    if (has(options, "icon")) {
      row.classList.add("icon-label");
      label.classList.add("strict-line-height");
      if (typeof options.icon === "string") {
        const span = el("span");
        addClasses(span, options.icon);
        label.appendChild(span);
      } else if (options.icon) label.appendChild(options.icon);
    } else {
      const span = el("span", "vertical-align");
      label.appendChild(span);
      if (typeof options.label === "string") span.textContent = options.label;
      else if (options.label) appendContent(span, options.label);
    }
    if (options.click) {
      label.classList.add("clickable");
      for (const span of label.querySelectorAll("span")) {
        span.appendChild(el("span", "gravit-icon-down click-arrow"));
        span.addEventListener("click", options.click);
      }
    }
  } else row.classList.add("no-label");
  if (has(options, "justified") && options.justified === true) row.classList.add("justified");
  const columns = el("div", "columns");
  row.appendChild(columns);
  if (has(options, "clickable") && options.clickable) columns.classList.add("clickable");
  if (has(options, "hoverable") && options.hoverable) columns.classList.add("hoverable");
  if (has(options, "height")) cssWidthLike(columns, "height", options.height);
  let captions = false;
  for (const column of options.columns) {
    const tag = column.content && isInput(column.content) ? "label" : "div";
    const element = el(tag, "column");
    if (has(column, "clazz")) addClasses(element, column.clazz);
    if (column.width === "auto") element.classList.add("auto-grow");
    else if (column.width) cssWidth(element, column.width);
    if (column.prefix) {
      let html: string;
      let width: string | number | null = null;
      if (typeof column.prefix === "string") html = column.prefix + "&nbsp;";
      else {
        html = column.prefix.label;
        width = column.prefix.width || null;
      }
      const prefix = el("div", "prefix");
      cssWidth(prefix, width);
      prefix.innerHTML = html;
      element.appendChild(prefix);
    }
    if (column.content) {
      const content = el("div", "content");
      appendContent(content, column.content);
      element.appendChild(content);
    } else if (column.html instanceof Element) element.appendChild(column.html);
    else if (column.html) {
      const holder = document.createElement("div");
      holder.innerHTML = column.html;
      for (const child of [...holder.childNodes]) element.appendChild(child);
    } else element.innerHTML = "&nbsp;";
    if (!column.content || (has(column, "padding") && column.padding === false))
      element.classList.add("no-padding");
    if (column.label) captions = true;
    if (options.isMenu) {
      const arrow = el("div", "gravit-icon-right");
      arrow.addEventListener("click", () => {
        const content = column.content;
        const list = Array.isArray(content) ? content : content ? [content] : [];
        for (const c of list) if (c instanceof HTMLElement) c.click();
      });
      element.appendChild(arrow);
      columns.classList.add("no-padding-left");
    }
    if (has(options, "rawClick") && options.rawClick)
      (element as HTMLElement).addEventListener("click", options.rawClick);
    if (options.noPaddingRight) columns.classList.add("no-padding-right");
    columns.appendChild(element);
  }
  if (captions) {
    const labels = el("div", "labels");
    row.appendChild(labels);
    for (const column of options.columns) {
      const label = el("label");
      if (column.label) {
        if (typeof column.label === "string") {
          const span = el("span");
          span.textContent = column.label;
          addClasses(span, column.labelClass);
          label.appendChild(span);
        } else label.appendChild(column.label);
      } else label.innerHTML = "&nbsp;";
      if (column.width === "auto") label.classList.add("auto-grow");
      else if (column.width) cssWidth(label, column.width);
      if (!column.content || (has(column, "padding") && column.padding === false))
        label.classList.add("no-padding");
      labels.appendChild(label);
    }
  }
  return row;
}

function cssWidthLike(
  element: HTMLElement,
  name: "height",
  value: string | number | null | undefined,
): void {
  if (value === null || value === undefined) return;
  element.style[name] = typeof value === "number" ? value + "px" : value;
}

/** `GLocale.get(new GLocaleKey(table, key))` as a string. */
export function text(table: string, key: string): string {
  return Locale.get(new LocaleKey(table, key)) ?? "";
}

/** The scene of a document the panel shows (always set while it is shown). */
export function sceneOf(document: Document): Scene {
  return document.getScene() as Scene;
}

/** The editor of a document the panel shows (always set while it is shown). */
export function editorOf(document: Document): Editor {
  return document.getEditor() as Editor;
}

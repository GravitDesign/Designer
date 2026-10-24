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

// The one DOM port of the old property row plugin (widgets/property-row.ts).
export { propertyRow, type RowColumn, type RowOptions } from "../widgets/property-row.ts";

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

  /** Opens the eye dropper of the panel's color chooser at the page point. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- subclasses take both
  openEyeDropper(_pageX?: number, _pageY?: number): void {
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

/** `$(el).addClass(classes)`: every whitespace separated name, in order, once. */
export function addClasses(element: Element, classes: string | null | undefined): void {
  if (!classes) return;
  const list = classes.split(/\s+/).filter(Boolean);
  if (list.length) element.classList.add(...list);
}

/** `$("<tag></tag>").addClass(classes)`. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  classes?: string | null,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  addClasses(element, classes);
  return element;
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

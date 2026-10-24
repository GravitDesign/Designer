// Old: designer.browser.dev.js module 1731 (GDesignerStyleEditor, $.fn.gDesignerStyleEditor).
/**
 * The shared style picker of the appearance panel. `attach(field)` (the
 * old `$(field).gDesignerStyleEditor()`) makes a click on the field open
 * the picker overlay:
 *
 *     .g-overlay > .g-style-editor
 *       .styles.no-style > .style        "No Shared Style"
 *       .styles > .style*                 one row per shared style
 *       .style-toolbar > div > button     Create / Organize
 *
 * Create opens the style creator overlay (name, preview and the property
 * sets to share); Organize opens a dialog where the rows can be dragged
 * into another order, edited or deleted. Assigning a row links the
 * selection to that style (`sref`) in one undo step.
 *
 * Plain DOM like the old jQuery code: the overlay and dialog wrappers
 * come from dialogs/dialog-container.ts and dialogs/dialog.ts, and the
 * rows are rebuilt from the scene's styles every time.
 *
 * Dropped: the Pro badge (gPro) on the field and the analytics calls.
 * The field's "open" and "close" events are dispatched as bubbling DOM
 * events, as jQuery's trigger did.
 */
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import type { Node } from "../../engine/scene/node.ts";
import { Style } from "../../engine/style/style.ts";
import { PropertySet } from "../../engine/style/stylable-sets.ts";
import { Text } from "../../engine/text/text.ts";
import type { Editor } from "../../editor/editor.ts";
import { Dialog } from "../dialogs/dialog.ts";
import { Overlay } from "../dialogs/dialog-container.ts";
import type { Document } from "../document/document.ts";
import { computed, css, height } from "../shell/dom.ts";
import { designer } from "../shell/globals.ts";
import { offset } from "../widgets/dom-helpers.ts";

/** A shared style as the picker uses it. */
interface StyleNode extends Node {
  getReferenceId(): string;
  getProperty(name: string): unknown;
  setProperty(name: string, value: unknown): boolean;
  setProperties(names: string[], values: unknown[]): boolean;
  assignStyleFrom(source: unknown): void;
  disconnectStyle(): void;
  clone(): StyleNode;
}

/** A selected element as the picker uses it. */
interface StylableElement extends Node {
  getProperty(name: string): unknown;
  addStyle(style: unknown): void;
  removeStyle(style?: unknown): void;
  getReferencedStyle(): StyleNode | null;
}

/** The scene's styles container. */
interface StylesContainer {
  getFirstChild(): Node | null;
  appendChild(child: Node): void;
  insertChild(child: Node, reference: Node | null | undefined): void;
  removeChild(child: Node): void;
  getIndexOfChild(child: Node): number;
}

function str(table: string, key: string): string {
  return Locale.get(new LocaleKey(table, key)) ?? "";
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K): HTMLElementTagNameMap[K] {
  return document.createElement(tag);
}

function activeDocument(): Document {
  // The designer holds GDocuments; its own interface types only what the shell needs.
  return designer().getActiveDocument() as unknown as Document;
}

function activeEditor(): Editor {
  return activeDocument().getEditor() as Editor;
}

function selection(): StylableElement[] | null {
  return activeEditor().getSelection() as StylableElement[] | null;
}

function styles(): StylesContainer | null {
  const scene = activeDocument().getScene();
  return scene ? (scene.getStyles() as unknown as StylesContainer | null) : null;
}

/** `$(img).attr("src", value)`: null leaves the attribute out. */
function setSrc(img: HTMLImageElement, src: string | null): void {
  if (src !== null && src !== undefined) img.setAttribute("src", src);
}

/** `$(el).trigger(type)`: a bubbling DOM event. */
function trigger(element: Element, type: string): void {
  element.dispatchEvent(new CustomEvent(type, { bubbles: true }));
}

/**
 * `$(el).offset({ top, left })` (jQuery 3.6 setOffset) for the positioned
 * overlay wrappers: moves the element by the difference to its current
 * offset, writing top and then left.
 */
function setOffset(element: HTMLElement, target: { top: number; left: number }): void {
  const position = computed(element, "position");
  if (position === "static") element.style.position = "relative";
  const current = offset(element);
  const cssTop = computed(element, "top");
  const cssLeft = computed(element, "left");
  let top: number;
  let left: number;
  if (
    (position === "absolute" || position === "fixed") &&
    (cssTop + cssLeft).indexOf("auto") > -1
  ) {
    // jQuery's .position(): the offset relative to the offset parent.
    const parent = (element.offsetParent as HTMLElement | null) || document.documentElement;
    const parentOffset = parent === document.documentElement ? { top: 0, left: 0 } : offset(parent);
    top = current.top - parentOffset.top - (parseFloat(computed(element, "margin-top")) || 0);
    left = current.left - parentOffset.left - (parseFloat(computed(element, "margin-left")) || 0);
  } else {
    top = parseFloat(cssTop) || 0;
    left = parseFloat(cssLeft) || 0;
  }
  css(element, "top", target.top - current.top + top);
  css(element, "left", target.left - current.left + left);
}

/** Whether a drag of the pressed row may start (the press was on the row, not a button). */
let dragAllowed = false;
/** The style of the row being dragged. */
let draggedStyle: StyleNode | null = null;
/** The row being dragged. */
let draggedRow: HTMLElement | null = null;

/** The style a row element stands for ($(row).data("style")). */
const rowStyles = new WeakMap<Element, StyleNode>();

/**
 * Links (or with `remove`, unlinks) every selected element to `style`, in
 * one transaction.
 */
function assignStyle(style: StyleNode, remove?: boolean): void {
  const editor = activeEditor();
  const nodes = selection();
  if (nodes && nodes.length > 0) {
    const name = str("GDesignerStyleEditor", "text.style-attribution");
    editor.beginTransaction();
    try {
      for (let i = 0; i < nodes.length; ++i)
        if (remove) (nodes[i] as StylableElement).removeStyle(style.getReferenceId());
        else (nodes[i] as StylableElement).addStyle(style.getReferenceId());
    } finally {
      editor.commitTransaction(name);
    }
    editor.updateSelection(false, nodes);
  }
}

/**
 * The style creator (or, with `edit`, the editor of `style`), opened at
 * `anchor`. Creating from the picker, `anchor` is the picker's row list
 * (the new row goes there) and `listContent` the picker overlay's content.
 */
function openStyleCreator(
  anchor: HTMLElement,
  edit: boolean,
  style: StyleNode | null,
  listContent?: HTMLElement,
): void {
  const document_ = activeDocument();
  if (!edit) {
    style = new Style() as unknown as StyleNode;
    style.setProperty("name", str("GDesignerStyleEditor", "text.new-style"));
    style.setProperty("defaultStyle", false);
  }
  const target = style as StyleNode;
  const preview = target.clone();
  let source: StylableElement | null = null;
  const current = document_.getEditor()?.getSelection();
  if (current && current.length > 0) source = current[0] as StylableElement;
  if (!edit && source) preview.assignStyleFrom(source);
  const title = edit
    ? str("GDesignerStyleEditor", "text.style-editor")
    : str("GDesignerStyleEditor", "text.style-creator");

  const header = el("div");
  const titleSpan = el("span");
  titleSpan.textContent = title;
  header.appendChild(titleSpan);
  header.className = "creator-toolbar";

  const nameInput = el("input");
  css(nameInput, "align-self", "center");
  css(nameInput, "width", "100%");
  nameInput.setAttribute("type", "text");
  nameInput.value = String(target.getProperty("name") ?? "");

  const row = el("div");
  row.className = "style";
  const image = el("img");
  css(image, "align-self", "center");
  css(image, "margin-left", "10px");
  setSrc(image, designer().getStylePreview(preview, source instanceof Text));
  row.appendChild(image);
  row.appendChild(nameInput);

  const sets = target.getProperty("ps") as string[] | null;
  const has = (set: string) => !!sets && sets.indexOf(set) >= 0;
  const checkboxes = el("div");
  checkboxes.className = "checkboxes";
  const checkbox = (property: string, checked: boolean, label: string) => {
    const box = el("div");
    const input = el("input");
    input.setAttribute("data-property", property);
    input.setAttribute("type", "checkbox");
    input.checked = checked;
    box.appendChild(input);
    const span = el("span");
    span.textContent = str("GDesignerStyleEditor", label);
    box.appendChild(span);
    box.className = "checkbox";
    checkboxes.appendChild(box);
  };
  checkbox("style", !edit || has(PropertySet.Style), "text.style");
  checkbox("fill", !edit || has(PropertySet.FillPaintLayers), "text.fill");
  checkbox("border", !edit || has(PropertySet.BorderPaintLayers), "text.border");
  checkbox("effects", !edit || has(PropertySet.Effects), "text.effects");
  checkbox("text", edit ? has(PropertySet.Text) : source instanceof Text, "text.text");

  const content = el("div");
  const footer = el("div");
  const button = el("button");
  // Old: .html(...) with the string table text.
  button.innerHTML = edit
    ? str("GCommonNames", "action.apply")
    : str("GDesignerStyleEditor", "action.create");
  const checked = (property: string) =>
    (checkboxes.querySelector(`input[data-property="${property}"]`) as HTMLInputElement).checked;
  button.addEventListener("click", () => {
    const chosen: string[] = [];
    if (checked("style")) chosen.push(PropertySet.Style);
    if (checked("fill")) chosen.push(PropertySet.FillPaintLayers);
    if (checked("border")) chosen.push(PropertySet.BorderPaintLayers);
    if (checked("effects")) chosen.push(PropertySet.Effects);
    if (checked("text")) {
      chosen.push(PropertySet.Text);
      chosen.push(PropertySet.Paragraph);
    }
    target.setProperties(
      ["name", "ps"],
      [(row.querySelector("input") as HTMLInputElement).value, chosen],
    );
    if (!edit) {
      if (source) target.assignStyleFrom(source);
      (document_.getScene()?.getStyles() as unknown as StylesContainer).appendChild(target);
      addStyleRow(target, anchor, false, listContent);
      // Old: `if (i.parent())`, always true for a jQuery set.
      const wrapper = (listContent as HTMLElement).parentElement;
      if (wrapper && offset(wrapper).top + height(wrapper) > document.body.clientHeight)
        setOffset(wrapper, { top: offset(wrapper).top - 34, left: offset(wrapper).left });
      assignStyle(target);
    }
    designer().createNewStylePreview(target, true, source instanceof Text);
    overlay.close(anchor);
    if (!edit && listContent) Overlay.of(listContent)?.close();
    if (edit)
      for (const list of document.querySelectorAll<HTMLElement>(".g-style-creator .styles"))
        refreshStyles(list, edit);
    else
      for (const list of document.querySelectorAll<HTMLElement>(
        ".g-style-editor .styles:not(.no-style)",
      ))
        refreshStyles(list, edit);
  });
  footer.appendChild(button);
  footer.className = "creator-toolbar bottom";

  content.className = "g-style-creator";
  content.appendChild(header);
  const list = el("div");
  list.className = "styles";
  list.appendChild(row);
  content.appendChild(list);
  content.appendChild(checkboxes);
  content.appendChild(footer);
  const overlay = new Overlay(content, { padding: false, releaseOnClose: true });
  overlay.open(anchor);
  const wrapper = overlay.getElement();
  const top = offset(wrapper).top;
  const left = offset(wrapper).left;
  setOffset(wrapper, { top, left: left - 100 });
  nameInput.focus();
}

/** Whether the dragged row may be dropped on `row`. */
function canDropOn(row: Element): boolean {
  if (draggedStyle) {
    const style = rowStyles.get(row);
    return !!style && style.getReferenceId() !== draggedStyle.getReferenceId();
  }
  return false;
}

/**
 * Rebuilds the style rows of `container` (the organizer's or editor's
 * list with `organizer`); the picker also gets its "No Shared Style" row
 * back.
 */
function refreshStyles(container: HTMLElement, organizer: boolean): void {
  container.replaceChildren();
  const list = styles();
  if (list) {
    if (!organizer)
      for (const noStyle of document.querySelectorAll<HTMLElement>(".g-style-editor .no-style")) {
        noStyle.replaceChildren();
        addNoStyleRow(noStyle);
      }
    for (let style = list.getFirstChild(); null !== style; style = style.getNext())
      if (false === (style as StyleNode).getProperty("defaultStyle"))
        addStyleRow(style as StyleNode, container, organizer);
  }
}

/** Whether the first selected element is linked to `style`. */
function isSelectedStyle(style: StyleNode): boolean {
  const nodes = selection();
  return (
    !!(nodes && nodes.length > 0) &&
    (nodes[0] as StylableElement).getProperty("sref") === style.getReferenceId()
  );
}

/**
 * Appends the row of `style` to `container`: a draggable row with edit
 * and delete buttons in the organizer, else a row that assigns the style
 * (and closes the picker overlay of `pickerContent`).
 */
function addStyleRow(
  style: StyleNode,
  container: HTMLElement,
  organizer: boolean,
  pickerContent?: HTMLElement,
): void {
  const dragStart = (event: DragEvent) => {
    if (!dragAllowed) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    draggedRow = (event.target as Element).closest(".style") as HTMLElement;
    event.stopPropagation();
    draggedStyle = draggedRow ? rowStyles.get(draggedRow) || null : null;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", "dummy_data");
    }
    // Every drag start adds another set of drop listeners to the rows,
    // as the old .on() calls did; a rebuild after the drop drops them.
    for (const candidate of container.querySelectorAll<HTMLElement>(".style")) {
      candidate.addEventListener("dragenter", () => {
        if (canDropOn(candidate)) {
          for (const sibling of (candidate.parentElement as HTMLElement).querySelectorAll(".style"))
            sibling.classList.remove("g-drop");
          candidate.classList.add("g-drop");
        }
      });
      candidate.addEventListener("dragleave", (leave: DragEvent) => {
        // Old: `$(e.target).parent() !== this` compared a jQuery set with
        // an element, which is always true.
        if (canDropOn(candidate) && leave.target !== candidate)
          candidate.classList.remove("g-drop");
      });
      candidate.addEventListener("dragover", (over: DragEvent) => {
        if (canDropOn(candidate)) {
          over.preventDefault();
          over.stopPropagation();
          if (over.dataTransfer) over.dataTransfer.dropEffect = "move";
        }
      });
      candidate.addEventListener("drop", () => {
        candidate.classList.remove("g-drop");
        const target = rowStyles.get(candidate);
        if (draggedStyle && target && draggedStyle.getParent() === target.getParent()) {
          const parent = draggedStyle.getParent() as unknown as StylesContainer;
          const from = parent.getIndexOfChild(draggedStyle);
          const to = parent.getIndexOfChild(target);
          parent.removeChild(draggedStyle);
          parent.insertChild(draggedStyle, from < to ? target.getNext() : target);
          refreshStyles(container, true);
        }
      });
    }
  };

  const row = el("div");
  row.className = "style";
  rowStyles.set(row, style);
  container.appendChild(row);
  const selector = el("div");
  selector.className = "style-selector";
  row.appendChild(selector);
  if (organizer) {
    row.setAttribute("draggable", "true");
    row.addEventListener("mousedown", (event) => {
      const target = event.target as Element;
      dragAllowed =
        target.classList.contains("style") ||
        !!(target.parentElement && target.parentElement.classList.contains("style"));
    });
    row.addEventListener("dragstart", dragStart);
    row.addEventListener("dragend", () => undefined);
  } else {
    const selected = isSelectedStyle(style);
    row.setAttribute("data-selected", selected ? "yes" : "no");
    if (selected) row.classList.add("g-selected");
    row.addEventListener("click", () => {
      if ("no" === row.getAttribute("data-selected")) {
        for (const other of document.querySelectorAll(".g-style-editor .style"))
          other.classList.remove("g-selected");
        for (const other of document.querySelectorAll(".g-style-editor .style"))
          other.setAttribute("data-selected", "no");
        row.setAttribute("data-selected", "yes");
        row.classList.add("g-selected");
        assignStyle(style);
      }
      if (pickerContent) Overlay.of(pickerContent)?.close();
    });
  }
  let first: StylableElement | null = null;
  const nodes = selection();
  if (nodes && nodes.length > 0) first = nodes[0] as StylableElement;
  const image = el("img");
  css(image, "align-self", "center");
  setSrc(image, designer().getStylePreview(style, first instanceof Text));
  row.appendChild(image);
  const name = el("span");
  css(name, "align-self", "center");
  css(name, "white-space", "nowrap");
  css(name, "text-overflow", "ellipsis");
  css(name, "overflow", "hidden");
  css(name, "width", "200px");
  name.textContent = String(style.getProperty("name") ?? "");
  row.appendChild(name);
  if (organizer) {
    const buttons = el("div");
    buttons.className = "styles-buttons";
    css(buttons, "display", "none");
    const remove = el("button");
    remove.className = "g-flat";
    css(remove, "align-self", "center");
    const trash = el("span");
    trash.className = "gravit-icon-trash";
    remove.appendChild(trash);
    remove.addEventListener("click", () => {
      style.disconnectStyle();
      styles()?.removeChild(style);
      row.remove();
    });
    buttons.appendChild(remove);
    const settings = el("button");
    settings.className = "g-flat";
    css(settings, "align-self", "center");
    const icon = el("span");
    icon.className = "gravit-icon-settings";
    settings.appendChild(icon);
    settings.addEventListener("click", () => openStyleCreator(row, true, style));
    buttons.appendChild(settings);
    row.appendChild(buttons);
  }
  if (!container.classList.contains("styles")) container.classList.add("styles");
}

/**
 * Appends the "No Shared Style" row to `container` when something is
 * selected; clicking it unlinks the selection (and closes the picker
 * overlay of `pickerContent`).
 */
function addNoStyleRow(container: HTMLElement, pickerContent?: HTMLElement): void {
  const nodes = selection();
  if (nodes && nodes.length > 0) {
    const row = el("div");
    row.className = "style";
    container.appendChild(row);
    const first = nodes[0] as StylableElement;
    const selected = !first.getProperty("sref");
    const selector = el("div");
    selector.className = "style-selector";
    row.appendChild(selector);
    row.setAttribute("data-selected", selected ? "yes" : "no");
    if (selected) row.classList.add("g-selected");
    row.addEventListener("click", () => {
      if ("no" === row.getAttribute("data-selected")) {
        for (const other of (row.parentElement as HTMLElement).querySelectorAll(".style")) {
          other.setAttribute("data-selected", "no");
          other.classList.remove("g-selected");
        }
        row.setAttribute("data-selected", "yes");
        row.classList.add("g-selected");
        assignStyle(first.getReferencedStyle() as StyleNode, true);
      }
      if (pickerContent) Overlay.of(pickerContent)?.close();
    });
    const label = el("span");
    css(label, "align-self", "center");
    label.textContent = str("GDesignerStyleEditor", "text.no-style");
    css(label, "width", "165px");
    css(label, "margin-left", "10px");
    row.appendChild(label);
    if (!container.classList.contains("styles")) {
      container.classList.add("styles");
      container.classList.add("no-style");
    }
  }
}

/** The organizer dialog; Finish rebuilds the picker's rows (closing it with `pickerContent`). */
function openOrganizer(pickerContent: HTMLElement): void {
  const header = el("div");
  const title = el("span");
  title.textContent = str("GDesignerStyleEditor", "text.style-organizer");
  header.appendChild(title);
  header.className = "creator-toolbar";
  const list = el("div");
  const container = styles();
  let any = false;
  if (container)
    for (let style = container.getFirstChild(); null !== style; style = style.getNext())
      if (false === (style as StyleNode).getProperty("defaultStyle")) {
        any = true;
        addStyleRow(style as StyleNode, list, true);
      }
  if (!any) addNoStyleRow(list);
  const content = el("div");
  const footer = el("div");
  const finish = el("button");
  // Old: .html(...) with the string table text.
  finish.innerHTML = str("GCommonNames", "text.finish");
  finish.addEventListener("click", () => {
    const lists = document.querySelectorAll<HTMLElement>(".g-style-editor .styles:not(.no-style)");
    for (const target of lists) target.replaceChildren();
    if (container)
      for (let style = container.getFirstChild(); null !== style; style = style.getNext())
        if (false === (style as StyleNode).getProperty("defaultStyle"))
          for (const target of lists) addStyleRow(style as StyleNode, target, false, pickerContent);
    dialog.close();
  });
  footer.appendChild(finish);
  footer.className = "creator-toolbar bottom";
  content.appendChild(header);
  content.appendChild(list);
  content.appendChild(footer);
  const dialog = new Dialog(content, {
    releaseOnClose: true,
    className: "g-style-creator organizer",
  });
  dialog.open(false);
}

/** Opens the picker overlay at `field`. */
function openPicker(field: HTMLElement): void {
  const noStyle = el("div");
  const list = el("div");
  const content = el("div");
  content.className = "g-style-editor";
  css(content, "width", "250px");
  addNoStyleRow(noStyle, content);
  const container = styles();
  if (container)
    for (let style = container.getFirstChild(); null !== style; style = style.getNext())
      if (false === (style as StyleNode).getProperty("defaultStyle"))
        addStyleRow(style as StyleNode, list, false, content);
  const toolbar = el("div");
  toolbar.className = "style-toolbar";
  const createBox = el("div");
  const create = el("button");
  create.className = "g-flat";
  // Old: .html(...) with the string table text.
  create.innerHTML = str("GDesignerStyleEditor", "action.create-new-style");
  createBox.appendChild(create);
  createBox.addEventListener("click", () => openStyleCreator(list, false, null, content));
  toolbar.appendChild(createBox);
  const organizeBox = el("div");
  const organize = el("button");
  organize.className = "g-flat";
  organize.innerHTML = str("GDesignerStyleEditor", "action.organize-styles") + "...";
  organizeBox.appendChild(organize);
  organizeBox.addEventListener("click", () => openOrganizer(content));
  toolbar.appendChild(organizeBox);
  content.appendChild(noStyle);
  content.appendChild(list);
  content.appendChild(toolbar);
  const overlay = new Overlay(content, { padding: false, releaseOnClose: true });
  overlay.on("open", () => trigger(field, "open"));
  overlay.on("close", () => trigger(field, "close"));
  overlay.open(field);
}

/**
 * `$(field).gDesignerStyleEditor()`: a click on `field` opens the picker,
 * unless its `.g-styles-field` is disabled.
 */
export function designerStyleEditor<T extends HTMLElement>(field: T): T {
  field.addEventListener("click", () => {
    const inner = field.querySelector(".g-styles-field");
    if (!(inner && inner.classList.contains("g-disabled"))) openPicker(field);
  });
  return field;
}

/**
 * The old module exported an empty GObject class (nothing used it); the
 * plugin is the API. `DesignerStyleEditor.attach(field)` is the same as
 * designerStyleEditor(field).
 */
export const DesignerStyleEditor = { attach: designerStyleEditor };

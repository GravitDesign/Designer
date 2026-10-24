// Old: designer.browser.dev.js module 1523 (GExportProperties).
/**
 * The Export panel at the bottom of the outline sidebar: one row per entry
 * of the elements' "__export" list (size, suffix, format, remove), and the
 * toolbar buttons Export..., Create Slice and Add Export.
 *
 * The outline sidebar (sidebars/outline-sidebar.ts, old module 1260)
 * creates it and drives it like an inspector panel:
 *
 *     const exportProperties = new ExportProperties();
 *     exportProperties.init(exportPanel, exportToolbar); // .export-panel, .toolbar-export
 *     exportProperties.update(document, elements);       // on selection, tool and page changes
 *
 * `update` looks up the elements itself (the selection, the active tool's
 * default style or the active page), as the old panel did; it only keeps
 * blocks and returns whether there are any.
 *
 * The rows are rebuilt as plain DOM on every change, like the old code.
 * Dropped with the cloud: the sign-in gate (old module 446) in front of
 * Export...; the export runs right away.
 */
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { registerClass } from "../../engine/core/object.ts";
import { Block } from "../../engine/scene/block.ts";
import type { Node } from "../../engine/scene/node.ts";
import type { Scene } from "../../engine/scene/scene.ts";
import { AfterPropertiesChangeEvent } from "../../engine/scene/node-events.ts";
import { Slice } from "../../engine/scene/slice.ts";
import type { Editor } from "../../editor/editor.ts";
import { ItemTool } from "../../editor/tools/item-tool.ts";
import type { Document } from "../document/document.ts";
import { Exporter, EXPORT_PROPERTY_NAME, type ExportRow } from "../export/export-document.ts";
import { Menu, MenuPosition } from "../menus/menu.ts";
import type { MenuItem } from "../menus/menu-item.ts";
import { css, toggleClass } from "../shell/dom.ts";
import { designer } from "../shell/globals.ts";
import { SettingChangedEvent } from "../shell/setting-changed-event.ts";
import { attachRichTooltip } from "../widgets/rich-tooltip.ts";
import { RichTooltipConfig } from "../widgets/rich-tooltip-config.ts";
import { propertyRow } from "./paint-dom.ts";
import { Properties, type InspectedElements } from "./properties.ts";

/** A merged row: the first element's entry, `diff` when several elements have one. */
interface MergedRow extends ExportRow {
  diff?: boolean;
}

interface ExportNode extends Node {
  getProperty(name: string, custom?: boolean, defaultValue?: unknown): unknown;
  setProperty(name: string, value: unknown, custom?: boolean): unknown;
  setProperties(names: string[], values: unknown[]): unknown;
  getPaintBBox(): { getX(): number; getY(): number; getWidth(): number; getHeight(): number };
}

function text(className: string, key: string): string {
  return Locale.get(new LocaleKey(className, key)) as string;
}

function make<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  return element;
}

/** The rows of an element (`getProperty("__export", true, [])`), never null. */
function rowsOf(element: ExportNode): ExportRow[] {
  return ((element.getProperty(EXPORT_PROPERTY_NAME, true, []) as ExportRow[] | null) ||
    []) as ExportRow[];
}

export class ExportProperties extends Properties {
  static {
    registerClass(this, "GExportProperties");
  }

  _panel: HTMLElement | null = null;
  _toolbar: HTMLElement | null = null;
  _exportButton: HTMLButtonElement | null = null;
  _createSliceButton: HTMLButtonElement | null = null;
  _elements: ExportNode[] | null = null;
  _sizeMenu: Menu | null = null;
  private readonly _afterPropertiesChange = (event: AfterPropertiesChangeEvent): void => {
    if (
      !event.temporary &&
      this._elements &&
      this._elements.length &&
      this._elements[0] === event.node &&
      (event.properties as string[]).indexOf(EXPORT_PROPERTY_NAME) >= 0
    )
      this._updateProperties();
  };

  override isSticky(): boolean {
    return true;
  }

  override init(panel: HTMLElement, toolbar: HTMLElement): void {
    this._panel = panel;
    this._toolbar = toolbar;
    toolbar.classList.add("list-toolbar");
    const title = make("label", "panel-title");
    title.textContent = text("GExportProperties", "text.make-exportable");
    toolbar.appendChild(title);

    const exportButton = make("button", "btn-export");
    exportButton.setAttribute("id", "btn-export");
    exportButton.setAttribute("data-title", text("GCommonNames", "text.export") + "...");
    exportButton.appendChild(make("span", "gravit-icon-export"));
    exportButton.addEventListener("click", () => this._export());
    toolbar.appendChild(exportButton);
    this._exportButton = exportButton;

    const sliceButton = make("button");
    sliceButton.setAttribute("data-title", text("GExportProperties", "action.create-slice"));
    sliceButton.appendChild(make("span", "gravit-icon-slice"));
    sliceButton.addEventListener("click", () => this._createSlice());
    toolbar.appendChild(sliceButton);
    attachRichTooltip(
      sliceButton,
      RichTooltipConfig.from({
        title: text("GExportProperties", "text.create-slice-tooltip-title"),
        description: text("GExportProperties", "text.create-slice-tooltip-description"),
        learnMore: "",
      }),
    );
    this._createSliceButton = sliceButton;

    const addButton = make("button");
    addButton.setAttribute("data-title", text("GExportProperties", "action.add"));
    addButton.appendChild(make("span", "gravit-icon-plus"));
    addButton.addEventListener("click", () => this._addExport());
    toolbar.appendChild(addButton);
    attachRichTooltip(
      addButton,
      RichTooltipConfig.from({
        title: text("GExportProperties", "text.add-export-tooltip-title"),
        description: text("GExportProperties", "text.add-export-tooltip-description"),
        learnMore: "",
      }),
    );

    this._sizeMenu = new Menu();
    for (const caption of ["1x", "2x", "0.5x", "3x", "512w", "512h", "128x128", "300dpi"])
      this._sizeMenu.createAddItem(caption);
    designer().addEventListener(SettingChangedEvent, this._settingChanged, this);
  }

  /** Shows the export rows of `document`'s selection; the elements argument is not used. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old panel looked the elements up itself
  override update(document: Document | null, _elements?: InspectedElements | null): boolean {
    if (this._document) {
      const scene = this._document.getScene();
      if (scene) scene.removeEventListener(AfterPropertiesChangeEvent, this._afterPropertiesChange);
      this._document = null;
    }
    this._elements = null;
    if (document) {
      this._document = document;
      const elements = this._getElements();
      this._elements = [];
      let notOnlySlices = false;
      for (const element of elements) {
        if (element instanceof Block) this._elements.push(element as unknown as ExportNode);
        if (!(element instanceof Slice)) notOnlySlices = true;
      }
      if (this._elements && this._elements.length) {
        this._document = document;
        const scene = document.getScene();
        if (scene) scene.addEventListener(AfterPropertiesChangeEvent, this._afterPropertiesChange);
        css(this._createSliceButton as HTMLElement, "display", notOnlySlices ? "" : "none");
        this._updateProperties();
        return true;
      }
    }
    return false;
  }

  /** The selection's individual elements, else the tool's default style, else the active page. */
  _getElements(): Node[] {
    const document = this._document as Document;
    const editor = document.getEditor() as Editor;
    let elements: Node[] | null = null;
    if (document && editor) {
      elements = editor.getSelection();
      if (elements && elements.length)
        elements = editor.filterIndividualElements(elements as never) as unknown as Node[];
      if (!elements || 0 === elements.length) {
        const tool = designer().getToolManager().getActiveTool();
        const style = tool instanceof ItemTool ? tool.getDefaultStyle() : null;
        if (style) elements = [style];
        else elements = [(document.getScene() as Scene).getActivePage() as unknown as Node];
      }
    }
    this._elements = elements as ExportNode[] | null;
    return elements || [];
  }

  _export(): void {
    const document = this._document as Document;
    const exportables = Exporter.generateExportables(
      this._elements as unknown as Node[],
      null,
      false,
    );
    Exporter.export(
      exportables,
      (document.getStorage() || designer().getDefaultStorage()) as unknown as Parameters<
        typeof Exporter.export
      >[1],
      document.getTitle(),
      null,
      null,
      true,
    );
  }

  _createSlice(): void {
    const editor = (this._document as Document).getEditor() as Editor;
    editor.beginTransaction();
    try {
      const slices: Node[] = [];
      for (const element of this._elements as ExportNode[]) {
        if (!(element instanceof Slice)) {
          const rows = rowsOf(element).slice();
          const box = element.getPaintBBox();
          element.setProperty(EXPORT_PROPERTY_NAME, undefined, true);
          const slice = new Slice() as unknown as ExportNode;
          slice.setProperties(
            ["x", "y", "w", "h"],
            [box.getX(), box.getY(), box.getWidth(), box.getHeight()],
          );
          slice.setProperty(EXPORT_PROPERTY_NAME, rows, true);
          slices.push(slice);
        }
      }
      editor.insertElements(slices, true, true, false);
    } finally {
      editor.commitTransaction(text("GExportProperties", "action.create-slices"));
    }
  }

  _addExport(): void {
    const editor = (this._document as Document).getEditor() as Editor;
    editor.beginTransaction();
    try {
      for (const element of this._elements as ExportNode[]) {
        const rows = rowsOf(element).slice();
        const row: ExportRow = { sz: "", sf: "", fm: "png" };
        const defaults = [
          { sz: "1x", sf: "@1x" },
          { sz: "2x", sf: "@2x" },
          { sz: "3x", sf: "@3x" },
          { sz: "1.5x", sf: "@1,5x" },
          { sz: "0.5x", sf: "@0,5x" },
        ];
        for (const candidate of defaults) {
          let taken = false;
          for (const existing of rows) {
            if (existing.sz === candidate.sz) {
              taken = true;
              break;
            }
          }
          if (!taken) {
            row.sz = candidate.sz;
            row.sf = rows.length > 0 ? candidate.sf : "";
            break;
          }
        }
        rows.push(row);
        element.setProperty(EXPORT_PROPERTY_NAME, rows, true);
      }
    } finally {
      editor.commitTransaction(text("GExportProperties", "action.add"));
    }
  }

  _settingChanged(event: SettingChangedEvent): void {
    if ("touch" === event.key) this._updateProperties();
  }

  _updateExport(index: number, key: keyof ExportRow, value: string): void {
    const editor = (this._document as Document).getEditor() as Editor;
    editor.beginTransaction();
    try {
      for (const element of this._elements as ExportNode[]) {
        let rows = element.getProperty(EXPORT_PROPERTY_NAME, true) as ExportRow[] | null;
        if (!(!rows || index >= rows.length)) {
          rows = rows.slice();
          rows[index] = { ...(rows[index] as ExportRow) };
          (rows[index] as ExportRow)[key] = value;
          element.setProperty(EXPORT_PROPERTY_NAME, rows, true);
        }
      }
    } finally {
      editor.commitTransaction(text("GExportProperties", "action.update-setting"));
    }
  }

  _removeExport(index: number): void {
    const editor = (this._document as Document).getEditor() as Editor;
    editor.beginTransaction();
    try {
      for (const element of this._elements as ExportNode[]) {
        let rows = element.getProperty(EXPORT_PROPERTY_NAME, true) as ExportRow[] | null;
        if (!(!rows || index >= rows.length)) {
          rows = rows.slice();
          rows.splice(index, 1);
          element.setProperty(EXPORT_PROPERTY_NAME, rows, true);
        }
      }
    } finally {
      editor.commitTransaction(text("GExportProperties", "action.remove"));
    }
  }

  _updateProperties(): void {
    const merged: MergedRow[] = [];
    const touch = designer().isTouchEnabled();
    const sizeWidth = touch ? "40%" : "30%";
    const suffixWidth = touch ? "25%" : "35%";
    const formatWidth = touch ? "25%" : "30%";
    const removeWidth = touch ? "12%" : "5%";
    if (this._elements) {
      for (const element of this._elements) {
        const rows = rowsOf(element);
        for (let index = 0; index < rows.length; ++index) {
          if (index < merged.length) (merged[index] as MergedRow).diff = true;
          else merged.push({ ...(rows[index] as ExportRow) });
        }
      }
    }
    const panel = this._panel as HTMLElement;
    const toolbar = this._toolbar as HTMLElement;
    panel.replaceChildren();
    css(panel, "margin", merged.length ? "" : "0");
    toggleClass(toolbar, "empty-list", 0 === merged.length);
    const title = toolbar.querySelector("label:first-child");
    if (title)
      title.textContent =
        0 === merged.length
          ? text("GExportProperties", "text.make-exportable")
          : text("GCommonNames", "text.export");
    css(this._exportButton as HTMLElement, "display", merged.length ? "" : "none");
    for (let index = 0; index < merged.length; ++index) {
      const last = index + 1 === merged.length;
      const row = merged[index] as MergedRow;

      const sizeInput = make("input");
      sizeInput.setAttribute("type", "text");
      css(sizeInput, "margin", "0");
      css(sizeInput, "width", "70%");
      sizeInput.value = row.sz;
      sizeInput.addEventListener("change", () => {
        this._updateExport(index, "sz", sizeInput.value);
      });
      const sizeButton = make("button", "g-flat");
      css(sizeButton, "width", "30%");
      const arrow = make("span", "gravit-icon-down");
      css(arrow, "font-size", "12px");
      sizeButton.appendChild(arrow);
      sizeButton.addEventListener("click", (event) => {
        const target = event.target as HTMLElement;
        (this._sizeMenu as Menu).open(
          target,
          MenuPosition.Left_Top,
          MenuPosition.Right_Bottom,
          (item: MenuItem) => {
            const holder = target.closest("div");
            const input = holder ? holder.querySelector("input") : null;
            if (!input) return;
            input.value = String(item.getCaption());
            input.dispatchEvent(new Event("change", { bubbles: true }));
            input.focus();
            input.select();
          },
        );
      });
      const size = make("div");
      size.appendChild(sizeInput);
      size.appendChild(sizeButton);

      const suffix = make("input");
      suffix.setAttribute("type", "text");
      suffix.value = row.diff ? "" : row.sf;
      suffix.setAttribute(
        "placeholder",
        row.diff ? text("GExportProperties", "text.multiple") : text("GCommonNames", "text.none"),
      );
      suffix.addEventListener("change", () => {
        this._updateExport(index, "sf", suffix.value);
      });

      const format = make("select");
      for (const [value, caption] of [
        ["png", "PNG"],
        ["jpg", "JPEG"],
        ["svg", "SVG"],
        ["pdf", "PDF"],
      ] as const) {
        const option = make("option");
        option.setAttribute("value", value);
        option.textContent = caption;
        format.appendChild(option);
      }
      format.value = row.fm;
      format.addEventListener("change", () => {
        this._updateExport(index, "fm", format.value);
      });

      const remove = make("button", touch ? "g-flat gravit-icon-close" : "g-flat");
      remove.textContent = touch ? "" : "✕";
      remove.addEventListener("click", () => {
        this._removeExport(index);
      });

      const element = make("div");
      propertyRow(element, {
        clazz: "export-properties-row",
        columns: [
          {
            width: sizeWidth,
            ...(last ? { label: text("GCommonNames", "text.size") } : {}),
            content: size,
          },
          {
            width: suffixWidth,
            ...(last ? { label: text("GExportProperties", "text.suffix") } : {}),
            content: suffix,
          },
          {
            width: formatWidth,
            ...(last ? { label: text("GExportProperties", "text.format") } : {}),
            content: format,
          },
          { width: removeWidth, content: remove },
        ],
      });
      panel.appendChild(element);
    }
  }

  override toString(): string {
    return "[Object GExportProperties]";
  }
}

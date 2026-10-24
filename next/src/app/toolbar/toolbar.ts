// Old: designer.browser.dev.js module 1541 (GToolbar).
/**
 * The toolbar (#toolbar): sections of label buttons in the old order
 *
 *     file (save, undo with the quick history, redo)
 *     view (zoom, fit all, view tools, snap)
 *     tool (select, shape, path, knife, text, image)
 *     transform, group, arrange, action, export
 *
 * Each button is `div.toolbar-button[data-action]` > `button.action-button`
 * (an `.icon` span or a `.caption`), split buttons add a
 * `button.dropdown-button`, buttons with a menu are gMenuButtons, and
 * every button ends with `span.processing`. Action buttons are disabled
 * while their action is (updated on selection, document and window
 * changes); tool buttons show the group's active tool.
 *
 * Like the menus, the toolbar owns its DOM as plain elements: the
 * designer toggles `.toolbar-button[data-action] button` classes itself
 * (executeAction for file.save) and other modules query these elements.
 *
 * Dropped: the Pro badges (gPro, licence), the share button and the
 * realtime collaborators (cloud; their section is kept empty, see
 * _createExportSection), and the developer's custom code buttons
 * (localStorage "enable_mods", which ran arbitrary code).
 */
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { LocaleLanguage } from "../../engine/core/locale/locale-language.ts";
import { GMath } from "../../engine/math/math.ts";
import { Editor } from "../../editor/editor.ts";
import { HandTool } from "../../editor/tools/hand-tool.ts";
import { KnifeTool } from "../../editor/tools/knife-tool.ts";
import { PenTool } from "../../editor/tools/pen-tool.ts";
import { PointerTool } from "../../editor/tools/pointer-tool.ts";
import { RectangleTool } from "../../editor/tools/rectangle-tool.ts";
import { TextTool } from "../../editor/tools/text-tool.ts";
import type { Tool } from "../../editor/tools/tool.ts";
import {
  ToolManager,
  type ToolChangedEvent,
  type ToolClass,
} from "../../editor/tools/tool-manager.ts";
import { SceneWidget } from "../../editor/view/scene-widget.ts";
import type { Action } from "../actions/action.ts";
import { config } from "../config.ts";
import { Category } from "../actions/category.ts";
import { MagnificationAction } from "../actions/view/magnification-action.ts";
import { Document } from "../document/document.ts";
import { DocumentEvent } from "../document/document-event.ts";
import { DocumentStatus } from "../document/document-status.ts";
import { Menu } from "../menus/menu.ts";
import { MenuItem } from "../menus/menu-item.ts";
import { css } from "../shell/dom.ts";
import { appRegistryOrNull, containerOrNull, designer } from "../shell/globals.ts";
import type { ToolTableEntry } from "../shell/registry.ts";
import { SettingChangedEvent } from "../shell/setting-changed-event.ts";
import { SidebarsIds } from "../shell/sidebar-ids.ts";
import { WindowEvent } from "../shell/windows.ts";
import {
  RichTooltipConfig,
  TOOLTIP_AREA,
  type RichTooltipFields,
} from "../widgets/rich-tooltip-config.ts";
import { attachRichTooltip } from "../widgets/rich-tooltip.ts";
import { MenuButton } from "../widgets/menu-button.ts";
import { TouchToolbar } from "./zoom-menu.ts";

/** The ids of the actions the toolbar shows (the old classes' ID constants). */
export const ToolbarActionIds = {
  Save: "file.save",
  Undo: "edit.undo",
  Redo: "edit.redo",
  FitAll: "view.zoom.fit.all",
  OriginalView: "view.zoom.original",
  Magnification: MagnificationAction.ID,
  ZoomIn: "view.zoom.in",
  ZoomOut: "zoom.out",
  ToggleSnap: "view.toggle-snap",
  ToggleSnapZones: "view.toggle-snapzones",
  ToggleGuide: "view.toggle-guide",
  ShowGrid: "view.canvas.show-grid",
  ShowGuideLines: "view.canvas.show-guide-lines",
  ShowSymbolLabels: "view.canvas.show-symbol-labels",
  ToggleSidebar: "view.toggle-sidebar",
  PlaceImport: "file.place-import",
  LinkImage: "file.link-import",
  Open: "file.open",
  SaveAs: "file.save-as",
  Export: "file.export",
  Transform: "arrange.transform",
  Arrange: "arrange.order",
  Group: "modify.group",
  Split: "modify.split",
  Merge: "modify.merge",
  Clip: "modify.clip",
  CreateSymbol: "modify.createsymbol",
  ConvertToPath: "modify.converttopath",
  VectorizeBorder: "modify.vectorize",
} as const;

/** The guides the snap menu toggles (GGridGuide.ID ... GPageGuide.ID). */
const SNAP_GUIDES = [
  "guide.grid",
  "guide.guide-lines",
  "guide.full-pixels",
  "guide.points",
  "guide.bbox",
  "guide.scene",
];

/** What a toolbar button keeps ($(button).data(...)). */
interface ButtonData {
  action?: Action;
  tool?: ToolClass;
  toolGroup?: string;
}

/** The options of _createLabelButton. */
export interface LabelButtonOptions {
  /** Backs the button with an action (title, icon, tooltip, click, data-action). */
  action?: Action | null;
  label?: string;
  className?: string;
  icon?: string | null;
  click?: ((event: globalThis.MouseEvent) => void) | null;
  menudblclick?: (() => void) | null;
  caption?: string;
  active?: boolean;
  menu?: Menu | (() => Menu);
  menuOpen?: ((event: globalThis.MouseEvent) => void) | null;
  split?: boolean;
  getActiveItem?: (() => MenuItem | null | undefined | false | "" | 0) | null;
  tooltipConfig?: unknown;
}

/** An action that has sub actions (GMergeMainAction). */
interface MainActionLike {
  getSubActions(): Action[] | null;
}

/** The parts of a window the toolbar uses. */
/** The document calls of the toolbar (GDocument). */
interface ToolbarDocument {
  getEditor(): Editor | null;
  getScene(): unknown;
}

/** A sidebar's optional tool check (GSidebar.isToolAllowed, default allowed). */
interface ToolCheckingSidebar {
  isToolAllowed?(tool: Tool | null): boolean;
  isDeactivatable(): boolean;
}

/**
 * $.fn.gRichTooltip (widgets/rich-tooltip.ts). The tool table (shell/
 * tool-table.ts) still hands out plain objects with the config's fields
 * (`_title`, ...), written before RichTooltipConfig existed; those are
 * turned into one here.
 */
export function richTooltip(element: Element, config: unknown): void {
  if (!config) return;
  let tooltip = config;
  if (!(tooltip instanceof RichTooltipConfig)) {
    const fields = tooltip as Record<string, unknown>;
    const values: Record<string, unknown> = {};
    for (const key of Object.keys(fields))
      values[key.startsWith("_") ? key.slice(1) : key] = fields[key];
    tooltip = RichTooltipConfig.from(values as { title: unknown });
  }
  attachRichTooltip(element as HTMLElement, tooltip as RichTooltipConfig);
}

/** The fields of a tool table tooltip (`_title` ...) or a RichTooltipConfig's getConfig(). */
function tooltipFields(config: unknown): Record<string, unknown> {
  const withGetter = config as { getConfig?: () => Record<string, unknown> };
  if (typeof withGetter.getConfig === "function") return { ...withGetter.getConfig() };
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config as Record<string, unknown>))
    fields[key.replace(/^_/, "")] = value;
  return fields;
}

const buttonData = new WeakMap<Element, ButtonData>();

function dataOf(element: Element): ButtonData {
  let data = buttonData.get(element);
  if (!data) {
    data = {};
    buttonData.set(element, data);
  }
  return data;
}

/** `$(button).data("action", action)`: the action _updateActions reads for the button. */
export function setButtonAction(element: Element, action: Action): void {
  dataOf(element).action = action;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  ...classes: string[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (classes.length) element.classList.add(...classes);
  return element;
}

function text(owner: string, key: string): string {
  return Locale.get(new LocaleKey(owner, key)) as string;
}

/** The tool table (gravit.tools). */
function tools(): ToolTableEntry[] {
  const registry = appRegistryOrNull();
  return registry ? registry.tools : [];
}

/** The nearest `.toolbar-button` around an event target. */
function toolbarButtonOf(event: globalThis.Event): Element | null {
  const target = event.target as Element | null;
  return target && typeof target.closest === "function" ? target.closest(".toolbar-button") : null;
}

export class Toolbar {
  /** The English name of a tool (the stats used it). */
  static getToolName(tool: unknown): string {
    if (tool)
      for (const entry of tools())
        if (entry.tool === tool || tool instanceof entry.tool) {
          let name = entry.title;
          if (Locale.getLanguage() !== LocaleLanguage.English)
            try {
              name = Locale.get(
                new LocaleKey(entry.toolString, "name"),
                undefined,
                LocaleLanguage.English,
              ) as string;
            } catch {
              name = "[errored]";
            }
          return name;
        }
    return "";
  }

  /** The rich tooltip of the tool with the old class name `toolString`. */
  static getToolTooltipConfig(toolString: string): unknown {
    const list = tools();
    if (!list.length) return null;
    const found = list.filter((entry) => entry.toolString === toolString)[0];
    return found ? found.richTooltipConfig : null;
  }

  readonly _htmlElement: HTMLElement;
  _zoomButton: HTMLElement | null = null;
  _touchZoomButton: HTMLElement | null = null;
  _currentZoomLevel = -1;
  _initShapeMenu = false;
  _toolsDiv: HTMLElement | null = null;
  _exportButton: HTMLElement | null = null;
  _viewMenu: Menu | null = null;
  readonly _touch: TouchToolbar;

  constructor(element: HTMLElement) {
    this._htmlElement = element;
    this._touch = new TouchToolbar(this);
  }

  getHtmlElement(): HTMLElement {
    return this._htmlElement;
  }

  init(): void {
    const d = designer();
    const action = (id: string): Action | null => d.getAction(id);
    const file = el("div", "section", "compound-section", "file-section");
    file.append(
      this._createLabelButton({ action: action(ToolbarActionIds.Save) }),
      this._createLabelButton({
        action: action(ToolbarActionIds.Undo),
        icon: "gravit-icon-undo",
        split: true,
        menu: () => this._createQuickHistoryUndoRedoMenu(),
        click: () => d.executeAction(ToolbarActionIds.Undo),
      }),
      this._createLabelButton({ action: action(ToolbarActionIds.Redo) }),
    );
    this._htmlElement.append(file);
    this._initZoomButton();
    this._viewMenu = new Menu();
    const view = el("div", "section", "compound-section", "view-section");
    const viewButton = this._createLabelButton({
      icon: "gravit-icon-expand",
      label: text("GFitAllAction", "title"),
      click: () => {
        d.executeAction(ToolbarActionIds.FitAll, undefined, "toolbar");
      },
      tooltipConfig: this._actionTooltip(ToolbarActionIds.FitAll),
    });
    const viewTools = this._createLabelButton({
      icon: "gravit-icon-move",
      label: text("GToolbar", "text.view"),
      menu: this._createToolItems("view", this._viewMenu),
      getActiveItem: () => {
        const manager = d.getToolManager();
        const tool = manager && manager.getActiveTool();
        const name = tool && Toolbar.getToolName(tool);
        return name && (this._viewMenu as Menu).findItem(name);
      },
      split: true,
      click: (event) => this._activateOrResetTool(this._toolOf(event)),
      tooltipConfig: Toolbar.getToolTooltipConfig("GHandTool"),
    });
    dataOf(viewTools).toolGroup = "view";
    dataOf(viewTools).tool = HandTool;
    view.append(this._zoomButton as HTMLElement, viewButton, viewTools, this._createSnapButton());
    this._htmlElement.append(view);
    this._toolsDiv = el("div", "section", "compound-section", "tool-section");
    this._toolsDiv.append(
      this._toolButton(
        "select",
        PointerTool,
        {
          icon: "gravit-icon-cursor-filled",
          label: text("GToolbar", "text.select"),
          menu: this._createToolItems("select"),
          split: true,
          click: (event) => this._activateOrResetTool(this._toolOf(event)),
          tooltipConfig: Toolbar.getToolTooltipConfig("GPointerTool"),
        },
        "select-toolbar-button",
      ),
      this._toolButton(
        "shape",
        RectangleTool,
        {
          icon: "gravit-icon-shapes",
          label: text("GShape", "name"),
          menu: this._createToolItems("shape"),
          split: true,
          click: (event) => {
            const button = toolbarButtonOf(event);
            if (button && dataOf(button).tool && this._initShapeMenu)
              this._activateOrResetTool(dataOf(button).tool as ToolClass);
            else if (button) {
              // $(...).find("button.dropdown-button").trigger("mousedown"): the menu button's handler.
              const dropdown = button.querySelector("button.dropdown-button");
              if (dropdown) dropdown.dispatchEvent(new MouseEvent("mousedown"));
            }
          },
        },
        "shapes-toolbar-button",
      ),
      this._toolButton(
        "path",
        PenTool,
        {
          icon: "gravit-icon-pen",
          label: text("GPath", "name"),
          menu: this._createToolItems("path"),
          split: true,
          click: (event) => this._activateOrResetTool(this._toolOf(event)),
          tooltipConfig: Toolbar.getToolTooltipConfig("GPenTool"),
        },
        "path-toolbar-button",
      ),
      this._toolButton(
        "knife",
        KnifeTool,
        {
          icon: "gravit-icon-scalpel",
          label: text("GKnifeTool", "name"),
          menu: this._createToolItems("knife"),
          split: true,
          click: (event) => this._activateOrResetTool(this._toolOf(event)),
          tooltipConfig: Toolbar.getToolTooltipConfig("GKnifeTool"),
        },
        "knife-toolbar-button",
      ),
      this._toolButton(
        null,
        TextTool,
        {
          icon: "gravit-icon-textbox",
          label: text("GText", "name"),
          click: (event) => this._activateOrResetTool(this._toolOf(event)),
          tooltipConfig: Toolbar.getToolTooltipConfig("GTextTool"),
        },
        "text-toolbar-button",
      ),
    );
    const image = this._createLabelButton({
      icon: "gravit-icon-upload-image-icon",
      label: text("GPlaceImportAction", "tooltip-title"),
      menu: this._createImageMenu(),
      split: true,
      click: () => d.executeAction(ToolbarActionIds.PlaceImport, undefined, "toolbar"),
      tooltipConfig: this._actionTooltip(ToolbarActionIds.PlaceImport),
    });
    image.classList.add("image-toolbar-button");
    this._toolsDiv.append(image);
    this._htmlElement.append(this._toolsDiv);
    const transform = el("div", "section", "compound-section", "transform-section");
    for (const [type, icon] of [
      ["flip-horizontal", "gravit-icon-flip-horizontal"],
      ["flip-vertical", "gravit-icon-flip-vertical"],
      ["rotate-90-left", "gravit-icon-rotate-left"],
      ["rotate-90-right", "gravit-icon-rotate-right"],
    ] as const)
      transform.append(
        this._createLabelButton({ action: action(ToolbarActionIds.Transform + "." + type), icon }),
      );
    this._htmlElement.append(transform);
    const group = el("div", "section", "compound-section", "group-section");
    group.append(
      this._createLabelButton({
        action: action(ToolbarActionIds.Group),
        label: text("GToolbar", "text.group"),
      }),
      this._createLabelButton({
        action: action(ToolbarActionIds.Split),
        label: text("GToolbar", "text.split"),
      }),
      this._createLabelButton({
        action: action(ToolbarActionIds.Merge),
        label: text("GToolbar", "text.merge"),
        menu: this._createMergeMenu(),
        split: true,
      }),
      this._createLabelButton({
        action: action(ToolbarActionIds.Clip),
        label: text("GToolbar", "text.clip"),
      }),
    );
    this._htmlElement.append(group);
    const arrange = el("div", "section", "compound-section", "arrange-section");
    arrange.append(
      this._createLabelButton({ action: action(ToolbarActionIds.Arrange + ".bring-forward") }),
      this._createLabelButton({ action: action(ToolbarActionIds.Arrange + ".send-backward") }),
    );
    this._htmlElement.append(arrange);
    const actions = el("div", "section", "compound-section", "action-section");
    actions.append(
      this._createLabelButton({ action: action(ToolbarActionIds.CreateSymbol) }),
      this._createLabelButton({ action: action(ToolbarActionIds.ConvertToPath) }),
      this._createLabelButton({ action: action(ToolbarActionIds.VectorizeBorder) }),
    );
    this._htmlElement.append(actions);
    this._htmlElement.append(this._createExportSection());
    const active = d.getToolManager().getActiveTool();
    if (active) this._updateActiveTool(active);
    this._updateContextTools();
    this._updateZoomFromWindow();
    this._updateActions();
    d.getToolManager().addEventListener(ToolManager.ToolChangedEvent, this._toolChangedEvent, this);
    d.getWindows().addEventListener(WindowEvent, this._windowEvent, this);
    d.addEventListener(DocumentEvent, this._documentEvent, this);
    d.addEventListener(SettingChangedEvent, this._settingChangedEvent, this);
  }

  /** The export button and the (empty) share section. */
  private _createExportSection(): HTMLElement {
    this._exportButton = this._createLabelButton({
      action: designer().getAction(ToolbarActionIds.Export),
      split: true,
      menu: this._createExportMenu(),
    });
    this._exportButton.classList.add("export-toolbar-button");
    for (const dropdown of this._exportButton.querySelectorAll(".dropdown-button"))
      dropdown.classList.add("g-touch-only");
    const section = el("div", "section", "compound-section", "export-section");
    // The collaborators and the share button (cloud) are dropped; they were
    // hidden in a local document, so the section stays as an empty box.
    section.append(this._exportButton, el("div", "share-section"));
    return section;
  }

  private _toolButton(
    group: string | null,
    tool: ToolClass,
    options: LabelButtonOptions,
    className: string,
  ): HTMLElement {
    const button = this._createLabelButton(options);
    button.classList.add(className);
    if (group) dataOf(button).toolGroup = group;
    dataOf(button).tool = tool;
    return button;
  }

  private _toolOf(event: globalThis.Event): ToolClass | undefined {
    const button = toolbarButtonOf(event);
    return button ? dataOf(button).tool : undefined;
  }

  private _actionTooltip(id: string): unknown {
    const action = designer().getAction(id);
    return action ? action.getTooltipConfig(TOOLTIP_AREA.TOOLBAR) : null;
  }

  setVisible(visible: boolean): void {
    const was = this.isVisible();
    css(this._htmlElement, "display", visible ? "" : "none");
    if (was !== visible) designer().relayout();
  }

  /**
   * As before this returns nothing, so setVisible always lays out again:
   * see "Toolbar.isVisible returns nothing" in QUESTIONS.md.
   */
  isVisible(): boolean | undefined {
    return undefined;
  }

  /**
   * The old _updateUI built the page button, the select section and the
   * comment toggle for the simple UI of view-only and comment-only shared
   * files (isPagesInspectEnabled false). Sharing is dropped, so only the
   * action update is left.
   */
  _updateUI(): void {
    this._updateActions();
  }

  _createSnapButton(): HTMLElement {
    const d = designer();
    const button = this._createLabelButton({
      icon: "gravit-icon-magnet",
      active: false === d.getSetting("snap_disabled"),
      label: text("GToolbar", "text.snap"),
      menu: this._createSnapMenu(),
      split: true,
      click: (event) => {
        const owner = toolbarButtonOf(event);
        const actionButton = owner && owner.querySelector(".action-button");
        if (actionButton)
          actionButton.classList.toggle("g-active", !actionButton.classList.contains("g-active"));
        d.executeAction(ToolbarActionIds.ToggleSnap, undefined, "toolbar");
      },
      tooltipConfig: this._actionTooltip(ToolbarActionIds.ToggleSnap),
    });
    button.classList.add("snap-button");
    return button;
  }

  /** The touch Open menu: open, then the recent files under a title. */
  _createOpenMenu(): Menu {
    const d = designer();
    const menu = new Menu();
    menu.createAddItem(d.getAction(ToolbarActionIds.Open));
    // The Gravit Cloud open entry is dropped with the cloud.
    const container = containerOrNull();
    const recent = container ? container.getRecentDocuments() : [];
    if (recent && recent.length) {
      menu.createAddDivider();
      const title = menu.createAddItem(
        "".concat(text("GFilesPanel", "text.title-recent-files"), ":"),
      );
      title.setEnabled(false);
      title.addClass("title");
      for (const item of recent) {
        const entry = menu.createAddItem(item.getName(), () => {
          d.openDocument(item as never);
        });
        // gContainer.getRecentDocumentIconClass (the storage icon) isn't ported yet.
        const iconOf = (container as { getRecentDocumentIconClass?: (i: unknown) => string | null })
          .getRecentDocumentIconClass;
        entry.setIcon(iconOf ? iconOf.call(container, item) : null);
      }
    }
    return menu;
  }

  /** The undo button's menu: redo, the redo states, then the undo states (newest first). */
  _createQuickHistoryUndoRedoMenu(): Menu {
    const d = designer();
    const menu = new Menu(null, "g-quick-history-undo-redo-menu");
    const redo = d.getAction(ToolbarActionIds.Redo);
    menu.createAddItem(redo);
    const document = d.getActiveDocument() as ToolbarDocument | null;
    const editor = document && document.getEditor();
    if (!editor) return menu;
    const current = editor.getCurrentStateId();
    const undo = d.getAction(ToolbarActionIds.Undo);
    if (editor.hasRedoState()) {
      menu.createAddDivider();
      for (const state of editor.getRedoStates())
        this._buildAndIncludeItemForState(state, redo as Action, true, current, menu, editor);
    }
    if (editor.hasUndoState()) {
      menu.createAddDivider();
      for (const state of editor.getUndoStates().slice().reverse())
        this._buildAndIncludeItemForState(state, undo as Action, false, current, menu, editor);
    }
    return menu;
  }

  _buildAndIncludeItemForState(
    state: { id: string; name: string },
    action: Action,
    isRedo: boolean,
    current: string | null,
    menu: Menu,
    editor: Editor,
  ): void {
    const isCurrent = current === state.id;
    const item = new MenuItem(MenuItem.Type.Item);
    item.setCaption(state.name);
    item.setIcon(isCurrent ? "gravit-icon-dot" : action.getIcon());
    if (isCurrent) item.addClass("g-active");
    if (!action.isEnabled()) item.addClass("g-disabled");
    item.addEventListener(MenuItem.ActivateEvent, () =>
      this._actionHandler(state, isRedo, editor, action),
    );
    menu.addItem(item);
  }

  /** Undoes or redoes until `state` is the current one. */
  _actionHandler(state: { id: string }, isRedo: boolean, editor: Editor, action: Action): void {
    if (!action.isEnabled()) return;
    let current = editor.getCurrentStateId();
    if (current !== state.id)
      do {
        if (isRedo) editor.redoState();
        else editor.undoState();
        current = editor.getCurrentStateId();
      } while (current !== state.id);
  }

  /** Export, the save-as formats, and PDF in its own submenu. */
  _createExportMenu(): Menu {
    const d = designer();
    const menu = new Menu();
    menu.createAddItem(d.getAction("".concat(ToolbarActionIds.Export)));
    const skipped = ["cdrapp", "des", "gvdesign", "pdf"];
    Document.FileTypes.filter((type) => type.store && !skipped.includes(type.ext)).forEach((type) =>
      menu.createAddItem(d.getAction("".concat(ToolbarActionIds.SaveAs, ".").concat(type.ext))),
    );
    const pdf = new MenuItem(MenuItem.Type.Menu, Menu);
    const label = Category.CATEGORY_FILE_EXPORT_PDF.label || "";
    pdf.setCaption(label.split("/").slice(-1).pop() as string);
    const pdfMenu = pdf.getMenu() as Menu;
    for (const suffix of [".pdf", ".pdf.96", ".pdf.150", ".pdf.300"])
      pdfMenu.createAddItem(d.getAction("".concat(ToolbarActionIds.SaveAs).concat(suffix)));
    pdfMenu.createAddItem(d.getAction("".concat(ToolbarActionIds.Export, ".pdf")));
    menu.addItem(pdf);
    return menu;
  }

  _initZoomButton(): void {
    const d = designer();
    const menu = new Menu();
    menu.setTooltipType(TOOLTIP_AREA.TOOLBAR);
    menu.createAddItem(d.getAction(ToolbarActionIds.OriginalView));
    menu.createAddDivider();
    for (const level of MagnificationAction.ZOOM_LEVELS)
      menu.createAddItem(d.getAction(ToolbarActionIds.Magnification + "." + level.toString()));
    const zoom = this._createLabelButton({
      caption: "100%",
      label: text("GToolbar", "text.zoom"),
      menu,
      menudblclick: () => {
        const active = d.getWindows().getActiveWindow();
        // The old handler threw on getActiveWindow().getView() here, before
        // it touched the buttons, so without a window nothing changes.
        if (!active) return;
        const view = active.getView();
        this._showZoomInput(false);
        const input = zoom.querySelector<HTMLInputElement>(".gravit-zoom-manual-input > input");
        if (input && view) {
          input.value = String(parseInt(String(100 * view.getZoom()), 10));
          input.focus();
          input.select();
        }
      },
    });
    zoom.classList.add("zoom-button");
    this._zoomButton = zoom;
    const actionButton = zoom.querySelector<HTMLElement>(".action-button") as HTMLElement;
    const caption = zoom.querySelector(".caption") as HTMLElement;
    caption.before(el("span", "gravit-icon-zoom-in", "icon"));
    richTooltip(
      actionButton,
      RichTooltipConfig.from({ title: text("GToolbar", "text.zoom-button-tooltip-title") }),
    );
    actionButton.classList.add("left-attached", "right-attached");
    for (const icon of actionButton.querySelectorAll(".dropdown-icon")) icon.remove();
    const minus = el("button", "left-attached", "attached-button");
    css(minus, "width", "15px");
    minus.textContent = "-";
    minus.addEventListener("click", () => {
      d.executeAction(ToolbarActionIds.ZoomOut, undefined, "toolbar");
    });
    richTooltip(minus, this._actionTooltip(ToolbarActionIds.ZoomOut));
    actionButton.before(minus);
    const plus = el("button", "right-attached", "attached-button");
    css(plus, "width", "15px");
    plus.textContent = "+";
    plus.addEventListener("click", () => {
      d.executeAction(ToolbarActionIds.ZoomIn, undefined, "toolbar");
    });
    richTooltip(plus, this._actionTooltip(ToolbarActionIds.ZoomIn));
    zoom.append(plus);
    const manual = el("div", "gravit-zoom-manual-input");
    css(manual, "display", "none");
    actionButton.before(manual);
    const input = el("input");
    input.setAttribute("type", "number");
    const levels = MagnificationAction.ZOOM_LEVELS;
    input.setAttribute("min", String(levels[0]));
    input.setAttribute("max", String(levels[levels.length - 1]));
    // The old handlers kept their "keydown" flag on the toolbar object
    // ($(this).data in arrow functions), so it is one flag per toolbar.
    let keydown = false;
    input.addEventListener("blur", () => {
      if (!keydown) this._showZoomInput(true);
    });
    input.addEventListener("keydown", (event) => {
      event.stopPropagation();
      keydown = true;
    });
    input.addEventListener("keyup", (event) => {
      if (!keydown) return;
      if (13 === event.which) {
        const active = d.getWindows().getActiveWindow();
        this._showZoomInput(true);
        const view = active && active.getView();
        // The input's text, divided by 100 as the old code did.
        if (view) d.zoomAtViewCenter(view, Number(input.value) / 100);
      } else if (27 === event.which) this._showZoomInput(true);
      keydown = false;
    });
    input.addEventListener("keypress", (event) => {
      const code = event.keyCode || event.which;
      if (8 === code || 46 === code || 37 === code || 39 === code) return;
      if (code < 48 || code > 57) event.preventDefault();
    });
    const percent = el("span");
    percent.textContent = "%";
    manual.append(input, percent);
  }

  /** Shows the attached -/+ buttons (true) or the manual zoom input (false). */
  private _showZoomInput(buttons: boolean): void {
    const zoom = this._zoomButton;
    if (!zoom) return;
    for (const element of zoom.querySelectorAll<HTMLElement>(".left-attached, .right-attached"))
      css(element, "display", buttons ? "" : "none");
    const manual = zoom.querySelector<HTMLElement>(".gravit-zoom-manual-input");
    if (manual) css(manual, "display", buttons ? "none" : "");
  }

  relayout(): void {}

  /** Activates a tool, or the pointer when it is active already (unless `keep`). */
  _activateOrResetTool(toolClass: ToolClass | undefined, keep?: boolean): void {
    if (!toolClass) return;
    const d = designer();
    const manager = d.getToolManager();
    let tool = manager.getTool(toolClass);
    if (tool === manager.getActiveTool()) {
      if (keep) return;
      tool = manager.getTool(PointerTool);
    }
    const id = d.getRightSidebars().getActiveSidebar();
    const sidebar = (id && d.getRightSidebars().getSidebar(id)) as ToolCheckingSidebar | null;
    if (!sidebar || isToolAllowed(sidebar, tool) || sidebar.isDeactivatable())
      manager.activateTool(tool as Tool, null, true);
  }

  /** Marks the button of the active tool and shows it on its group's button. */
  _updateActiveTool(active: Tool): void {
    let entry: ToolTableEntry | null = null;
    for (const candidate of tools())
      if (active.constructor === candidate.tool) {
        entry = candidate;
        break;
      }
    for (const button of this._htmlElement.querySelectorAll(".toolbar-button")) {
      const data = dataOf(button);
      let tool = data.tool;
      const group = data.toolGroup;
      if ("shape" === group && entry && "shape" === entry.group) this._initShapeMenu = true;
      if (!tool) continue;
      if (group && entry && entry.group === group) {
        tool = entry.tool;
        data.tool = tool;
        const icon = button.querySelector<HTMLElement>(".action-button > .icon");
        let iconClass: string | null = entry.icon;
        if (!iconClass) {
          const instance = designer().getToolManager().getTool(tool) as
            (Tool & { getIcon?: () => string | null }) | null;
          if (instance && instance.getIcon) iconClass = instance.getIcon();
        }
        if (entry.richTooltipConfig) {
          richTooltip(button, entry.richTooltipConfig);
          const actionButton = button.querySelector(".action-button");
          if (actionButton) richTooltip(actionButton, entry.richTooltipConfig);
        }
        if (icon) this._updateIcon(icon, iconClass);
      }
      for (const actionButton of button.querySelectorAll(".action-button"))
        actionButton.classList.toggle("g-active", !(!entry || entry.tool !== tool));
    }
  }

  /** Sets an icon span: a class name, or an inline SVG (16px, no stroke). */
  _updateIcon(element: HTMLElement, icon: string | null | undefined): void {
    if (icon && "<svg" === icon.substr(0, 4)) {
      element.replaceChildren();
      element.setAttribute("class", "icon");
      const holder = document.createElement("div");
      holder.innerHTML = icon;
      const svg = holder.firstElementChild as HTMLElement | null;
      if (svg) {
        svg.setAttribute("width", "16px");
        svg.setAttribute("height", "16px");
        css(svg, "stroke", "transparent");
        css(svg, "vertical-align", "middle");
        element.append(svg);
      }
    } else {
      element.replaceChildren();
      element.setAttribute("class", "icon " + icon);
    }
  }

  private _toolChangedEvent(event: ToolChangedEvent): void {
    if (event.newTool) {
      const d = designer();
      const id = d.getRightSidebars().getActiveSidebar();
      if (id) {
        const sidebar = d.getRightSidebars().getSidebar(id) as ToolCheckingSidebar | null;
        if (sidebar && !isToolAllowed(sidebar, event.newTool))
          d.getRightSidebars().setActiveSidebar(SidebarsIds.GInspectorSidebar);
      }
      this._updateActiveTool(event.newTool);
    }
    this._clearViewMenuActiveItem();
  }

  private _clearViewMenuActiveItem(): void {
    const item = this._viewMenu && this._viewMenu.getActiveItem();
    if (item) item.changeActiveState(false);
  }

  /** Disables the tool buttons whose tool can't be used in the active view. */
  _updateContextTools(): void {
    const manager = designer().getToolManager();
    for (const button of this._htmlElement.querySelectorAll(".toolbar-button")) {
      const toolClass = dataOf(button).tool;
      if (!toolClass) continue;
      const tool = manager.getTool(toolClass) as Tool;
      const activatable = manager.isContextActivatable(tool);
      for (const actionButton of button.querySelectorAll(".action-button"))
        if (actionButton.classList.contains("g-disabled") === activatable)
          actionButton.classList.toggle("g-disabled", !activatable);
    }
  }

  /** Disables the buttons of unavailable or disabled actions. */
  _updateActions(): void {
    // ".toolbar-button[data-action]"
    for (const button of this._htmlElement.querySelectorAll(".toolbar-button")) {
      if (button.getAttribute("data-action") === null) continue;
      const action = dataOf(button).action;
      // The Pro badge (gPro) and the tab-less "processing" spinner are dropped
      // with the licence and the shared documents.
      for (const inner of button.querySelectorAll("button"))
        inner.classList.toggle(
          "g-disabled",
          !action || !action.isAvailable() || !action.isEnabled(),
        );
    }
  }

  private _selectionChangedEvent(): void {
    this._updateActions();
    this._updateContextTools();
  }

  private _settingChangedEvent(event: SettingChangedEvent): void {
    if ("snap_disabled" === event.key) {
      for (const button of this._htmlElement.querySelectorAll(".snap-button > .action-button"))
        button.classList.toggle("g-active", false === event.newValue);
    } else if ("touch" === event.key) {
      if (designer().isTouchEnabled()) this._touch.updateTouchUI();
      else this._updateDesktopUI();
    }
  }

  /**
   * Back from touch mode: the desktop zoom button again. (The old code also
   * reset the simple UI's page button, which the local app never builds.)
   */
  _updateDesktopUI(): void {
    const current = this._htmlElement.querySelector<HTMLElement>(".view-section > .zoom-button");
    if (current !== this._zoomButton) {
      this._zoomButton = null;
      this._initZoomButton();
      if (current && this._zoomButton) current.replaceWith(this._zoomButton);
      this._updateZoomFromWindow(true);
    }
  }

  private _documentEvent(event: DocumentEvent): void {
    const document = event.document as ToolbarDocument | null;
    const editor = document && document.getEditor();
    switch (event.type) {
      case DocumentEvent.Type.Activated:
        if (editor)
          editor.addEventListener(Editor.SelectionChangedEvent, this._selectionChangedEvent, this);
        this._updateActions();
        this._updateContextTools();
        break;
      case DocumentEvent.Type.Deactivated: {
        if (editor)
          editor.removeEventListener(
            Editor.SelectionChangedEvent,
            this._selectionChangedEvent,
            this,
          );
        this._updateActions();
        this._updateContextTools();
        const manager = designer().getToolManager();
        if (manager) {
          const tool = manager.getActiveTool() as
            (Tool & { clearClickedElement?: () => void }) | null;
          if (tool && tool.supportsElementClick() && tool.clearClickedElement)
            tool.clearClickedElement();
        }
        break;
      }
      case DocumentEvent.Type.Modified:
        this._updateActions();
        this._updateContextTools();
        this._touch.updateActiveWindow();
        break;
      case DocumentEvent.Type.StorageItemUpdated:
      case DocumentEvent.Type.SynchronismUpdated:
        this._touch.updateActiveWindow();
        this._updateActions();
    }
  }

  private _windowEvent(event: WindowEvent): void {
    const view = event.window.getView();
    switch (event.type) {
      case WindowEvent.Type.Activated:
        if (view) view.addEventListener(SceneWidget.TransformEvent, this._zoomChanged, this);
        this._updateZoomFromWindow();
        this._updateContextTools();
        break;
      case WindowEvent.Type.Deactivated:
        if (view) view.removeEventListener(SceneWidget.TransformEvent, this._zoomChanged, this);
        this._updateZoomFromWindow();
        this._updateContextTools();
    }
    this._touch.updateActiveWindow();
  }

  /**
   * The view's TransformEvent listener. The old code registered
   * _updateZoomFromWindow itself, so the event object arrived as `force`
   * and every transform rewrote the caption; this forces as well.
   */
  private _zoomChanged(): void {
    this._updateZoomFromWindow(true);
  }

  /** Shows the active view's zoom in percent on the zoom button. */
  _updateZoomFromWindow(force = false): void {
    const active = designer().getWindows().getActiveWindow();
    const view = active && active.getView();
    if (!view) return;
    const level = GMath.round(100 * view.getZoom(), false, 0);
    if (this._currentZoomLevel !== level || force) {
      for (const caption of this._htmlElement.querySelectorAll(
        ".zoom-button > .action-button > .caption",
      ))
        caption.textContent = level.toString() + "%";
      this._currentZoomLevel = level;
    }
  }

  /**
   * A menu of the tools of `group`, a divider wherever the category
   * changes (as before, also before the first entry unless it is the
   * first tool of the table).
   */
  _createToolItems(group: string, menu?: Menu): Menu {
    const target = menu || new Menu();
    target.setTooltipType(TOOLTIP_AREA.TOOLBAR);
    let category: string | null | undefined = null;
    tools().forEach((entry, index) => {
      if (entry.group !== group) return;
      if (category !== entry.category) {
        if (index > 0) target.createAddDivider();
        category = entry.category;
      }
      // The old "simpleshape" category (a simple shapes submenu from
      // simple-shapes.json) has no tool in the table, so it never appears.
      const item = new MenuItem();
      item.setCaption(entry.title);
      item.setIcon(entry.icon);
      item.setShortcutHint(entry.key ? [entry.key] : null);
      item.setPro(!!entry.pro, entry.feature);
      item.addEventListener(MenuItem.ActivateEvent, () => {
        this._activateOrResetTool(entry.tool, true);
      });
      item.addEventListener(MenuItem.UpdateEvent, () => {
        if (designer().canActivateTool(entry.tool, true) && entry.key)
          item.setShortcutHint([entry.key]);
        else item.setShortcutHint(null);
      });
      if (entry.richTooltipConfig)
        item.setTooltipConfig(
          RichTooltipConfig.from(
            Object.assign({}, tooltipFields(entry.richTooltipConfig), {
              side: true,
            }) as unknown as RichTooltipFields,
          ),
        );
      target.addItem(item);
    });
    return target;
  }

  /**
   * One toolbar button. The label goes to data-title; an icon makes it an
   * icon button, else a caption; a menu makes it a menu button (split: an
   * extra dropdown button).
   */
  _createLabelButton(options: LabelButtonOptions): HTMLDivElement {
    let label = options.label;
    let icon = options.icon;
    let click = options.click || null;
    let tooltip: unknown = null;
    const action = options.action || null;
    if (action) {
      tooltip = action.getTooltipConfig(TOOLTIP_AREA.TOOLBAR);
      if (!label) label = Locale.get(action.getTitle() as LocaleKey) as string;
      if (!icon) icon = action.getIcon() || action.getGroupIcon();
      if (!click)
        click = () => {
          designer().executeAction(
            action.getId(),
            [
              undefined,
              (result?: { documentStatus?: number }) => {
                if (result && result.documentStatus === DocumentStatus.SaveCancelled)
                  this._updateActions();
              },
            ],
            "toolbar",
          );
        };
    }
    if (options.tooltipConfig) tooltip = options.tooltipConfig;
    const button = el("div", "toolbar-button");
    if (options.className) button.classList.add(options.className);
    if (action) {
      button.setAttribute("data-action", action.getId());
      dataOf(button).action = action;
    }
    const actionButton = el("button", "action-button");
    actionButton.classList.toggle("g-active", true === options.active);
    // jQuery's attr with an undefined value reads instead of writing.
    if (label !== undefined) actionButton.setAttribute("data-title", label);
    button.append(actionButton);
    actionButton.addEventListener("mousedown", (event) => event.preventDefault());
    if (tooltip) richTooltip(actionButton, tooltip);
    if (icon) {
      const span = el("span");
      actionButton.append(span);
      this._updateIcon(span, icon);
      actionButton.classList.add("icon");
    } else if (options.caption) {
      const caption = el("span", "caption");
      caption.textContent = options.caption;
      actionButton.append(caption);
    }
    if (click) actionButton.addEventListener("click", click);
    if (options.menu || options.menuOpen) {
      let menuButton: HTMLElement;
      if (options.split) {
        button.classList.add("dropdown");
        menuButton = el("button", "dropdown-button");
        menuButton.append(el("span", "gravit-icon-down"));
        button.append(menuButton);
        menuButton.addEventListener("mouseover", (event) => {
          event.stopPropagation();
        });
      } else {
        menuButton = actionButton;
        menuButton.classList.add("menu");
        menuButton.append(el("span", "gravit-icon-down", "dropdown-icon"));
      }
      if (options.menu)
        new MenuButton(menuButton, {
          menu: options.menu,
          dblclick: options.menudblclick || null,
          getActiveItem: options.getActiveItem || null,
        });
      else if (options.menuOpen) menuButton.addEventListener("click", options.menuOpen);
      if ("gravit-icon-undo" === icon)
        richTooltip(
          menuButton,
          RichTooltipConfig.from({
            title: text("GToolbar", "text.undoList-button-tooltip-title"),
            description: text("GToolbar", "text.undoList-button-tooltip-description"),
            learnMore: "",
            isPro: false,
          }),
        );
    }
    button.append(el("span", "processing"));
    return button;
  }

  /** The merge button's menu: the merge sub actions. */
  _createMergeMenu(): Menu {
    const menu = new Menu();
    menu.setTooltipType(TOOLTIP_AREA.TOOLBAR);
    const merge = designer().getAction(ToolbarActionIds.Merge) as (Action & MainActionLike) | null;
    // The old code assumed the merge action; until it is registered the menu stays empty.
    const subActions = merge ? merge.getSubActions() : null;
    if (subActions) for (const sub of subActions) menu.createAddItem(sub);
    return menu;
  }

  _createSnapMenu(): Menu {
    const d = designer();
    const menu = new Menu();
    menu.setTooltipType(TOOLTIP_AREA.TOOLBAR);
    menu.createAddItem(d.getAction(ToolbarActionIds.ToggleSnap));
    if (config.HAS_SNAPZONES) menu.createAddItem(d.getAction(ToolbarActionIds.ToggleSnapZones));
    menu.createAddDivider();
    for (const guide of SNAP_GUIDES)
      menu.createAddItem(d.getAction(ToolbarActionIds.ToggleGuide + "." + guide));
    menu.createAddDivider();
    menu.createAddItem(d.getAction(ToolbarActionIds.ShowGrid));
    menu.createAddItem(d.getAction(ToolbarActionIds.ShowGuideLines));
    menu.createAddItem(d.getAction(ToolbarActionIds.ShowSymbolLabels));
    return menu;
  }

  _createImageMenu(): Menu {
    const d = designer();
    const menu = new Menu();
    menu.setTooltipType(TOOLTIP_AREA.TOOLBAR);
    menu.createAddItem(d.getAction(ToolbarActionIds.PlaceImport));
    menu.createAddItem(d.getAction(ToolbarActionIds.LinkImage));
    return menu;
  }

  getHeight(): number {
    return this._htmlElement.clientHeight;
  }

  /** Enables or disables every toolbar button in the page. */
  setEnabled(enabled: boolean): void {
    for (const button of document.querySelectorAll<HTMLButtonElement>(".toolbar-button > button")) {
      button.classList[enabled ? "remove" : "add"]("g-disabled");
      button.disabled = !enabled;
    }
  }

  toString(): string {
    return "[Object GToolbar]";
  }
}

function isToolAllowed(sidebar: ToolCheckingSidebar, tool: Tool | null): boolean {
  return typeof sidebar.isToolAllowed === "function" ? sidebar.isToolAllowed(tool) : true;
}

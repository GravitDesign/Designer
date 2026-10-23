// Old: designer.browser.dev.js module 1491 (GDesigner).
/**
 * The app: the workspace, the open documents and the active one, the
 * shell parts, the actions and their shortcuts, the settings and the
 * global swatches. One instance exists (globals.ts designer()).
 *
 * Kept from the old class: the boot order (constructor, init, start; see
 * bootstrap.ts), the part creation and init order, the layout of the
 * parts (relayout and the four offsets), the menu built from the action
 * table, the setting handlers, the theme switch and the window title.
 *
 * Dropped with the cloud, the licence and analytics: users, licences,
 * subscriptions and payments, deep links, shares, realtime and review
 * managers, persona, auto save, the CDR integration engine, stats and
 * tracking (stats() is a no-op), the offline checks. Where the old code
 * asked the licence, the answers of the always-pro local build are used:
 * isEnabledProFeatures() is true, canAccessFreemium() is true, and the
 * body has the classes "pro-license pro-subscription" the licence event
 * set (the stylesheets key on them).
 *
 * Parts of other clusters are reached through late.ts by their port-map
 * file (header, toolbar, menus, context menu, welcome screen, system
 * dialog, GDocument); a missing one is skipped, so the shell runs while
 * they are ported. Every such point names the cluster.
 */
import { Color } from "../../engine/color/color.ts";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import type { Event, EventClass } from "../../engine/core/event.ts";
import { EventTarget } from "../../engine/core/event-target.ts";
import type { KeyValue } from "../../engine/core/key.ts";
import { Key } from "../../engine/core/key.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { Platform, WebBrowser } from "../../engine/core/platform.ts";
import { Hardware, OperatingSystem, System } from "../../engine/core/system.ts";
import { Util } from "../../engine/core/util.ts";
import { Point } from "../../engine/math/point.ts";
import { Rect } from "../../engine/math/rect.ts";
import { PaintCanvas } from "../../engine/paint/paint-canvas.ts";
import { ScenePaintConfiguration } from "../../engine/paint/scene-paint-configuration.ts";
import { Node } from "../../engine/scene/node.ts";
import { SceneOptions } from "../../engine/scene/scene-options.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Pattern } from "../../engine/style/pattern.ts";
import { Swatch } from "../../engine/style/swatch.ts";
import { Font } from "../../engine/text/fonts/font.ts";
import { Text } from "../../engine/text/text.ts";
import { EditorOptions } from "../../editor/editor-options.ts";
import { EditorPaintConfiguration } from "../../editor/editor-paint-configuration.ts";
import { EditorWorkspace } from "../../editor/editor-workspace.ts";
import { ElementEditor } from "../../editor/element-editors/element-editor.ts";
import { GridGuide } from "../../editor/guides/grid-guide.ts";
import { Guides } from "../../editor/guides/guides.ts";
import { PreserveAspectRatioAnnotation } from "../../editor/handles/preserve-aspect-ratio-annotation.ts";
import { RotateAnnotation } from "../../editor/handles/rotate-annotation.ts";
import { SkewHorizontalAnnotation } from "../../editor/handles/skew-horizontal-annotation.ts";
import { SkewVerticalAnnotation } from "../../editor/handles/skew-vertical-annotation.ts";
import { PointerTool } from "../../editor/tools/pointer-tool.ts";
import { SelectTool } from "../../editor/tools/select-tool.ts";
import type { ToolClass, ToolManager } from "../../editor/tools/tool-manager.ts";
import { DocumentTouchTarget } from "../../editor/touch/document-touch-target.ts";
import { EditorTouchTarget } from "../../editor/touch/editor-touch-target.ts";
import { startLongPressEvents } from "../../editor/touch/long-press-event.ts";
import { setTouchHost } from "../../editor/touch/touch-host.ts";
import type { EditorWidget } from "../../editor/view/editor-widget.ts";
import { SceneWidget } from "../../editor/view/scene-widget.ts";
import type { Action } from "../actions/action.ts";
import { DocumentEvent } from "../document/document-event.ts";
import { DocumentStatus } from "../document/document-status.ts";
import { PageClip } from "../export/page-clip.ts";
import { baseConfig } from "../file-formats.ts";
import { publishSettings } from "../state/settings-store.ts";
import { bumpShellVersion, useShellStore } from "../state/shell-store.ts";
import { setTheme, updateTheme } from "../themes/theme.ts";
import { applyDefaultEditorOptions, applyTouchEditorOptions } from "./handle-options.ts";
import { Info } from "./info.ts";
import { ApplicationStatusEvent } from "./application-status-event.ts";
import type { Container } from "./container.ts";
import { Runtime } from "./container.ts";
import {
  css,
  height,
  isDisplayed,
  outerHeight,
  outerWidth,
  setHeight,
  setOuterWidth,
  width,
} from "./dom.ts";
import { Footer } from "./document-loading.ts";
import { appRegistry, containerOrNull } from "./globals.ts";
import { lateExport, systemDialog } from "./late.ts";
import { Layout, type LayoutPart } from "./layout-ids.ts";
import { Sidebars } from "./layout.ts";
import { MouseTracker } from "./mouse-tracker.ts";
import type { ShellPart } from "./part.ts";
import { SettingChangedEvent } from "./setting-changed-event.ts";
import { defaultSettings, SETTINGS_PROPERTY, type DesignerSettings } from "./settings.ts";
import { shortcutBinder, shortcutToMousetrap } from "./shortcut-binder.ts";
import { Panels } from "./sidebar-collapse.ts";
import { SidebarEvent } from "./sidebar-event.ts";
import { SidebarsIds } from "./sidebar-ids.ts";
import type { Window, WindowDocument } from "./window.ts";
import { WindowEvent, Windows } from "./windows.ts";

/** The document the designer manages (GDocument, app-config-document). */
export interface DesignerDocument extends WindowDocument {
  activate(): void;
  deactivate(): void;
  release(): void;
  getWindows(): Window[];
  getActiveWindow(): Window | null;
  isModified(): boolean;
  isSynchronizing?(): boolean;
  getId?(): string | null;
  getExtension?(): string | null;
  load?(item: unknown): void;
}

/** A storage item the designer opens (GStorage.Item). */
export interface DesignerStorageItem {
  getExtension(): string | null;
  getUniqueId(): string | null;
  getVersionId?(): string | null;
}

/** GMenu / GMenuItem as the main menu build uses them (app-menus-toolbar). */
interface MenuLike {
  addItem(item: MenuItemLike): void;
  removeItem(index: number): void;
  indexOf(item: MenuItemLike): number;
  update(): void;
  addEventListener(eventClass: EventClass, listener: (event: never) => void): void;
  setEnabled?(enabled: boolean): void;
}

interface MenuItemLike {
  getMenu(): MenuLike;
  setCaption(caption: string | null): void;
  setIcon(icon: string | null): void;
  setEnabled(enabled: boolean): void;
  setChecked(checked: boolean): void;
  setPro(pro: boolean, id?: string): void;
  setNoHover(noHover: boolean): void;
  setShortcutHint(shortcut: readonly KeyValue[]): void;
  setVisible(visible: boolean): void;
  setAction(action: Action): void;
  addClass(name: string): void;
  addEventListener(eventClass: EventClass, listener: (event: never) => void): void;
}

interface MenuItemClass {
  new (type: number, menuClass?: unknown, data?: unknown, isVisible?: unknown): MenuItemLike;
  Type: { Menu: number; Item: number; Divider: number };
  ActivateEvent: EventClass;
  UpdateEvent: EventClass;
}

/** The parts the menus cluster provides (header and toolbar). */
interface HeaderLike extends ShellPart {
  getHeight(): number;
  setWindowTabEnable?(enabled: boolean): void;
  getWindowTab?(window: Window | null): unknown;
}

interface ToolbarLike extends ShellPart {
  getHeight(): number;
  setEnabled?(enabled: boolean): void;
}

/** GContextMenu (app-menus-toolbar). */
interface ContextMenuLike {
  close(): void;
}

/** The welcome screen / new document dialog (app-welcome-settings). */
interface NewDocumentDialogLike {
  open(options?: unknown): void;
  close(): void;
  getDialogElement?(): HTMLElement | null;
}

/** A part whose module is not ported yet: an empty element and no behaviour. */
class PendingPart implements HeaderLike, ToolbarLike {
  constructor(private readonly _element: HTMLElement) {}
  init(): void {}
  relayout(): void {}
  getHeight(): number {
    return this._element.clientHeight;
  }
}

/** The licence banner and overlay parts (dropped, modules 1497 and 1498): always hidden. */
class HiddenPart {
  constructor(private readonly _element: HTMLElement) {}
  init(): void {}
  setEnabled(enabled: boolean): void {
    css(this._element, "display", enabled ? "none" : "unset");
  }
}

/** One menu entry of the table _createMainMenu builds. */
interface MenuEntry {
  type: "menu" | "item" | "divider";
  caption?: string;
  items?: MenuEntry[];
  icon?: string | null;
  category?: { label: string; visible: boolean; icon: string | null; parent: unknown };
  action?: Action;
  isVisible?: () => boolean;
  menu?: MenuLike;
  item?: MenuItemLike;
  separator?: MenuItemLike;
}

/** The setting value for the theme etc.; settings are an open JSON object. */
type Settings = DesignerSettings & Record<string, unknown>;

/** An inline text editor that may take a key first. */
interface KeyHandler {
  handleKeyDown(event: KeyboardEvent): boolean;
}

/** A shortcut handler: true stops the key event. */
export type ShortcutHandler = (event: KeyboardEvent) => unknown;

/** The pieces of the main frame, by part id. */
export interface ShellElements {
  mainframe: HTMLElement;
  frame: HTMLElement;
  parts: Record<string, HTMLElement>;
}

export class Designer extends EventTarget {
  /**
   * Makes the workspace. The interim parity hooks set this to share the
   * workspace src/parity/app/document.ts already made (UI.md, section 14).
   */
  static workspaceFactory: () => EditorWorkspace = () => new EditorWorkspace();

  /**
   * Builds the shell DOM (#mainframe and the parts) and returns it. The
   * real app renders it with React (mount.tsx); unit tests use plain
   * elements.
   */
  static shellBuilder: ((designer: Designer) => ShellElements) | null = null;

  /**
   * Whether init loads the CMYK profile itself. False while the interim
   * src/parity/g/engine-color.ts loads it at module load (see init).
   */
  static loadsCmykProfile = false;

  private _settings: Settings = defaultSettings() as Settings;
  private _settingsLoaded = false;
  private readonly _swatches: Record<string, Node[]> = {};
  private readonly _workspace: EditorWorkspace;
  private readonly _documents: DesignerDocument[] = [];
  private _activeDocument: DesignerDocument | null = null;
  private _actions: Action[] = [];
  private readonly _actionsMap: Record<string, Action> = {};
  private readonly _clipboardMimeTypes: Record<string, unknown> = {};
  private _initialized = false;
  private _ready = false;
  private _mainframe: HTMLElement | null = null;
  private _frame: HTMLElement | null = null;
  private _info: Info | null = null;
  private _footer: Footer | null = null;
  private _header: HeaderLike | null = null;
  private _toolbar: ToolbarLike | null = null;
  private _panels: Panels | null = null;
  private _banner: HiddenPart | null = null;
  private _overlay: HiddenPart | null = null;
  private _leftSidebars: Sidebars | null = null;
  private _rightSidebars: Sidebars | null = null;
  private _windows: Windows | null = null;
  private _mainMenu: MenuLike | null = null;
  private _contextMenu: ContextMenuLike | null = null;
  private _newDocumentDialog: NewDocumentDialogLike | null = null;
  private readonly _paste: unknown;
  private readonly _cursorManager = new MouseTracker();
  private readonly _editorTouchHandler: EditorTouchTarget;
  private _draggableItemIsDragging = false;
  private _mouseOverContext: { context?: unknown; prevEvt?: unknown; contextCallback?: unknown } =
    {};
  private _version: string | null = null;
  private _versionFriendlyName: string | null = null;
  private _commitSHA: string | null = null;
  private _buildNum: string | null = null;
  private _isBeta: boolean | null = null;
  private _env: string | null = null;
  private readonly _readyCallbacks: (() => void)[] = [];
  private readonly _stylesPreview: Record<
    string,
    { preview: Node; bitmap: string; textBitmap: string }
  > = {};

  constructor() {
    super();
    this._workspace = Designer.workspaceFactory();
    this._mainMenu = this._createMenu();
    // The touch input layer (editor-touch): taps and pans on the page, the
    // view gestures on the active window, the gesture lookups.
    new DocumentTouchTarget(document);
    this._editorTouchHandler = new EditorTouchTarget();
    setTouchHost({
      getActiveView: () => this.getActiveView(),
      getContextMenu: () => this._contextMenu,
      getActiveTool: () => this.getToolManager().getActiveTool(),
      triggerContextMenu: (target, clientX, clientY) =>
        this._triggerContextMenu(target, clientX, clientY),
    });
    document.addEventListener("gesturechange", (event) => event.stopPropagation());
    window.addEventListener(
      "dragover",
      (event) => {
        event.preventDefault();
      },
      false,
    );
    window.addEventListener(
      "drop",
      (event) => {
        event.preventDefault();
        const active = this.getWindows() ? this.getWindows().getActiveWindow() : null;
        const view = active && active.getView();
        if (view)
          (view as unknown as { handleDropEvent(e: DragEvent): void }).handleDropEvent(event);
      },
      false,
    );
    window.addEventListener(
      "wheel",
      (event) => {
        if (Platform.modifiers.ctrlKey || Platform.modifiers.metaKey) event.preventDefault();
      },
      { passive: false },
    );
    window.addEventListener("gesturestart", (event) => event.preventDefault());
    window.addEventListener("gestureend", (event) => event.preventDefault());
    window.addEventListener("gesturechange", (event) => {
      event.preventDefault();
      const gesture = event as unknown as { scale: number; clientX: number; clientY: number };
      let scale = gesture.scale;
      if (scale > 1) scale *= -1;
      else scale = 2 - scale;
      const wheel = new WheelEvent("wheel", {
        deltaY: scale,
        clientX: gesture.clientX,
        clientY: gesture.clientY,
        ctrlKey: true,
      });
      const active = this.getWindows() && this.getWindows().getActiveWindow();
      const element = active && active.getView() && (active.getView() as EditorWidget)._htmlElement;
      if (element) element.dispatchEvent(wheel);
    });
    document.addEventListener("keydown", (event) => this._documentKeyDown(event), false);
    document.addEventListener(
      "contextmenu",
      (event) => {
        if (!isEditable(event.target) || this.propertyPanelHasContextMenu(event)) {
          event.preventDefault();
          return false;
        }
        event.stopPropagation();
        return true;
      },
      true,
    );
    this._workspace.addEventListener(
      (EditorWorkspace as unknown as { ResolveUrlEvent: EventClass }).ResolveUrlEvent,
      this._workspaceResolveUrlEvent,
      this,
    );
    this.addEventListener(DocumentEvent, this._documentEvent, this);
    this.addEventListener(SettingChangedEvent, this._settingChangedEvent, this);
    this.addEventListener(ApplicationStatusEvent, this._applicationStatusEvent, this);
    const ClipboardBridge = lateExport<new () => unknown>(
      "clipboard/clipboard-bridge.ts",
      "ClipboardBridge",
    );
    this._paste = ClipboardBridge ? new ClipboardBridge() : null;
  }

  // -------------------------------------------------------------------------
  // Getters

  getOverlay(): HiddenPart | null {
    return this._overlay;
  }

  getBanner(): HiddenPart | null {
    return this._banner;
  }

  getMainMenu(): MenuLike | null {
    return this._mainMenu;
  }

  /** Whether one of the event's elements is a properties panel with its own context menu. */
  propertyPanelHasContextMenu(event: globalThis.Event): boolean {
    let has = false;
    if (event.composedPath && event.composedPath())
      for (const element of event.composedPath())
        if (element instanceof HTMLElement && element.classList.contains("properties-panel"))
          has = !!(element as unknown as { __contextmenu?: unknown }).__contextmenu;
    return has;
  }

  getMouseOverContext(): typeof this._mouseOverContext {
    return this._mouseOverContext;
  }

  setMouseOverContext(context: unknown, prevEvt: unknown, contextCallback: unknown): void {
    this._mouseOverContext = { context, prevEvt, contextCallback };
  }

  isAnonymous(): boolean {
    return false;
  }

  toggleLoading(loading: boolean): void {
    document.body.classList.toggle("g-loading", loading);
  }

  getDefaultStorage(): ReturnType<Container["getStorage"]> {
    return (containerOrNull() as Container).getStorage();
  }

  getWorkspace(): EditorWorkspace {
    return this._workspace;
  }

  getToolManager(): ToolManager {
    return this._workspace.getToolManager() as ToolManager;
  }

  getCursorManager(): MouseTracker {
    return this._cursorManager;
  }

  getDocuments(): DesignerDocument[] {
    return this._documents;
  }

  getActiveDocument(): DesignerDocument | null {
    return this._activeDocument ? this._activeDocument : null;
  }

  getActiveView(): EditorWidget | null {
    const document = this.getActiveDocument();
    const window = document && document.getActiveWindow();
    return window ? window.getView() : null;
  }

  getHeader(): HeaderLike | null {
    return this._header;
  }

  getInfo(): Info | null {
    return this._info;
  }

  getToolbar(): ToolbarLike | null {
    return this._toolbar;
  }

  getPanels(): Panels | null {
    return this._panels;
  }

  getFooter(): Footer | null {
    return this._footer;
  }

  getLeftSidebars(): Sidebars {
    return this._leftSidebars as Sidebars;
  }

  getRightSidebars(): Sidebars {
    return this._rightSidebars as Sidebars;
  }

  getWindows(): Windows {
    return this._windows as Windows;
  }

  getContextMenu(): ContextMenuLike | null {
    return this._contextMenu;
  }

  getPaste(): unknown {
    return this._paste;
  }

  // -------------------------------------------------------------------------
  // Parts

  isPartVisible(part: LayoutPart): boolean {
    const element = this.getPart(part);
    return !!element && isDisplayed(element);
  }

  /** Shows (with `display`, default block) or hides a part, then lays out again. */
  setPartVisible(part: LayoutPart, visible: boolean, display?: string): void {
    if (visible == this.isPartVisible(part)) return;
    const element = this.getPart(part);
    if (!element) return;
    css(element, "display", visible ? (display || "" === display ? display : "block") : "none");
    this.relayout();
  }

  getPart(part: LayoutPart): HTMLElement | null {
    return this._mainframe ? this._mainframe.querySelector<HTMLElement>("#" + part.id) : null;
  }

  // -------------------------------------------------------------------------
  // Actions and menus

  getActions(): Action[] {
    return this._actions;
  }

  getAction(id: string): Action | null {
    return this._actionsMap[id] || null;
  }

  private _menuItemClass(): MenuItemClass | null {
    return lateExport<MenuItemClass>("menus/menu-item.ts", "MenuItem");
  }

  private _createMenu(): MenuLike | null {
    const Menu = lateExport<new () => MenuLike>("menus/menu.ts", "Menu");
    return Menu ? new Menu() : null;
  }

  addMenu(
    parent: MenuLike | null,
    caption: string,
    onOpen?: (() => void) | null,
    icon?: string | null,
    onUpdate?: ((item: MenuItemLike) => void) | null,
  ): MenuLike | null {
    const MenuItem = this._menuItemClass();
    const Menu = lateExport<new () => MenuLike>("menus/menu.ts", "Menu");
    const OpenEvent = lateExport<EventClass>("menus/menu-open-event.ts", "MenuOpenEvent");
    const target = parent || this._mainMenu;
    if (!MenuItem || !Menu || !target) return null;
    const item = new MenuItem(MenuItem.Type.Menu, Menu);
    item.setCaption(caption);
    item.setIcon(icon || null);
    target.addItem(item);
    if (onOpen && OpenEvent) item.getMenu().addEventListener(OpenEvent, onOpen);
    if (onUpdate) item.addEventListener(MenuItem.UpdateEvent, () => onUpdate(item));
    return item.getMenu();
  }

  addMenuSeparator(menu: MenuLike, isVisible?: (() => boolean) | null): MenuItemLike | null {
    const MenuItem = this._menuItemClass();
    if (!MenuItem) return null;
    const item = new MenuItem(MenuItem.Type.Divider, null, null, isVisible);
    menu.addItem(item);
    return item;
  }

  addMenuItem(
    menu: MenuLike,
    caption?: string | null,
    icon?: string | null,
    _checkable?: boolean | null,
    shortcut?: readonly KeyValue[] | null,
    activate?: ((source: string, event?: KeyboardEvent) => unknown) | null,
    globalShortcut?: boolean,
    pro?: boolean,
    action?: Action | null,
    className?: string | null,
    noHover?: boolean,
  ): MenuItemLike | null {
    const MenuItem = this._menuItemClass();
    if (!MenuItem) return null;
    const item = new MenuItem(MenuItem.Type.Item);
    if (activate) item.addEventListener(MenuItem.ActivateEvent, activate as (event: never) => void);
    if (shortcut) {
      this.registerShortcut(
        shortcut,
        (event) => (activate ? activate("shortcut", event) : undefined),
        globalShortcut,
      );
      item.setShortcutHint(shortcut);
    }
    item.setIcon(icon || null);
    item.setPro(!!pro);
    item.setNoHover(!!noHover);
    if (className) item.addClass(className);
    this.updateMenuItem(item, caption || null, true, false);
    menu.addItem(item);
    if (action) item.setAction(action);
    return item;
  }

  updateMenuItem(
    item: MenuItemLike,
    caption: string | null,
    enabled: boolean,
    checked: boolean,
    pro?: boolean,
    id?: string,
  ): void {
    item.setCaption(caption);
    item.setEnabled(enabled);
    item.setChecked(checked);
    item.setPro(!!pro, id);
  }

  removeMenuItem(menu: MenuLike, item: MenuItemLike): void {
    menu.removeItem(menu.indexOf(item));
  }

  canExecuteAction(id: string, args?: unknown[]): boolean {
    const action = this.getAction(id);
    return (
      !!action &&
      action.isAvailable() &&
      (action.isEnabled as (...a: unknown[]) => boolean)(...(args || []))
    );
  }

  /** The annotations sidebar blocked drawing tools; it is dropped, so every tool may activate. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  canActivateTool(_tool: ToolClass, _check?: boolean): boolean {
    return true;
  }

  /**
   * Runs an action by id: only when it is available and enabled for the
   * arguments, not in a preview window; "shortcut" runs
   * executeFromShortcut. Returns the action's result, or true.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  executeAction(id: string, args?: unknown[], source?: string, _noStats?: boolean): unknown {
    const action = this.getAction(id);
    if (!action) throw new Error("Unable to execute action '" + id + "' - not registered.");
    const window = this._windows ? this._windows.getActiveWindow() : null;
    if (window && window.isPreview()) return undefined;
    const list = args || [];
    if (action.isAvailable() && (action.isEnabled as (...a: unknown[]) => boolean)(...list)) {
      if (id === SAVE_ACTION_ID) {
        const toolbar = this.getPart(Layout.Toolbar);
        if (toolbar)
          for (const button of toolbar.querySelectorAll(
            ".toolbar-button[data-action='" + id + "'] button",
          ))
            button.classList.toggle("g-disabled", true);
      }
      const run = ("shortcut" === source ? action.executeFromShortcut : action.execute) as (
        ...a: unknown[]
      ) => unknown;
      const result = run.apply(action, list);
      if (undefined !== result) return result;
    }
    return true;
  }

  private _executeShortcutAction(action: Action, event?: KeyboardEvent): unknown {
    const args = action.isKeyBoardEventRequiredToExecute() ? [event] : [undefined];
    return this.executeAction(action.getId(), args, "shortcut");
  }

  registerAdditionalShortcuts(action: Action): void {
    const shortcuts = (
      action.getAdditionalShortcuts as () => readonly (readonly KeyValue[])[] | null
    )();
    if (shortcuts && shortcuts.length)
      shortcuts.forEach((shortcut) => {
        this.registerShortcut(
          shortcut,
          (event) => this._executeShortcutAction(action, event),
          false,
        );
      });
  }

  /**
   * Binds a key combo. While a text is edited inline its editor gets the
   * key first; a handler returning true stops the event. [META, "+"] also
   * binds mod+= (the key the plus sits on).
   */
  registerShortcut(
    keys: readonly KeyValue[],
    down: ShortcutHandler,
    global?: boolean,
    up?: ShortcutHandler | null,
  ): void {
    const wrap =
      (handler: ShortcutHandler, checkTextEditor: boolean) =>
      (event: KeyboardEvent): boolean | undefined => {
        let textEditor: KeyHandler | null = null;
        const document = this.getActiveDocument();
        const editor = document && document.getEditor();
        if (editor && editor.isInlineEditing()) {
          const node = editor.getCurrentInlineEditorNode();
          if (ElementEditor && node instanceof Text)
            textEditor = ElementEditor.getEditor(node) as unknown as KeyHandler;
        }
        if (!(
          (checkTextEditor && textEditor && textEditor.handleKeyDown(event)) ||
          true !== handler(event)
        )) {
          event.preventDefault();
          event.stopPropagation();
          return false;
        }
        return undefined;
      };
    const binder = shortcutBinder();
    const bind = global ? binder.bindGlobal.bind(binder) : binder.bind.bind(binder);
    if (2 === keys.length && keys[0] === Key.Constant.META && "+" === keys[1]) {
      bind(shortcutToMousetrap(keys), wrap(down, true));
      bind("mod+=", wrap(down, true), "keydown");
      if (up) bind("mod+=", wrap(up, false), "keyup");
    } else {
      bind(shortcutToMousetrap(keys), wrap(down, true), "keydown");
      if (up) bind(shortcutToMousetrap(keys), wrap(up, false), "keyup");
    }
  }

  /** The menu bar's structure from the action table (categories, groups and dividers). */
  private _createMainMenu(): void {
    const groups: { item: MenuEntry; group: string | null }[] = [];
    const root: MenuEntry = { type: "menu", items: [] };
    const groupOf = (item: MenuEntry): string | null | undefined => {
      for (const entry of groups) if (entry.item === item) return entry.group;
      return undefined;
    };
    const add = (parent: MenuEntry, item: MenuEntry, group: string | null): void => {
      const items = parent.items as MenuEntry[];
      if (items.length > 0) {
        const last = items[items.length - 1] as MenuEntry;
        if (groupOf(last) !== group) {
          const divider: MenuEntry = { type: "divider" };
          if ("item" === last.type && last.action) {
            const lastGroup = groupOf(last);
            const members: MenuEntry[] = [];
            // The old code pushed the last item once per entry of its group.
            for (const entry of groups) if (entry.group === lastGroup) members.push(last);
            divider.isVisible = () => members.some((m) => (m.action as Action).isVisible());
          }
          items.push(divider);
        }
      }
      groups.push({ item, group });
    };
    for (const action of this._actions) {
      this._actionsMap[action.getId()] = action;
      if (!action.isAvailable()) continue;
      let category = action.getCategory() as unknown as MenuEntry["category"] & { parent: unknown };
      const chain = [category];
      while ((category = (category as { parent: typeof category }).parent)) chain.push(category);
      chain.reverse();
      const group = action.getGroup();
      const groupIcon = action.getGroupIcon();
      const groupParts = group ? [""].concat(group.split("/")) : null;
      if (groupParts && chain && chain.length !== groupParts.length - 1)
        throw new Error("The number of categories is different than the number of groups.");
      let current = root;
      for (let p = 0; p < chain.length; ++p) {
        const cat = chain[p] as NonNullable<MenuEntry["category"]>;
        const groupName = groupParts ? (groupParts[p] as string) : null;
        let found: MenuEntry | null = null;
        const caption = cat.label.split("/")[p];
        for (const existing of current.items as MenuEntry[])
          if (caption == existing.caption) found = existing;
        if (!found) {
          found = { type: "menu", caption, items: [], icon: groupIcon, category: cat };
          add(current, found, groupName);
          (current.items as MenuEntry[]).push(found);
        }
        current = found;
      }
      const entry: MenuEntry = { type: "item", action };
      add(current, entry, groupParts ? (groupParts[groupParts.length - 1] as string) : null);
      (current.items as MenuEntry[]).push(entry);
    }
    const build = (entry: MenuEntry, menu: MenuLike | null): void => {
      if ("menu" === entry.type) entry.menu = buildMenu(entry, menu) || undefined;
      else if ("divider" === entry.type) {
        if (menu) entry.separator = this.addMenuSeparator(menu, entry.isVisible) || undefined;
      } else if ("item" === entry.type && menu) {
        const action = entry.action as Action;
        entry.item =
          this.addMenuItem(
            menu,
            Locale.get(action.getTitle() as LocaleKey) as string,
            action.getIcon(),
            action.isCheckable(),
            action.getShortcut(),
            (source, event) => {
              if ("shortcut" === source) return this._executeShortcutAction(action, event);
              return undefined;
            },
            action.isShortcutGlobal(),
            action.isPro(),
            action,
            (action as unknown as { _sidebar?: unknown })._sidebar
              ? action.getStyleClass() + " hidepanel"
              : action.getStyleClass(),
            action.noHover(),
          ) || undefined;
        this.registerAdditionalShortcuts(action);
      }
    };
    const buildMenu = (entry: MenuEntry, parent: MenuLike | null): MenuLike | null => {
      const category = entry.category;
      const onUpdate = category
        ? (item: MenuItemLike) => {
            item.setVisible(category.visible);
            item.setIcon(category.icon);
          }
        : null;
      const menu = this.addMenu(
        parent,
        entry.caption as string,
        () => {
          for (const child of entry.items as MenuEntry[])
            if ("item" === child.type && child.item) {
              const action = child.action as Action;
              this.updateMenuItem(
                child.item,
                Locale.get(action.getTitle() as LocaleKey) as string,
                action.isEnabled(),
                !!action.isCheckable() && action.isChecked(),
                action.isPro(),
                action.getId(),
              );
            }
        },
        entry.icon,
        onUpdate,
      );
      for (const child of entry.items as MenuEntry[]) build(child, menu);
      return menu;
    };
    // The old loop also passed root dividers to the menu builder, which threw;
    // a root divider only appears while some actions are not registered yet.
    for (const entry of root.items as MenuEntry[])
      if ("menu" === entry.type) buildMenu(entry, null);
    if (this._mainMenu) this._mainMenu.update();
  }

  // -------------------------------------------------------------------------
  // Clipboard

  getClipboardMimeTypes(): string[] | null {
    return this._clipboardMimeTypes ? Object.keys(this._clipboardMimeTypes) : null;
  }

  getClipboardContent(mimeType: string): unknown {
    return this._clipboardMimeTypes &&
      Object.prototype.hasOwnProperty.call(this._clipboardMimeTypes, mimeType)
      ? this._clipboardMimeTypes[mimeType]
      : null;
  }

  setClipboardContent(mimeType: string, content: unknown): void {
    this._clipboardMimeTypes[mimeType] = content;
  }

  // -------------------------------------------------------------------------
  // Settings

  getSetting<K extends keyof DesignerSettings>(
    key: K,
    defaultValue?: DesignerSettings[K],
  ): DesignerSettings[K];
  getSetting(key: string, defaultValue?: unknown): unknown;
  getSetting(key: string, defaultValue?: unknown): unknown {
    return Object.prototype.hasOwnProperty.call(this._settings, key)
      ? this._settings[key]
      : defaultValue;
  }

  /**
   * Changes settings (one key, or parallel arrays). Ignored until start()
   * loaded them. Every changed key triggers a SettingChangedEvent; then
   * the whole object is stored. Returns whether anything changed.
   */
  setSetting(key: string | string[], value: unknown): boolean | undefined {
    if (!this._settingsLoaded) return undefined;
    const keys = key instanceof Array ? key : [key];
    const values = key instanceof Array ? (value as unknown[]) : [value];
    let changed = false;
    for (let i = 0; i < keys.length; ++i) {
      const name = keys[i] as string;
      const newValue = values[i];
      if (
        !Object.prototype.hasOwnProperty.call(this._settings, name) ||
        !Util.equals(this._settings[name], newValue, true)
      ) {
        const previous = this._settings[name];
        this._settings[name] = newValue;
        publishSettings(this._settings, true);
        this.trigger(new SettingChangedEvent(name, previous || undefined, newValue));
        changed = true;
      }
    }
    if (changed)
      try {
        (containerOrNull() as Container).setProperty(SETTINGS_PROPERTY, this._settings);
      } catch {
        // The old code ignored storage errors (quota, private mode).
      }
    return changed;
  }

  // -------------------------------------------------------------------------
  // Swatches

  /** The swatches of a scope: "global*" from the settings, "document*" from the active scene. */
  getSwatches(scope: string): Node[] | undefined {
    if (scope.startsWith("document") && this.getActiveDocument()) {
      const swatches = (this.getActiveDocument() as DesignerDocument).getScene()?.getSwatches();
      const out: Node[] = [];
      if (swatches)
        for (let child = swatches.getFirstChild(); null !== child; child = child.getNext()) {
          const pattern = serializePattern(propertyOf(child, "_pt"));
          if (
            ((pattern.startsWith("C#") || pattern.startsWith("Y#")) && "document" === scope) ||
            (pattern.startsWith("L#") && "document-linear-gradient" === scope) ||
            (pattern.startsWith("R#") && "document-radial-gradient" === scope) ||
            (pattern.startsWith("A#") && "document-angular-gradient" === scope) ||
            (pattern.startsWith("T#") && "document-texture-pattern" === scope) ||
            (pattern.startsWith("N#") && "document-noise-pattern" === scope)
          )
            out.push(child);
        }
      return out;
    }
    return this._swatches[scope];
  }

  /**
   * Replaces the swatches of a scope (document swatches in the scene,
   * global ones stored as "swatches"); `clear` empties the document list
   * first instead of removing just this scope's.
   */
  setSwatches(scope: string, swatches: Node[], clear?: boolean): void {
    if (
      (scope.startsWith("document") && !this.getActiveDocument()) ||
      (!scope.startsWith("document") &&
        !Object.prototype.hasOwnProperty.call(this._swatches, scope))
    )
      return;
    if (!scope.startsWith("document")) this._swatches[scope] = swatches;
    const isDocument = scope.startsWith("document");
    const isGlobal = scope.startsWith("global");
    const scene = (this.getActiveDocument() as DesignerDocument).getScene() as Scene;
    if (isDocument) {
      const list = scene.getSwatches();
      if (clear) list.clearChildren();
      else {
        const current = this.getSwatches(scope) || [];
        const remove: Node[] = [];
        for (let child = list.getFirstChild(); null !== child; child = child.getNext())
          for (const swatch of current) if (Util.equals(child, swatch)) remove.push(child);
        for (const node of remove) list.removeChild(node);
      }
      for (const swatch of swatches) list.appendChild(swatch);
    } else if (isGlobal) {
      const all = this._allGlobalSwatches();
      (containerOrNull() as Container).setProperty(
        "swatches",
        all.map((swatch) => Node.serialize(swatch)),
      );
    }
    const SwatchesChangedEvent = lateExport<new (scope: string) => Event>(
      "color/swatches-changed-event.ts",
      "SwatchesChangedEvent",
    );
    if (SwatchesChangedEvent) this.trigger(new SwatchesChangedEvent(scope));
  }

  /** Global swatches in the old storage order (solid, linear, angular, radial, texture, noise). */
  private _allGlobalSwatches(): Node[] {
    const s = this._swatches;
    return ([] as Node[])
      .concat(s.global || [])
      .concat(s["global-linear-gradient"] || [])
      .concat(s["global-angular-gradient"] || [])
      .concat(s["global-radial-gradient"] || [])
      .concat(s["global-texture-pattern"] || [])
      .concat(s["global-noise-pattern"] || []);
  }

  getAllSwatches(scope: string): Node[] {
    if (scope.startsWith("document")) {
      const out: Node[] = [];
      const list = (
        (this.getActiveDocument() as DesignerDocument).getScene() as Scene
      ).getSwatches();
      for (let child = list.getFirstChild(); null !== child; child = child.getNext())
        out.push(child);
      return out;
    }
    return this._allGlobalSwatches();
  }

  private _addGlobalSwatch(swatch: Node): void {
    const pattern = serializePattern(propertyOf(swatch, "_pt"));
    if (pattern.startsWith("C#") || pattern.startsWith("Y#")) this._swatches.global?.push(swatch);
    else if (pattern.startsWith("L#")) this._swatches["global-linear-gradient"]?.push(swatch);
    else if (pattern.startsWith("R#")) this._swatches["global-radial-gradient"]?.push(swatch);
    else if (pattern.startsWith("A#")) this._swatches["global-angular-gradient"]?.push(swatch);
    else if (pattern.startsWith("T#")) this._swatches["global-texture-pattern"]?.push(swatch);
    else if (pattern.startsWith("N#")) this._swatches["global-noise-pattern"]?.push(swatch);
  }

  // -------------------------------------------------------------------------
  // Documents

  /** A document with one white page of no size (the infinite canvas). */
  newInfiniteDocument(): DesignerDocument | null {
    const scene = this.createScene();
    const page = scene.getActivePage();
    if (page) page.setProperties(["bck", "w", "h"], [RGBColor.WHITE, 0, 0]);
    const document = this.createDocument(scene);
    if (!document) return null;
    this.addDocument(document);
    return document;
  }

  /**
   * A new GDocument for a scene (or a storage item). Until GDocument
   * exists (app-config-document) the interim parity documents are made by
   * src/parity/app/document.ts instead, so this gives null.
   */
  createDocument(source: Scene | DesignerStorageItem | null): DesignerDocument | null {
    const DocumentClass = lateExport<new (source: unknown) => DesignerDocument>(
      "document/document.ts",
      "Document",
    );
    return DocumentClass ? new DocumentClass(source) : null;
  }

  createScene(noPage?: boolean): Scene {
    const scene = new Scene(this.getWorkspace(), noPage);
    const options = EditorOptions as unknown as {
      scaleBorderWidth?: unknown;
      scaleCorners?: unknown;
    };
    if (undefined !== options.scaleBorderWidth)
      (scene as unknown as { setBorderScale(v: unknown): void }).setBorderScale(
        options.scaleBorderWidth,
      );
    if (undefined !== options.scaleCorners)
      (scene as unknown as { setCornersScale(v: unknown): void }).setCornersScale(
        options.scaleCorners,
      );
    return scene;
  }

  private _newDocumentDialogInstance(): NewDocumentDialogLike | null {
    if (!this._newDocumentDialog) {
      const Dialog = lateExport<new () => NewDocumentDialogLike>(
        "welcome/welcome-screen.ts",
        "WelcomeScreen",
      );
      this._newDocumentDialog = Dialog ? new Dialog() : null;
    }
    return this._newDocumentDialog;
  }

  createNewDocumentDialog(): void {
    this._newDocumentDialog = null;
    this._newDocumentDialogInstance();
  }

  /** The welcome screen, unless one is open already. */
  openNewDocumentDialog(options?: unknown): void {
    const dialog = this._newDocumentDialogInstance();
    if (dialog && 0 === document.querySelectorAll(".g-new-document-dialog").length)
      dialog.open(options);
  }

  closeNewDocumentDialog(): void {
    if (this._newDocumentDialog) this._newDocumentDialog.close();
  }

  /** Adds a document (at `index`) and opens a window for it, which activates it. */
  addDocument(document: DesignerDocument, index?: number): void {
    if (undefined !== index) this._documents.splice(index, 0, document);
    else this._documents.push(document);
    useShellStore.setState({ documents: this._documents.slice() });
    if (this.hasEventListeners(DocumentEvent))
      this.trigger(new DocumentEvent(DocumentEvent.Type.Added, document));
    this.getWindows().addWindow(document, false, index);
  }

  notifyDocumentModified(document: DesignerDocument): void {
    bumpShellVersion();
    if (this.hasEventListeners(DocumentEvent))
      this.trigger(new DocumentEvent(DocumentEvent.Type.Modified, document, null));
  }

  isInitialized(): boolean {
    return this._initialized;
  }

  private _isNativeDesign(extension: string | null): boolean {
    const native = baseConfig.FILE_FORMATS.find((format) => format.default);
    return !!native && extension === native.ext.toUpperCase();
  }

  /**
   * Opens a storage item: an already open .gvdesign with the same id is
   * activated instead. GDocument decides which extensions it can load.
   */
  openDocument(item: DesignerStorageItem, index?: number): DesignerDocument | null | undefined {
    if (!this._initialized) return undefined;
    const extension = item.getExtension();
    if (this._isNativeDesign(extension)) {
      const id = item.getUniqueId();
      if (null != id)
        for (const document of this._documents) {
          const stored = (
            document as unknown as {
              getStorageItem(): (DesignerStorageItem & { getVersionId?(): string | null }) | null;
            }
          ).getStorageItem();
          if (
            stored &&
            stored.getUniqueId() === id &&
            (!stored.getVersionId ||
              !item.getVersionId ||
              stored.getVersionId() === item.getVersionId())
          ) {
            this.activateDocument(document);
            return document;
          }
        }
    }
    return this._processOpenDocument(item, index);
  }

  /**
   * GDesigner.addToRecentFiles: the old code kept recent files for the
   * Electron runtime and for cloud and external items only; a browser
   * file item changed nothing.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  addToRecentFiles(_item: unknown): void {}

  openDocumentWithReload(
    item: DesignerStorageItem,
    index?: number,
  ): DesignerDocument | null | undefined {
    if (!this._initialized) return undefined;
    return this._processOpenDocument(item, index);
  }

  private _processOpenDocument(item: DesignerStorageItem, index?: number): DesignerDocument | null {
    const extension = item.getExtension();
    const document = this.createDocument(this._isNativeDesign(extension) ? item : null);
    const loadable = document as unknown as {
      isExtensionAvailableForLoading?(ext: string | null): boolean;
      fileExtension?: string | null;
    } | null;
    if (
      document &&
      loadable &&
      loadable.isExtensionAvailableForLoading &&
      loadable.isExtensionAvailableForLoading(extension)
    ) {
      this.addDocument(document, index);
      loadable.fileExtension = extension;
      if (document.load) document.load(item);
      this.trigger(new DocumentEvent(DocumentEvent.Type.Opened, document));
      return document;
    }
    const FileTypes = lateExport<{ ext: string; category?: string }[]>(
      "document/file-types.ts",
      "FileTypeList",
    );
    const isImage = !!(FileTypes || []).find(
      (type) =>
        type.ext.toUpperCase() === (extension || "").toUpperCase() && "image" === type.category,
    );
    systemDialog().alert(
      Locale.get(
        new LocaleKey(
          "GDocument",
          isImage ? "text.suggestion-open-image" : "text.unsupported-file-extension",
        ),
      ) as string,
    );
    return null;
  }

  /** Activates a document (and its window, unless `fromWindows` says the windows did it). */
  activateDocument(document: DesignerDocument | null, fromWindows?: boolean): void {
    if (document == this._activeDocument) return;
    if (this._activeDocument) {
      const previous = this._activeDocument;
      this._activeDocument = null;
      useShellStore.setState({ activeDocument: null });
      previous.deactivate();
      if (this.hasEventListeners(DocumentEvent))
        this.trigger(new DocumentEvent(DocumentEvent.Type.Deactivated, previous));
      if (previous.getActiveWindow() === this.getWindows().getActiveWindow())
        this.getWindows().activateWindow(null);
    }
    if (document) {
      this._activeDocument = document;
      useShellStore.setState({ activeDocument: document });
      if (!fromWindows) this.getWindows().activateWindow(document.getActiveWindow());
      document.activate();
      if (this.hasEventListeners(DocumentEvent))
        this.trigger(new DocumentEvent(DocumentEvent.Type.Activated, document));
    }
  }

  replaceDocument(
    document: DesignerDocument,
    replacement: DesignerDocument,
    force?: boolean,
  ): void {
    const index = this._documents.indexOf(document);
    if (index < 0) return;
    this.addDocument(replacement, index);
    this.removeDocument(document, null, force);
  }

  /**
   * Closes a document: its windows one by one (each may ask to save), then
   * the document itself. The last one closed opens the welcome screen.
   */
  removeDocument(document: DesignerDocument, done?: (() => void) | null, force?: boolean): void {
    const index = this._documents.indexOf(document);
    if (index < 0) return;
    const windows = document.getWindows();
    if (windows.length) {
      const next = (): void => {
        if (windows.length > 0) this.getWindows().removeWindow(windows[0] as Window, next, force);
        else this.removeDocument(document, done);
      };
      next();
      return;
    }
    if (document === this.getActiveDocument()) this.activateDocument(null);
    document.release();
    this._documents.splice(this._documents.indexOf(document), 1);
    useShellStore.setState({ documents: this._documents.slice() });
    if (done) done();
    if (this.hasEventListeners(DocumentEvent))
      this.trigger(new DocumentEvent(DocumentEvent.Type.Removed, document));
    if (0 === this._documents.length) this.handleWelcomeScreenOpenWithUserPermissions();
  }

  /** The welcome screen, closable; closing it with a choice makes an infinite document. */
  handleWelcomeScreenOpenWithUserPermissions(): void {
    this.openNewDocumentDialog({
      closable: true,
      showCloudOptions: true,
      closeCallback: (create: boolean) => {
        if (create) this.newInfiniteDocument();
      },
    });
  }

  hasModifiedDocuments(): boolean {
    for (const document of this.getDocuments()) if (document.isModified()) return true;
    return false;
  }

  hasSynchronizingDocuments(): boolean {
    for (const document of this.getDocuments())
      if (document.isSynchronizing && document.isSynchronizing()) return true;
    return false;
  }

  hasDocuments(): boolean {
    return !!this.getDocuments().length;
  }

  isActiveDocument(document: unknown): boolean {
    const active = this.getActiveDocument();
    if (
      !active ||
      !document ||
      (this._documents.indexOf(document as DesignerDocument) < 0 && document !== active)
    )
      return false;
    const other = document as DesignerDocument;
    return (
      active === other ||
      !(!active.getId || !active.getId() || active.getId() !== (other.getId && other.getId()))
    );
  }

  /**
   * Asks to save a modified document before it closes: resolves true
   * (close without saving), false (save first) or rejects with
   * SaveCancelled.
   */
  canUnloadDocument(
    document: DesignerDocument,
    { changeActiveDocument = true }: { changeActiveDocument?: boolean } = {},
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!document.isModified() && !(document.isSynchronizing && document.isSynchronizing()))
        return resolve(true);
      if (changeActiveDocument && this.getActiveDocument() !== document)
        this.activateDocument(document);
      if (!this.canExecuteAction(SAVE_ACTION_ID, [document])) resolve(true);
      const dialog = systemDialog() as unknown as {
        advanced?(options: unknown): void;
      };
      const cancelled = { documentStatus: DocumentStatus.SaveCancelled };
      if (!dialog.advanced) {
        resolve(true);
        return undefined;
      }
      dialog.advanced({
        title: (
          Locale.get(new LocaleKey("GCommonNames", "text.document-modified")) as string
        ).replace("%title", document.getTitle()),
        closeCallback: (closed: boolean) => {
          if (closed) reject(cancelled);
        },
        buttons: [
          {
            label: Locale.get(new LocaleKey("GCommonNames", "text.dont-save")),
            onclick: () => resolve(true),
            closeOnClick: true,
            position: "left",
            shortcut: "n",
          },
          {
            label: Locale.get(new LocaleKey("GCommonNames", "text.cancel")),
            onclick: () => reject(cancelled),
            closeOnClick: true,
            shortcut: "esc",
          },
          {
            label: (Locale.get(new LocaleKey("GCommonNames", "text.save")) as string) + "...",
            onclick: () => resolve(false),
            // The old code passed the key constant instead of a list, which
            // gives an empty combo (see "The save button of the close prompt
            // has no shortcut" in QUESTIONS.md).
            shortcut: "",
            highlighted: true,
            closeOnClick: true,
          },
        ],
      });
      return undefined;
    });
  }

  /** Asks about every modified document in turn; rejects when one save is cancelled. */
  handleUnsavedDocuments(): Promise<void> {
    if (!this.hasModifiedDocuments()) return Promise.resolve();
    return this.getDocuments()
      .filter((document) => document.isModified())
      .reduce(
        (previous, document) =>
          previous.then(
            () =>
              new Promise<void>((resolve, reject) => {
                this.canUnloadDocument(document)
                  .then((canUnload) => {
                    if (canUnload) resolve();
                    else
                      this.executeAction(
                        SAVE_ACTION_ID,
                        [
                          document,
                          (result: { documentStatus?: number | null } = {}) => {
                            const status = result.documentStatus ?? null;
                            if (status && status === DocumentStatus.SaveCancelled) reject(result);
                            else resolve();
                          },
                        ],
                        "unsavedhandler",
                      );
                  })
                  .catch((error: unknown) => reject(error));
              }),
          ),
        Promise.resolve(),
      );
  }

  // -------------------------------------------------------------------------
  // Touch

  setOpenSansDefaultFont(): void {
    const fonts = this._workspace.getFontManager() as unknown as {
      setDefaultFont(font: unknown): void;
      getFont(family: string, style: unknown, weight: unknown): unknown;
      setDefaultFontStyles(styles: unknown[]): void;
      setDefaultFontWeights(weights: number[]): void;
    };
    fonts.setDefaultFont(fonts.getFont("Open Sans", Font.Style.Normal, Font.Weight.Regular));
    fonts.setDefaultFontStyles([Font.Style.Normal, Font.Style.Italic]);
    fonts.setDefaultFontWeights([300, 400, 600, 700, 800]);
  }

  isTouchDevice(): boolean {
    const nav = navigator as unknown as { msMaxTouchPoints?: number; maxTouchPoints?: number };
    return (
      baseConfig.TOUCH_LAYOUT &&
      ("ontouchstart" in window || !!nav.msMaxTouchPoints || !!nav.maxTouchPoints)
    );
  }

  isTouchEnabled(): boolean {
    const container = containerOrNull();
    return (
      (!!container && container.getRuntime() === (Runtime.IPad as string)) ||
      (!!baseConfig.TOUCH_LAYOUT &&
        this.isEnabledProFeatures() &&
        !!this.getSetting("touch", false))
    );
  }

  setTouchEnabled(enabled: boolean): void {
    this.setSetting("touch", !!enabled);
  }

  // -------------------------------------------------------------------------
  // Boot

  /** The licence's body classes of the always-pro build (old _licenseChangedEvent). */
  preInit(): void {
    document.body.classList.toggle("pro-expired", false);
    document.body.classList.toggle("pro-license", true);
    document.body.classList.toggle("pro-legacy", false);
    document.body.classList.toggle("pro-subscription", true);
    document.body.classList.toggle("trial-expired", false);
    this._updateState();
  }

  /** Builds the shell and its parts, the action table and the menu, the tools' shortcuts. */
  init(): void {
    // Fonts: the providers and the default font (app-fonts-ui). The interim
    // src/parity/app/fonts.ts installs them on the shared workspace.
    (containerOrNull() as Container).registerFontProviders();
    EditorOptions.selectDoubleClickBehavior = "subselect";
    EditorOptions.coordinatesTooltip = true;
    EditorOptions.bboxPositionTooltip = false;
    EditorOptions.sizeTooltip = false;
    EditorOptions.angleTooltip = false;
    EditorOptions.showTooltips = true;
    (
      EditorOptions as unknown as { propertiesExcludedFromCopying: unknown }
    ).propertiesExcludedFromCopying = PageClip.PropertiesToExcludeFromCopying;
    EditorOptions.adaptiveResizeHandles = true;
    SkewHorizontalAnnotation.setIcon("assets/annotation/touch/skew-horizontal-handle.png");
    SkewVerticalAnnotation.setIcon("assets/annotation/touch/skew-vertical-handle.png");
    PreserveAspectRatioAnnotation.setIcon(
      "assets/annotation/touch/preserve-aspect-ratio-handle.png",
    );
    RotateAnnotation.setIcon("assets/annotation/touch/rotate-handle.png");
    void (containerOrNull() as Container)
      .getProperty("designer.settings.dimension.preserveratio")
      .then((value) => {
        const keep = value || false;
        EditorOptions.preserveAspectRatio = keep as boolean;
        (
          EditorOptions as unknown as { allowTextRatioPreservation: unknown }
        ).allowTextRatioPreservation = keep;
      });
    SceneOptions.scaleLabel = false;
    SceneOptions.defaultBorderPositionForLines = true;
    EditorPaintConfiguration.prototype.pageDecoration.shadow = 4;
    EditorPaintConfiguration.prototype.pageDecoration.shadowOffsetY = 2;
    EditorPaintConfiguration.prototype.pageDecoration.shadowBackground = "rgba(0,0,0,0.25)";
    void (containerOrNull() as Container)
      .getProperty("designer.settings.outline-view.enabled")
      .then((value) => {
        if (value)
          this.updateGEditorSceneConfigurationPaintMode(ScenePaintConfiguration.PaintMode.Outline);
      });
    GridGuide.MIN_CELL_SPACE = 5;
    const body = document.body;
    body.setAttribute("data-long-press-delay", String(baseConfig.LONG_PRESS_TIME_OUT));
    body.addEventListener("long-press", (event) => {
      const detail = (event as CustomEvent<{ clientX: number; clientY: number }>).detail;
      if (event.target) this._triggerContextMenu(event.target, detail.clientX, detail.clientY);
    });
    // GLongPressEvent started itself when its module loaded (once per page).
    startLongPressEvents();
    if (!Designer.shellBuilder) throw new Error("no shell builder (mount.tsx sets it)");
    const shell = Designer.shellBuilder(this);
    this._mainframe = shell.mainframe;
    this._frame = shell.frame;
    css(this._mainframe, "display", "none");
    const part = (layout: LayoutPart): HTMLElement => shell.parts[layout.id] as HTMLElement;
    this._windows = new Windows(part(Layout.Windows));
    this._info = new Info(part(Layout.Info));
    this._header = this._makePart<HeaderLike>("menus/header.ts", "Header", part(Layout.Header));
    this._toolbar = this._makePart<ToolbarLike>(
      "toolbar/toolbar.ts",
      "Toolbar",
      part(Layout.Toolbar),
    );
    this._banner = new HiddenPart(part(Layout.Banner));
    this._overlay = new HiddenPart(part(Layout.Overlay));
    this._footer = new Footer(part(Layout.Footer));
    this._panels = new Panels(part(Layout.Panels));
    const left = part(Layout.LeftSidebars);
    left.addEventListener("mousedown", () =>
      this._toggleSideBarAndAssistBarZIndex(true, false, false, false),
    );
    this._leftSidebars = new Sidebars(left, Sidebars.Orientation.Left, this._frame);
    const right = part(Layout.RightSidebars);
    right.addEventListener("mousedown", () =>
      this._toggleSideBarAndAssistBarZIndex(false, true, false, false),
    );
    this._rightSidebars = new Sidebars(right, Sidebars.Orientation.Right, this._frame);
    this._updateStyles(body);
    // The unsupported-browser notice: Chrome, Firefox and Edge on the desktop are supported.
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    window.addEventListener("resize", () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resizeTimer = null;
        this.relayout();
        setTimeout(() => {
          const active = this._windows && this._windows.getActiveWindow();
          if (active && active.getView()) (active.getView() as EditorWidget).invalidate(null, true);
        });
      }, 500);
    });
    const registry = appRegistry();
    let cloneIndex = -1;
    this._actions = registry.actions.map((action, index) => {
      if (action.getId() === NEW_WINDOW_ACTION_ID) cloneIndex = index;
      return action;
    });
    const ToggleSidebarAction = lateExport<new (sidebar: unknown) => Action>(
      "actions/view/toggle-sidebar-action.ts",
      "ToggleSidebarAction",
    );
    const toggles = ToggleSidebarAction
      ? registry.sidebars.map((sidebar) => new ToggleSidebarAction(sidebar))
      : [];
    // Array.prototype.splice with -1 inserts before the last action when
    // there is no new-window action, as the old apply call did.
    this._actions.splice(cloneIndex, 0, ...toggles);
    this._createMainMenu();
    if (registry.tools) {
      const down = (entry: (typeof registry.tools)[number]) => () =>
        !(!this.isEnabledProFeatures(entry.feature) && entry.pro) &&
        !!this.canActivateTool(entry.tool, true) &&
        this.getToolManager().tempToolKeyActivate(entry.tool);
      const up = (entry: (typeof registry.tools)[number]) => () =>
        !this.isEnabledProFeatures(entry.feature) && entry.pro
          ? false
          : this.getToolManager().tempToolKeyRelease(entry.tool, 450);
      for (const entry of registry.tools) {
        if (entry.key || entry.shortcuts) {
          const onDown = down(entry);
          const onUp = up(entry);
          if (entry.key) this.registerShortcut([entry.key], onDown, false, onUp);
          if (Array.isArray(entry.shortcuts))
            entry.shortcuts.forEach((keys) => this.registerShortcut(keys, onDown, false, onUp));
        }
      }
      const first = registry.tools[0];
      if (first) this.getToolManager().activateTool(first.tool);
      this.registerShortcut(["Q"], () => {
        const manager = this.getToolManager();
        if (!(manager.getActiveTool() && manager.getActiveTool() instanceof SelectTool))
          manager.activateTool(PointerTool);
        const active = manager.getActiveTool();
        if (active instanceof SelectTool && active.getEditMode() !== SelectTool.EditMode.Transform)
          active.setEditMode(SelectTool.EditMode.Transform);
        return true;
      });
    }
    this._info.init();
    this._header.init();
    this._toolbar.init();
    this._panels.init();
    this._footer.init();
    this._leftSidebars.init();
    this._rightSidebars.init();
    this._windows.init();
    this._banner.init();
    this._overlay.init();
    this._leftSidebars.setActiveSidebar(OUTLINE_SIDEBAR_ID);
    this._rightSidebars.setActiveSidebar(SidebarsIds.GInspectorSidebar);
    this.setPartVisible(Layout.Panels, false);
    this.setPartVisible(Layout.Info, false);
    css(this._mainframe, "display", "");
    // GColor.setCMYKProfile("USWebCoatedSWOPv2", "assets/data/icc/") ran here. The
    // interim src/parity/g/engine-color.ts still makes that call when it loads
    // (before boot); a second call while that request runs would fetch the
    // file twice, so until that call goes the designer leaves it to the hook.
    if (!Color.currentCMYKProfile && Designer.loadsCmykProfile)
      Color.setCMYKProfile("USWebCoatedSWOPv2", "assets/data/icc/");
    this._initialized = true;
    useShellStore.setState({ initialized: true });
    this._windows.addEventListener(WindowEvent, this._windowEvent, this);
    this._leftSidebars.addEventListener(SidebarEvent, this._sidebarEvent, this);
    this._rightSidebars.addEventListener(SidebarEvent, this._sidebarEvent, this);
    const ContextMenu = lateExport<new (element: HTMLElement) => ContextMenuLike>(
      "menus/context-menu.ts",
      "ContextMenu",
    );
    this._contextMenu = ContextMenu ? new ContextMenu(part(Layout.Windows)) : null;
    void this._updateTitle({ saveToSessionHistory: false });
    this.getCursorManager().init();
    this._updateLayout();
    requestAnimationFrame(() => this.relayout());
    this._updateState();
  }

  private _makePart<T extends ShellPart>(path: string, name: string, element: HTMLElement): T {
    const PartClass = lateExport<new (element: HTMLElement) => T>(path, name);
    return PartClass ? new PartClass(element) : (new PendingPart(element) as unknown as T);
  }

  /** Body classes for the browser, the hardware and the operating system. */
  private _updateStyles(body: HTMLElement): void {
    switch (Platform.webBrowser) {
      case WebBrowser.Edge:
        body.classList.add("g-edge");
        break;
      case WebBrowser.Opera:
        body.classList.add("g-opera");
        break;
      case WebBrowser.Chrome:
        body.classList.add("g-chrome");
        break;
      case WebBrowser.Firefox:
        body.classList.add("g-firefox");
        break;
      case WebBrowser.Safari:
        body.classList.add("g-safari");
        break;
      case WebBrowser.MSIE:
        body.classList.add("g-msie");
        break;
    }
    switch (System.hardware) {
      case Hardware.Desktop:
        body.classList.add("g-desktop");
        break;
      case Hardware.Tablet:
        body.classList.add("g-tablet");
        break;
      case Hardware.Phone:
        body.classList.add("g-phone");
        break;
    }
    switch (System.operatingSystem) {
      case OperatingSystem.Unix:
        body.classList.add("g-os-unix");
        break;
      case OperatingSystem.Windows:
        body.classList.add("g-os-windows");
        break;
      case OperatingSystem.OSX_IOS:
        body.classList.add("g-os-osx_ios");
        break;
    }
    const container = containerOrNull();
    if (container && container.getRuntime() === (Runtime.IPad as string))
      body.classList.add("g-ipad");
  }

  /** Brings the touch sidebars and the assistant bar to the front (touch layout only). */
  private _toggleSideBarAndAssistBarZIndex(
    left: boolean,
    right: boolean,
    assistant: boolean,
    notifications?: boolean,
  ): void {
    if (!this.isTouchEnabled()) return;
    this.getLeftSidebars().getHtmlElement().classList.toggle("bring-to-front", left);
    this.getRightSidebars().getHtmlElement().classList.toggle("bring-to-front", right);
    void assistant;
    if (undefined !== notifications)
      for (const panel of document.querySelectorAll(".g-notification-panel"))
        panel.classList.toggle("bring-to-front", notifications);
  }

  sendSideBarAndAssistBarToBack(): void {
    this._toggleSideBarAndAssistBarZIndex(false, false, false);
  }

  /**
   * Restores the stored settings (adding the missing defaults, one
   * restoring event per key) and the global swatches.
   */
  start(): Promise<unknown> {
    const container = containerOrNull() as Container;
    return Promise.all([
      container.getProperty(SETTINGS_PROPERTY).then((stored) => {
        const settings = ((stored as Settings | null) || {}) as Settings;
        for (const key of Object.keys(this._settings))
          if (!Object.prototype.hasOwnProperty.call(settings, key))
            settings[key] = this._settings[key];
        this._settings = settings;
        this._settingsLoaded = true;
        publishSettings(this._settings, true);
        for (const key of Object.keys(this._settings))
          this.trigger(new SettingChangedEvent(key, undefined, this._settings[key], true));
      }),
      container.getProperty("swatches").then((stored) => {
        this._swatches.global = [];
        this._swatches["global-linear-gradient"] = [];
        this._swatches["global-radial-gradient"] = [];
        this._swatches["global-angular-gradient"] = [];
        this._swatches["global-texture-pattern"] = [];
        this._swatches["global-noise-pattern"] = [];
        const list = stored as string[] | null;
        if (list) {
          for (const entry of list) {
            const node = Node.deserialize(entry) || Pattern.deserialize(entry);
            const swatch = node instanceof Swatch ? node : new Swatch(node as Pattern | null);
            this._addGlobalSwatch(swatch);
          }
        }
        const SwatchesChangedEvent = lateExport<new (scope: string) => Event>(
          "color/swatches-changed-event.ts",
          "SwatchesChangedEvent",
        );
        if (SwatchesChangedEvent) this.trigger(new SwatchesChangedEvent("global"));
      }),
    ]);
  }

  /** Lays out the parts around the windows and gives the windows the view offset. */
  relayout(): void {
    if (!this._initialized) return;
    let left = 0;
    let right = 0;
    const top = this._getTopOffset(left, right);
    left = this._getLeftOffset(top);
    right = this._getRightOffset(top);
    const bottom = this._getBottomOffset(left, right);
    const touch = this.isTouchEnabled();
    (this._header as HeaderLike).relayout();
    (this._toolbar as ToolbarLike).relayout();
    (this._panels as Panels).relayout();
    (this._footer as Footer).relayout();
    this.getLeftSidebars().relayout();
    this.getRightSidebars().relayout();
    this.getWindows().relayout([touch ? 0 : left, top, touch ? 0 : right, bottom]);
  }

  private _getTopOffset(left: number, right: number): number {
    let top = 0;
    const info = this.getPart(Layout.Info) as HTMLElement;
    top += this.isPartVisible(Layout.Info) ? outerHeight(info) : 0;
    const header = this.getPart(Layout.Header) as HTMLElement;
    css(header, "top", top.toString() + "px");
    top += this.isPartVisible(Layout.Header) ? outerHeight(header) : 0;
    css(this.getPart(Layout.Overlay) as HTMLElement, "top", top.toString() + "px");
    const toolbar = this.getPart(Layout.Toolbar) as HTMLElement;
    css(toolbar, "left", left.toString() + "px");
    css(toolbar, "top", top.toString() + "px");
    css(toolbar, "right", right.toString() + "px");
    top += this.isPartVisible(Layout.Toolbar) ? outerHeight(toolbar) : 0;
    const banner = this.getPart(Layout.Banner) as HTMLElement;
    css(banner, "top", top.toString() + "px");
    top += this.isPartVisible(Layout.Banner) ? outerHeight(banner) : 0;
    return top;
  }

  private _sideOffset(sidebars: Sidebars, layout: LayoutPart, top: number): number {
    const active = sidebars.getSidebar(sidebars.getActiveSidebar());
    const minimum = active ? active.getMinimumWidth() : 0;
    const element = this.getPart(layout) as HTMLElement;
    const visible = this.isPartVisible(layout);
    if (outerWidth(element) < minimum && visible) setOuterWidth(element, minimum);
    css(element, "top", top.toString() + "px");
    setHeight(element, height(this._mainframe as HTMLElement) - top);
    return visible ? outerWidth(element) : 0;
  }

  private _getLeftOffset(top: number): number {
    return this._sideOffset(this.getLeftSidebars(), Layout.LeftSidebars, top);
  }

  private _getRightOffset(top: number): number {
    return this._sideOffset(this.getRightSidebars(), Layout.RightSidebars, top);
  }

  private _getBottomOffset(left: number, right: number): number {
    let bottom = 0;
    const panels = this.getPart(Layout.Panels) as HTMLElement;
    css(panels, "left", left.toString() + "px");
    css(panels, "width", (width(this._mainframe as HTMLElement) - left - right).toString() + "px");
    const footer = this.getPart(Layout.Footer) as HTMLElement;
    css(footer, "left", left.toString() + "px");
    css(footer, "width", (width(this._mainframe as HTMLElement) - left - right).toString() + "px");
    bottom += this.isPartVisible(Layout.Panels) ? outerHeight(panels) : 0;
    bottom += this.isPartVisible(Layout.Footer) ? outerHeight(footer) : 0;
    return bottom;
  }

  /** Whether a page point is over the canvas (not under a part). */
  positionIsOnCanvas(x: number, y: number): boolean {
    let left = 0;
    let right = 0;
    const top = this._getTopOffset(left, right);
    left = this._getLeftOffset(top);
    right = this._getRightOffset(top);
    const bottom = this._getBottomOffset(left, right);
    return x > left && x < window.innerWidth - right && y > top && y < window.innerHeight - bottom;
  }

  updateGEditorSceneConfigurationPaintMode(mode: string): void {
    const modes: string[] = [
      ScenePaintConfiguration.PaintMode.Full,
      ScenePaintConfiguration.PaintMode.Outline,
      ScenePaintConfiguration.PaintMode.Fast,
    ];
    if (modes.indexOf(mode) < 0) return;
    (EditorPaintConfiguration.prototype as unknown as { paintMode: string }).paintMode = mode;
  }

  /** The paint mode of the active view now, a repaint without cached tiles on the next frame. */
  setPaintMode(mode: string): void {
    const view = this.getActiveView();
    if (!view) return;
    view.getViewConfiguration().paintMode = mode;
    Platform.scheduleFrame(() => {
      view.invalidateAndResetCache(null);
    });
  }

  // -------------------------------------------------------------------------
  // Event handlers

  private _documentKeyDown(event: KeyboardEvent): void {
    const active = document.activeElement as HTMLElement | null;
    if (active && isButton(active) && (13 == event.keyCode || 32 == event.keyCode)) {
      event.preventDefault();
      active.blur();
    }
    if (!this._windows) return;
    const focused = document.activeElement as HTMLElement | null;
    const window = this._windows.getActiveWindow();
    const numberInput =
      !!focused &&
      focused.tagName === "INPUT" &&
      "number" === focused.getAttribute("type") &&
      !focused.classList.contains("g-disabled") &&
      "true" !== focused.getAttribute("disabled");
    if (!window || !window.getView() || (focused && (isEditable(focused) || numberInput))) return;
    (window.getView() as EditorWidget).focus();
  }

  private _workspaceResolveUrlEvent(event: unknown): void {
    const resolveImage = lateExport<(event: unknown, document: unknown) => void>(
      "document/document-images.ts",
      "resolveImage",
    );
    if (resolveImage) resolveImage(event, this.getActiveDocument());
  }

  private _documentEvent(event: DocumentEvent): void {
    switch (event.type) {
      case DocumentEvent.Type.StorageItemUpdated:
        bumpShellVersion();
        void this._updateTitle();
        break;
      case DocumentEvent.Type.Added:
        if (this._newDocumentDialog) this._newDocumentDialog.close();
        break;
    }
  }

  private _windowEvent(event: WindowEvent): void {
    switch (event.type) {
      case WindowEvent.Type.Added:
      case WindowEvent.Type.Removed:
        void this._updateTitle();
        break;
      case WindowEvent.Type.Activated: {
        if (1 === this.getWindows().getWindows().length) this._updateTheme();
        const view = event.window.getView();
        this.getToolManager().setView(view);
        this.getLeftSidebars().setView(view);
        this.getRightSidebars().setView(view);
        void this._updateTitle();
        if (view) this._editorTouchHandler.activate(view.getHtmlElement());
        break;
      }
      case WindowEvent.Type.Deactivated: {
        const view = event.window.getView();
        if (view) this._editorTouchHandler.deactivate(view.getHtmlElement());
        this.getToolManager().setView(null);
        this.getLeftSidebars().setView(null);
        this.getRightSidebars().setView(null);
        void this._updateTitle();
        break;
      }
    }
  }

  private _sidebarEvent(event: SidebarEvent): void {
    if (event.type === SidebarEvent.Type.Activated) this.relayout();
  }

  private _settingChangedEvent(event: SettingChangedEvent): void {
    switch (event.key) {
      case "touch":
        if (event.restoring && event.newValue && !this.isTouchEnabled())
          this.setTouchEnabled(false);
        else this._updateLayout();
        this._updateEditorOptions();
        break;
      case "theme":
        this._setTheme(event.newValue);
        break;
      case "snap_disabled":
        Guides.options.disabled = event.newValue as boolean;
        break;
      case "snap_zones":
        Guides.options.zones = event.newValue as boolean;
        break;
      case "snap_guides":
        Guides.options.guides = event.newValue as string[];
        break;
      case "highlight_on_hover":
        EditorOptions.highlightOnHover = event.newValue as boolean;
        break;
      case "dont_store_textpath":
        Text.dontStorePaths = event.newValue as boolean;
        break;
      case "decimals_num":
        Scene.decimalsNum = event.newValue as number | null;
        break;
      case "enable_steps_debug":
        EditorOptions.debugTransactions = event.newValue as boolean;
        break;
      case "enable_cache":
        // Only with the gdb_loaddesign debug hook, which no build defines.
        break;
      case "ui_toolbar_alignment":
        if (this._frame) this._frame.classList.toggle("ui-toolbar-center", !event.newValue);
        break;
    }
  }

  private _updateEditorOptions(): void {
    if (this.isTouchEnabled()) this._applyTouchEditorOptions();
    else this._applyDefaultEditorOptions();
    const view = this.getActiveView();
    if (view) Platform.scheduleFrame(() => view.invalidate(null, true));
  }

  /** The handle look of the touch layout. */
  _applyTouchEditorOptions(): void {
    applyTouchEditorOptions();
  }

  /** The handle look of the desktop layout. */
  _applyDefaultEditorOptions(): void {
    applyDefaultEditorOptions();
  }

  /** The touch class on body, the default sidebars, then a relayout. */
  private _updateLayout(): void {
    document.body.classList.toggle("g-touch", this.isTouchEnabled());
    if (!this.isTouchEnabled()) {
      if (this._leftSidebars)
        this._leftSidebars.getHtmlElement().classList.toggle("bring-to-front", false);
      if (this._rightSidebars)
        this._rightSidebars.getHtmlElement().classList.toggle("bring-to-front", false);
    }
    if (this._initialized) {
      if (!this.getLeftSidebars().getActiveSidebar())
        this.getLeftSidebars().setActiveSidebar(OUTLINE_SIDEBAR_ID);
      if (!this.getRightSidebars().getActiveSidebar())
        this.getRightSidebars().setActiveSidebar(SidebarsIds.GInspectorSidebar);
      this.getLeftSidebars().setActiveTouchTool(null);
      this.getRightSidebars().setActiveTouchTool(null);
      // The assistant bar (virtual key bar) comes with app-touch-ui.
    }
    this.relayout();
  }

  private _setTheme(value: unknown): void {
    if (!this._windows) return;
    setTheme(value, this._windows, () => this.relayout());
  }

  private _updateTheme(): void {
    updateTheme(this.getWindows(), () => this.relayout());
  }

  /** The window title: "<active window title> - Gravit Designer", or the app name. */
  async _updateTitle({
    saveToSessionHistory = true,
  }: { saveToSessionHistory?: boolean } = {}): Promise<void> {
    let title = "";
    const name = baseConfig.DESIGNER.TITLE;
    const container = containerOrNull();
    const browser =
      !!container &&
      (container.getRuntime() === (Runtime.Browser as string) ||
        container.getRuntime() === (Runtime.PWA as string));
    if (browser && saveToSessionHistory) window.history.pushState(null, "Title", "/");
    const active = this._windows ? this._windows.getActiveWindow() : null;
    if (active) title = active.getTitle() + " - ";
    bumpShellVersion();
    title += name;
    document.title = decodeHtml(title);
  }

  addNotification(notification: unknown, options?: unknown): void {
    const NotificationEvent = lateExport<new (n: unknown, o?: unknown) => Event>(
      "dialogs/notification-event.ts",
      "NotificationEvent",
    );
    if (NotificationEvent && this.hasEventListeners(NotificationEvent as EventClass))
      this.trigger(new NotificationEvent(notification, options));
  }

  isGravitIME(element: Element | null): boolean {
    return !!element && element.className === SceneWidget.GRAVIT_IME;
  }

  getCanvasWidth(): number {
    const view = this.getWindows().getActiveWindow()?.getView() as EditorWidget;
    const rightPart = document.getElementById("right-sidebars") as HTMLElement;
    const leftPart = document.getElementById("left-sidebars") as HTMLElement;
    return (
      view.getWidth() -
      (isDisplayed(rightPart) ? width(rightPart) : 0) -
      (isDisplayed(leftPart) ? width(leftPart) : 0)
    );
  }

  getCanvasHeight(): number {
    const view = this.getWindows().getActiveWindow()?.getView() as EditorWidget;
    return (
      view.getHeight() -
      (this.getHeader() as HeaderLike).getHeight() -
      (this.getToolbar() as ToolbarLike).getHeight()
    );
  }

  getCanvasCenter(): Point {
    const dpi = PaintCanvas.getScreenDPI();
    let x = this.getCanvasWidth() / 2;
    let y = this.getCanvasHeight() / 2;
    const leftPart = document.getElementById("left-sidebars") as HTMLElement;
    x += isDisplayed(leftPart) ? width(leftPart) : 0;
    y +=
      (this.getHeader() as HeaderLike).getHeight() + (this.getToolbar() as ToolbarLike).getHeight();
    return new Point(x * dpi, y * dpi);
  }

  /** Zooms the view at the selection's center, or the canvas center without one. */
  zoomAtViewCenter(view: EditorWidget, zoom: number): void {
    let noSelection = false;
    let box: Rect | null = null;
    const document = this.getActiveDocument();
    const editor = document ? document.getEditor() : null;
    if (!document || !editor || !(box = editor.getSelectionBBox() as Rect | null)) {
      noSelection = true;
      const scene = view.getScene();
      if (scene) box = scene.getPaintBBox();
    }
    let center = box && !box.isEmpty() ? box.getSide(Rect.Side.CENTER) : new Point(0, 0);
    if (noSelection && !view.getViewConfiguration().multiPageView) {
      const mapped = view.getViewTransform().mapPoint(this.getCanvasCenter());
      if (!isNaN(mapped.getX()) && !isNaN(mapped.getY())) center = mapped;
    }
    if (view.getViewConfiguration().multiPageView) {
      const page = (view.getScene() as Scene).getActivePage();
      if (page) center = center.add(page.getPosition(true));
    }
    view.zoomAtCenter(center, zoom);
  }

  // -------------------------------------------------------------------------
  // Ready state, versions, licence answers

  private _applicationStatusEvent(event: ApplicationStatusEvent): void {
    if (event.status === ApplicationStatusEvent.Status.Ready) {
      this._ready = true;
      const callbacks = this._readyCallbacks.splice(0);
      for (const callback of callbacks) callback();
    }
  }

  /** Runs `callback` once the app is ready (now, when it is already). */
  executeWhenReady(callback: () => void): void {
    if (this._ready) callback();
    else this._readyCallbacks.push(callback);
  }

  isReady(): boolean {
    return this._ready;
  }

  /** Analytics are dropped; the calls stay so callers need no change. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  stats(..._args: unknown[]): void {}

  isEnabledSubscriptions(): boolean {
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  isEnabledProFeatures(_feature?: string): boolean {
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  isProTooltipNeeded(_feature?: string): boolean {
    return false;
  }

  /** The licence of the local build: everything allowed. */
  getLicense(): { canAccessFreemium(): boolean; isPro(): boolean; isExpired(): boolean } {
    return { canAccessFreemium: () => true, isPro: () => true, isExpired: () => false };
  }

  now(): number {
    return Date.now();
  }

  getOpacityIncrement(): number {
    return 1;
  }

  getTabByDocument(document: DesignerDocument): unknown {
    const header = this.getHeader();
    return header && header.getWindowTab
      ? header.getWindowTab(this.getWindows().getWindow(document))
      : null;
  }

  draggableItemIsDragging(): boolean {
    return this._draggableItemIsDragging;
  }

  setItemDraggingState(state: boolean): void {
    this._draggableItemIsDragging = state;
  }

  setVersion(version: string): void {
    this._version = version;
  }

  getVersion(): string | null {
    return this._version;
  }

  setVersionFriendlyName(name: string): void {
    this._versionFriendlyName = name;
  }

  getVersionFriendlyName(): string | null {
    return this._versionFriendlyName;
  }

  setCommitSHA(sha: string): void {
    this._commitSHA = sha;
  }

  getCommitSHA(): string | null {
    return this._commitSHA;
  }

  setBuildNum(build: string): void {
    this._buildNum = build;
  }

  getBuildNum(): string | null {
    return this._buildNum;
  }

  setIsBeta(beta: boolean): void {
    this._isBeta = beta;
  }

  isBeta(): boolean | null {
    return this._isBeta;
  }

  setEnv(env: string): void {
    this._env = env;
  }

  getEnv(): string | null {
    return this._env;
  }

  getWebURL(): string {
    return location.origin;
  }

  /** The licence state reaches the toolbar, sidebars, menu and tabs (all enabled here). */
  private _updateState(): void {
    const free = this.getLicense().canAccessFreemium();
    if (this._toolbar && this._toolbar.setEnabled) this._toolbar.setEnabled(free);
    if (this._leftSidebars) this._leftSidebars.setEnabled(this._leftSidebars, free);
    if (this._rightSidebars) this._rightSidebars.setEnabled(this._rightSidebars, free);
    if (this._banner) this._banner.setEnabled(free);
    if (this._overlay) this._overlay.setEnabled(free);
    if (this._mainMenu && this._mainMenu.setEnabled) this._mainMenu.setEnabled(free);
    if (this._header && this._header.setWindowTabEnable) this._header.setWindowTabEnable(free);
    this.relayout();
  }

  /**
   * The context menu where a long press happened: the old code triggered
   * jQuery's "contextmenu" on the target, which only jQuery handlers saw.
   * The menus cluster's ContextMenu listens for it through this hook.
   */
  static contextMenuTrigger:
    ((target: globalThis.EventTarget, clientX: number, clientY: number) => void) | null = null;

  private _triggerContextMenu(
    target: globalThis.EventTarget,
    clientX: number,
    clientY: number,
  ): void {
    if (Designer.contextMenuTrigger) Designer.contextMenuTrigger(target, clientX, clientY);
  }

  /** A style's preview bitmaps, cached by its reference id. */
  getStylePreview(style: Node, text?: boolean): string | null {
    const cached =
      this._stylesPreview[(style as unknown as { getReferenceId(): string }).getReferenceId()];
    if (cached) return text ? cached.textBitmap : cached.bitmap;
    return null;
  }

  override toString(): string {
    return "[Object GDesigner]";
  }
}

/** GSaveAction.ID (module 447). */
const SAVE_ACTION_ID = "file.save";
/** GNewWindowAction.ID (module 1296): the sidebar toggles go in before it. */
const NEW_WINDOW_ACTION_ID = "view.clone";
/** GOutlineSidebar's id (module 1260), the left sidebar shown at start. */
const OUTLINE_SIDEBAR_ID = SidebarsIds.GOutlineSidebar;

/** jQuery's `:editable`-ish test of the old handlers: form fields and contenteditable. */
function isEditable(target: globalThis.EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element || !element.tagName) return false;
  return (
    element.isContentEditable ||
    "INPUT" === element.tagName ||
    "TEXTAREA" === element.tagName ||
    "SELECT" === element.tagName
  );
}

/** jQuery's `:button`: a button element or an input of type button. */
function isButton(element: HTMLElement): boolean {
  return (
    "BUTTON" === element.tagName ||
    ("INPUT" === element.tagName && "button" === (element as HTMLInputElement).type)
  );
}

/** GUtil decodeHTML: the text of an HTML string. */
function decodeHtml(text: string): string {
  const area = document.createElement("textarea");
  area.innerHTML = text;
  return area.value;
}

/** A node's property (nodes with the properties mixin). */
function propertyOf(node: Node, name: string): unknown {
  return (node as unknown as { getProperty(name: string): unknown }).getProperty(name);
}

/** GPattern.serialize for the swatch scopes. */
function serializePattern(pattern: unknown): string {
  return Pattern.serialize(pattern as Pattern | null) || "";
}

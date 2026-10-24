// Old: designer.browser.dev.js module 1500 (GHeader).
/**
 * The #header part: the menu bar, an empty spacer section, the document
 * tabs, the busy indicator. A tab shows its window's title (with a "*"
 * while modified) and a close button; a click activates the window, a
 * right click opens the tab menu (rename, save, export, duplicate, close
 * others, close all) in an overlay below the tab.
 *
 * Like the menus, the header builds its content as plain DOM (see
 * menu.ts): the tab rearranging (shell/tabs-rearrange.ts) moves the tab
 * elements and adds its own, and the tab menu is an overlay around a
 * Menu's element.
 *
 * Dropped with the cloud and the licence: the "try out Pro" section, the
 * login section and user info, the cloud icons and the sync status of
 * cloud files (nothing local triggers them), the Share, Open Shared File,
 * Version History and cloud Save As entries' behaviour.
 */
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import type { EditorWorkspace } from "../../editor/editor-workspace.ts";
import { DocumentEvent } from "../document/document-event.ts";
import { DocumentStatus } from "../document/document-status.ts";
import { DocumentStatusEvent } from "../document/document-status-event.ts";
import { Overlay } from "../dialogs/dialog-container.ts";
import { config } from "../config.ts";
import type { DesignerDocument } from "../shell/designer.ts";
import { css, outerWidth } from "../shell/dom.ts";
import { designer } from "../shell/globals.ts";
import { lateExport, systemDialog } from "../shell/late.ts";
import { SettingChangedEvent } from "../shell/setting-changed-event.ts";
import type { Window } from "../shell/window.ts";
import { WindowEvent } from "../shell/windows.ts";
import type { Action } from "../actions/action.ts";
import { applicationManager } from "../actions/host.ts";
import { Key, type KeyValue } from "../../engine/core/key.ts";
import { Menu } from "./menu.ts";
import { MenuBar } from "./menu-bar.ts";
import { MenuItem } from "./menu-item.ts";

/** The title of a duplicated document: "name(1)", or the number in the parentheses plus one. */
const NUMBER_IN_PARENTHESES_AT_END = /\(\d+\)$/;
const NUMBER = /\d+/;

/** "name" becomes "name(1)", "name(4)" becomes "name(5)". */
export function duplicateTitle(title: string): string {
  if (new RegExp(NUMBER_IN_PARENTHESES_AT_END).test(title)) {
    const match = title.match(NUMBER_IN_PARENTHESES_AT_END) as RegExpMatchArray;
    const number = parseInt(((match[0] as string).match(NUMBER) as RegExpMatchArray)[0] as string);
    return title.replace(NUMBER_IN_PARENTHESES_AT_END, "(".concat(String(number + 1), ")"));
  }
  return "".concat(title, "(1)");
}

/** The save action's id, title and shortcut (GSaveAction, module 447). */
const SAVE_ACTION_ID = "file.save";
const SAVE_TITLE = new LocaleKey("GSaveAction", "title");
const SAVE_SHORTCUT: readonly KeyValue[] = [Key.Constant.META, "S"];
/** GGravitCloudAction.ID + "." + Actions.SaveAs (dropped with the cloud). */
const CLOUD_SAVE_AS_ACTION_ID = "gravit-cloud.save-as";
/** GOpenSharedFileAction.ID and GVersionsHistoryAction.ID (dropped with the cloud). */
const OPEN_SHARED_FILE_ACTION_ID = "file.share.opensharedfile";
const VERSION_HISTORY_ACTION_ID = "gravit-versions-history";
/** GExportAction (module 861). */
const EXPORT_ACTION_ID = "file.export";
const EXPORT_TITLE = new LocaleKey("GExportAction", "title");
const EXPORT_SHORTCUT: readonly KeyValue[] = [Key.Constant.SHIFT, Key.Constant.META, "E"];

/** The tab rearranging of shell/tabs-rearrange.ts (module 1517, app-shell-storage). */
interface TabsRearrange {
  allowRearrangeTabs(header: HTMLElement): void;
  updateTabsInterface(): void;
  toggleRearrangeTabsVisibility(header: HTMLElement, visible: boolean): void;
}

function tabsRearrange(): Partial<TabsRearrange> {
  const get = <K extends keyof TabsRearrange>(name: K): TabsRearrange[K] | undefined =>
    lateExport<TabsRearrange[K]>("shell/tabs-rearrange.ts", name) || undefined;
  return {
    allowRearrangeTabs: get("allowRearrangeTabs"),
    updateTabsInterface: get("updateTabsInterface"),
    toggleRearrangeTabsVisibility: get("toggleRearrangeTabsVisibility"),
  };
}

/** The window each tab element shows ($(tab).data("window")). */
const tabWindows = new WeakMap<Element, Window>();

/** The window a tab element belongs to (for the tab rearranging). */
export function windowOfTab(tab: Element): Window | null {
  return tabWindows.get(tab) || null;
}

/** One entry of the tab menu. */
interface TabMenuEntry {
  title?: LocaleKey | string;
  shortcut?: readonly KeyValue[] | null;
  callback?: (this: Header, window: Window, tab: HTMLElement) => unknown;
  id?: string | (() => string);
  needsAction?: boolean;
  icon?: string | (() => string | null);
  isEnabled?: (window: Window) => boolean;
  isVisible?: ((window: Window) => boolean) | boolean;
  separator?: boolean;
}

/** The document's storage item as the header uses it. */
interface HeaderStorageItem {
  getExtension(): string | null;
  setFileName(name: string): void;
}

function storageItemOf(window: Window): HeaderStorageItem | null {
  return (
    window.getDocument() as unknown as { getStorageItem(): HeaderStorageItem | null }
  ).getStorageItem();
}

function closeWindows(windows: readonly Window[]): void {
  const all = designer().getWindows();
  for (let n = 0, count = windows.length; n < count; n++) all.removeWindow(windows[n] as Window);
}

const TAB_MENU: readonly TabMenuEntry[] = [
  {
    title: new LocaleKey("GFilesPanel", "action.rename"),
    shortcut: null,
    callback(window, tab) {
      // GExternalStorage files couldn't be renamed; that storage is dropped.
      this._renameTab(window, tab);
      return true;
    },
    isEnabled: () => applicationManager().isEditingEnabled(),
    isVisible: () => true,
  },
  { separator: true, isVisible: () => true },
  {
    title: SAVE_TITLE,
    shortcut: SAVE_SHORTCUT,
    id: SAVE_ACTION_ID,
    needsAction: true,
    icon: () => (designer().getAction(SAVE_ACTION_ID) as Action).getIcon(),
  },
  {
    title: new LocaleKey("GSaveAsAction", "title"),
    shortcut: [Key.Constant.SHIFT, Key.Constant.META, "S"],
    id: () => CLOUD_SAVE_AS_ACTION_ID,
    needsAction: true,
  },
  { separator: true },
  {
    // Sharing needed a cloud file, so the entry is always disabled; see
    // "The tab menu keeps a disabled Share entry" in QUESTIONS.md.
    title: new LocaleKey("GToolbar", "text.share"),
    shortcut: null,
    callback() {},
    isEnabled: () => false,
  },
  {
    title: new LocaleKey("GOpenSharedFileAction", "title"),
    id: () => OPEN_SHARED_FILE_ACTION_ID,
    needsAction: true,
  },
  {
    title: new LocaleKey("GVersionsHistoryAction", "title"),
    shortcut: null,
    id: VERSION_HISTORY_ACTION_ID,
    needsAction: true,
  },
  {
    title: EXPORT_TITLE,
    shortcut: EXPORT_SHORTCUT,
    icon: () => (designer().getAction(EXPORT_ACTION_ID) as Action).getGroupIcon(),
    id: EXPORT_ACTION_ID,
    needsAction: true,
  },
  {
    title: new LocaleKey("GHeader", "action.context-menu.duplicate"),
    shortcut: null,
    callback(window) {
      const document = window.getDocument() as unknown as {
        getScene(): { clone(options: null, workspace: EditorWorkspace): unknown };
        getFileFormatVersion(): unknown;
        getTitle(): string;
      };
      const DocumentClass = lateExport<
        new (scene: unknown) => DesignerDocument & {
          setFileFormatVersion(version: unknown): void;
          setTitle(title: string): void;
        }
      >("document/document.ts", "Document");
      if (!DocumentClass) return;
      const copy = new DocumentClass(document.getScene().clone(null, designer().getWorkspace()));
      if (document.getFileFormatVersion())
        copy.setFileFormatVersion(document.getFileFormatVersion());
      const newTitle = duplicateTitle(document.getTitle());
      const index = designer()
        .getDocuments()
        .indexOf(document as unknown as DesignerDocument);
      copy.setTitle(newTitle);
      designer().addDocument(copy, index + 1);
    },
    // GExternalStorage files couldn't be duplicated; that storage is dropped.
    isEnabled: () => applicationManager().isSavingAsEnabled(),
    icon: "gravit-icon-duplicate",
  },
  { separator: true },
  {
    title: new LocaleKey("GHeader", "action.context-menu.close-other"),
    shortcut: null,
    callback(window) {
      const others = designer()
        .getWindows()
        .getWindows()
        .slice()
        .filter((other) => other !== window);
      confirm(
        Locale.get(new LocaleKey("GHeader", "text.close-other-tabs-confirmation")) as string,
        (ok) => {
          if (ok) closeWindows(others);
        },
      );
    },
    isEnabled: (window) =>
      designer()
        .getWindows()
        .getWindows()
        .slice()
        .filter((other) => other !== window).length > 0,
  },
  {
    title: new LocaleKey("GHeader", "action.context-menu.close-all"),
    shortcut: null,
    callback() {
      confirm(
        Locale.get(new LocaleKey("GHeader", "text.close-all-tabs-confirmation")) as string,
        (ok) => {
          if (ok) closeWindows(designer().getWindows().getWindows().slice());
        },
      );
    },
    icon: "gravit-icon-close",
  },
];

/** SystemDialog.confirm(text, done, null, null, null, true, true). */
function confirm(text: string, done: (ok: boolean) => void): void {
  const dialog = systemDialog();
  if (dialog.confirm) dialog.confirm(text, done, null, null, null, true, true);
}

function div(...classes: string[]): HTMLDivElement {
  const element = document.createElement("div");
  if (classes.length) element.classList.add(...classes);
  return element;
}

export class Header {
  private readonly _htmlElement: HTMLElement;
  private readonly _menuBar: MenuBar;
  private _windows: HTMLElement | null = null;
  private _busy: HTMLElement | null = null;
  private _contextMenu: HTMLElement | null = null;
  private readonly _documentStatusEvent = (event: DocumentStatusEvent): void => {
    if (event.status === DocumentStatus.Loaded) this.updateWindowIcon(this._activeTab());
  };

  constructor(htmlElement: HTMLElement) {
    this._htmlElement = htmlElement;
    this._menuBar = new MenuBar(designer().getMainMenu());
    this._menuBar.__which = "menubar";
  }

  getMenuBar(): MenuBar {
    return this._menuBar;
  }

  init(): void {
    if (designer().isBeta()) {
      const beta = div();
      for (const [name, value] of [
        ["width", "40px"],
        ["background-color", "#29d029"],
        ["color", "#fff"],
        ["font", '400 1em "Helvetica Neue", Helvetica, Arial, sans-serif'],
        ["line-height", "1.54em"],
        ["text-align", "center"],
        ["border-radius", "4px"],
        ["margin-left", "12px"],
        ["margin-right", "-5px"],
        ["padding", "2px"],
      ] as const)
        css(beta, name, value);
      beta.textContent = "βETA";
      this._htmlElement.append(beta);
    }
    const menu = div("section", "menu");
    menu.append(this._menuBar._htmlElement);
    this._htmlElement.append(menu);
    // The persona bar (module 1502) is dropped with the account UI
    // (REMOVED.md DROP-003). Its empty section stays: the stylesheet gives
    // it flex-grow, which keeps the document tabs at the right end.
    this._htmlElement.append(div("section", "persona"));
    this._windows = div("section", "windows");
    this._windows.append(this._createWindows());
    this._htmlElement.append(this._windows);
    const rearrange = tabsRearrange();
    if (config.ALLOW_REARRANGE_TABS && rearrange.allowRearrangeTabs)
      rearrange.allowRearrangeTabs(this._htmlElement);
    this._busy = div("section", "busy");
    // The colours were a template placeholder the browser rejects; only
    // the valid declarations end up in the style.
    css(this._busy, "display", "none");
    css(this._busy, "color", "$(BRAND_COLOR}");
    const text = document.createElement("span");
    text.classList.add("txt");
    css(text, "margin-right", "4px");
    const spinner = document.createElement("span");
    for (const [name, value] of [
      ["border", "4px solid #f3f3f3"],
      ["border-top", "4px solid $(BRAND_COLOR}"],
      ["border-radius", "50%"],
      ["width", "6px"],
      ["height", "6px"],
      ["animation", "spin 2s linear infinite"],
    ] as const)
      css(spinner, name, value);
    this._busy.append(text, spinner);
    this._htmlElement.append(this._busy);
    designer().addEventListener(DocumentEvent, this._documentEvent, this);
    designer().addEventListener(SettingChangedEvent, this._settingChangedEvent, this);
    designer().getWindows().addEventListener(WindowEvent, this._windowEvent, this);
    this._updateViewBasedOnPermissions();
  }

  private _updateViewBasedOnPermissions(): void {
    // isDocumentTabManagementEnabled: always for local documents.
    const enabled = true;
    const tabs = this._tabsElement();
    if (tabs) css(tabs, "display", enabled ? "" : "none");
    const rearrange = tabsRearrange();
    if (rearrange.toggleRearrangeTabsVisibility)
      rearrange.toggleRearrangeTabsVisibility(this._htmlElement, enabled);
  }

  /** isInspectEnabled is always true for local documents, so the header is never "lone". */
  relayout(): void {
    this._htmlElement.classList.remove("lone");
  }

  private _tabsElement(): HTMLElement | null {
    return this._windows ? this._windows.querySelector<HTMLElement>(".tabs") : null;
  }

  private _tabs(): HTMLElement[] {
    return this._windows ? [...this._windows.querySelectorAll<HTMLElement>(".tab")] : [];
  }

  private _activeTab(): HTMLElement | null {
    const windows = document.querySelector(".windows");
    return windows ? windows.querySelector<HTMLElement>(".tab.g-active") : null;
  }

  private _documentEvent(event: DocumentEvent): void {
    const rearrange = tabsRearrange();
    if (config.ALLOW_REARRANGE_TABS && rearrange.updateTabsInterface)
      rearrange.updateTabsInterface();
    const document = (event.document || designer().getActiveDocument()) as DesignerDocument | null;
    const tab = this.getWindowTab(document ? designer().getWindows().getWindow(document) : null);
    const Type = DocumentEvent.Type;
    const storageUpdated = event.type === Type.StorageItemUpdated;
    if (
      storageUpdated ||
      event.type === Type.AutoSaveSynchronized ||
      event.type === Type.Modified
    ) {
      if (storageUpdated) this.updateWindowIcon(this._activeTab());
      const eventDocument = event.document as unknown as DesignerDocument;
      const windows = eventDocument.getWindows();
      for (let s = 0; s < windows.length; ++s) {
        const window = windows[s] as Window;
        for (const element of this._tabs()) {
          if (tabWindows.get(element) !== window) continue;
          const modified = eventDocument.isModified() ? "*" : "";
          const cover = element.querySelector<HTMLElement>(".title > .cover");
          // Text, where the old code set it as HTML: see "Menu captions
          // and tab titles are text" in QUESTIONS.md.
          if (cover) cover.textContent = window.getTitleWithExtension() + modified;
          const input = element.querySelector<HTMLInputElement>(".title > input");
          if (input) input.value = window.getTitle() + modified;
          break;
        }
      }
      if (event.type === Type.Modified || event.type === Type.AutoSaveSynchronized) {
        this._updateSyncStatus(tab, "");
        this.updateWindowIcon(tab, false, true, document);
      }
    } else if (event.type === Type.Activated) {
      (event.document as unknown as DesignerDocument).addEventListener(
        DocumentStatusEvent,
        this._documentStatusEvent,
      );
    } else if (event.type === Type.Deactivated) {
      (event.document as unknown as DesignerDocument).removeEventListener(
        DocumentStatusEvent,
        this._documentStatusEvent,
      );
    }
  }

  private _settingChangedEvent(event: SettingChangedEvent): void {
    // Leaving touch mode puts the main menu back from the touch toolbar.
    if ("touch" === event.key && !designer().isTouchEnabled())
      this._menuBar.setMenu(designer().getMainMenu() as Menu);
  }

  private _windowEvent(event: WindowEvent): void {
    switch (event.type) {
      case WindowEvent.Type.Added:
        this._addWindowTab(event.window, event.index);
        break;
      case WindowEvent.Type.Removed:
        this._removeWindowTab(event.window);
        break;
      case WindowEvent.Type.Activated:
      case WindowEvent.Type.Deactivated:
        this._updateActiveWindowTab();
    }
  }

  private _addWindowTab(window: Window, index?: number): void {
    const tab = div("tab");
    tabWindows.set(tab, window);
    const tabs = this._tabs();
    const container = this._tabsElement() as HTMLElement;
    if ("number" == typeof index && index !== tabs.length && tabs[index])
      container.insertBefore(tab, tabs[index] as HTMLElement);
    else container.append(tab);
    const title = div("title");
    const cover = document.createElement("span");
    cover.classList.add("cover");
    // Text, where the old code set it as HTML: see "Menu captions and tab
    // titles are text" in QUESTIONS.md.
    cover.textContent = window.getTitleWithExtension();
    const input = document.createElement("input");
    input.setAttribute("type", "text");
    css(input, "display", "none");
    input.value = window.getTitle();
    // The old width came from the cover before the title was in the tab,
    // so it measured nothing and set no width.
    title.append(cover, input);
    tab.append(title);
    tab.addEventListener("click", () => {
      designer()
        .getWindows()
        .activateWindow(tabWindows.get(tab) || null, true);
    });
    tab.addEventListener("contextmenu", (event) => {
      event.stopPropagation();
      this.handleContextMenu(window, tab);
    });
    const close = document.createElement("span");
    close.classList.add("close");
    close.textContent = "✕";
    close.addEventListener("click", (event) => {
      event.stopPropagation();
      const owner = close.closest(".tab");
      const target = owner ? tabWindows.get(owner) : undefined;
      if (target) designer().getWindows().removeWindow(target, undefined, undefined, true);
    });
    tab.append(close);
    this.setWindowTabEnable(true);
  }

  private _removeWindowTab(window: Window): void {
    for (const tab of this._tabs())
      if (tabWindows.get(tab) === window) {
        tab.remove();
        break;
      }
  }

  private _updateActiveWindowTab(): void {
    const active = designer().getWindows().getActiveWindow();
    for (const tab of this._tabs())
      tab.classList.toggle("g-active", tabWindows.get(tab) === active);
  }

  private _createWindows(): HTMLElement {
    return div("tabs");
  }

  getHeight(): number {
    return this._htmlElement.clientHeight;
  }

  /**
   * Shows the cloud icon of a cloud file's tab, or removes it. Local
   * documents are never cloud or external files, so this only removes.
   */
  updateWindowIcon(
    tab: Element | null,
    synchronizing?: boolean,
    fade?: boolean,
    document?: DesignerDocument | null,
  ): void {
    void document;
    if (!tab) return;
    const icon = tab.querySelector(".header-cloud");
    if (synchronizing) {
      if (!icon) {
        const span = window.document.createElement("span");
        span.classList.add("header-cloud", "gravit-icon-cloud");
        const close = tab.querySelector(".close");
        if (close) close.before(span);
      }
    } else if (icon) {
      if (fade) setTimeout(() => icon.remove(), 2e3);
      else icon.remove();
    }
  }

  showBusyIcon(text: string): void {
    if (!this._busy) return;
    const label = this._busy.querySelector(".txt");
    if (label) label.textContent = text;
    css(this._busy, "display", "inherit");
  }

  hideBusyIcon(): void {
    if (this._busy) css(this._busy, "display", "none");
  }

  /** The sync status text after a tab's close button (created on first use). */
  private _updateSyncStatus(
    tab: Element | null,
    text: string,
    animated?: boolean,
    keepAnimated?: boolean,
    fade?: boolean,
  ): void {
    if (!tab) return;
    const icons = [...tab.querySelectorAll(".header-cloud")];
    if (icons.length > 0) for (const icon of icons) icon.classList.toggle("animated", !!animated);
    if (keepAnimated) for (const icon of icons) icon.classList.add("animated");
    if (!tab.querySelector(".sync-status")) {
      const status = document.createElement("span");
      status.classList.add("sync-status");
      const close = tab.querySelector(".close");
      if (close) close.after(status);
    }
    const status = tab.querySelector(".sync-status");
    if (status) status.textContent = text;
    if (fade) {
      setTimeout(() => {
        const current = tab.querySelector(".sync-status");
        if (current) current.remove();
      }, 2e3);
    }
  }

  /** The tab element of a window. */
  getWindowTab(window: Window | null): HTMLElement | null {
    for (const tab of this._tabsElement()?.querySelectorAll<HTMLElement>(".tab") || [])
      if (tabWindows.get(tab) === window) return tab;
    return null;
  }

  /** Opens the tab menu below a tab (activating its window first). */
  handleContextMenu(window: Window, tab: HTMLElement): void {
    const right = outerWidth(tab) - 10;
    tab.classList.add("context-pane-opened");
    designer().getWindows().activateWindow(window);
    this._contextMenu = this._createContextMenu(window, tab);
    new Overlay(this._contextMenu, {
      padding: false,
      releaseOnClose: true,
      clazz: "g-header-context-overlay",
      bottomClazz: "from-bottom",
      customRight: right,
      offsetY: -13,
      closeCallback: () => {
        tab.classList.remove("context-pane-opened");
      },
    }).open(tab);
  }

  private _createContextMenu(window: Window, tab: HTMLElement): HTMLElement {
    const menu = new Menu();
    for (const entry of TAB_MENU) {
      const caption =
        entry.title instanceof LocaleKey ? (Locale.get(entry.title) as string) : entry.title;
      let id: string | undefined;
      if (entry.id) id = "function" == typeof entry.id ? entry.id() : entry.id;
      if (entry.separator) {
        const divider = menu.createAddDivider();
        if (entry.isVisible instanceof Function) divider.setVisible(entry.isVisible(window));
        else if ("boolean" == typeof entry.isVisible) divider.setVisible(entry.isVisible);
        continue;
      }
      if (entry.needsAction && !designer().getAction(id as string)) continue;
      let item: MenuItem;
      if (entry.callback) {
        const callback = entry.callback;
        item = menu.createAddItem(caption, () => {
          callback.call(this, window, tab);
        });
      } else {
        item = menu.createAddItem(caption);
        if (entry.needsAction) item.setAction(designer().getAction(id as string));
      }
      if (entry.shortcut) item.setShortcutHint(entry.shortcut);
      if (entry.isEnabled instanceof Function) item.setEnabled(entry.isEnabled(window));
      if (entry.isVisible instanceof Function) item.setVisible(entry.isVisible(window));
      else if ("boolean" == typeof entry.isVisible) item.setVisible(entry.isVisible);
      if (entry.icon) item.setIcon("function" == typeof entry.icon ? entry.icon() : entry.icon);
      const isEnabled = entry.isEnabled;
      item.addEventListener(MenuItem.BeforeActivateEvent, () => {
        const overlay = this._contextMenu ? Overlay.of(this._contextMenu) : null;
        if (overlay) overlay.close();
        this._contextMenu = null;
        menu.clearItems();
        if (isEnabled) item.setEnabled(isEnabled(window));
      });
      item.setCaption(caption ?? null);
    }
    return menu.getHtmlElement();
  }

  /** Lets the tab title be edited in place; Enter or leaving the field renames. */
  _renameTab(window: Window, tab: HTMLElement): void {
    const document = window.getDocument() as unknown as DesignerDocument & {
      setTitle(title: string): void;
    };
    const item = storageItemOf(window);
    const input = tab.querySelector<HTMLInputElement>("input");
    const cover = tab.querySelector<HTMLElement>("span.cover");
    if (!input || !cover) return;
    const title = window.getTitle();
    let shown = title;
    if (item && config.USE_EXTENSION_IN_FILENAME)
      shown += "." + (item.getExtension() || "").toLowerCase();
    // jQuery's off("focusout") and off("keypress") dropped an earlier rename's listeners.
    const earlier = renameHandlers.get(input);
    if (earlier) {
      input.removeEventListener("focusout", earlier.focusOut);
      input.removeEventListener("keypress", earlier.keyPress);
    }
    cover.textContent = shown;
    css(input, "width", outerWidth(cover));
    input.value = title;
    const previous = input.value;
    let done = false;
    css(input, "display", "");
    css(cover, "display", "none");
    input.focus();
    const finish = (): void => {
      css(input, "display", "none");
      css(cover, "display", "");
      const name = input.value.trim();
      if (name && name !== title) {
        if (item) {
          document.setTitle(name);
          item.setFileName(name);
          designer().trigger(new DocumentEvent(DocumentEvent.Type.Modified, document as never));
          this._updateSyncStatus(tab, "");
          cover.textContent =
            name +
            (config.USE_EXTENSION_IN_FILENAME
              ? "." + (item.getExtension() || "").toLowerCase()
              : "");
          css(input, "width", outerWidth(cover));
        } else document.setTitle(name);
      } else input.value = previous;
    };
    const handlers = {
      focusOut: (): void => {
        if (!done) {
          finish();
          done = true;
        }
      },
      keyPress: (event: KeyboardEvent): void => {
        if (13 === event.which && !done) {
          finish();
          done = true;
        }
      },
    };
    input.addEventListener("focusout", handlers.focusOut);
    input.addEventListener("keypress", handlers.keyPress);
    renameHandlers.set(input, handlers);
  }

  /** Lets the tab buttons take clicks (or not), on every tab in the page. */
  setWindowTabEnable(enabled: boolean): void {
    for (const span of document.querySelectorAll<HTMLElement>(".tab > span"))
      css(span, "pointer-events", enabled ? "auto" : "none");
  }

  /** The login section is dropped with the cloud; kept for callers. */
  updateLoginInfo(): void {}

  toString(): string {
    return "[Object GHeader]";
  }
}

/** The listeners of the last rename per tab input (jQuery's off removed them). */
const renameHandlers = new WeakMap<
  HTMLInputElement,
  { focusOut: () => void; keyPress: (event: KeyboardEvent) => void }
>();

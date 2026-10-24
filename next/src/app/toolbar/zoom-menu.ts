// Old: designer.browser.dev.js module 1543 (the toolbar's touch parts).
/**
 * What the toolbar adds in touch mode (old module 1543 mixed these into
 * GToolbar): a `.menu-section` in front with the hamburger button (the
 * whole main menu as a dropdown), Open (with the recent files), the save
 * group, Undo with the quick history, the touch zoom menu (`g-zoom-menu`:
 * fit all, fit selection, 50/100/200/400%) and the snap button; a window
 * button listing the open documents; on Electron a native window button.
 */
import { GMath } from "../../engine/math/math.ts";
import { OperatingSystem, System } from "../../engine/core/system.ts";
import type { SceneWidget } from "../../editor/view/scene-widget.ts";
import { Overlay } from "../dialogs/dialog-container.ts";
import { baseConfig } from "../file-formats.ts";
import { Menu } from "../menus/menu.ts";
import { MenuItem } from "../menus/menu-item.ts";
import { Runtime } from "../shell/container.ts";
import { css } from "../shell/dom.ts";
import { containerOrNull, designer } from "../shell/globals.ts";
import { MenuButton } from "../widgets/menu-button.ts";
import { setButtonAction, type Toolbar } from "./toolbar.ts";

const FIT_ALL = "view.zoom.fit.all";
const FIT_SELECTION = "view.zoom.fit-selection";
const MAGNIFICATION = "view.magnification";
const SAVE = "file.save";
const SAVE_AS = "file.save-as";
const UNDO = "edit.undo";
const OPEN = "file.open";
/** GSyncAction (module 1293); not ported in the local app. */
const SYNC = "file.sync";

/** A window as the touch window button lists it. */
interface TouchWindow {
  getTitleWithExtension(): string;
  getDocument(): {
    isModified?(): boolean;
    isCloudFile?(): boolean;
    isExternalFile?(): boolean;
    isSynchronizing?(): boolean;
  } | null;
  getView(): SceneWidget | null;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  ...classes: string[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (classes.length) element.classList.add(...classes);
  return element;
}

export class TouchToolbar {
  _windowButton: HTMLElement | null = null;
  _nativeButton: HTMLElement | null = null;
  _touchSection: HTMLElement | null = null;

  constructor(private readonly _toolbar: Toolbar) {}

  /** Switches the toolbar to touch mode (adds the touch parts once). */
  updateTouchUI(): void {
    const toolbar = this._toolbar;
    const element = toolbar._htmlElement;
    if (!this._touchSection) {
      this._touchSection = this._createTouchSection();
      element.prepend(this._touchSection);
    }
    if (!this._windowButton) {
      this._windowButton = this._createWindowButton();
      css(this._windowButton, "display", "none");
      if (toolbar._exportButton) toolbar._exportButton.before(this._windowButton);
    }
    const container = containerOrNull();
    if (
      !this._nativeButton &&
      container &&
      container.getRuntime() === Runtime.Electron &&
      System.operatingSystem !== OperatingSystem.OSX_IOS
    ) {
      this._nativeButton = this._createNativeButton();
      const section = element.querySelector(".export-section");
      if (section) section.append(this._nativeButton);
    }
    // Editing is always enabled locally (no view-only shared files).
    this._updateTouchFullUI();
    this.updateActiveWindow();
    toolbar._updateZoomFromWindow(true);
    toolbar._updateActions();
    toolbar._updateContextTools();
    this._updateViewBasedOnPermissions();
  }

  private _updateViewBasedOnPermissions(): void {
    // Tab management is always enabled locally.
    if (this._windowButton) css(this._windowButton, "display", "");
  }

  private _updateTouchFullUI(): void {
    const toolbar = this._toolbar;
    if (!toolbar._htmlElement.querySelector(".menu-section > .zoom-button")) {
      toolbar._touchZoomButton = null;
      this._initTouchZoomButton();
      const snap = toolbar._htmlElement.querySelector(".menu-section > .snap-button");
      if (snap) snap.before(toolbar._touchZoomButton as unknown as HTMLElement);
    }
  }

  /** The touch zoom button and its `g-zoom-menu`. */
  private _initTouchZoomButton(): void {
    const toolbar = this._toolbar;
    const dropdown = el("button", "dropdown-button");
    dropdown.append(el("span", "gravit-icon-down"));
    const menu = new Menu(undefined, "g-zoom-menu");
    const button = el(
      "div",
      "zoom-button",
      "toolbar-button",
      "action-button",
      "g-menu-button",
      "dropdown",
    );
    const inner = el("div", "action-button");
    const caption = el("span", "caption");
    caption.textContent = "100%";
    inner.append(caption);
    button.append(inner, dropdown);
    toolbar._touchZoomButton = button;
    new MenuButton(button, {
      menu: () => {
        menu.clearItems();
        const d = designer();
        for (const id of [
          FIT_ALL,
          FIT_SELECTION,
          MAGNIFICATION + ".50",
          MAGNIFICATION + ".100",
          MAGNIFICATION + ".200",
          MAGNIFICATION + ".400",
        ])
          menu.createAddItem(d.getAction(id));
        return menu;
      },
      getActiveItem: () => {
        const d = designer();
        const active = d.getWindows().getActiveWindow() as unknown as TouchWindow | null;
        const view = active && active.getView();
        if (!view) return null;
        const zoom = 100 * view.getZoom();
        const rounded = zoom && GMath.round(zoom, false, 0);
        const action = rounded && d.getAction(MAGNIFICATION + "." + rounded);
        const title = action && action.getTitle();
        return title ? menu.findItem(title) : null;
      },
      reference: dropdown,
    });
  }

  private _menubarIcon(): string {
    const container = containerOrNull();
    return container && container.getRuntime() === Runtime.IPad
      ? "gravit-icon-touch-menubar-ipad"
      : "gravit-icon-touch-menubar";
  }

  private _createTouchSection(): HTMLElement {
    const toolbar = this._toolbar;
    const d = designer();
    if (!toolbar._touchZoomButton) this._initTouchZoomButton();
    const section = el("div", "section", "menu-section", "g-touch-only");
    const menubar = toolbar._createLabelButton({
      icon: this._menubarIcon(),
      menu: () => {
        const main = d.getMainMenu() as Menu;
        main.detach();
        return main;
      },
    });
    menubar.classList.add("menubar-toolbar-button");
    const open = toolbar._createLabelButton({
      icon: "gravit-icon-open",
      split: true,
      menu: () => toolbar._createOpenMenu(),
      click: () => d.executeAction(OPEN),
    });
    open.classList.add("open-toolbar-button");
    const undo = toolbar._createLabelButton({
      action: d.getAction(UNDO),
      icon: "gravit-icon-undo",
      split: true,
      menu: () => toolbar._createQuickHistoryUndoRedoMenu(),
      click: () => d.executeAction(UNDO),
    });
    undo.classList.add("undo-toolbar-button");
    section.append(
      menubar,
      open,
      this._createSaveButtonGroup(),
      undo,
      toolbar._touchZoomButton as unknown as HTMLElement,
      toolbar._createSnapButton(),
    );
    return section;
  }

  /** Save, with a menu of save as (the default format) and sync. */
  private _createSaveButtonGroup(): HTMLElement {
    const toolbar = this._toolbar;
    const d = designer();
    const save = d.getAction(SAVE);
    const menu = new Menu();
    const format = baseConfig.FILE_FORMATS.find((f) => f.default);
    // The Gravit Cloud save-as entry is dropped with the cloud.
    for (const action of [
      d.getAction(SAVE_AS + "." + (format ? format.ext : "")),
      d.getAction(SYNC),
    ])
      menu.createAddItem(action);
    const button = toolbar._createLabelButton({
      icon: "gravit-icon-save",
      split: true,
      menu,
      click: () => d.executeAction(SAVE),
    });
    button.classList.add("save-toolbar-button");
    if (save) {
      button.setAttribute("data-action", save.getId());
      setButtonAction(button, save);
    }
    return button;
  }

  /** The open documents; detaching an entry closes its window. */
  private _createWindowButton(): HTMLElement {
    const toolbar = this._toolbar;
    const menu = new Menu();
    const button = toolbar._createLabelButton({
      caption: " ",
      menu: () => {
        menu.clearItems();
        const windows = designer().getWindows();
        for (const window of windows.getWindows())
          this._createAndAppendWindowTabToMenu(menu, window as unknown as TouchWindow);
        return menu;
      },
      getActiveItem: () => this._findActiveWindowItemInMenu(menu),
    });
    button.classList.add("window-button", "g-touch-only");
    return button;
  }

  private _createAndAppendWindowTabToMenu(menu: Menu, window: TouchWindow): void {
    const windows = designer().getWindows();
    const item = menu.createAddItem(this._getWindowTitle(window), () => {
      windows.activateWindow(window as never, true);
    });
    item.setDetachable(true);
    item.addEventListener(MenuItem.DetachEvent, () => {
      windows.removeWindow(window as never);
    });
    // Cloud and external files had a cloud icon; there are none locally.
  }

  private _findActiveWindowItemInMenu(menu: Menu): MenuItem | null | "" {
    const windows = designer().getWindows();
    const active = windows && (windows.getActiveWindow() as unknown as TouchWindow | null);
    const title = this._getWindowTitle(active);
    return title && menu.findItem(title);
  }

  /** On Electron: minimize, maximize and close in an overlay. */
  private _createNativeButton(): HTMLElement {
    const toolbar = this._toolbar;
    const native = (icon: string): HTMLButtonElement => {
      const button = el("button", "native-button");
      button.append(el("span", icon));
      return button;
    };
    const button = toolbar._createLabelButton({
      caption: "",
      icon: "gravit-icon-3-dots",
      click: (event) => {
        const container = containerOrNull() as unknown as {
          minimizeWindow(): void;
          maximizeWindow(): void;
          closeWindow(): void;
        } | null;
        const content = el("div");
        const box = el("div", "container");
        const minimize = native("gravit-icon-minimize");
        minimize.addEventListener("click", () => container && container.minimizeWindow());
        const maximize = native("gravit-icon-maximize");
        maximize.addEventListener("click", () => container && container.maximizeWindow());
        const close = native("gravit-icon-close");
        close.addEventListener("click", () => container && container.closeWindow());
        box.append(minimize, maximize, close);
        content.append(box);
        new Overlay(content, {
          releaseOnClose: true,
          clazz: "g-toolbar-native-button-overlay",
        }).open(event.target as Element);
      },
    });
    button.classList.add("native-button", "g-touch-only");
    return button;
  }

  /** The window button shows the active document's title (touch mode only). */
  updateActiveWindow(): void {
    const button = this._windowButton;
    if (!designer().isTouchEnabled() || !button) return;
    const windows = designer().getWindows();
    const active = windows && (windows.getActiveWindow() as unknown as TouchWindow | null);
    if (!active) {
      css(button, "display", "none");
      return;
    }
    const document = active.getDocument();
    const title = this._getWindowTitle(active);
    const ending = "..." + title.substr(title.length - 3);
    css(button, "display", "");
    button.classList.toggle(
      "syncing",
      !!(document && document.isSynchronizing && document.isSynchronizing()),
    );
    const caption = button.querySelector<HTMLElement>(".action-button > .caption");
    if (caption) caption.textContent = title;
    for (const old of button.querySelectorAll(".subicon, .ending")) old.remove();
    const overflow = !!caption && caption.offsetWidth < caption.scrollWidth;
    button.classList.toggle("text-overflow", overflow);
    if (overflow) {
      const span = el("span", "ending");
      span.setAttribute("data-ending", ending);
      const down = button.querySelector(".gravit-icon-down");
      if (down) down.before(span);
    }
  }

  private _getWindowTitle(window: TouchWindow | null): string {
    const document = window && window.getDocument();
    return window
      ? ""
          .concat(window.getTitleWithExtension())
          .concat(document && document.isModified && document.isModified() ? "*" : "")
      : "";
  }
}

// Old: designer.browser.dev.js module 339 (GMenuItem).
/**
 * One entry of a Menu: an item (usually backed by an action), a submenu
 * or a divider. It owns its `li.g-menu-item` as plain DOM (see menu.ts):
 *
 *     li.g-menu-item[.g-menu-item-menu | .g-menu-item-divider]
 *       span.g-menu-item-icon      (hidden without an icon)
 *       span.g-menu-item-caption
 *       span.g-menu-item-info
 *       span.g-menu-item-shortcut  (hidden without a shortcut)
 *       span.g-menu-item-detach.gravit-icon-detach (hidden unless detachable)
 *       span.g-menu-item-tail
 *
 * Hovering an enabled item adds g-hover; a submenu opens on hover on the
 * desktop and on mouse down everywhere; releasing the mouse on an item
 * activates it (its action runs) and closes the active menu.
 */
import { Event } from "../../engine/core/event.ts";
import { EventTarget } from "../../engine/core/event-target.ts";
import { Key, type KeyValue } from "../../engine/core/key.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { MouseEvent as GMouseEvent } from "../../engine/core/mouse-event.ts";
import { registerClass } from "../../engine/core/object.ts";
import { Hardware, System } from "../../engine/core/system.ts";
import { uuid } from "../../engine/core/util.ts";
import type { Action } from "../actions/action.ts";
import { css } from "../shell/dom.ts";
import { designerOrNull } from "../shell/globals.ts";
import { attachRichTooltip } from "../widgets/rich-tooltip.ts";
import { RichTooltipConfig, type RichTooltipFields } from "../widgets/rich-tooltip-config.ts";
import { ActiveMenuManager } from "./active-menu-manager.ts";
import { MenuActivateEvent } from "./menu-activate-event.ts";
import { MenuCloseEvent } from "./menu-close-event.ts";
import type { Menu, MenuOwner } from "./menu.ts";
import { MenuOpenEvent } from "./menu-open-event.ts";

const Type = { Item: 0, Menu: 1, Divider: 2 } as const;

export type MenuItemType = (typeof Type)[keyof typeof Type];

/** The menu class an item of type Menu creates its submenu with (Menu, or a subclass). */
export type MenuClass = new (parent: MenuItem) => Menu;

/** A caption or info: a string, a key to resolve, or a node to show as it is. */
export type MenuItemContent = string | LocaleKey | Node | null;

/** An icon: class names for an `<i>`, or a node. */
export type MenuItemIcon = string | Node | null;

class EnterEvent extends Event {
  static {
    registerClass(this, "GMenuItem.EnterEvent");
  }
  override toString(): string {
    return "[Object GMenuItem.EnterEvent]";
  }
}

class LeaveEvent extends Event {
  static {
    registerClass(this, "GMenuItem.LeaveEvent");
  }
  override toString(): string {
    return "[Object GMenuItem.LeaveEvent]";
  }
}

class ActivateEvent extends Event {
  static {
    registerClass(this, "GMenuItem.ActivateEvent");
  }
  override toString(): string {
    return "[Object GMenuItem.ActivateEvent]";
  }
}

class BeforeActivateEvent extends Event {
  static {
    registerClass(this, "GMenuItem.BeforeActivateEvent");
  }
  override toString(): string {
    return "[Object GMenuItem.BeforeActivateEvent]";
  }
}

class UpdateEvent extends Event {
  static {
    registerClass(this, "GMenuItem.UpdateEvent");
  }
  override toString(): string {
    return "[Object GMenuItem.UpdateEvent]";
  }
}

class DetachEvent extends Event {
  static {
    registerClass(this, "GMenuItem.DetachEvent");
  }
  override toString(): string {
    return "[Object GMenuItem.DetachEvent]";
  }
}

/** The rich tooltip config an action hands out. */
interface TooltipConfigLike {
  getConfig(): RichTooltipFields;
}

/** A child span of the item, created as the old constructor did. */
function span(...classes: string[]): HTMLSpanElement {
  const element = document.createElement("span");
  element.classList.add(...classes);
  return element;
}

export class MenuItem extends EventTarget {
  static readonly Type = Type;
  static readonly EnterEvent = EnterEvent;
  static readonly ENTER_EVENT = new EnterEvent();
  static readonly LeaveEvent = LeaveEvent;
  static readonly LEAVE_EVENT = new LeaveEvent();
  static readonly ActivateEvent = ActivateEvent;
  static readonly ACTIVATE_EVENT = new ActivateEvent();
  static readonly BeforeActivateEvent = BeforeActivateEvent;
  static readonly BEFORE_ACTIVATE_EVENT = new BeforeActivateEvent();
  static readonly UpdateEvent = UpdateEvent;
  static readonly UPDATE_EVENT = new UpdateEvent();
  static readonly DetachEvent = DetachEvent;

  /** The menu the item is in. */
  _parent: Menu | null = null;
  readonly _htmlElement: HTMLLIElement;
  /** Set by code that builds a hit list (the context menu's Select entries). */
  element?: unknown;
  private readonly _category: MenuItemType;
  private readonly _componentId: string | null;
  private _menu: Menu | null = null;
  private _icon: MenuItemIcon = null;
  private _forcedAsOpened = false;
  private _caption: MenuItemContent = null;
  private _shortcutHint: readonly KeyValue[] | null = null;
  private _action: Action | null = null;
  private _data: unknown = null;
  private _noHover = false;
  private _pro = false;
  private _visible = true;
  private _feature: string | null = null;
  private _info: MenuItemContent = null;
  private _uuid: string | null = null;
  private _detached = false;
  private readonly _detachBound = (event: globalThis.MouseEvent): void => this._detach(event);
  private _isVisible: (() => boolean) | null = null;
  private _proFeatureInterruption = true;

  /**
   * `menuClass` makes the submenu of a Menu item; `componentId` goes to
   * the action's isAvailable on activation; `isVisible` decides whether
   * a divider shows (asked on every update).
   */
  constructor(
    type?: MenuItemType | null,
    menuClass?: MenuClass | null,
    componentId?: string | null,
    isVisible?: (() => boolean) | null,
  ) {
    super();
    this._htmlElement = document.createElement("li");
    this._htmlElement.classList.add("g-menu-item");
    this._category = type || Type.Item;
    this._componentId = componentId || null;
    if (this._category === Type.Divider) {
      this._isVisible = isVisible || null;
      this._htmlElement.classList.add("g-menu-item-divider");
    } else {
      const icon = span("g-menu-item-icon");
      css(icon, "display", "none");
      const shortcut = span("g-menu-item-shortcut");
      css(shortcut, "display", "none");
      const detach = span("g-menu-item-detach", "gravit-icon-detach");
      css(detach, "display", "none");
      this._htmlElement.append(
        icon,
        span("g-menu-item-caption"),
        span("g-menu-item-info"),
        shortcut,
        detach,
        span("g-menu-item-tail"),
      );
      if (this._category === Type.Menu) {
        this._htmlElement.classList.add("g-menu-item-menu");
        this.setMenu(new (menuClass as MenuClass)(this));
      }
    }
    this._htmlElement.addEventListener("mouseover", () => this._mouseOver());
    this._htmlElement.addEventListener("mouseout", (event) => this._mouseOut(event));
    this._htmlElement.addEventListener("mousedown", (event) => this._mouseDown(event));
    this._htmlElement.addEventListener("mouseup", (event) => this._mouseUp(event));
  }

  private _part(name: string): HTMLElement | null {
    return this._htmlElement.querySelector<HTMLElement>(":scope > ." + name);
  }

  getUUID(): string {
    if (!this._uuid) this._uuid = uuid();
    return this._uuid;
  }

  getParent(): Menu | null {
    return this._parent;
  }

  getType(): MenuItemType {
    return this._category;
  }

  getIcon(): MenuItemIcon {
    return this._icon;
  }

  isForcedAsOpened(): boolean {
    return this._forcedAsOpened;
  }

  /**
   * Marks the item as a Pro feature. The old item also showed a Pro badge
   * and, for trial and free licences, a tooltip; the licence is dropped,
   * so only the flags remain.
   */
  setPro(pro: boolean, feature?: string | null): void {
    this._pro = !!pro;
    this._feature = feature || null;
  }

  isPro(): boolean {
    return !!this._pro;
  }

  getFeature(): string | null {
    return this._feature;
  }

  setIcon(icon: MenuItemIcon): void {
    if (icon === this._icon) return;
    this._icon = icon;
    const element = this._part("g-menu-item-icon");
    if (!element) return;
    element.replaceChildren();
    if (this._icon) {
      if ("string" == typeof this._icon) {
        const i = document.createElement("i");
        // jQuery's addClass, so an inline SVG icon from the action icon
        // table ends up as class names, as before.
        const names = this._icon.match(/[^\x20\t\r\n\f]+/g);
        if (names) i.classList.add(...names);
        element.append(i);
      } else element.append(this._icon);
      css(element, "display", "");
      this._htmlElement.classList.add("has-icon");
    } else {
      css(element, "display", "none");
      this._htmlElement.classList.remove("has-icon");
    }
  }

  getCaption(): MenuItemContent {
    return this._caption;
  }

  /**
   * Sets the caption. Strings and keys are shown as text; the old item
   * inserted them as HTML, which also interpreted markup in file and
   * layer names (see "Menu captions are text" in the report).
   */
  setCaption(caption: MenuItemContent): void {
    if (caption === this._caption) return;
    this._caption = caption;
    const element = this._part("g-menu-item-caption");
    if (!element) return;
    element.replaceChildren();
    if (!this._caption || this._caption instanceof LocaleKey || "string" == typeof this._caption)
      element.textContent = this._caption ? (Locale.get(this._caption) as string) : "";
    else element.append(this._caption);
  }

  getInfo(): MenuItemContent {
    return this._info;
  }

  /**
   * Sets the info text. As before this shows or hides the whole item (not
   * the info span): see "A menu item's info hides the item" in QUESTIONS.md.
   */
  setInfo(info: MenuItemContent): void {
    if (info === this._info) return;
    this._info = info;
    const element = this._part("g-menu-item-info");
    if (element) element.replaceChildren();
    css(this._htmlElement, "display", this._info ? "" : "none");
    if (this._info && element) {
      if (this._info instanceof LocaleKey || "string" == typeof this._info)
        element.textContent = this._info ? (Locale.get(this._info) as string) : "";
      else element.append(this._info);
    }
  }

  getShortcutHint(): readonly KeyValue[] | null {
    return this._shortcutHint;
  }

  setShortcutHint(shortcut: readonly KeyValue[] | null): void {
    this._shortcutHint = shortcut;
    const element = this._part("g-menu-item-shortcut");
    if (!element) return;
    if (this._shortcutHint && this._shortcutHint.length > 0) {
      element.textContent = Key.shortcutToString(shortcut as KeyValue[]);
      css(element, "display", "");
      this._htmlElement.classList.add("has-shortcut");
    } else {
      element.replaceChildren();
      css(element, "display", "none");
      this._htmlElement.classList.remove("has-shortcut");
    }
  }

  getAction(): Action | null {
    return this._action;
  }

  updateEnabled(): void {
    if (this._action) this.setEnabled(!!this._action.isEnabled());
  }

  /**
   * Backs the item with an action: its shortcut, title, info, icon,
   * enabled and visible state, and with `tooltipType` its rich tooltip.
   */
  setAction(action: Action | null, tooltipType?: string | null): void {
    if (action !== this._action) {
      if (this._action) {
        // As before this compares the new action's shortcut with the hint.
        const shortcut = action ? action.getShortcut() : null;
        if (shortcut && shortcut === this.getShortcutHint()) this.setShortcutHint(null);
      }
      this._action = action;
      if (this._action) {
        const shortcut = this._action.getShortcut();
        if (shortcut) this.setShortcutHint(shortcut);
        this.setCaption(this._action.getTitle());
        this.setInfo(this._action.getInfo());
        this.setIcon(this._action.getIcon());
        this.setEnabled(true === this._action.isEnabled());
        this.setVisible(this._action.isVisible());
        if (tooltipType) {
          const config = this._action.getTooltipConfig(tooltipType) as TooltipConfigLike | null;
          if (config) {
            this.setTooltipConfig(
              RichTooltipConfig.from(Object.assign({}, config.getConfig(), { side: true })),
            );
          }
        }
      }
    }
    this.setPro(!!this._action && this._action.isPro(), this._action && this._action.getId());
  }

  isChecked(): boolean {
    return this._htmlElement.classList.contains("g-menu-item-checked");
  }

  isCheckable(): boolean {
    return !!this._action && this._action.isCheckable();
  }

  setChecked(checked: boolean): void {
    if (checked != this.isChecked())
      this._htmlElement.classList.toggle("g-menu-item-checked", checked);
  }

  isEnabled(): boolean {
    return !this._htmlElement.classList.contains("g-disabled");
  }

  setEnabled(enabled: boolean): void {
    if (enabled != this.isEnabled()) this._htmlElement.classList.toggle("g-disabled", !enabled);
  }

  /** Shows the detach button, which takes the item out of its menu (DetachEvent). */
  setDetachable(detachable: boolean): void {
    const element = this._part("g-menu-item-detach");
    if (!element) return;
    css(element, "display", detachable ? "" : "none");
    if (detachable) {
      element.addEventListener("click", this._detachBound);
      element.addEventListener("mousedown", stopPropagation, true);
      element.addEventListener("mouseup", stopPropagation, true);
    } else {
      element.removeEventListener("click", this._detachBound);
      element.removeEventListener("mousedown", stopPropagation, true);
      element.removeEventListener("mouseup", stopPropagation, true);
    }
  }

  private _detach(event: globalThis.MouseEvent): void {
    if (event.button != GMouseEvent.BUTTON_LEFT) return;
    event.stopPropagation();
    event.preventDefault();
    this._detached = true;
    const parent = this._parent;
    if (parent) {
      parent.removeItem(parent.indexOf(this));
      parent.close();
    }
    if (this.hasEventListeners(DetachEvent)) this.trigger(new DetachEvent());
  }

  setVisible(visible: boolean): void {
    this._visible = !!visible;
    css(this._htmlElement, "display", visible ? "" : "none");
  }

  isVisible(): boolean {
    return this._visible;
  }

  getData(): unknown {
    return this._data;
  }

  setData(data: unknown): void {
    this._data = data;
  }

  setNoHover(noHover: boolean): void {
    this._noHover = noHover;
  }

  addClass(name: string): void {
    const names = name.match(/[^\x20\t\r\n\f]+/g);
    if (names) this._htmlElement.classList.add(...names);
  }

  /** Whether the item is in a root menu that has an owner that is not an item (a menu bar). */
  isRootItem(): boolean {
    return (
      !!this._parent &&
      "function" == typeof this._parent.toString &&
      "[Object GMenu]" === this._parent.toString() &&
      null != this._parent._parent &&
      !(this._parent._parent instanceof MenuItem)
    );
  }

  isRootMenuBarItem(): boolean {
    const bar = this._parent && this._parent._parent;
    return (
      this.isRootItem() &&
      !!bar &&
      "function" == typeof bar.toString &&
      "[Object GMenuBar]" === bar.toString()
    );
  }

  /** The menu bar of a top-level menu bar entry. */
  getMenuBar(): MenuBarLike | null {
    return this.isRootMenuBarItem()
      ? ((this._parent as Menu)._parent as unknown as MenuBarLike)
      : null;
  }

  getMenu(): Menu | null {
    return this._menu;
  }

  setMenu(menu: Menu | null): void {
    if (menu && menu !== this._menu && this._category === Type.Menu) {
      this._menu = menu;
      this._menu._parent = this as MenuOwner;
      this._menu.addEventListener(MenuOpenEvent, () => this._menuOpen());
      this._menu.addEventListener(MenuCloseEvent, () => this._menuClose());
    }
  }

  /** Refreshes the item from its action; dividers ask their visibility callback. */
  update(): void {
    if (this._action) {
      this.setCaption(this._action.getTitle());
      this.setEnabled(this._action.isEnabled());
      this.setChecked(this._action.isChecked());
      this.setPro(this._action.isPro(), this._action.getId());
      this.setIcon(this._icon || this._action.getIcon());
      this.setInfo(this._action.getInfo());
      this.setVisible(this._action.isVisible());
    }
    if (this.getType() === Type.Divider && this._isVisible) this.setVisible(this._isVisible());
    if (this.hasEventListeners(UpdateEvent)) this.trigger(MenuItem.UPDATE_EVENT);
  }

  /**
   * Runs the item: BeforeActivateEvent, the action (when available and
   * enabled), then ActivateEvent and the menu's MenuActivateEvent if the
   * item is enabled. The old Pro interruption needed a free licence; the
   * licence is dropped, so it never happens.
   */
  activate(): boolean | undefined {
    if (this.hasEventListeners(BeforeActivateEvent)) this.trigger(MenuItem.BEFORE_ACTIVATE_EVENT);
    if (
      this._action &&
      this._action.isAvailable(this._componentId ?? undefined) &&
      this._action.isEnabled()
    )
      this._action.execute();
    if (this.isEnabled()) {
      if (this.hasEventListeners(ActivateEvent)) this.trigger(MenuItem.ACTIVATE_EVENT);
      if (this._parent && this._parent.hasEventListeners(MenuActivateEvent))
        this._parent.trigger(new MenuActivateEvent(this));
    }
    return undefined;
  }

  /** The tooltip shown on hover ($.fn.gRichTooltip). */
  setTooltipConfig(config: RichTooltipConfig | null): void {
    attachRichTooltip(this._htmlElement, config);
  }

  /** Kept for callers; without a licence there is no Pro interruption. */
  setProFeatureInterruption(interrupt: boolean): void {
    this._proFeatureInterruption = interrupt;
  }

  isProFeatureInterruption(): boolean {
    return this._proFeatureInterruption;
  }

  private _mouseOver(): void {
    const parent = this._parent;
    if (
      parent &&
      this._category === Type.Menu &&
      parent.getActiveItem() !== this &&
      !this.isRootItem()
    )
      parent.closeMenus(true);
    if (
      parent &&
      "function" == typeof parent.toString &&
      "[Object GMenu]" === parent.toString() &&
      !this.isRootItem()
    )
      parent.closeMenus();
    if (!this.isEnabled()) return;
    if (
      this._category == Type.Menu &&
      System.hardware === Hardware.Desktop &&
      (!this.isRootItem() ||
        (this.isRootMenuBarItem() && (this.getMenuBar() as MenuBarLike).isActive()))
    )
      this._openMenu();
    if (this._category != Type.Divider) {
      if (!this._noHover) this._htmlElement.classList.add("g-hover");
      if (this.hasEventListeners(EnterEvent)) this.trigger(MenuItem.ENTER_EVENT);
    }
  }

  isActive(): boolean {
    return this._htmlElement.classList.contains("g-active");
  }

  changeActiveState(active: boolean): void {
    this._htmlElement.classList.toggle("g-active", active);
  }

  private _mouseOut(event: globalThis.MouseEvent | null): void {
    if (
      this._category === Type.Menu &&
      (this.isRootItem() || System.hardware !== Hardware.Desktop)
    ) {
      if (event) {
        event.stopPropagation();
        event.preventDefault();
      }
      return;
    }
    if (this.isEnabled() && this._category != Type.Divider) {
      if (!this._noHover) this._htmlElement.classList.remove("g-hover");
      if (this.hasEventListeners(LeaveEvent)) this.trigger(MenuItem.LEAVE_EVENT);
    }
  }

  private _mouseDown(event: globalThis.MouseEvent): void {
    if (!event.cancelable) return;
    if (this.isEnabled()) {
      if (event.button == GMouseEvent.BUTTON_LEFT) {
        event.stopPropagation();
        event.preventDefault();
        if (this._category === Type.Menu) {
          if (this._forcedAsOpened) {
            (this.getMenu() as Menu).close();
            this._forcedAsOpened = false;
          } else {
            if (this._parent) {
              this._parent.closeMenus(true);
              this._parent.setActiveItem(this);
            }
            this._openMenu();
            this._forcedAsOpened = true;
          }
        }
      } else {
        event.stopPropagation();
        event.preventDefault();
      }
    } else {
      const designer = designerOrNull();
      if (designer && designer.isTouchEnabled() && event.button === GMouseEvent.BUTTON_LEFT)
        event.stopPropagation();
    }
  }

  private _mouseUp(event: globalThis.MouseEvent): void {
    if (!event.cancelable) return;
    event.stopPropagation();
    event.preventDefault();
    if (
      event.button != GMouseEvent.BUTTON_MIDDLE &&
      event.button != GMouseEvent.BUTTON_RIGHT &&
      !this._detached &&
      this._category !== Type.Menu
    ) {
      if (!this.isRootMenuBarItem()) this._mouseOut(event);
      if (this._category == Type.Item) {
        const result = this.activate();
        if (this.isEnabled() && false !== result) ActiveMenuManager.triggerGlobalActivation(this);
      }
      if (!this.isRootMenuBarItem()) ActiveMenuManager.setActiveMenu(null);
    }
  }

  private _openMenu(): void {
    const root = this.isRootItem();
    (this.getMenu() as Menu).open(
      this._htmlElement,
      root ? MenuPositionValues.Center : MenuPositionValues.Right_Bottom,
      root ? MenuPositionValues.Right_Bottom : MenuPositionValues.Center,
    );
  }

  private _menuOpen(): void {
    this._htmlElement.classList.add("g-active");
    if (this.isRootItem())
      (
        (this._parent as Menu)._parent as unknown as { _htmlElement: Element }
      )._htmlElement.classList.add("g-active");
  }

  private _menuClose(): void {
    this._forcedAsOpened = false;
    this._htmlElement.classList.remove("g-active");
    if (this.isRootItem())
      (
        (this._parent as Menu)._parent as unknown as { _htmlElement: Element }
      )._htmlElement.classList.remove("g-active");
  }

  override toString(): string {
    return "[Object GMenuItem]";
  }
}

/** What an item asks of the menu bar it sits in (menu-bar.ts). */
export interface MenuBarLike {
  isActive(): boolean;
}

/** MenuPosition from menu.ts, repeated here so the two modules don't need each other at load. */
const MenuPositionValues = { Left_Top: 0, Center: 1, Right_Bottom: 2 } as const;

function stopPropagation(event: globalThis.Event): void {
  event.stopPropagation();
}

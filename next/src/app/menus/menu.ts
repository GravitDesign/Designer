// Old: designer.browser.dev.js module 238 (GMenu).
/**
 * A menu: an `ul.g-menu` of MenuItems. A closed menu is detached; open()
 * appends it to body, positions it next to an element or at a point and
 * makes it the active menu (unless it is a submenu). The root menu of the
 * menu bar lives inside the bar's `nav` instead.
 *
 * Menus and their items own their elements as plain DOM, like the jQuery
 * widget they replace: the same element moves between the menu bar, body
 * and the overlays other code puts it in (getHtmlElement), items are
 * inserted and detached one by one, and the class and style attributes
 * record the order in which the old code changed them, which the DOM
 * snapshots compare.
 */
import type { Event } from "../../engine/core/event.ts";
import { EventTarget } from "../../engine/core/event-target.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { css, outerHeight, outerWidth } from "../shell/dom.ts";
import { isPassiveSupported } from "../util/designer-util.ts";
import { Action } from "../actions/action.ts";
import { ActiveMenuManager, type ActivationCallback } from "./active-menu-manager.ts";
import { MenuCloseEvent } from "./menu-close-event.ts";
import { MenuItem } from "./menu-item.ts";
import { MenuOpenEvent } from "./menu-open-event.ts";

/**
 * Where a menu opens relative to its reference, per axis (module 444,
 * shell/alignment-position.ts of app-shell-storage, not there yet).
 */
export const MenuPosition = { Left_Top: 0, Center: 1, Right_Bottom: 2 } as const;

export type MenuPosition = (typeof MenuPosition)[keyof typeof MenuPosition];

/** A point in page coordinates to open a menu at. */
export interface MenuPoint {
  x: number;
  y: number;
}

/** What a menu can belong to: the item that opens it, a menu bar, or nothing. */
export interface MenuOwner {
  toString(): string;
}

/** A listener of an item event; `this` is the item, as the old trigger called it. */
export type ItemListener = (this: MenuItem, event: Event) => void;

const POSITION_CLASSES = ["g-menu-left", "g-menu-right", "g-menu-top", "g-menu-bottom"];

/** $(window).width() / height(): the viewport without scrollbars. */
function windowWidth(): number {
  return document.documentElement.clientWidth;
}

function windowHeight(): number {
  return document.documentElement.clientHeight;
}

export class Menu extends EventTarget {
  /** Where the old code recorded which kind of menu this is ("menubar", "context", ...). */
  __which?: string;

  _parent: MenuOwner | null;
  readonly _htmlElement: HTMLUListElement;
  private _items: MenuItem[] | null = null;
  private _hovered = false;
  private _tooltipType: string | null = null;
  private _rangeLeftX: number | null = null;
  private _rangeLeftY: number | null = null;
  private _rangeRightX: number | null = null;
  private _rangeRightY: number | null = null;

  constructor(parent?: MenuOwner | null, className?: string | null) {
    super();
    this._parent = parent || null;
    this._htmlElement = document.createElement("ul");
    this._htmlElement.classList.add("g-menu");
    this._htmlElement.addEventListener("mouseover", () => this._mouseOver());
    this._htmlElement.addEventListener("mouseout", () => this._mouseOut());
    // Taps that can't be cancelled (a scroll is under way) don't reach the
    // page; a moving finger closes the submenus.
    const touch = (event: TouchEvent): void => {
      if (!event.cancelable) {
        event.stopImmediatePropagation();
        if ("touchmove" === event.type) this.closeMenus(true);
      }
    };
    const options = !!isPassiveSupported() && { capture: false, passive: true };
    this._htmlElement.addEventListener("touchstart", touch, options);
    this._htmlElement.addEventListener("touchmove", touch, options);
    this._htmlElement.addEventListener("touchend", touch, options);
    if (className) this._htmlElement.classList.add(className);
  }

  getParent(): MenuOwner | null {
    return this._parent;
  }

  /** The tooltip area the items of createAddItem(action) show their tooltip for. */
  setTooltipType(type: string): this | undefined {
    if (type && "string" == typeof type) {
      this._tooltipType = type;
      return this;
    }
    return undefined;
  }

  /** Whether the mouse is over the menu or, with `deep`, over one of its open submenus. */
  isHovered(deep?: boolean): boolean {
    if (this._hovered) return true;
    if (deep) {
      for (let i = 0; i < this.getItemCount(); ++i) {
        const item = this.getItem(i);
        if (
          item instanceof MenuItem &&
          item.getType() === MenuItem.Type.Menu &&
          (item.getMenu() as Menu).isHovered(true)
        )
          return true;
      }
      return false;
    }
    return false;
  }

  createMenuItem(withMenu?: boolean): MenuItem {
    return withMenu ? new MenuItem(MenuItem.Type.Menu, Menu) : new MenuItem();
  }

  createDivider(): MenuItem {
    return new MenuItem(MenuItem.Type.Divider);
  }

  setActiveItem(item: MenuItem): void {
    const active = this.getActiveItem();
    if (active) active.changeActiveState(false);
    item.changeActiveState(true);
  }

  getActiveItem(): MenuItem | null {
    let active: MenuItem | null = null;
    // The old loop read _items without a null check; a menu without items
    // never got here (only item mouse downs call it).
    for (const item of this._items || []) {
      if (item.isActive()) {
        active = item;
        break;
      }
    }
    return active;
  }

  isRootMenu(): boolean {
    return !(this._parent && this._parent instanceof MenuItem);
  }

  isSubMenu(): boolean {
    return !!(this._parent && this._parent instanceof MenuItem) && !this._parent.isRootItem();
  }

  createAddDivider(): MenuItem {
    return this.createInsertDivider(this.getItemCount());
  }

  createInsertDivider(index: number): MenuItem {
    const item = new MenuItem(MenuItem.Type.Divider);
    this.insertItem(index, item);
    return item;
  }

  /**
   * Adds an item for an action, or with a caption and enter, leave and
   * activate listeners. `componentId` is passed to the action's
   * isAvailable when the item is activated.
   */
  createAddItem(
    actionOrCaption: Action | string | LocaleKey | Node | null | undefined,
    activate?: ItemListener | null,
    enter?: ItemListener | null,
    leave?: ItemListener | null,
    componentId?: string | null,
  ): MenuItem {
    return this.createInsertItem(
      this.getItemCount(),
      actionOrCaption,
      activate,
      enter,
      leave,
      componentId,
    );
  }

  createInsertItem(
    index: number,
    actionOrCaption: Action | string | LocaleKey | Node | null | undefined,
    activate?: ItemListener | null,
    enter?: ItemListener | null,
    leave?: ItemListener | null,
    componentId?: string | null,
  ): MenuItem {
    const item = new MenuItem(null, null, componentId);
    if (actionOrCaption instanceof Action) item.setAction(actionOrCaption, this._tooltipType);
    else {
      item.setCaption(actionOrCaption ?? null);
      if (activate) item.addEventListener(MenuItem.ActivateEvent, activate);
      if (enter) item.addEventListener(MenuItem.EnterEvent, enter);
      if (leave) item.addEventListener(MenuItem.LeaveEvent, leave);
    }
    this.insertItem(index, item);
    return item;
  }

  addItem(item: MenuItem): void {
    this.insertItem(this.getItemCount(), item);
  }

  insertItem(index: number, item: MenuItem): void {
    if (null == this._items) this._items = [];
    // As before: an item is inserted only when it doesn't go into the last
    // two places; there it is appended.
    if (index + 1 < this._items.length) {
      this._items.splice(index, 0, item);
      (this._items[index + 1] as MenuItem)._htmlElement.before(item._htmlElement);
    } else {
      this._items.push(item);
      this._htmlElement.append(item._htmlElement);
    }
    item._parent = this;
  }

  removeItem(index: number): void {
    if (index >= 0 && index < this.getItemCount()) {
      const items = this._items as MenuItem[];
      (items[index] as MenuItem)._parent = null;
      (items[index] as MenuItem)._htmlElement.remove();
      items.splice(index, 1);
    }
  }

  clearItems(): void {
    if (this._items) {
      for (const item of this._items) {
        item._parent = null;
        item._htmlElement.remove();
      }
      this._items = [];
    }
  }

  getItem(index: number): MenuItem | null {
    return index >= 0 && index < this.getItemCount()
      ? (this._items as MenuItem[])[index] || null
      : null;
  }

  getItemCount(): number {
    return this._items ? this._items.length : 0;
  }

  indexOf(item: MenuItem): number {
    return this._items ? this._items.indexOf(item) : -1;
  }

  /** The item whose caption is `caption`. */
  findItem(caption: unknown): MenuItem | null {
    for (let i = 0; i < this.getItemCount(); ++i) {
      const item = this.getItem(i) as MenuItem;
      if (caption == item.getCaption()) return item;
    }
    return null;
  }

  /** Refreshes every item (its action's title, enabled and checked state). */
  update(): void {
    for (let i = 0; i < this.getItemCount(); ++i) (this.getItem(i) as MenuItem).update();
  }

  isOpen(): boolean {
    return !!this._htmlElement.parentElement;
  }

  /**
   * Opens the menu at a point or next to an element. `horizontal` and
   * `vertical` say on which side (MenuPosition, Center by default); a
   * menu that doesn't fit flips to the other side, and the active range
   * (setActiveRangeSize, the window by default) clamps it. `callback`
   * gets every item activated while this menu is the active one.
   */
  open(
    reference: MenuPoint | HTMLElement,
    horizontal?: MenuPosition | null,
    vertical?: MenuPosition | null,
    callback?: ActivationCallback | null,
  ): void {
    const hPos = "number" == typeof horizontal ? horizontal : MenuPosition.Center;
    const vPos = "number" == typeof vertical ? vertical : MenuPosition.Center;
    const isPoint =
      !!reference &&
      "number" == typeof (reference as MenuPoint).x &&
      "number" == typeof (reference as MenuPoint).y;
    const touch = this._htmlElement.classList.contains("g-touch");
    const fromButton =
      !isPoint && !!reference && (reference as HTMLElement).classList.contains("g-menu-button");
    this._htmlElement.classList.toggle("g-menu-button", !!fromButton);
    if (!this.isOpen()) {
      this.update();
      document.body.append(this._htmlElement);
      if (!this.isSubMenu()) ActiveMenuManager.setActiveMenu(this, false, callback);
      this.trigger(MenuOpenEvent.EVENT);
    }
    if (this._htmlElement.parentElement !== document.body) return;
    const width = outerWidth(this._htmlElement);
    const height = outerHeight(this._htmlElement);
    const winWidth = windowWidth();
    const winHeight = windowHeight();
    const rect = { x: 0, y: 0, width: 0, height: 0 };
    if (isPoint) {
      rect.x = (reference as MenuPoint).x;
      rect.y = (reference as MenuPoint).y;
    } else {
      const element = reference as HTMLElement;
      const box = element.getBoundingClientRect();
      // jQuery's offset(): the client box plus the page scroll.
      rect.x = box.left + window.pageXOffset;
      rect.y = box.top + window.pageYOffset;
      rect.width = outerWidth(element);
      rect.height = outerHeight(element);
    }
    let x = 0;
    switch (hPos) {
      case MenuPosition.Left_Top:
        if ((x = rect.x - width) < 0) x = rect.x + rect.width;
        break;
      case MenuPosition.Center:
        x = rect.x;
        break;
      case MenuPosition.Right_Bottom:
        if ((x = rect.x + rect.width) + width > winWidth) x = rect.x - width;
    }
    let y = 0;
    switch (vPos) {
      case MenuPosition.Left_Top:
        if ((y = rect.y - height) < 0) y = rect.y + rect.height;
        break;
      case MenuPosition.Center:
        y = rect.y;
        break;
      case MenuPosition.Right_Bottom:
        if ((y = rect.y + rect.height) + height > winHeight) y = rect.y - height;
    }
    const leftX = this._rangeLeftX ? this._rangeLeftX : 0;
    if (x < leftX) x = leftX;
    const rightX = this._rangeRightX ? this._rangeRightX : winWidth;
    if (x + width >= rightX) x = rightX - width;
    const leftY = this._rangeLeftY ? this._rangeLeftY : 0;
    if (y < leftY) y = leftY;
    const rightY = this._rangeRightY ? this._rangeRightY : winHeight;
    if (y + height >= rightY) y = rightY - height;
    for (const arrow of this._htmlElement.querySelectorAll(".g-menu-arrow")) arrow.remove();
    if (touch && fromButton) {
      // A touch menu under a menu button points at the button's middle.
      const arrow = document.createElement("div");
      arrow.classList.add("g-menu-arrow");
      this._htmlElement.prepend(arrow);
      let left = rect.width / 2 - 14;
      if (left < 0) {
        if (x - 14 > 0) {
          x -= 14;
          left += 14;
        } else arrow.remove();
      }
      css(arrow, "left", "".concat(String(left), "px"));
    }
    css(this._htmlElement, "left", x);
    css(this._htmlElement, "top", y);
    switch (hPos) {
      case MenuPosition.Left_Top:
        this._htmlElement.classList.add("g-menu-left");
        break;
      case MenuPosition.Right_Bottom:
        this._htmlElement.classList.add("g-menu-right");
    }
    switch (vPos) {
      case MenuPosition.Left_Top:
        this._htmlElement.classList.add("g-menu-top");
        break;
      case MenuPosition.Right_Bottom:
        this._htmlElement.classList.add("g-menu-bottom");
    }
  }

  /** Closes an open menu (one in body) with its submenus. */
  close(): void {
    if (this.isOpen() && this._htmlElement.parentElement === document.body) {
      this.closeMenus(true);
      this._htmlElement.classList.remove(...POSITION_CLASSES);
      this._htmlElement.remove();
      if (this === ActiveMenuManager.getActiveMenu()) ActiveMenuManager.setActiveMenu(null, true);
      this.trigger(MenuCloseEvent.EVENT);
    }
  }

  setTouchMode(touch: boolean): void {
    this._htmlElement.classList.toggle("g-touch", !!touch);
  }

  /** Closes the submenus; with `force` also those opened by a click. */
  closeMenus(force = false): void {
    for (let i = 0; i < this.getItemCount(); ++i) {
      const item = this.getItem(i);
      if (
        item instanceof MenuItem &&
        item.getType() === MenuItem.Type.Menu &&
        (!item.isForcedAsOpened() || force)
      )
        (item.getMenu() as Menu).close();
    }
  }

  private _mouseOver(): void {
    this._hovered = true;
  }

  private _mouseOut(): void {
    this._hovered = false;
    if (this.isSubMenu())
      setTimeout(() => {
        if (!this.isHovered(true)) this.closeMenus();
      }, 150);
  }

  getHtmlElement(): HTMLUListElement {
    return this._htmlElement;
  }

  /** Takes the menu out of where it is (the menu bar, an overlay) with its submenus closed. */
  detach(): void {
    this.closeMenus(true);
    for (const hovered of this._htmlElement.querySelectorAll(".g-hover"))
      hovered.classList.remove("g-hover");
    this._htmlElement.classList.remove("g-menu-root");
    this._htmlElement.remove();
    this._parent = null;
  }

  addClass(name: string): void {
    addClasses(this._htmlElement, name);
  }

  /** Limits where the menu may open (page coordinates). */
  setActiveRangeSize(left: number, top: number, height: number, width: number): void {
    this._rangeLeftX = left;
    this._rangeLeftY = top;
    this._rangeRightX = this._rangeLeftX + width;
    this._rangeRightY = this._rangeLeftY + height;
  }

  override toString(): string {
    return "[Object GMenu]";
  }

  /**
   * Enables or disables the File, Edit, Modify and View entries of every
   * menu in the page (found by their caption text, as before).
   */
  setEnabled(enabled: boolean): void {
    for (const id of ["file", "edit", "modify", "view"]) {
      const label = Locale.get(new LocaleKey("GCategory", "category.".concat(id))) as string;
      for (const element of document.querySelectorAll(".g-menu-item-menu"))
        if ((element.textContent || "").includes(label))
          element.classList[enabled ? "remove" : "add"]("g-disabled");
    }
  }
}

/** jQuery's addClass: every whitespace-separated name, each once. */
export function addClasses(element: Element, names: string): void {
  const list = names.match(/[^\x20\t\r\n\f]+/g);
  if (list) element.classList.add(...list);
}

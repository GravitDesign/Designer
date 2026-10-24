// Old: designer.browser.dev.js module 1721 ($.fn.gMenuButton).
/**
 * Makes an element open a Menu below it on mouse down (`.g-menu-button`,
 * `.g-active` while the menu is open). Options as before:
 *
 * - `menu`: the menu, or a factory called once at setup and again on
 *   every press (its items are moved into the first menu when it returns
 *   another one);
 * - `defaultAction`: a press opens the menu only when held for 250 ms, a
 *   short click runs the default action instead;
 * - `dblclick`: everything waits 500 ms to tell a double click, which
 *   calls this instead of opening the menu;
 * - `reference`: the element (or a function giving it) the menu opens
 *   next to, the button itself by default;
 * - `getActiveItem`: the item to mark active when the menu opens.
 *
 *     const button = new MenuButton(element, { menu: () => createMenu() });
 *     button.open();
 */
import type { Menu } from "../menus/menu.ts";
import { MenuPosition } from "../menus/menu.ts";
import { MenuCloseEvent } from "../menus/menu-close-event.ts";
import type { MenuItem } from "../menus/menu-item.ts";

export interface MenuButtonOptions {
  menu: Menu | (() => Menu);
  defaultAction?: (() => void) | null;
  dblclick?: ((this: HTMLElement) => void) | null;
  touch?: boolean;
  reference?: HTMLElement | (() => HTMLElement | null | undefined) | null;
  getActiveItem?: (() => MenuItem | null | undefined | false | "" | 0) | null;
}

const buttons = new WeakMap<Element, MenuButton>();

export class MenuButton {
  /** The menu button set up on an element ($(el).data("gmenubutton")). */
  static of(element: Element): MenuButton | null {
    return buttons.get(element) || null;
  }

  readonly element: HTMLElement;
  /** The menu the button opens (the first one the factory made). */
  readonly menu: Menu;
  private readonly _options: MenuButtonOptions;
  private readonly _menuFactory: (() => Menu) | null;
  /** Clicks of a double click still to be swallowed ($(el).data("dblclicked")). */
  private _dblclicked = 0;

  constructor(element: HTMLElement, options: MenuButtonOptions) {
    this.element = element;
    this._options = {
      defaultAction: null,
      dblclick: null,
      touch: false,
      reference: null,
      ...options,
    };
    if ("function" == typeof options.menu) {
      this._menuFactory = options.menu;
      this.menu = this._menuFactory();
    } else {
      this._menuFactory = null;
      this.menu = options.menu;
    }
    this.menu.setTouchMode(!!this._options.touch);
    element.classList.add("g-menu-button");
    buttons.set(element, this);
    let openTimer: ReturnType<typeof setTimeout> | null = null;
    const pressed = (): void => {
      if (this._options.defaultAction)
        openTimer = setTimeout(() => {
          this.open();
          openTimer = null;
        }, 250);
      else if (this.menu.isOpen()) this.close();
      else this.open();
    };
    const released = (): void => {
      if (null !== openTimer) {
        clearTimeout(openTimer);
        openTimer = null;
      }
      if (!this.menu.isOpen() && this._options.defaultAction) this._options.defaultAction();
    };
    element.addEventListener("mousedown", (event) => {
      event.stopPropagation();
      if (this._menuFactory) {
        const made = this._menuFactory();
        if (made !== this.menu) {
          this.menu.clearItems();
          for (let n = 0; n < made.getItemCount(); ++n)
            this.menu.addItem(made.getItem(n) as MenuItem);
        }
      }
      if (this._options.dblclick)
        setTimeout(() => {
          if (this._dblclicked) {
            if (this.menu.isOpen()) this.close();
          } else pressed();
        }, 500);
      else pressed();
    });
    element.addEventListener("mouseup", (event) => {
      event.stopPropagation();
      if (this._options.dblclick)
        setTimeout(() => {
          if (this._dblclicked) this._dblclicked = this._dblclicked - 1;
          else released();
        }, 500);
      else released();
    });
    element.addEventListener("dblclick", (event) => {
      event.stopPropagation();
      if (this._options.dblclick) {
        this._dblclicked = 2;
        this._options.dblclick.call(element);
      }
    });
  }

  /** Opens the menu below the reference and marks the active item. */
  open(): void {
    const menu = this.menu;
    if (menu.isOpen()) return;
    const element = this.element;
    element.classList.add("g-active");
    const closed = (): void => {
      element.classList.remove("g-active");
      menu.removeEventListener(MenuCloseEvent, closed);
    };
    menu.addEventListener(MenuCloseEvent, closed);
    const option = this._options.reference;
    let reference: HTMLElement | null | undefined = null;
    if (option) reference = "function" == typeof option ? option() : option;
    if (!reference) reference = element;
    menu.open(reference, MenuPosition.Center, MenuPosition.Right_Bottom, (item) => {
      // jQuery's trigger("menuitemactivate", item); nothing in the old app listened.
      if (typeof CustomEvent === "function")
        element.dispatchEvent(new CustomEvent("menuitemactivate", { bubbles: true, detail: item }));
    });
    if (this._options.getActiveItem && "function" == typeof this._options.getActiveItem) {
      const active = this._options.getActiveItem();
      if (active) menu.setActiveItem(active);
    }
  }

  close(): void {
    if (this.menu.isOpen()) this.menu.close();
  }
}

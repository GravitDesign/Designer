// Old: designer.browser.dev.js module 1501 (GMenuBar).
/**
 * The bar of top-level menus: `nav.g-menu-bar` holding a root Menu
 * (`ul.g-menu.g-menu-root`). Once one of its menus is open, hovering
 * another entry switches to that menu.
 */
import { ActiveMenuManager } from "./active-menu-manager.ts";
import { Menu } from "./menu.ts";
import { MenuItem } from "./menu-item.ts";

export class MenuBar {
  /** Where the old code recorded which kind of menu this is ("menubar"). */
  __which?: string;

  readonly _htmlElement: HTMLElement;
  private _menu: Menu | null = null;

  constructor(menu?: Menu | null) {
    this._htmlElement = document.createElement("nav");
    this._htmlElement.classList.add("g-menu-bar");
    this.setMenu(menu || new Menu(this));
  }

  getMenu(): Menu | null {
    return this._menu;
  }

  /** Whether the open menu is one of this bar's. */
  isActive(): boolean {
    const active = ActiveMenuManager.getActiveMenu();
    return (
      !!(active && active._parent && active._parent instanceof MenuItem) &&
      (active._parent as MenuItem).getMenuBar() === this
    );
  }

  getParent(): null {
    return null;
  }

  getHtmlElement(): HTMLElement {
    return this._htmlElement;
  }

  /** Puts `menu` into the bar, taking it out of wherever it was. */
  setMenu(menu: Menu): void {
    menu.detach();
    this._menu = menu;
    this._menu._parent = this;
    this._menu._htmlElement.classList.add("g-menu-root");
    this._htmlElement.append(this._menu._htmlElement);
    menu.update();
  }

  toString(): string {
    return "[Object GMenuBar]";
  }
}

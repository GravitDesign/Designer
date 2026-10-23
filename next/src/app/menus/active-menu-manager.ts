// Old: designer.browser.dev.js module 1157 (the active menu manager).
/**
 * Tracks the one open top-level menu. While a menu is active, a mouse
 * press or release anywhere (the release only after 250 ms, so the click
 * that opened it doesn't close it) and the Escape key close it, and the
 * Escape modifier change doesn't reach the tools.
 *
 * createActionMenu builds a menu tree from actions the way the main menu
 * build does: categories become submenus, group changes dividers.
 */
import { Locale } from "../../engine/core/locale/locale.ts";
import type { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { ModifiersChangedEvent } from "../../engine/core/modifiers-changed-event.ts";
import { Platform } from "../../engine/core/platform.ts";
import type { Action } from "../actions/action.ts";
import type { Menu } from "./menu.ts";
import type { MenuItem } from "./menu-item.ts";

/** Called with the activated item while a menu opened with a callback is active. */
export type ActivationCallback = (item: MenuItem) => void;

/** While a menu is open, an Escape press stops the other modifier listeners. */
function stopEscape(event: ModifiersChangedEvent): void {
  if (event.changed.escapeKey) event.isImmediatePropagationStopped = true;
}

let activeMenu: Menu | null = null;
let activeActivationCallback: ActivationCallback | null = null;
let mouseLocations: { x: number; y: number }[] | null = null;

function mouseMoveListener(event: globalThis.MouseEvent): void {
  if (!mouseLocations) mouseLocations = [];
  mouseLocations.push({ x: event.pageX, y: event.pageY });
  if (mouseLocations.length > 3) mouseLocations.shift();
}

function mouseUpDownListener(event: globalThis.MouseEvent): void {
  if (event.cancelable) ActiveMenuManager.setActiveMenu(null);
}

function keyDownListener(event: KeyboardEvent): void {
  if (27 == event.keyCode) ActiveMenuManager.setActiveMenu(null);
}

export const ActiveMenuManager = {
  getActiveMenu(): Menu | null {
    return activeMenu;
  },

  /** The last three mouse positions while a menu is active (page coordinates). */
  getMouseLocations(): readonly { x: number; y: number }[] | null {
    return mouseLocations;
  },

  triggerGlobalActivation(item: MenuItem): void {
    if (activeMenu && activeActivationCallback) activeActivationCallback(item);
  },

  /**
   * Makes `menu` the active one. The previous one is closed unless
   * `noClose` (it is closing itself already).
   */
  setActiveMenu(menu: Menu | null, noClose?: boolean, callback?: ActivationCallback | null): void {
    if (activeMenu) {
      Platform.removeEventListener(
        ModifiersChangedEvent,
        stopEscape,
        activeMenu && activeMenu.getHtmlElement(),
      );
      if (!noClose) activeMenu.close();
      activeMenu = null;
      activeActivationCallback = null;
      document.removeEventListener("mousemove", mouseMoveListener);
      document.removeEventListener("mousedown", mouseUpDownListener);
      document.removeEventListener("mouseup", mouseUpDownListener);
      document.removeEventListener("keydown", keyDownListener);
    }
    activeMenu = menu;
    activeActivationCallback = callback || null;
    if (activeMenu) {
      Platform.addEventListener(
        ModifiersChangedEvent,
        stopEscape,
        (menu as Menu).getHtmlElement(),
        null,
        true,
      );
      document.addEventListener("mousemove", mouseMoveListener);
      document.addEventListener("mousedown", mouseUpDownListener);
      setTimeout(() => {
        // Kept from the old code: this runs even when the menu closed in
        // the meantime, so a later release closes whatever is active then.
        document.addEventListener("mouseup", mouseUpDownListener);
      }, 250);
      document.addEventListener("keydown", keyDownListener);
    }
  },

  /**
   * Adds an item per available action to `menu`, nested by category,
   * divided by group. Nothing in the old app called it.
   */
  createActionMenu(actions: readonly Action[], menu: Menu): void {
    const groups: { item: MenuItem; group: string | null }[] = [];
    const groupOf = (item: MenuItem | null): string | null | undefined => {
      for (const entry of groups) if (entry.item === item) return entry.group;
      return undefined;
    };
    const add = (target: Menu, item: MenuItem, group: string | null): void => {
      if (target.getItemCount() > 0 && groupOf(target.getItem(target.getItemCount() - 1)) !== group)
        target.addItem(menu.createDivider());
      groups.push({ item, group });
    };
    for (const action of actions) {
      if (!action.isAvailable()) continue;
      // As before: the category goes to Locale.get as it is.
      const label = Locale.get(action.getCategory() as unknown as LocaleKey) as unknown;
      let group = action.getGroup();
      const categories = typeof label === "string" && label ? label.split("/") : null;
      const groupParts = group ? [""].concat(group.split("/")) : null;
      if (groupParts && categories && categories.length !== groupParts.length - 1)
        throw new Error("Number of categories different thant number of groups.");
      let current = menu;
      if (categories)
        for (let p = 0; p < categories.length; ++p) {
          const caption = categories[p] as string;
          group = groupParts ? (groupParts[p] as string) : null;
          let item = current.findItem(caption);
          if (!item) {
            item = menu.createMenuItem(true);
            item.setCaption(caption);
            add(current, item, group);
            current.addItem(item);
          }
          current = item.getMenu() as Menu;
        }
      const item = menu.createMenuItem();
      item.setAction(action);
      add(current, item, groupParts ? (groupParts[groupParts.length - 1] as string) : null);
      current.addItem(item);
    }
  },
};

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ActiveMenuManager } from "../menus/active-menu-manager.ts";
import { Menu } from "../menus/menu.ts";
import {
  fake,
  fire,
  installFakeDom,
  type FakeDomHandle,
} from "../menus/testing/fake-dom.testing.ts";
import { MenuButton } from "./menu-button.ts";

let dom: FakeDomHandle;
beforeEach(() => {
  dom = installFakeDom();
  vi.useFakeTimers();
});
afterEach(() => {
  ActiveMenuManager.setActiveMenu(null, true);
  vi.useRealTimers();
  dom.uninstall();
});

function button(): HTMLElement {
  const element = dom.document.createElement("button");
  dom.document.body.append(element);
  element.box = { left: 20, top: 10, width: 30, height: 20 };
  return element as unknown as HTMLElement;
}

describe("MenuButton", () => {
  it("toggles its menu on mouse down and is g-active while it is open", () => {
    const element = button();
    const menu = new Menu();
    menu.createAddItem("A");
    new MenuButton(element, { menu });
    expect([...fake(element).classList]).toEqual(["g-menu-button"]);
    fire(element, "mousedown");
    expect(menu.isOpen()).toBe(true);
    expect([...fake(element).classList]).toEqual(["g-menu-button", "g-active"]);
    // Below the button.
    expect(fake(menu.getHtmlElement()).getAttribute("style")).toBe("left: 20px; top: 30px;");
    fire(element, "mousedown");
    expect(menu.isOpen()).toBe(false);
    expect([...fake(element).classList]).toEqual(["g-menu-button"]);
  });

  it("refills its menu from the factory on every press", () => {
    const element = button();
    let round = 0;
    const handle = new MenuButton(element, {
      menu: () => {
        const menu = new Menu();
        menu.createAddItem("round " + round++);
        return menu;
      },
    });
    expect(handle.menu.getItem(0)?.getCaption()).toBe("round 0");
    fire(element, "mousedown");
    expect(handle.menu.getItemCount()).toBe(1);
    expect(handle.menu.getItem(0)?.getCaption()).toBe("round 1");
  });

  it("runs the default action on a click and opens the menu only when held", () => {
    const element = button();
    const menu = new Menu();
    const defaultAction = vi.fn();
    new MenuButton(element, { menu, defaultAction });
    fire(element, "mousedown");
    fire(element, "mouseup");
    expect(defaultAction).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(300);
    expect(menu.isOpen()).toBe(false);
    fire(element, "mousedown");
    vi.advanceTimersByTime(250);
    expect(menu.isOpen()).toBe(true);
    fire(element, "mouseup");
    expect(defaultAction).toHaveBeenCalledTimes(1);
  });

  it("waits for a double click, which calls dblclick instead of opening", () => {
    const element = button();
    const menu = new Menu();
    const dblclick = vi.fn();
    new MenuButton(element, { menu, dblclick });
    fire(element, "mousedown");
    fire(element, "mouseup");
    fire(element, "mousedown");
    fire(element, "mouseup");
    fire(element, "dblclick");
    vi.advanceTimersByTime(500);
    expect(dblclick).toHaveBeenCalledTimes(1);
    expect(menu.isOpen()).toBe(false);
    // A single press opens it after the wait.
    fire(element, "mousedown");
    vi.advanceTimersByTime(500);
    expect(menu.isOpen()).toBe(true);
  });

  it("opens next to the reference and marks the active item", () => {
    const element = button();
    const reference = dom.document.createElement("span");
    dom.document.body.append(reference);
    reference.box = { left: 100, top: 50, width: 10, height: 10 };
    const menu = new Menu();
    const item = menu.createAddItem("A");
    new MenuButton(element, {
      menu,
      reference: () => reference as unknown as HTMLElement,
      getActiveItem: () => item,
    });
    fire(element, "mousedown");
    expect(fake(menu.getHtmlElement()).getAttribute("style")).toBe("left: 100px; top: 60px;");
    expect(item.isActive()).toBe(true);
  });
});

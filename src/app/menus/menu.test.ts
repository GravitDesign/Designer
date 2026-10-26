import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Key } from "../../engine/core/key.ts";
import { Action, type Shortcut } from "../actions/action.ts";
import { ActiveMenuManager } from "./active-menu-manager.ts";
import { Menu, MenuPosition } from "./menu.ts";
import { MenuActivateEvent } from "./menu-activate-event.ts";
import { MenuBar } from "./menu-bar.ts";
import { MenuCloseEvent } from "./menu-close-event.ts";
import { MenuItem } from "./menu-item.ts";
import { MenuOpenEvent } from "./menu-open-event.ts";
import {
  fake,
  FakeElement,
  fire,
  installFakeDom,
  type FakeDomHandle,
} from "./testing/fake-dom.testing.ts";

class TestAction extends Action {
  enabled = true;
  checked = false;
  runs = 0;
  constructor(
    private readonly _id: string,
    private readonly _title: string,
    private readonly _shortcut: Shortcut | null = null,
  ) {
    super();
  }
  override getId(): string {
    return this._id;
  }
  override getTitle(): string {
    return this._title;
  }
  override getShortcut(): Shortcut | null {
    return this._shortcut;
  }
  override isEnabled(): boolean {
    return this.enabled;
  }
  override isCheckable(): boolean {
    return true;
  }
  override isChecked(): boolean {
    return this.checked;
  }
  override execute(): void {
    this.runs++;
  }
}

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

const classes = (element: unknown): string[] => [...fake(element).classList];

describe("MenuItem", () => {
  it("builds the old item structure with hidden icon, shortcut and detach spans", () => {
    const item = new MenuItem();
    const li = fake(item._htmlElement);
    expect(li.tagName).toBe("LI");
    expect(classes(li)).toEqual(["g-menu-item"]);
    expect(li.children.map((c) => c.className)).toEqual([
      "g-menu-item-icon",
      "g-menu-item-caption",
      "g-menu-item-info",
      "g-menu-item-shortcut",
      "g-menu-item-detach gravit-icon-detach",
      "g-menu-item-tail",
    ]);
    expect(li.children.map((c) => c.getAttribute("style"))).toEqual([
      "display: none;",
      null,
      null,
      "display: none;",
      "display: none;",
      null,
    ]);
    const divider = new MenuItem(MenuItem.Type.Divider);
    expect(classes(divider._htmlElement)).toEqual(["g-menu-item", "g-menu-item-divider"]);
    expect(fake(divider._htmlElement).children).toHaveLength(0);
  });

  it("keeps classes in the order they were set, and an emptied style attribute", () => {
    const item = new MenuItem();
    item.setShortcutHint([Key.Constant.META, "S"]);
    item.setEnabled(false);
    item.setChecked(true);
    item.setEnabled(true);
    item.setEnabled(false);
    expect(classes(item._htmlElement)).toEqual([
      "g-menu-item",
      "has-shortcut",
      "g-menu-item-checked",
      "g-disabled",
    ]);
    const shortcut = fake(item._htmlElement).children[3];
    expect(shortcut?.getAttribute("style")).toBe("");
    expect(shortcut?.textContent).toBe(Key.shortcutToString([Key.Constant.META, "S"]));
  });

  it("shows captions as text and icons as an <i> with the class names", () => {
    // The fake innerHTML keeps markup as text, so the test watches its setter.
    const asHtml = vi.spyOn(FakeElement.prototype, "innerHTML", "set");
    const item = new MenuItem();
    item.setCaption("<b>Layer</b> &amp;");
    const caption = fake(item._htmlElement).children[1];
    expect(caption?.textContent).toBe("<b>Layer</b> &amp;");
    expect(caption?.children).toHaveLength(0);
    expect(asHtml).not.toHaveBeenCalled();
    asHtml.mockRestore();
    item.setIcon('<svg class="x"');
    const icon = fake(item._htmlElement).children[0];
    expect(icon?.getAttribute("style")).toBe("");
    expect(classes(icon?.children[0])).toEqual(["<svg", 'class="x"']);
    expect(classes(item._htmlElement)).toEqual(["g-menu-item", "has-icon"]);
    item.setIcon(null);
    expect(icon?.getAttribute("style")).toBe("display: none;");
    expect(classes(item._htmlElement)).toEqual(["g-menu-item"]);
  });

  it("hides the whole item when its info goes from set to empty, as before", () => {
    const item = new MenuItem();
    item.setInfo("info");
    expect(fake(item._htmlElement).getAttribute("style")).toBe(null);
    item.setInfo(null);
    expect(fake(item._htmlElement).getAttribute("style")).toBe("display: none;");
  });

  it("takes title, shortcut and state from its action and refreshes on update", () => {
    const action = new TestAction("a.b", "Title", [Key.Constant.META, "B"]);
    const item = new MenuItem();
    item.setAction(action);
    expect(fake(item._htmlElement).children[1]?.textContent).toBe("Title");
    expect(classes(item._htmlElement)).toEqual(["g-menu-item", "has-shortcut"]);
    action.enabled = false;
    action.checked = true;
    const updates = vi.fn();
    item.addEventListener(MenuItem.UpdateEvent, updates);
    item.update();
    expect(item.isEnabled()).toBe(false);
    expect(item.isChecked()).toBe(true);
    expect(updates).toHaveBeenCalledTimes(1);
  });

  it("treats an undefined checked or active state as off, as the old add/removeClass did", () => {
    const action = new TestAction("a.b", "Title");
    action.isChecked = () => undefined as unknown as boolean;
    const item = new MenuItem();
    item.setAction(action);
    item.update();
    expect(item.isChecked()).toBe(false);
    item.update();
    expect(item.isChecked()).toBe(false);
    item.changeActiveState(undefined);
    expect(item.isActive()).toBe(false);
  });

  it("runs the action on mouse up and closes the active menu", () => {
    const action = new TestAction("a.b", "Title");
    const menu = new Menu();
    const item = menu.createAddItem(action);
    const activated = vi.fn();
    const menuActivated = vi.fn();
    item.addEventListener(MenuItem.ActivateEvent, activated);
    menu.addEventListener(MenuActivateEvent, menuActivated);
    menu.open({ x: 10, y: 20 });
    expect(ActiveMenuManager.getActiveMenu()).toBe(menu);
    fire(item._htmlElement, "mouseup");
    expect(action.runs).toBe(1);
    expect(activated).toHaveBeenCalledTimes(1);
    expect((menuActivated.mock.calls[0]?.[0] as MenuActivateEvent).item).toBe(item);
    expect(ActiveMenuManager.getActiveMenu()).toBe(null);
    expect(menu.isOpen()).toBe(false);
  });

  it("doesn't run a disabled action, and right clicks do nothing", () => {
    const action = new TestAction("a.b", "Title");
    const menu = new Menu();
    const item = menu.createAddItem(action);
    menu.open({ x: 0, y: 0 });
    fire(item._htmlElement, "mouseup", { button: 2 });
    expect(action.runs).toBe(0);
    expect(menu.isOpen()).toBe(true);
    action.enabled = false;
    item.update();
    fire(item._htmlElement, "mouseup");
    expect(action.runs).toBe(0);
  });

  it("adds g-hover on enter and removes it on leave, unless noHover", () => {
    const menu = new Menu();
    const item = menu.createAddItem("A");
    fire(item._htmlElement, "mouseover");
    expect(classes(item._htmlElement)).toContain("g-hover");
    fire(item._htmlElement, "mouseout");
    expect(classes(item._htmlElement)).not.toContain("g-hover");
    item.setNoHover(true);
    fire(item._htmlElement, "mouseover");
    expect(classes(item._htmlElement)).not.toContain("g-hover");
  });
});

describe("Menu", () => {
  it("inserts items before the next one only outside the last two places, as before", () => {
    const menu = new Menu();
    const a = menu.createAddItem("a");
    const b = menu.createAddItem("b");
    const c = menu.createAddItem("c");
    // Index 1 of three: inserted.
    const x = menu.createInsertItem(1, "x");
    expect(fake(menu._htmlElement).children.map((li) => li.textContent)).toEqual([
      "a",
      "x",
      "b",
      "c",
    ]);
    // Index 3 of four: 3 + 1 is not below 4, so it is appended.
    const y = menu.createInsertItem(3, "y");
    expect(fake(menu._htmlElement).children.map((li) => li.textContent)).toEqual([
      "a",
      "x",
      "b",
      "c",
      "y",
    ]);
    expect(menu.indexOf(y)).toBe(4);
    menu.removeItem(menu.indexOf(x));
    expect(x.getParent()).toBe(null);
    expect(menu.findItem("b")).toBe(b);
    menu.clearItems();
    expect(menu.getItemCount()).toBe(0);
    expect(a.getParent()).toBe(null);
    expect(c._htmlElement.parentElement).toBe(null);
  });

  it("opens at a point in body, flips into the window and records the side", () => {
    const menu = new Menu();
    menu.createAddItem("a");
    const ul = fake(menu._htmlElement);
    ul.box = { left: 0, top: 0, width: 200, height: 100 };
    const opened = vi.fn();
    menu.addEventListener(MenuOpenEvent, opened);
    menu.open({ x: 900, y: 700 }, MenuPosition.Right_Bottom, MenuPosition.Right_Bottom);
    expect(ul.parentElement).toBe(dom.document.body);
    // 900 + 200 > 1024 and 700 + 100 > 768: flipped to the other side.
    expect(ul.getAttribute("style")).toBe("left: 700px; top: 600px;");
    expect(classes(ul)).toEqual(["g-menu", "g-menu-right", "g-menu-bottom"]);
    expect(opened).toHaveBeenCalledTimes(1);
    const closed = vi.fn();
    menu.addEventListener(MenuCloseEvent, closed);
    menu.close();
    expect(ul.parentElement).toBe(null);
    expect(classes(ul)).toEqual(["g-menu"]);
    expect(closed).toHaveBeenCalledTimes(1);
  });

  it("opens next to an element below it, as the menu bar entries do", () => {
    const menu = new Menu();
    menu.createAddItem("a");
    fake(menu._htmlElement).box = { left: 0, top: 0, width: 150, height: 300 };
    const button = dom.document.createElement("div");
    dom.document.body.append(button);
    button.box = { left: 10, top: 5, width: 40, height: 27 };
    menu.open(button as unknown as HTMLElement, MenuPosition.Center, MenuPosition.Right_Bottom);
    expect(fake(menu._htmlElement).getAttribute("style")).toBe("left: 10px; top: 32px;");
    expect(classes(menu._htmlElement)).toEqual(["g-menu", "g-menu-bottom"]);
  });

  it("closes on Escape and on a mouse down anywhere while active", () => {
    const menu = new Menu();
    menu.createAddItem("a");
    menu.open({ x: 0, y: 0 });
    fire(dom.document.body, "keydown", { keyCode: 27 });
    expect(menu.isOpen()).toBe(false);
    menu.open({ x: 0, y: 0 });
    fire(dom.document.body, "mousedown");
    expect(menu.isOpen()).toBe(false);
    // The release closes only after 250 ms.
    menu.open({ x: 0, y: 0 });
    fire(dom.document.body, "mouseup");
    expect(menu.isOpen()).toBe(true);
    vi.advanceTimersByTime(250);
    fire(dom.document.body, "mouseup");
    expect(menu.isOpen()).toBe(false);
  });

  it("opens submenus on hover and closes them with the parent", () => {
    const menu = new Menu();
    const sub = new MenuItem(MenuItem.Type.Menu, Menu);
    sub.setCaption("Sub");
    menu.addItem(sub);
    (sub.getMenu() as Menu).createAddItem("child");
    menu.open({ x: 0, y: 0 });
    fire(sub._htmlElement, "mouseover");
    const subMenu = sub.getMenu() as Menu;
    expect(subMenu.isOpen()).toBe(true);
    expect(subMenu.isSubMenu()).toBe(true);
    // A submenu does not take over as the active menu.
    expect(ActiveMenuManager.getActiveMenu()).toBe(menu);
    expect(classes(sub._htmlElement)).toEqual([
      "g-menu-item",
      "g-menu-item-menu",
      "g-active",
      "g-hover",
    ]);
    expect(classes(subMenu._htmlElement)).toEqual(["g-menu", "g-menu-right"]);
    menu.close();
    expect(subMenu.isOpen()).toBe(false);
    expect(classes(sub._htmlElement)).toEqual(["g-menu-item", "g-menu-item-menu", "g-hover"]);
  });

  it("updates dividers from their visibility callback", () => {
    let visible = false;
    const menu = new Menu();
    const divider = new MenuItem(MenuItem.Type.Divider, null, null, () => visible);
    menu.addItem(divider);
    menu.update();
    expect(fake(divider._htmlElement).getAttribute("style")).toBe("display: none;");
    visible = true;
    menu.update();
    expect(fake(divider._htmlElement).getAttribute("style")).toBe("");
  });
});

describe("MenuBar", () => {
  it("hosts the root menu and switches menus on hover once one is open", () => {
    const root = new Menu();
    const file = new MenuItem(MenuItem.Type.Menu, Menu);
    file.setCaption("File");
    root.addItem(file);
    (file.getMenu() as Menu).createAddItem("New");
    const edit = new MenuItem(MenuItem.Type.Menu, Menu);
    edit.setCaption("Edit");
    root.addItem(edit);
    (edit.getMenu() as Menu).createAddItem("Undo");
    const bar = new MenuBar(root);
    dom.document.body.append(fake(bar._htmlElement));
    expect(classes(root._htmlElement)).toEqual(["g-menu", "g-menu-root"]);
    expect(file.isRootItem()).toBe(true);
    expect(file.getMenuBar()).toBe(bar);
    // Hover alone doesn't open a top-level menu.
    fire(file._htmlElement, "mouseover");
    expect((file.getMenu() as Menu).isOpen()).toBe(false);
    fire(file._htmlElement, "mousedown");
    expect((file.getMenu() as Menu).isOpen()).toBe(true);
    expect(bar.isActive()).toBe(true);
    expect(classes(bar._htmlElement)).toEqual(["g-menu-bar", "g-active"]);
    fire(edit._htmlElement, "mouseover");
    expect((edit.getMenu() as Menu).isOpen()).toBe(true);
    expect((file.getMenu() as Menu).isOpen()).toBe(false);
    expect(ActiveMenuManager.getActiveMenu()).toBe(edit.getMenu());
  });
});

describe("Menu classes", () => {
  it("adds several space-separated classes like jQuery addClass", () => {
    const menu = new Menu(null, "g-assistant-bar-menu paste-menu");
    expect(Array.from(menu._htmlElement.classList)).toEqual([
      "g-menu",
      "g-assistant-bar-menu",
      "paste-menu",
    ]);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Menu } from "../menus/menu.ts";
import { MenuItem } from "../menus/menu-item.ts";
import { ActiveMenuManager } from "../menus/active-menu-manager.ts";
import {
  fake,
  fire,
  installFakeDom,
  type FakeDomHandle,
  type FakeElement,
} from "../menus/testing/fake-dom.testing.ts";
import { Runtime } from "../shell/container.ts";
import { resetGlobals, setContainer } from "../shell/globals.ts";
import { MenuButton } from "../widgets/menu-button.ts";
import { Toolbar } from "./toolbar.ts";
import { setup, TestAction, type Fixture } from "./toolbar-fixture.testing.ts";

let dom: FakeDomHandle;
let toolbarElement: FakeElement;
beforeEach(() => {
  dom = installFakeDom();
  vi.useFakeTimers();
  toolbarElement = dom.document.createElement("div");
  dom.document.body.append(toolbarElement);
});
afterEach(() => {
  ActiveMenuManager.setActiveMenu(null, true);
  vi.useRealTimers();
  resetGlobals();
  dom.uninstall();
});

function fakeWindow(title: string, zoom = 1) {
  const document = { modified: false, isModified: () => document.modified };
  return {
    document,
    getTitleWithExtension: () => title,
    getDocument: () => document,
    getView: () => ({ getZoom: () => zoom, addEventListener() {}, removeEventListener() {} }),
  };
}

/** A touch designer: the fixture plus the actions and calls the touch parts use. */
function touchSetup(): Fixture & { mainMenu: Menu } {
  const f = setup();
  for (const [id, title] of [
    ["file.open", "Open"],
    ["file.save-as.gvdesign", "Save As"],
    ["view.zoom.fit.all", "Fit All"],
    ["view.zoom.fit-selection", "Fit Selection"],
    ["view.magnification.50", "50%"],
    ["view.magnification.100", "100%"],
    ["view.magnification.200", "200%"],
    ["view.magnification.400", "400%"],
  ] as const)
    f.actions.set(id, new TestAction(id, title));
  const mainMenu = new Menu();
  Object.assign(f.designer, {
    isTouchEnabled: () => true,
    getMainMenu: () => mainMenu,
  });
  return Object.assign(f, { mainMenu });
}

function touchToolbar(): Toolbar {
  const toolbar = new Toolbar(toolbarElement as unknown as HTMLElement);
  toolbar.init();
  toolbar._touch.updateTouchUI();
  return toolbar;
}

const find = (selector: string): FakeElement => {
  const found = toolbarElement.querySelector(selector);
  if (!found) throw new Error("not found: " + selector);
  return found;
};

/** The menu button inside (or on) a toolbar button. */
function menuButtonIn(element: FakeElement): MenuButton {
  const target = element.classList.contains("g-menu-button")
    ? element
    : (element.querySelectorAll(".g-menu-button")[0] as FakeElement);
  return MenuButton.of(target as unknown as Element) as MenuButton;
}

const captions = (menu: Menu): string[] =>
  fake(menu.getHtmlElement()).children.map((li) =>
    li.classList.contains("g-menu-item-divider") ? "---" : (li.children[1]?.textContent ?? ""),
  );

describe("TouchToolbar", () => {
  it("adds the menu section in front, in the old order", () => {
    touchSetup();
    touchToolbar();
    const section = toolbarElement.children[0] as FakeElement;
    expect(section.className).toBe("section menu-section g-touch-only");
    expect(section.children.map((c) => c.className)).toEqual([
      "toolbar-button menubar-toolbar-button",
      "toolbar-button dropdown open-toolbar-button",
      "toolbar-button dropdown save-toolbar-button",
      "toolbar-button dropdown undo-toolbar-button",
      "zoom-button toolbar-button action-button g-menu-button dropdown",
      "toolbar-button dropdown snap-button",
    ]);
  });

  it("gives the save menu the default save as and two empty rows for the cloud actions", () => {
    touchSetup();
    touchToolbar();
    const save = find(".save-toolbar-button");
    expect(save.getAttribute("data-action")).toBe("file.save");
    expect(captions(menuButtonIn(save).menu)).toEqual(["Save As", "", ""]);
  });

  it("lists open and the recent files in the Open menu", () => {
    const f = touchSetup();
    const opened: unknown[] = [];
    f.designer.openDocument = (item: unknown) => opened.push(item);
    const recent = [{ getName: () => "Poster" }, { getName: () => "Flyer" }];
    setContainer({
      getRuntime: () => Runtime.Browser,
      getRecentDocuments: () => recent,
    } as never);
    const toolbar = touchToolbar();
    const menu = toolbar._createOpenMenu();
    expect(captions(menu)).toEqual(["Open", "---", "Recent Files:", "Poster", "Flyer"]);
    expect((menu.getItem(2) as MenuItem).isEnabled()).toBe(false);
    (menu.getItem(4) as MenuItem).activate();
    expect(opened).toEqual([recent[1]]);
  });

  it("marks the magnification item of the rounded zoom as active", () => {
    const f = touchSetup();
    f.windows.active = fakeWindow("Poster", 1.0004);
    touchToolbar();
    const zoom = find(".menu-section > .zoom-button");
    const button = menuButtonIn(zoom);
    fire(zoom, "mousedown");
    expect(button.menu.isOpen()).toBe(true);
    expect(captions(button.menu)).toEqual([
      "Fit All",
      "Fit Selection",
      "50%",
      "100%",
      "200%",
      "400%",
    ]);
    expect(button.menu.getActiveItem()).toBe(button.menu.getItem(3));
  });

  it("puts a rebuilt zoom button back before the snap button", () => {
    touchSetup();
    const toolbar = touchToolbar();
    find(".menu-section > .zoom-button").remove();
    toolbar._touch.updateTouchUI();
    const section = toolbarElement.children[0] as FakeElement;
    const names = section.children.map((c) => c.className);
    expect(names.findIndex((n) => n.includes("zoom-button"))).toBe(
      names.findIndex((n) => n.includes("snap-button")) - 1,
    );
    expect(fake(toolbar._touchZoomButton)).toBe(find(".menu-section > .zoom-button"));
  });

  it("shows the active document's title on the window button, with a star when modified", () => {
    const f = touchSetup();
    const window = fakeWindow("Poster.gvdesign");
    f.windows.active = window;
    const toolbar = touchToolbar();
    const button = find(".window-button");
    const caption = button.querySelector(".action-button > .caption") as FakeElement;
    expect(button.style.display).toBe("");
    expect(caption.textContent).toBe("Poster.gvdesign");
    expect(button.classList.contains("text-overflow")).toBe(false);
    window.document.modified = true;
    Object.assign(caption, { scrollWidth: 500 });
    toolbar._touch.updateActiveWindow();
    expect(caption.textContent).toBe("Poster.gvdesign*");
    expect(button.classList.contains("text-overflow")).toBe(true);
    const endings = button.querySelectorAll(".ending");
    expect(endings.map((e) => e.getAttribute("data-ending"))).toEqual(["...gn*"]);
    toolbar._touch.updateActiveWindow();
    expect(button.querySelectorAll(".ending")).toHaveLength(1);
    f.windows.active = null;
    toolbar._touch.updateActiveWindow();
    expect(button.style.display).toBe("none");
  });

  it("lists the windows in the window menu; picking activates, detaching closes", () => {
    const f = touchSetup();
    const first = fakeWindow("Poster");
    const second = fakeWindow("Flyer");
    second.document.modified = true;
    f.windows.list = [first, second];
    f.windows.active = second;
    touchToolbar();
    const button = menuButtonIn(find(".window-button"));
    button.open();
    expect(captions(button.menu)).toEqual(["Poster", "Flyer*"]);
    expect(button.menu.getActiveItem()).toBe(button.menu.getItem(1));
    (button.menu.getItem(0) as MenuItem).activate();
    expect(f.windows.activated).toEqual([[first, true]]);
    (button.menu.getItem(1) as MenuItem).trigger(new MenuItem.DetachEvent());
    expect(f.windows.removed).toEqual([second]);
  });

  it("adds the native window button on Electron", () => {
    touchSetup();
    setContainer({
      getRuntime: () => Runtime.Electron,
      getRecentDocuments: () => [],
    } as never);
    touchToolbar();
    const native = find(".export-section > .native-button");
    expect(native.className).toContain("g-touch-only");
  });
});

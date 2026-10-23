import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EventTarget } from "../../engine/core/event-target.ts";
import { DocumentEvent } from "../document/document-event.ts";
import { resetGlobals, setDesigner } from "../shell/globals.ts";
import type { Window } from "../shell/window.ts";
import { WindowEvent } from "../shell/windows.ts";
import { duplicateTitle, Header, windowOfTab } from "./header.ts";
import { Menu } from "./menu.ts";
import { fake, fire, installFakeDom, type FakeDomHandle } from "./testing/fake-dom.testing.ts";

class FakeWindows extends EventTarget {
  active: unknown = null;
  readonly activated: unknown[] = [];
  readonly removed: unknown[] = [];
  readonly list: unknown[] = [];
  getWindows(): unknown[] {
    return this.list;
  }
  getActiveWindow(): unknown {
    return this.active;
  }
  activateWindow(window: unknown): void {
    this.activated.push(window);
  }
  removeWindow(window: unknown): void {
    this.removed.push(window);
  }
  getWindow(): unknown {
    return null;
  }
}

class FakeDesigner extends EventTarget {
  readonly windows = new FakeWindows();
  readonly menu = new Menu();
  getMainMenu(): Menu {
    return this.menu;
  }
  getWindows(): FakeWindows {
    return this.windows;
  }
  getActiveDocument(): null {
    return null;
  }
  isBeta(): boolean {
    return false;
  }
  isTouchEnabled(): boolean {
    return false;
  }
}

function fakeWindow(title: string, modified = false) {
  const document = {
    modified,
    windows: [] as unknown[],
    getWindows() {
      return this.windows;
    },
    isModified() {
      return this.modified;
    },
  };
  const window = {
    getTitle: () => title,
    getTitleWithExtension: () => title,
    getDocument: () => document,
  };
  document.windows.push(window);
  return { window: window as unknown as Window, document };
}

let dom: FakeDomHandle;
let designer: FakeDesigner;
let header: Header;
let part: ReturnType<FakeDomHandle["document"]["createElement"]>;

beforeEach(() => {
  dom = installFakeDom();
  designer = new FakeDesigner();
  setDesigner(designer as never);
  part = dom.document.createElement("div");
  dom.document.body.append(part);
  header = new Header(part as unknown as HTMLElement);
  header.init();
});
afterEach(() => {
  resetGlobals();
  dom.uninstall();
});

const tabs = () => part.querySelectorAll(".tab");

describe("Header", () => {
  it("builds the sections in the old order with the main menu in the bar", () => {
    expect(part.children.map((c) => c.className)).toEqual([
      "section menu",
      "section persona",
      "section windows",
      "section busy",
    ]);
    const nav = part.children[0]?.children[0];
    expect(nav?.className).toBe("g-menu-bar");
    expect(nav?.children[0]).toBe(fake(designer.menu.getHtmlElement()));
    expect(fake(designer.menu.getHtmlElement()).className).toBe("g-menu g-menu-root");
    // The browser drops the placeholder colour; the fake keeps it.
    expect(part.children[3]?.getAttribute("style")).toMatch(/^display: none;/);
  });

  it("adds a tab per window with its title, close button and active state", () => {
    const first = fakeWindow("Untitled-1");
    const second = fakeWindow("Poster");
    designer.windows.trigger(new WindowEvent(WindowEvent.Type.Added, first.window));
    designer.windows.trigger(new WindowEvent(WindowEvent.Type.Added, second.window, 0));
    expect(tabs().map((t) => t.querySelector(".cover")?.textContent)).toEqual([
      "Poster",
      "Untitled-1",
    ]);
    const tab = tabs()[1];
    expect(windowOfTab(tab as unknown as Element)).toBe(first.window);
    expect(tab?.children.map((c) => c.className)).toEqual(["title", "close"]);
    expect(tab?.querySelector("input")?.getAttribute("style")).toBe("display: none;");
    expect(tab?.querySelector(".close")?.getAttribute("style")).toBe("pointer-events: auto;");
    designer.windows.active = first.window;
    designer.windows.trigger(new WindowEvent(WindowEvent.Type.Activated, first.window));
    expect(tabs().map((t) => t.classList.contains("g-active"))).toEqual([false, true]);
    fire(tab, "click");
    expect(designer.windows.activated).toEqual([first.window]);
    fire(tab?.querySelector(".close"), "click");
    expect(designer.windows.removed).toEqual([first.window]);
    expect(designer.windows.activated).toHaveLength(1);
    designer.windows.trigger(new WindowEvent(WindowEvent.Type.Removed, first.window));
    expect(tabs()).toHaveLength(1);
  });

  it("marks a modified document's tab with a star and adds the sync status", () => {
    const { window, document } = fakeWindow("Untitled-1");
    designer.windows.trigger(new WindowEvent(WindowEvent.Type.Added, window));
    document.modified = true;
    designer.trigger(new DocumentEvent(DocumentEvent.Type.Modified, document as never));
    const tab = tabs()[0];
    expect(tab?.querySelector(".cover")?.textContent).toBe("Untitled-1*");
    expect(tab?.querySelector("input")?.value).toBe("Untitled-1*");
  });
});

describe("duplicateTitle", () => {
  it("appends (1) or counts up the number at the end", () => {
    expect(duplicateTitle("Poster")).toBe("Poster(1)");
    expect(duplicateTitle("Poster(4)")).toBe("Poster(5)");
    expect(duplicateTitle("Poster (9) x")).toBe("Poster (9) x(1)");
  });
});

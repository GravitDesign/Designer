import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FakeDocument,
  FakeElement,
  FakeEvent,
  installFakeDom,
  type FakeDomHandle,
} from "../menus/testing/fake-dom.testing.ts";
import type { Designer } from "./designer.ts";
import { resetGlobals, setDesigner } from "./globals.ts";
import type { Window } from "./window.ts";

/** The header's tab -> window table (menus/header.ts windowOfTab). */
const tabWindows = new WeakMap<object, Window>();
vi.mock("../menus/header.ts", () => ({
  windowOfTab: (tab: object) => tabWindows.get(tab) || null,
}));

const { allowRearrangeTabs, toggleRearrangeTabsVisibility, updateTabsInterface } =
  await import("./tabs-rearrange.ts");

/*
 * Layout of the fake page: the tabs row starts at x = 100, y = 90 and is
 * `rowWidth` wide; every tab has an 8 px left margin, no padding or
 * border, is 24 px high and wraps to the next line when it doesn't fit.
 * An absolutely positioned tab sits at its style left (plus margin).
 */
const ROW_LEFT = 100;
const ROW_TOP = 90;
const MARGIN = 8;
let rowWidth = 1000;

function isHidden(element: FakeElement): boolean {
  for (let n: FakeElement | null = element; n; n = n.parentElement)
    if (n.style.getPropertyValue("display") === "none" || n.classList.contains("hide")) return true;
  return false;
}

function isTab(element: FakeElement): boolean {
  return element.classList.contains("tab");
}

function widthOf(element: FakeElement): number {
  return parseFloat(element.style.getPropertyValue("width")) || element.box.width;
}

function layout(element: FakeElement): {
  left: number;
  top: number;
  width: number;
  height: number;
} {
  const parent = element.parentElement;
  if (parent && parent.classList.contains("tabs")) {
    if (element.style.getPropertyValue("position") === "absolute")
      return {
        left: parseFloat(element.style.getPropertyValue("left")) + MARGIN,
        top: ROW_TOP,
        width: widthOf(element),
        height: 24,
      };
    let x = ROW_LEFT;
    let y = ROW_TOP;
    for (const child of parent.children) {
      if (isHidden(child) || child.style.getPropertyValue("position") === "absolute") {
        if (child === element) return { left: 0, top: 0, width: 0, height: 0 };
        continue;
      }
      if (x + MARGIN + widthOf(child) > ROW_LEFT + rowWidth && x > ROW_LEFT) {
        x = ROW_LEFT;
        y += 24;
      }
      x += MARGIN;
      if (child === element) return { left: x, top: y, width: widthOf(child), height: 24 };
      x += widthOf(child);
    }
  }
  return { ...element.box };
}

function computedStyle(element: FakeElement): Record<string, unknown> {
  const value = (name: string): string => {
    const inline = element.style.getPropertyValue(name);
    switch (name) {
      case "display":
        return isHidden(element) ? "none" : inline || "block";
      case "width":
        return widthOf(element) + "px";
      case "height":
        return inline || (isTab(element) ? "24px" : element.box.height + "px");
      case "position":
        return inline || "static";
      case "top":
      case "left":
        return inline || "auto";
      case "z-index":
        return inline || "auto";
      case "margin-left":
        return isTab(element) ? MARGIN + "px" : "0px";
      case "box-sizing":
        return "content-box";
      case "overflow":
        return "visible";
      default:
        return inline || "0px";
    }
  };
  return {
    getPropertyValue: value,
    position: value("position"),
    overflow: "visible",
    overflowX: "visible",
    overflowY: "visible",
  };
}

function cloneElement(element: FakeElement, deep: boolean): FakeElement {
  const copy = new FakeElement(element.tagName, element.ownerDocument);
  copy.className = element.className;
  for (const [name, value] of element.style._decls) copy.style.setProperty(name, value);
  copy.style._touched = element.style._touched;
  for (const [name, value] of element.attributes) copy.attributes.set(name, value);
  copy.box = { ...element.box };
  copy.value = element.value;
  const own = element as unknown as { _text: string };
  (copy as unknown as { _text: string })._text = own._text;
  if (deep) for (const child of element.children) copy.append(cloneElement(child, true));
  return copy;
}

/** What the module needs beyond the menus' fake DOM. */
function extendFakeDom(handle: FakeDomHandle): void {
  const proto = FakeElement.prototype as unknown as Record<string, unknown>;
  const define = (name: string, get: (this: FakeElement) => unknown) =>
    Object.defineProperty(FakeElement.prototype, name, { configurable: true, get });
  define("nodeName", function () {
    return this.tagName;
  });
  define("parentNode", function () {
    return this.parentElement;
  });
  define("previousElementSibling", function () {
    const list = this.parentElement ? this.parentElement.children : [];
    return list[list.indexOf(this) - 1] ?? null;
  });
  define("nextElementSibling", function () {
    const list = this.parentElement ? this.parentElement.children : [];
    const index = list.indexOf(this);
    return index >= 0 ? (list[index + 1] ?? null) : null;
  });
  define("nextSibling", function () {
    const list = this.parentElement ? this.parentElement.children : [];
    const index = list.indexOf(this);
    return index >= 0 ? (list[index + 1] ?? null) : null;
  });
  define("offsetParent", () => null);
  define("scrollWidth", function () {
    return this.box.width;
  });
  define("scrollHeight", function () {
    return this.box.height;
  });
  proto.scrollTop = 0;
  proto.scrollLeft = 0;
  proto.getBoundingClientRect = function (this: FakeElement) {
    const { left, top, width, height } = layout(this);
    return { left, top, width, height, right: left + width, bottom: top + height, x: left, y: top };
  };
  proto.getClientRects = function (this: FakeElement) {
    return isHidden(this) ? [] : [this.getBoundingClientRect()];
  };
  proto.cloneNode = function (this: FakeElement, deep: boolean) {
    return cloneElement(this, deep);
  };
  proto.click = function (this: FakeElement) {
    this.dispatchEvent(new FakeEvent("click"));
  };
  const docProto = FakeDocument.prototype as unknown as Record<string, unknown>;
  docProto.nodeType = 9;
  Object.defineProperty(FakeDocument.prototype, "defaultView", {
    configurable: true,
    get: () => (globalThis as unknown as { window: unknown }).window,
  });
  docProto.getElementById = function (this: FakeDocument, id: string) {
    return this.querySelectorAll("*").find((el) => el.getAttribute("id") === id) ?? null;
  };
  const g = globalThis as unknown as Record<string, unknown>;
  g.Element = FakeElement;
  g.getComputedStyle = computedStyle;
  (g.window as Record<string, unknown>).getComputedStyle = computedStyle;
  (g.window as Record<string, unknown>).scrollTo = () => {};
  handle.document.body.box = { left: 0, top: 0, width: 1400, height: 1000 };
}

let dom: FakeDomHandle;
let doc: FakeDocument;
let calls: string[];

interface Page {
  mainframe: FakeElement;
  header: FakeElement;
  windows: FakeElement;
  tabs: FakeElement;
  tab: Record<string, FakeElement>;
  window: Record<string, Window>;
}

/** The header as menus/header.ts builds it, with tabs A, B, C (A active). */
function buildPage(titles = ["A", "B", "C"], tabWidth = 60): Page {
  const el = (tag: string, ...classes: string[]): FakeElement => {
    const element = doc.createElement(tag);
    if (classes.length) element.classList.add(...classes);
    return element;
  };
  const mainframe = el("div");
  mainframe.setAttribute("id", "mainframe");
  const header = el("div");
  header.setAttribute("id", "header");
  header.box = { left: 0, top: 80, width: 1400, height: 40 };
  const windows = el("div", "section", "windows");
  windows.box = { left: ROW_LEFT, top: ROW_TOP, width: rowWidth, height: 24 };
  const tabs = el("div", "tabs");
  tabs.box = { left: ROW_LEFT, top: ROW_TOP, width: rowWidth, height: 24 };
  windows.append(tabs);
  header.append(windows);
  mainframe.append(header);
  doc.body.append(mainframe);
  const page: Page = { mainframe, header, windows, tabs, tab: {}, window: {} };
  allowRearrangeTabs(header as unknown as HTMLElement);
  for (const title of titles) {
    const tab = el("div", "tab");
    tab.box = { left: 0, top: 0, width: tabWidth, height: 24 };
    const titleElement = el("div", "title");
    const cover = el("span", "cover");
    cover.textContent = title;
    titleElement.append(cover);
    tab.append(titleElement);
    const close = el("span", "close");
    close.textContent = "x";
    tab.append(close);
    tabs.append(tab);
    const window = { title } as unknown as Window;
    tabWindows.set(tab, window);
    page.tab[title] = tab;
    page.window[title] = window;
    // The header's own tab click handler.
    tab.addEventListener("click", () => {
      activate(window);
    });
  }
  return page;
}

let active: Window | null = null;
let titleOf = new Map<Window, string>();

function activate(window: Window | null): void {
  calls.push(`activate ${window ? titleOf.get(window) : "null"}`);
  active = window;
  for (const tab of doc.querySelectorAll(".tabs > .tab"))
    tab.classList.toggle("g-active", tabWindows.get(tab) === active);
}

function mouse(target: FakeElement, type: string, x: number, y: number): FakeEvent {
  const event = new FakeEvent(type, { pageX: x, pageY: y, button: 0 });
  event.which = 1;
  target.dispatchEvent(event);
  return event;
}

function click(element: FakeElement): void {
  (element as unknown as { click(): void }).click();
}

function order(page: Page): string[] {
  return page.tabs.children.map((child) =>
    child.classList.contains("ui-sortable-placeholder") ? "_" : child.textContent.slice(0, 1),
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  dom = installFakeDom();
  doc = dom.document;
  extendFakeDom(dom);
  calls = [];
  active = null;
  titleOf = new Map();
  rowWidth = 1000;
  setDesigner({
    getWindows: () => ({
      activateWindow: (window: Window, recenter?: boolean) => {
        calls.push(`windows.activateWindow ${titleOf.get(window)} ${String(recenter)}`);
      },
      removeWindow: (window: Window, ...rest: unknown[]) => {
        calls.push(`windows.removeWindow ${titleOf.get(window)} ${rest.map(String).join(",")}`);
      },
    }),
    stats: (...args: unknown[]) => {
      calls.push(`stats ${args.join(" ")}`);
    },
  } as unknown as Designer);
});

afterEach(() => {
  // End a drag a failed test left open (ui.mouse's flag is module-wide).
  doc.dispatchEvent(new FakeEvent("mouseup"));
  vi.useRealTimers();
  resetGlobals();
  dom.uninstall();
});

function setUp(titles?: string[], tabWidth?: number): Page {
  const page = buildPage(titles, tabWidth);
  for (const [title, window] of Object.entries(page.window)) titleOf.set(window, title);
  activate(page.window.A as Window);
  calls.length = 0;
  return page;
}

describe("allowRearrangeTabs", () => {
  it("makes the tabs sortable and adds the more button after the tabs section", () => {
    const page = setUp();
    expect(page.tabs.className).toBe("tabs ui-sortable");
    // Tabs added after the sortable was created get no handle class.
    expect((page.tab.A as FakeElement).className).toBe("tab g-active");
    const button = page.header.children[1] as FakeElement;
    expect(button.className).toBe("more-button");
    expect(button.children.map((c) => c.className)).toEqual(["more-symbol", "moreTab"]);
  });

  it("gives the tabs that already exist the handle class", () => {
    const header = doc.createElement("div");
    const tabs = doc.createElement("div");
    tabs.classList.add("tabs");
    const tab = doc.createElement("div");
    tab.classList.add("tab");
    tabs.append(tab);
    header.append(tabs);
    doc.body.append(header);
    allowRearrangeTabs(header as unknown as HTMLElement);
    expect(tab.className).toBe("tab ui-sortable-handle");
  });
});

describe("dragging a tab", () => {
  it("starts after one pixel with the helper and placeholder styles of jQuery UI", () => {
    const page = setUp();
    const b = page.tab.B as FakeElement;
    const cover = b.querySelector(".cover") as FakeElement;
    // B is at 100 + 8 + 60 + 8 = 176.
    const down = mouse(cover, "mousedown", 186, 100);
    expect(down.defaultPrevented).toBe(true);
    expect(b.className).toBe("tab");
    mouse(cover, "mousemove", 186, 100);
    expect(order(page)).toEqual(["A", "B", "C"]);
    mouse(cover, "mousemove", 187, 100);
    // The activate callback clicked the tab: the header activated it.
    expect(calls).toEqual(["activate B"]);
    expect(b.className).toBe("tab g-active ui-sortable-helper");
    expect(b.getAttribute("style")).toBe(
      "width: 60px; height: 24px; position: absolute; z-index: 1000; left: 169px;",
    );
    const placeholder = page.tabs.children[2] as FakeElement;
    expect(order(page)).toEqual(["A", "B", "_", "C"]);
    // The class list is copied before the click made B active.
    expect(placeholder.className).toBe("ui-sortable-placeholder tab");
    expect(placeholder.getAttribute("style")).toBe("visibility: hidden; width: 60px; height: 1px;");
    mouse(cover, "mouseup", 187, 100);
    vi.advanceTimersByTime(200);
    expect(order(page)).toEqual(["A", "B", "C"]);
  });

  it("moves the placeholder past the middle of the next tab and drops the tab there", () => {
    const page = setUp();
    const b = page.tab.B as FakeElement;
    const cover = b.querySelector(".cover") as FakeElement;
    mouse(cover, "mousedown", 186, 100);
    mouse(cover, "mousemove", 187, 100);
    // C is at 176 + 60 + 8 = 244 (the placeholder keeps B's place); its
    // middle at 274. The pointer is the grab point (186 - 168 = 18) plus
    // the helper position.
    mouse(cover, "mousemove", 250, 100);
    expect(order(page)).toEqual(["A", "B", "_", "C"]);
    mouse(cover, "mousemove", 280, 100);
    expect(order(page)).toEqual(["A", "B", "C", "_"]);
    mouse(cover, "mouseup", 280, 100);
    // The tab glides back for 150 ms before it is put in place.
    expect(order(page)).toEqual(["A", "B", "C", "_"]);
    expect(b.classList.contains("ui-sortable-helper")).toBe(true);
    vi.advanceTimersByTime(80);
    const left = parseFloat(b.style.getPropertyValue("left"));
    expect(left).toBeLessThan(262);
    expect(left).toBeGreaterThan(236);
    vi.advanceTimersByTime(100);
    expect(order(page)).toEqual(["A", "C", "B"]);
    expect(b.className).toBe("tab g-active");
    expect(b.getAttribute("style")).toBe("");
    // Only the DOM changed: no window was moved.
    expect(calls).toEqual(["activate B"]);
  });

  it("moves the placeholder left before a tab when dragging left", () => {
    const page = setUp();
    const c = page.tab.C as FakeElement;
    const cover = c.querySelector(".cover") as FakeElement;
    // C is at 244..304.
    mouse(cover, "mousedown", 260, 100);
    mouse(cover, "mousemove", 259, 100);
    // A spans 108..168, its middle 138.
    mouse(cover, "mousemove", 150, 100);
    expect(order(page)).toEqual(["A", "B", "C", "_"]);
    mouse(cover, "mousemove", 130, 100);
    expect(order(page)).toEqual(["_", "A", "B", "C"]);
    mouse(cover, "mouseup", 130, 100);
    vi.advanceTimersByTime(200);
    expect(order(page)).toEqual(["C", "A", "B"]);
  });

  it("swallows the click that ends a drag on the tabs row", () => {
    const page = setUp();
    const b = page.tab.B as FakeElement;
    const cover = b.querySelector(".cover") as FakeElement;
    let mainframeClicks = 0;
    page.mainframe.addEventListener("click", () => mainframeClicks++);
    mouse(cover, "mousedown", 186, 100);
    mouse(cover, "mousemove", 200, 100);
    mainframeClicks = 0;
    mouse(cover, "mouseup", 200, 100);
    vi.advanceTimersByTime(200);
    const click = mouse(cover, "click", 200, 100);
    expect(mainframeClicks).toBe(0);
    expect(click.defaultPrevented).toBe(true);
    // The next click goes through again.
    mouse(cover, "click", 200, 100);
    expect(mainframeClicks).toBe(1);
  });

  it("doesn't drag from the rename input or with another button", () => {
    const page = setUp();
    const b = page.tab.B as FakeElement;
    const input = doc.createElement("input");
    (b.querySelector(".title") as FakeElement).append(input);
    const down = mouse(input, "mousedown", 186, 100);
    expect(down.defaultPrevented).toBe(false);
    mouse(input, "mousemove", 200, 100);
    expect(b.classList.contains("ui-sortable-helper")).toBe(false);
    mouse(input, "mouseup", 200, 100);
    const right = new FakeEvent("mousedown", { pageX: 186, pageY: 100, button: 2 });
    right.which = 3;
    b.dispatchEvent(right);
    mouse(b, "mousemove", 200, 100);
    expect(b.classList.contains("ui-sortable-helper")).toBe(false);
  });

  it("hides the tabs on the second line while dragging", () => {
    rowWidth = 100;
    const page = setUp();
    // A on the first line, B and C wrap.
    const a = page.tab.A as FakeElement;
    const cover = a.querySelector(".cover") as FakeElement;
    mouse(cover, "mousedown", 120, 100);
    mouse(cover, "mousemove", 121, 100);
    expect((page.tab.B as FakeElement).className).toBe("tab hide");
    expect((page.tab.C as FakeElement).className).toBe("tab hide");
    expect((page.tabs.children[1] as FakeElement).classList.contains("hide")).toBe(false);
    mouse(cover, "mouseup", 121, 100);
    vi.advanceTimersByTime(200);
    expect((page.tab.B as FakeElement).className).toBe("tab");
    expect((page.tab.C as FakeElement).className).toBe("tab");
  });
});

describe("the more button", () => {
  it("lists copies of the tabs with select marks and the old inline style", () => {
    const page = setUp();
    const list = page.header.querySelector(".moreTab") as FakeElement;
    list.box = { left: 0, top: 0, width: 104.265625, height: 0 };
    updateTabsInterface();
    expect(list.getAttribute("style")).toBe("left: -104.265625px; max-height: 950px;");
    expect(list.children.map((c) => c.className)).toEqual(["tab g-active", "tab", "tab"]);
    const first = list.children[0] as FakeElement;
    expect(first.children.map((c) => c.children.map((s) => s.className)[0])).toEqual([
      "select",
      "select",
    ]);
    vi.advanceTimersByTime(99);
    expect(first.querySelectorAll(".more-tab-icon")).toHaveLength(0);
    vi.advanceTimersByTime(1);
    expect(first.querySelectorAll(".select").map((s) => s.className)).toEqual([
      "select more-tab-icon",
      "select more-tab-icon",
    ]);
    // The original tabs are untouched.
    expect((page.tab.A as FakeElement).querySelectorAll(".select")).toHaveLength(0);
  });

  it("activates or closes a tab's window from its copy", () => {
    const page = setUp();
    updateTabsInterface();
    const list = page.header.querySelector(".moreTab") as FakeElement;
    const copyOfC = list.children[2] as FakeElement;
    click(copyOfC.querySelector(".cover") as FakeElement);
    expect(calls[0]).toBe("windows.activateWindow C true");
    calls.length = 0;
    click(copyOfC.querySelector(".close") as FakeElement);
    expect(calls).toEqual(["windows.removeWindow C undefined,undefined,true"]);
  });

  it("opens 10 ms after a click and closes on the next click or a click elsewhere", () => {
    const page = setUp();
    const button = page.header.querySelector(".more-button") as FakeElement;
    click(button);
    expect(calls).toEqual(["stats header_click_more-button Open"]);
    expect(button.className).toBe("more-button");
    vi.advanceTimersByTime(10);
    expect(button.className).toBe("more-button active");
    click(button);
    expect(button.className).toBe("more-button");
    expect(calls[1]).toBe("stats header_click_more-button Close");
    click(button);
    vi.advanceTimersByTime(10);
    click(page.mainframe);
    expect(button.className).toBe("more-button");
  });

  it("moves the active tab in front of the first tab that doesn't fit", () => {
    rowWidth = 200;
    const page = setUp(["A", "B", "C", "D"]);
    activate(page.window.D as Window);
    // 67.5 per tab: the third (index 2) passes 200.
    updateTabsInterface();
    expect(order(page)).toEqual(["A", "B", "C", "D"]);
    vi.advanceTimersByTime(100);
    expect(order(page)).toEqual(["A", "D", "B", "C"]);
    // The list was made before the move; the mark goes to the entry at the
    // active tab's new index, which is B's copy.
    const list = page.header.querySelector(".moreTab") as FakeElement;
    expect(
      list.children.map(
        (c) => (c.querySelector(".more-tab-icon") ? "*" : "") + c.textContent.slice(0, 1),
      ),
    ).toEqual(["A", "*B", "C", "D"]);
  });

  it("is hidden and shown with the tabs", () => {
    const page = setUp();
    const button = page.header.querySelector(".more-button") as FakeElement;
    toggleRearrangeTabsVisibility(page.header as unknown as HTMLElement, false);
    expect(button.getAttribute("style")).toBe("display: none;");
    toggleRearrangeTabsVisibility(page.header as unknown as HTMLElement, true);
    expect(button.getAttribute("style")).toBe("");
  });
});

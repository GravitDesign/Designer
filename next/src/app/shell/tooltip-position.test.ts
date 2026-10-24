import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FakeDocument,
  FakeElement,
  fire,
  installFakeDom,
  type FakeDomHandle,
} from "../menus/testing/fake-dom.testing.ts";
import type * as TooltipModule from "./tooltip-position.ts";

let dom: FakeDomHandle;
let doc: FakeDocument;
let mod: typeof TooltipModule;

const TOOLTIP_WIDTH = 80;
const TOOLTIP_HEIGHT = 30;

/** What the module needs beyond the menus' fake DOM. */
function extendFakeDom(): void {
  const proto = FakeElement.prototype as unknown as Record<string, unknown>;
  // The fake's selectors know no attributes; the module only asks for [data-title].
  proto.closest = function (this: FakeElement, selector: string) {
    expect(selector).toBe("[data-title]");
    const find = (n: FakeElement | null): FakeElement | null =>
      !n || n.attributes.has("data-title") ? n : find(n.parentElement);
    return find(this);
  };
  Object.defineProperty(FakeElement.prototype, "isConnected", {
    configurable: true,
    get(this: FakeElement) {
      return this.ownerDocument.documentElement.contains(this);
    },
  });
  // The tooltip sits where its inline left and top put it.
  proto.getBoundingClientRect = function (this: FakeElement) {
    const tooltip = this.classList.contains("g-tooltip");
    const left = tooltip ? parseFloat(this.style.getPropertyValue("left")) || 0 : this.box.left;
    const top = tooltip ? parseFloat(this.style.getPropertyValue("top")) || 0 : this.box.top;
    const { width, height } = this.box;
    return { left, top, width, height, right: left + width, bottom: top + height, x: left, y: top };
  };
  proto.getClientRects = function (this: FakeElement) {
    return [this.getBoundingClientRect()];
  };
  Object.defineProperty(FakeDocument.prototype, "defaultView", {
    configurable: true,
    get: () => (globalThis as unknown as { window: unknown }).window,
  });
  (globalThis as unknown as Record<string, unknown>).Element = FakeElement;
}

beforeEach(async () => {
  vi.useFakeTimers();
  dom = installFakeDom();
  doc = dom.document;
  extendFakeDom();
  doc.body.box = { left: 0, top: 0, width: 1000, height: 700 };
  vi.resetModules();
  mod = await import("./tooltip-position.ts");
  mod.installTooltips();
  tooltip().box = { left: 0, top: 0, width: TOOLTIP_WIDTH, height: TOOLTIP_HEIGHT };
});

afterEach(() => {
  vi.useRealTimers();
  dom.uninstall();
});

function tooltip(): FakeElement {
  return doc.body.querySelector(".g-tooltip") as FakeElement;
}

/** A button with a data-title at (left, top), 20 x 20, with an icon inside. */
function button(
  title: string,
  left: number,
  top: number,
  attrs: Record<string, string> = {},
): { button: FakeElement; icon: FakeElement } {
  const element = doc.createElement("button");
  element.setAttribute("data-title", title);
  for (const [name, value] of Object.entries(attrs)) element.setAttribute(name, value);
  element.box = { left, top, width: 20, height: 20 };
  const icon = doc.createElement("span");
  element.append(icon);
  doc.body.append(element);
  return { button: element, icon };
}

describe("installTooltips", () => {
  it("appends one tooltip element to the body, however often it runs", () => {
    mod.installTooltips();
    expect(doc.body.querySelectorAll(".g-tooltip")).toHaveLength(1);
    expect(tooltip().className).toBe("g-tooltip");
    expect(doc.listenerCount("mouseover")).toBe(1);
    expect(doc.listenerCount("mouseout")).toBe(1);
  });
});

describe("data-title tooltips", () => {
  it("show the title centred below the element after 500 ms", () => {
    const { icon } = button("Add Fill", 100, 200);
    fire(icon, "mouseover");
    vi.advanceTimersByTime(499);
    expect(tooltip().className).toBe("g-tooltip");
    vi.advanceTimersByTime(1);
    expect(tooltip().className).toBe("g-tooltip visible");
    expect(tooltip().textContent).toBe("Add Fill");
    // 100 + 20 / 2 - 80 / 2 = 70; 200 + 20 = 220.
    expect(tooltip().getAttribute("style")).toBe("left: 70px; top: 220px;");
  });

  it("hide on mouseout and leave an empty style", () => {
    const { icon } = button("Add Fill", 100, 200);
    fire(icon, "mouseover");
    vi.advanceTimersByTime(500);
    fire(icon, "mouseout");
    expect(tooltip().className).toBe("g-tooltip");
    expect(tooltip().textContent).toBe("");
    expect(tooltip().getAttribute("style")).toBe("");
  });

  it("cancel the pending tooltip when the mouse leaves first", () => {
    const { icon } = button("Add Fill", 100, 200);
    fire(icon, "mouseover");
    vi.advanceTimersByTime(300);
    fire(icon, "mouseout");
    vi.advanceTimersByTime(1000);
    expect(tooltip().className).toBe("g-tooltip");
  });

  it("show the next one at once within 500 ms of the last one", () => {
    const first = button("One", 100, 200);
    const second = button("Two", 300, 200);
    fire(first.icon, "mouseover");
    vi.advanceTimersByTime(500);
    fire(first.icon, "mouseout");
    vi.advanceTimersByTime(499);
    fire(second.icon, "mouseover");
    expect(tooltip().textContent).toBe("Two");
    fire(second.icon, "mouseout");
    // Showing "Two" started a new 500 ms window.
    vi.advanceTimersByTime(500);
    fire(first.icon, "mouseover");
    expect(tooltip().textContent).toBe("");
    vi.advanceTimersByTime(500);
    expect(tooltip().textContent).toBe("One");
  });

  it("go above the element (by one element height) when they would leave the page", () => {
    const { icon } = button("Low", 100, 690);
    fire(icon, "mouseover");
    vi.advanceTimersByTime(500);
    // 710 + 20 > 700: 690 - 20 = 670.
    expect(tooltip().getAttribute("style")).toBe("left: 70px; top: 670px;");
  });

  it("move left to stay on the page, by the custom left offset less", () => {
    const { icon } = button("Right", 960, 200, { "data-custom-left-offset": "15" });
    fire(icon, "mouseover");
    vi.advanceTimersByTime(500);
    // Centred at 930, ending at 1010; 930 - 10 + 15 = 935 (the old
    // code added the offset after making room for it).
    expect(tooltip().getAttribute("style")).toBe("left: 935px; top: 220px;");
  });

  it("keep their place near the right edge when the custom offset still fits", () => {
    const { icon } = button("Right", 900, 200, { "data-custom-left-offset": "5" });
    fire(icon, "mouseover");
    vi.advanceTimersByTime(500);
    // 870 + 80 + 5 = 955 fits.
    expect(tooltip().getAttribute("style")).toBe("left: 870px; top: 220px;");
  });

  it("wrap with data-wrap and keep the wrap class when hidden", () => {
    const { icon } = button("Long text", 100, 200, { "data-wrap": "1" });
    fire(icon, "mouseover");
    vi.advanceTimersByTime(500);
    expect(tooltip().className).toBe("g-tooltip visible wrap");
    fire(icon, "mouseout");
    expect(tooltip().className).toBe("g-tooltip wrap");
    const plain = button("Short", 300, 200);
    fire(plain.icon, "mouseover");
    expect(tooltip().className).toBe("g-tooltip visible");
  });

  it("leave elements with a rich tooltip (on them, their parent or first child) alone", () => {
    const own = button("Own", 100, 200);
    mod.markRichTooltip(own.button as unknown as Element);
    const child = button("Child", 200, 200);
    mod.markRichTooltip(child.icon as unknown as Element);
    const parent = doc.createElement("div");
    const inParent = button("Parent", 300, 200);
    parent.append(inParent.button);
    doc.body.append(parent);
    mod.markRichTooltip(parent as unknown as Element);
    for (const { icon } of [own, child, inParent]) {
      fire(icon, "mouseover");
      vi.advanceTimersByTime(600);
      expect(tooltip().className).toBe("g-tooltip");
      fire(icon, "mouseout");
    }
    mod.unmarkRichTooltip(own.button as unknown as Element);
    fire(own.icon, "mouseover");
    vi.advanceTimersByTime(500);
    expect(tooltip().textContent).toBe("Own");
  });

  it("ignore elements without a data-title", () => {
    const plain = doc.createElement("div");
    doc.body.append(plain);
    fire(plain, "mouseover");
    vi.advanceTimersByTime(1000);
    expect(tooltip().className).toBe("g-tooltip");
  });
});

describe("showTooltipFor", () => {
  it("shows the tooltip at once and hides it on the next click", () => {
    const { button: element } = button("Notifications", 100, 200);
    mod.showTooltipFor(element as unknown as Element);
    expect(tooltip().textContent).toBe("Notifications");
    fire(doc.body, "click");
    expect(tooltip().className).toBe("g-tooltip");
  });
});

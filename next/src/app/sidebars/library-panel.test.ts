import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fake,
  fire,
  installFakeDom,
  type FakeDomHandle,
  type FakeElement,
} from "../menus/testing/fake-dom.testing.ts";
import type { Designer } from "../shell/designer.ts";
import type { Rect } from "../../engine/math/rect.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { resetGlobals, setContainer, setDesigner } from "../shell/globals.ts";
import { ELEMENTS, LibraryElements } from "./library-elements.ts";
import { animateScrollTop, LibraryPanel, type LibraryAsset } from "./library-panel.ts";
import { LibrarySidebar } from "./library-sidebar.ts";

let dom: FakeDomHandle;

beforeEach(() => {
  dom = installFakeDom();
  setDesigner({ stats: () => undefined, isTouchDevice: () => false } as unknown as Designer);
});

afterEach(async () => {
  // The panel's resize handler is debounced by 200 ms; let a pending one run
  // while the fake DOM still exists, or it fires after the uninstall.
  vi.useRealTimers();
  await new Promise((resolve) => setTimeout(resolve, 250));
  resetGlobals();
  dom.uninstall();
});

/** The panel's children as "class" strings, rows with their tile count. */
function layout(panel: FakeElement): string[] {
  return panel.children.map((child) =>
    child.classList.contains("category-row")
      ? `category-row(${child.children.length})`
      : child.className,
  );
}

function newPanel(): { container: FakeElement; panel: FakeElement } {
  const container = fake(document.createElement("div"));
  container.classList.add("library-container");
  document.body.appendChild(container as unknown as HTMLElement);
  new LibraryPanel(container as unknown as HTMLElement);
  return { container, panel: container.children[0] as FakeElement };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("LibraryElements", () => {
  it("lists the old categories, Unsplash included", () => {
    expect(LibraryElements.getElements().map((e) => e.path)).toEqual([
      "element.shape",
      "element.illustration.",
      "element.icons",
      "element.emoji.",
      "element.sticker",
      "element.frame",
      "element.line",
      "element.image",
    ]);
    expect(ELEMENTS[0]?.url).toBe("https://dkqeh8b5t3gxm.cloudfront.net/icons/shape");
  });
});

describe("LibraryPanel", () => {
  it("lays out search, three categories per row and a box after each row", () => {
    const { panel } = newPanel();
    expect(panel.className).toBe("g-library-panel");
    expect(layout(panel)).toEqual([
      "library-search",
      "assets",
      "category-row(3)",
      "assets",
      "category-row(3)",
      "assets",
      "category-row(2)",
      "assets",
    ]);
    const search = panel.children[0] as FakeElement;
    expect(search.children.map((c) => c.tagName + "." + c.className)).toEqual([
      "INPUT.g-input",
      "SPAN.gravit-icon-search",
    ]);
    const firstTile = panel.querySelector(".category-row > .category") as FakeElement;
    const icon = firstTile.querySelector("img") as FakeElement;
    expect(icon.getAttribute("src")).toBe("https://dkqeh8b5t3gxm.cloudfront.net/icons/shape");
  });

  it("opens a category's box under its row and closes it on a second click", async () => {
    const { panel } = newPanel();
    const tile = panel.querySelectorAll(".category-row > .category")[0] as FakeElement;
    fire(tile, "click");
    const box = panel.children[3] as FakeElement;
    // The market request fails at once (no API), as in the old local app,
    // so loading is already over.
    expect([...box.classList]).toEqual(["assets", "first"]);
    expect(box.style.display).toBe("");
    expect([...tile.classList]).toEqual(["category", "active"]);
    const content = box.querySelector(".assets-content") as FakeElement;
    expect(content.className).toBe("assets-content asset-shape");
    const wrapper = box.querySelector(".assets-wrapper") as FakeElement;
    expect(wrapper.getAttribute("style")).toBe("height: auto;");
    await flush();
    expect(wrapper.children).toHaveLength(0);
    const loadMore = box.querySelector(".button-wrapper") as FakeElement;
    expect([...loadMore.classList]).toEqual(["button-wrapper", "hidden"]);
    fire(tile, "click");
    expect(box.style.display).toBe("none");
    expect([...tile.classList]).toEqual(["category"]);
  });

  it("puts the second tile's box in the 'second' position and closes the others", () => {
    const { panel } = newPanel();
    const tiles = panel.querySelectorAll(".category-row > .category");
    fire(tiles[0], "click");
    fire(tiles[4], "click");
    const firstBox = panel.children[3] as FakeElement;
    const secondBox = panel.children[5] as FakeElement;
    expect(firstBox.style.display).toBe("none");
    expect(firstBox.classList.contains("first")).toBe(false);
    expect(secondBox.classList.contains("second")).toBe(true);
    expect(fake(tiles[0]).classList.contains("active")).toBe(false);
  });

  it("adds the sub category selector for a category with children", async () => {
    const { panel } = newPanel();
    const tiles = panel.querySelectorAll(".category-row > .category");
    fire(tiles[1], "click"); // Illustrations
    await flush();
    const box = panel.children[3] as FakeElement;
    const content = box.querySelector(".assets-content") as FakeElement;
    expect(content.children.map((c) => c.className)).toEqual([
      "indicator",
      "selector-container",
      "assets-wrapper",
    ]);
    const options = box.querySelectorAll("option");
    expect(options).toHaveLength(6);
    // Unsplash photos get the full-width selector.
    fire(tiles[7], "click");
    await flush();
    const photos = panel.children[7] as FakeElement;
    expect([...(photos.querySelector("select") as FakeElement).classList]).toEqual([
      "selector",
      "full-width",
    ]);
  });

  it("searches on Enter and shows the results box", async () => {
    const { panel } = newPanel();
    const input = panel.querySelector("input") as FakeElement;
    input.value = "star";
    fire(input, "keypress", { keyCode: 13 } as never);
    const results = panel.children[1] as FakeElement;
    expect(results.style.display).toBe("block");
    expect([...(panel.querySelector(".library-search > span") as FakeElement).classList]).toEqual([
      "gravit-icon-close",
    ]);
    await flush();
    expect(results.classList.contains("loading")).toBe(false);
  });
});

describe("LibrarySidebar", () => {
  it("is enabled and builds the toolbar, the offline overlay and the panel", () => {
    const sidebar = new LibrarySidebar();
    expect(sidebar.getId()).toBe("library");
    expect(sidebar.isEnabled()).toBe(true);
    expect(sidebar.getDefaultWidth()).toBe(250);
    const container = fake(document.createElement("div"));
    sidebar.init(container as unknown as HTMLElement);
    expect(container.children.map((c) => c.className)).toEqual([
      "toolbar library-toolbar g-touch-only",
      "library-container",
    ]);
    const library = container.children[1] as FakeElement;
    expect(library.getAttribute("style")).toBe("overflow: auto;");
    expect(library.children.map((c) => c.className)).toEqual(["overlay", "g-library-panel"]);
    // relayout doesn't build a second panel.
    sidebar.relayout();
    expect(library.querySelectorAll(".g-library-panel")).toHaveLength(1);
    const resize = vi.spyOn(sidebar._libraryPanelInstance as LibraryPanel, "resize");
    sidebar.resize();
    expect(resize).toHaveBeenCalled();
  });
});

describe("LibraryPanel photos and helpers", () => {
  function photo(id: string, width: number, height: number): LibraryAsset {
    return {
      id,
      path: "element.image",
      url_t: "thumb-" + id,
      image: { thumb: "thumb-" + id, width, height },
      user: { name: "user " + id, profile: "https://unsplash.com/@" + id },
    };
  }

  function photoWrapper(parentWidth: number, hidden = false) {
    const { container } = newPanel();
    const instance = new LibraryPanel(container as unknown as HTMLElement);
    const wrapper = fake(document.createElement("div"));
    wrapper.classList.add("assets-wrapper");
    wrapper.box = { left: 0, top: 0, width: parentWidth, height: 0 };
    if (hidden) wrapper.style.display = "none";
    container.appendChild(wrapper);
    return { instance, wrapper, container };
  }

  const columnIds = (wrapper: FakeElement) =>
    wrapper
      .querySelectorAll(".column")
      .map((column) =>
        column.children.map((tile) => tile.querySelector("img")?.getAttribute("src")),
      );

  it("lays photos out in two columns in a hidden box, by the shortest column", () => {
    const { instance, wrapper } = photoWrapper(600, true);
    instance._initMasonryLayoutColumns(wrapper as unknown as HTMLElement, [
      photo("a", 200, 300),
      photo("b", 200, 100),
      photo("c", 200, 100),
      photo("d", 200, 100),
    ]);
    // a (304) left; b, c, d (104 each) go right until it is taller.
    expect(columnIds(wrapper)).toEqual([["thumb-a"], ["thumb-b", "thumb-c", "thumb-d"]]);
    expect(
      wrapper.querySelectorAll(".column").map((column) => column.getAttribute("style")),
    ).toEqual(["width: calc(50% - 4px);", "width: calc(50% - 4px); margin-left: 4px;"]);
  });

  it("uses three columns for a 600px box", () => {
    const { instance, wrapper } = photoWrapper(600);
    instance._initMasonryLayoutColumns(wrapper as unknown as HTMLElement, [
      photo("a", 200, 100),
      photo("b", 200, 100),
      photo("c", 200, 100),
    ]);
    expect(columnIds(wrapper)).toEqual([["thumb-a"], ["thumb-b"], ["thumb-c"]]);
  });

  it("reflows each box with photo columns when the width changed by more than 50px", () => {
    vi.useFakeTimers();
    try {
      const instance = new LibraryPanel(
        fake(document.createElement("div")) as unknown as HTMLElement,
      );
      // The boxes of a panel of their own, without the panel's (empty) ones.
      const container = fake(document.createElement("div"));
      instance._parent = container as unknown as HTMLElement;
      const box = (width: number, child: string) => {
        const wrapper = fake(document.createElement("div"));
        wrapper.classList.add("assets-wrapper");
        wrapper.box = { left: 0, top: 0, width, height: 0 };
        const inner = fake(document.createElement("div"));
        inner.classList.add(child);
        wrapper.appendChild(inner);
        container.appendChild(wrapper);
        return wrapper;
      };
      const first = box(400, "asset-container");
      const photos = box(0, "column");
      const reflow = vi.spyOn(instance, "_initMasonryLayoutColumns").mockImplementation(() => {});
      instance._wrapperWidth = 380;
      instance.resize();
      vi.advanceTimersByTime(200);
      // The first non-empty box is 400 wide against 380: not more than 50px.
      expect(reflow).not.toHaveBeenCalled();
      first.box.width = 600;
      instance.resize();
      vi.advanceTimersByTime(200);
      expect(instance._wrapperWidth).toBe(600);
      expect(reflow.mock.calls).toEqual([[photos, null, false, true]]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("credits the photographer with the app title as utm_source", () => {
    const opened: string[] = [];
    setContainer({ openExternalLink: (_event: unknown, url: string) => opened.push(url) } as never);
    const { instance, wrapper } = photoWrapper(400);
    instance._initMasonryLayoutColumns(wrapper as unknown as HTMLElement, [photo("a", 200, 100)]);
    fire(wrapper.querySelector(".image-asset > span"), "click");
    expect(opened).toEqual([
      "https://unsplash.com/@a?utm_source=Gravit%2520Designer&utm_medium=referral",
    ]);
  });

  it("moves only elements with the Transform mixin to the drop position", () => {
    const { container } = newPanel();
    const instance = new LibraryPanel(container as unknown as HTMLElement);
    const rect = new Rectangle();
    instance._transformNode(rect, { x: 100, y: 50 });
    const box = rect.getGeometryBBox() as Rect;
    expect([box.getX() + box.getWidth() / 2, box.getY() + box.getHeight() / 2]).toEqual([100, 50]);
    const transform = vi.fn();
    const plain = { hasMixin: () => false, transform, getGeometryBBox: () => null };
    instance._transformNode(plain as never, { x: 100, y: 50 });
    expect(transform).not.toHaveBeenCalled();
  });

  it("scrolls back to the top over 600 ms with swing easing", () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (step: () => void) => setTimeout(step, 16));
    try {
      const element = { scrollTop: 400 } as HTMLElement;
      animateScrollTop(element, 0, 600);
      expect(element.scrollTop).toBe(400);
      // Frames every 16 ms: the last one before 300 ms runs at 288 ms.
      vi.advanceTimersByTime(300);
      expect(element.scrollTop).toBeCloseTo(
        400 * (1 - (0.5 - Math.cos((288 / 600) * Math.PI) / 2)),
        6,
      );
      vi.advanceTimersByTime(320);
      expect(element.scrollTop).toBe(0);
    } finally {
      vi.unstubAllGlobals();
      vi.useRealTimers();
    }
  });
});

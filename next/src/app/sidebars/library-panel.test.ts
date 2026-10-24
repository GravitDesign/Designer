import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fake,
  fire,
  installFakeDom,
  type FakeDomHandle,
  type FakeElement,
} from "../menus/testing/fake-dom.testing.ts";
import type { Designer } from "../shell/designer.ts";
import { resetGlobals, setDesigner } from "../shell/globals.ts";
import { ELEMENTS, LibraryElements } from "./library-elements.ts";
import { LibraryPanel } from "./library-panel.ts";
import { LibrarySidebar } from "./library-sidebar.ts";

let dom: FakeDomHandle;

beforeEach(() => {
  dom = installFakeDom();
  setDesigner({ stats: () => undefined, isTouchDevice: () => false } as unknown as Designer);
});

afterEach(() => {
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

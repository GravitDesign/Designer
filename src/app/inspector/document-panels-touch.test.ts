// The touch layout of the page and slice panels, switched on and off
// (the scene panel's is in scene-properties-dom.test.ts).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FakeElement } from "../menus/testing/fake-dom.testing.ts";
import type { Designer } from "../shell/designer.ts";
import { resetGlobals, setDesigner } from "../shell/globals.ts";
import { installDocumentPanelsDom, type DocumentPanelsDom } from "./document-panels-dom.testing.ts";
import { PageProperties } from "./page-properties.ts";
import { SliceProperties } from "./slice-properties.ts";

// The real paint field builds the chooser popup, which needs a browser DOM.
vi.mock("./color-deps.ts", () => import("./color-deps.testing.ts"));

let env: DocumentPanelsDom;
let touch: boolean;

beforeEach(() => {
  env = installDocumentPanelsDom();
  touch = false;
  setDesigner({
    addEventListener() {},
    removeEventListener() {},
    stats() {},
    isTouchEnabled: () => touch,
    getSetting: (_key: string, fallback: unknown) => fallback,
  } as unknown as Designer);
});

afterEach(() => {
  resetGlobals();
  env.uninstall();
});

/** The classes of an element without the ones propertyRow adds. */
const own = (element: FakeElement) =>
  element._classes.filter((name) => !["g-property-row", "no-label"].includes(name)).join(" ");

describe("PageProperties touch layout", () => {
  /** A panel with the anchor hr; the inputs are placeholders named by property. */
  function setup() {
    const panel = env.make("div");
    const top = env.make("div", { class: "first" });
    const anchor = env.make("hr", { class: "anchor" });
    panel.appendChild(top);
    panel.appendChild(anchor);
    const properties = new PageProperties();
    properties._panel = panel as unknown as HTMLElement;
    properties._hrAfterbleedRow = anchor as unknown as HTMLElement;
    properties._createInput = (property: string) =>
      env.make("i", { "data-input": property }) as unknown as HTMLElement;
    return { panel, properties };
  }

  const rows = (panel: FakeElement) => panel.children.map(own);
  const inputs = (row: FakeElement | undefined) =>
    row
      ? row._descendants().flatMap((node) => {
          const name = node.getAttribute("data-input");
          return name === null ? [] : [name];
        })
      : [];

  it("builds the desktop rows before the anchor", () => {
    const { panel, properties } = setup();
    properties._updateUI();
    expect(rows(panel)).toEqual([
      "first",
      "canvas-properties-normal",
      "",
      "page-size-properties-normal",
      "",
      "bleed-properties-normal",
      "anchor",
    ]);
    expect(inputs(panel.children[1])).toEqual(["bck", "w", "h", "bop"]);
    expect(inputs(panel.children[3])).toEqual([
      "preset-size",
      "rotate-canvas",
      "trim-canvas",
      "clip-content",
    ]);
  });

  it("swaps to the two touch rows and back", () => {
    const { panel, properties } = setup();
    properties._updateUI();
    touch = true;
    properties._updateUI();
    expect(rows(panel)).toEqual([
      "first",
      "canvas-properties-touch",
      "page-size-and-bleed-properties-touch",
      "anchor",
    ]);
    // the swatch first, then the preset select and the sizes
    expect(inputs(panel.children[1])).toEqual(["bck", "preset-size", "w", "h"]);
    expect(inputs(panel.children[2])).toEqual([
      "bl",
      "rotate-canvas",
      "trim-canvas",
      "clip-content",
    ]);
    expect(panel.children[2]?.children[0]?.textContent).toBe("Bleed");
    expect(properties._canvasPropertiesRowInNormal).toBeNull();

    touch = false;
    properties._updateUI();
    expect(rows(panel)).toEqual([
      "first",
      "canvas-properties-normal",
      "",
      "page-size-properties-normal",
      "",
      "bleed-properties-normal",
      "anchor",
    ]);
    expect(properties._canvasPropertiesRowInTouch).toBeNull();
    expect(properties._bleedRowInTouch).toBeNull();
  });
});

describe("SliceProperties touch layout", () => {
  function setup() {
    const panel = env.make("div");
    const properties = new SliceProperties();
    properties.init(panel as unknown as HTMLElement);
    return { panel, properties };
  }

  const label = (panel: FakeElement, row: string) =>
    panel.querySelector("." + row + " .property-label span")?.textContent;
  const boxLabel = (panel: FakeElement, input: string) => {
    const box = panel.querySelector("." + input) as FakeElement;
    const siblings = (box.parentElement as FakeElement).children;
    const before = siblings[siblings.indexOf(box) - 1];
    return before && before.classList.contains("g-input-label") ? before.textContent : null;
  };

  it("shows sliders, Position/Size and x/y/w/h labels in touch mode, and removes them again", () => {
    const { panel, properties } = setup();
    const trim = panel.querySelector(".trm-checkbox") as FakeElement;
    const background = panel.querySelector(".cls-check-checkbox") as FakeElement;
    touch = true;
    properties._updateUI();
    expect(trim.classList.contains("g-checkbox-slider")).toBe(true);
    expect(background.classList.contains("g-checkbox-slider")).toBe(true);
    expect(label(panel, "slice-position-left-row")).toBe("Position");
    expect(label(panel, "slice-size-width-row")).toBe("Size");
    expect(["x-input", "y-input", "w-input", "h-input"].map((i) => boxLabel(panel, i))).toEqual([
      "x",
      "y",
      "w",
      "h",
    ]);
    // a second touch update adds no second label
    properties._updateUI();
    expect(panel.querySelectorAll(".g-input-label")).toHaveLength(4);

    touch = false;
    properties._updateUI();
    expect(trim.classList.contains("g-checkbox-slider")).toBe(false);
    expect(label(panel, "slice-position-left-row")).toBe("Left");
    expect(label(panel, "slice-size-width-row")).toBe("Width");
    expect(panel.querySelectorAll(".g-input-label")).toHaveLength(0);
  });
});

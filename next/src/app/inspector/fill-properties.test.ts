import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Page } from "../../engine/scene/page.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Scene } from "../../engine/scene/scene.ts";
import type { ContainerApi } from "../../engine/scene/node-container.ts";
import { FillPaintLayer } from "../../engine/style/fill-paint-layer.ts";
import type { PaintLayers } from "../../engine/style/paint-layers.ts";
import { EditorWorkspace } from "../../editor/editor-workspace.ts";
import { fake, fire, type FakeElement } from "../menus/testing/fake-dom.testing.ts";
import { ContextMenuContext } from "../menus/context-menu.ts";
import { FillProperties } from "./fill-properties.ts";
import {
  descendants,
  documentOf,
  installPaintTestDom,
  type PaintTestDom,
} from "./paint-dom.testing.ts";

// The real paint field builds the chooser popup, which needs a browser DOM.
vi.mock("./color-deps.ts", () => import("./color-deps.testing.ts"));

let t: PaintTestDom;

beforeEach(() => {
  t = installPaintTestDom();
});

afterEach(() => {
  t.uninstall();
});

function rectWithFills(count: number): { scene: Scene; rect: Rectangle; layers: FillPaintLayer[] } {
  const scene = new Scene(new EditorWorkspace());
  const page = new Page();
  scene.appendChild(page);
  const rect = new Rectangle();
  (page as unknown as ContainerApi).appendChild(rect);
  const layers: FillPaintLayer[] = [];
  for (let i = 0; i < count; ++i) {
    const layer = new FillPaintLayer();
    layer.setProperty("_op", (i + 1) / 10);
    (rect.getPaintLayers() as PaintLayers).appendChild(layer);
    layers.push(layer);
  }
  return { scene, rect, layers };
}

function initPanel(): { properties: FillProperties; panel: FakeElement; toolbar: FakeElement } {
  const panel = t.dom.document.createElement("div");
  const toolbar = t.dom.document.createElement("div");
  toolbar.classList.add("toolbar");
  const properties = new FillProperties();
  properties.init(panel as unknown as HTMLElement, toolbar as unknown as HTMLElement);
  return { properties, panel, toolbar };
}

const blocks = (panel: FakeElement) =>
  panel.children.filter((c) => c.classList.contains("fill-block"));

describe("FillProperties", () => {
  it("keeps the inherited toString", () => {
    expect(new FillProperties().toString()).toBe("[Object GProperties]");
  });

  it("builds the toolbar in the old order", () => {
    const { panel, toolbar } = initPanel();
    expect([...panel.classList]).toEqual(["fill-properties-panel"]);
    expect([...toolbar.classList]).toEqual(["toolbar", "list-toolbar", "fill-toolbar"]);
    expect(toolbar.children.map((c) => c.tagName + "." + c.className)).toEqual([
      "LABEL.",
      "BUTTON.fill completely-fill g-active",
      "BUTTON.fill winding-fill",
      "BUTTON.fill-settings",
      "BUTTON.",
      "BUTTON.",
    ]);
    expect(toolbar.children.map((c) => c.getAttribute("data-action"))).toEqual([
      null,
      null,
      null,
      "settings",
      "remove",
      "add",
    ]);
  });

  it("shows one row per fill, last fill on top, and selects the last inserted", () => {
    const { properties, panel, toolbar } = initPanel();
    const { scene, rect, layers } = rectWithFills(2);
    expect(properties.update(documentOf(scene, t.commits), [rect])).toBe(true);
    const rows = blocks(panel);
    expect(rows).toHaveLength(2);
    expect([...(rows[0] as FakeElement).classList]).toEqual([
      "fill-block",
      "g-cursor-hand-open",
      "g-property-row",
      "no-label",
      "g-selected",
    ]);
    expect(properties._getSelectedPaintLayer()).toBe(layers[1]);
    // The row's columns: drag indicator, swatch, blend, opacity, visibility, touch.
    const columns = (rows[0] as FakeElement).children[0] as FakeElement;
    expect(columns.children.map((c) => c.tagName + "." + c.className)).toEqual([
      "DIV.column drag-indicator g-cursor-hand-open",
      "DIV.column color-preview g-cursor-hand-open g-color",
      "LABEL.column auto-grow g-cursor-hand-open g-normal",
      "LABEL.column g-cursor-hand-open g-normal",
      "DIV.column g-cursor-hand-open g-normal",
      "DIV.column auto-grow g-cursor-hand-open g-touch",
    ]);
    const opacities = descendants(rows[0] as FakeElement)
      .filter((e) => e.getAttribute("data-property") === "_op")
      .map((e) => (e as unknown as HTMLInputElement).value);
    expect(opacities).toEqual(["20%", "20%"]);
    expect(toolbar.classList.contains("empty-list")).toBe(false);
  });

  it("marks the toolbar empty and hides settings and remove without fills", () => {
    const { properties, toolbar } = initPanel();
    const { scene, rect } = rectWithFills(0);
    properties.update(documentOf(scene, t.commits), [rect]);
    expect(toolbar.classList.contains("empty-list")).toBe(true);
    const shown = toolbar.children.map((c) => fake(c).style.getPropertyValue("display"));
    expect(shown).toEqual(["", "", "", "none", "none", ""]);
  });

  it("writes opacity to the fill at the same index of every inspected element", () => {
    const { properties, panel } = initPanel();
    const a = rectWithFills(2);
    const b = rectWithFills(2);
    properties.update(documentOf(a.scene, t.commits), [a.rect, b.rect]);
    const row = blocks(panel)[1] as FakeElement; // the first fill (bottom row)
    const input = descendants(row).find(
      (e) => e.getAttribute("data-property") === "_op" && e.classList.contains("normal"),
    ) as FakeElement;
    (input as unknown as HTMLInputElement).value = "55";
    fire(input, "change", { bubbles: true });
    expect(a.layers[0]?.getProperty("_op")).toBe(0.55);
    expect(b.layers[0]?.getProperty("_op")).toBe(0.55);
    expect(a.layers[1]?.getProperty("_op")).toBe(0.2);
    expect(t.commits.map((c) => c.name)).toEqual(["Change Fill Properties"]);
  });

  it("opens the fill menu through the context menu with the row's layer", () => {
    const { properties, panel } = initPanel();
    const { scene, rect, layers } = rectWithFills(2);
    properties.update(documentOf(scene, t.commits), [rect]);
    fire(blocks(panel)[1] as FakeElement, "contextmenu", { clientX: 4, clientY: 9 });
    expect(t.contextMenus).toHaveLength(1);
    const options = t.contextMenus[0] as {
      previousEvent: { data: { context: number }; clientX: number };
      data: { paintLayer: unknown };
    };
    expect(options.previousEvent.data.context).toBe(ContextMenuContext.FillPropertyPanel);
    expect(options.previousEvent.clientX).toBe(4);
    expect(options.data.paintLayer).toBe(layers[0]);
    expect(properties._getSelectedPaintLayer()).toBe(layers[0]);
    expect((panel as unknown as { __contextmenu?: boolean }).__contextmenu).toBe(true);
  });

  it("drops the row of a removed fill and selects its neighbour", () => {
    const { properties, panel } = initPanel();
    const { scene, rect, layers } = rectWithFills(3);
    properties.update(documentOf(scene, t.commits), [rect]);
    (rect.getPaintLayers() as unknown as ContainerApi).removeChild(layers[1] as FillPaintLayer);
    expect(blocks(panel)).toHaveLength(2);
    expect(properties._getSelectedPaintLayer()).toBe(layers[0]);
  });

  it("takes no element without fill paint layers", () => {
    const { properties } = initPanel();
    const { scene } = rectWithFills(0);
    expect(properties.update(documentOf(scene, t.commits), [scene.getActivePage() as Page])).toBe(
      false,
    );
  });
});

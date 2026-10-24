import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Page } from "../../engine/scene/page.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Scene } from "../../engine/scene/scene.ts";
import type { ContainerApi } from "../../engine/scene/node-container.ts";
import { FillPaintLayer } from "../../engine/style/fill-paint-layer.ts";
import type { PaintLayers } from "../../engine/style/paint-layers.ts";
import { EditorWorkspace } from "../../editor/editor-workspace.ts";
import { fake, fire, type FakeElement, type FakeEvent } from "../menus/testing/fake-dom.testing.ts";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Platform } from "../../engine/core/platform.ts";
import { Editor, ModifiedEvent } from "../../editor/editor.ts";
import { setDragImageElement } from "../shell/globals.ts";
import { clickedPreviews, setSliderValue } from "./color-deps.testing.ts";
import { str } from "./paint-dom.ts";
import { ContextMenuContext } from "../menus/context-menu.ts";
import { FillProperties } from "./fill-properties.ts";
import {
  descendants,
  documentOf,
  dropOn,
  installPaintTestDom,
  startDrag,
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

describe("FillProperties toolbar, drag and chooser", () => {
  let titles: (string | null | undefined)[];
  beforeEach(() => {
    setDragImageElement(t.dom.document.createElement("div") as unknown as HTMLDivElement);
    titles = [];
    vi.spyOn(Editor, "tryRunTransaction").mockImplementation((_node, fn, name) => {
      fn();
      titles.push(name);
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    setDragImageElement(null);
    Platform.modifiers.shiftKey = false;
    clickedPreviews.length = 0;
  });

  const ops = (rect: Rectangle) =>
    (rect.getPaintLayers() as PaintLayers).getFillLayers().map((l) => l.getProperty("_op"));

  it("switches the fill rule from the touch buttons across the document", () => {
    const { properties, toolbar } = initPanel();
    t.dom.document.body.appendChild(toolbar);
    const other = t.dom.document.createElement("button");
    other.className = "winding-fill";
    t.dom.document.body.appendChild(other);
    const a = rectWithFills(1);
    const b = rectWithFills(1);
    properties.update(documentOf(a.scene, t.commits), [a.rect, b.rect]);
    const [completely, winding] = toolbar.children.slice(1, 3) as [FakeElement, FakeElement];
    fire(winding, "click");
    expect(a.rect.getProperty("evenodd")).toBe(true);
    expect(b.rect.getProperty("evenodd")).toBe(true);
    expect(t.commits.map((c) => c.name)).toEqual([str("GCommonNames", "action.change-fill-rule")]);
    expect(winding.classList.contains("g-active")).toBe(true);
    expect(other.classList.contains("g-active")).toBe(true);
    expect(completely.classList.contains("g-active")).toBe(false);
    fire(completely, "click");
    expect(a.rect.getProperty("evenodd")).toBe(false);
    expect(other.classList.contains("g-active")).toBe(false);
    expect(completely.classList.contains("g-active")).toBe(true);
  });

  it("moves a row onto another, duplicates with Shift and deletes when dragged out", () => {
    const { properties, panel } = initPanel();
    const { scene, rect } = rectWithFills(3);
    properties.update(documentOf(scene, t.commits), [rect]);
    // Rows are newest first: 0.3, 0.2, 0.1.
    let [top, , bottom] = blocks(panel) as [FakeElement, FakeElement, FakeElement];
    startDrag(bottom);
    dropOn(top);
    expect(ops(rect)).toEqual([0.2, 0.3, 0.1]);
    expect(titles).toEqual([str("GFillPaintLayerProperties", "action.move")]);
    Platform.modifiers.shiftKey = true;
    [top, , bottom] = blocks(panel) as [FakeElement, FakeElement, FakeElement];
    startDrag(bottom); // 0.2
    dropOn(top); // 0.1, the last one
    expect(ops(rect)).toEqual([0.2, 0.3, 0.1, 0.2]);
    expect(titles[1]).toBe(str("GFillPaintLayerProperties", "action.duplicate"));
    Platform.modifiers.shiftKey = false;
    const row = blocks(panel)[0] as FakeElement;
    startDrag(row);
    fire(row, "drag", { clientX: -40, clientY: 5 });
    fire(row, "dragend");
    expect(ops(rect)).toEqual([0.2, 0.3, 0.1]);
    expect(titles.slice(2)).toEqual([
      str("GFillPaintLayerProperties", "action.move"),
      str("GFillPaintLayerProperties", "action.remove"),
    ]);
  });

  it("writes the fill index and stop of a chooser change into the undo data", () => {
    const { properties, panel } = initPanel();
    const { scene, rect, layers } = rectWithFills(2);
    properties.update(documentOf(scene, t.commits), [rect]);
    const swatch = descendants(blocks(panel)[1] as FakeElement).find(
      (e) => e.getAttribute("data-property") === "_pt",
    ) as FakeElement;
    const color = new RGBColor([255, 0, 0]);
    swatch.dispatchEvent(
      new CustomEvent("patternchange", {
        detail: [color, 0.5, false, true, 2],
      }) as unknown as FakeEvent,
    );
    expect(layers[0]?.getProperty("_pt")).toBe(color);
    expect(layers[0]?.getProperty("_op")).toBe(0.5);
    expect(t.commits).toEqual([
      {
        name: str("GFillPaintLayerProperties", "action.change-properties"),
        data: { fillLayerIndex: 0, chooserOn: true, activeStopIdx: 2 },
      },
    ]);
    // Without the chooser there is no undo data; temporary changes commit nothing.
    swatch.dispatchEvent(
      new CustomEvent("patternchange", { detail: [undefined, 0.25] }) as unknown as FakeEvent,
    );
    expect(t.commits[1]?.data).toBeNull();
    swatch.dispatchEvent(
      new CustomEvent("patternchange", { detail: [undefined, 0.75, true] }) as unknown as FakeEvent,
    );
    expect(layers[0]?.getProperty("_op", false, false, true)).toBe(0.75);
    expect(layers[0]?.getProperty("_op")).toBe(0.25);
    expect(t.commits).toHaveLength(2);
  });

  it("re-opens the chooser at the stop when an undo of a chooser change updates it", () => {
    const { properties, panel } = initPanel();
    const { scene, rect } = rectWithFills(2);
    const doc = documentOf(scene, t.commits);
    const undo = { evtType: ModifiedEvent.Type.Undo, chooserOn: true, fillLayerIndex: 0 };
    properties.update(doc, [rect], { ...undo, activeStopIdx: 1 });
    // The row of fill 0 is the bottom one.
    const preview = descendants(blocks(panel)[1] as FakeElement).find((e) =>
      e.classList.contains("preview"),
    );
    expect(clickedPreviews).toEqual([[preview, 1]]);
    clickedPreviews.length = 0;
    properties.update(doc, [rect], { ...undo, evtType: ModifiedEvent.Type.Redo });
    expect(clickedPreviews.map(([, stop]) => stop)).toEqual([null]);
    clickedPreviews.length = 0;
    properties.update(doc, [rect], { ...undo, evtType: ModifiedEvent.Type.Raw });
    properties.update(doc, [rect], { ...undo, chooserOn: false });
    expect(clickedPreviews).toEqual([]);
  });

  it("re-fires the opacity box change from the touch slider, falling back to the box at 0", () => {
    const { properties, panel } = initPanel();
    const { scene, rect, layers } = rectWithFills(1);
    properties.update(documentOf(scene, t.commits), [rect]);
    const row = blocks(panel)[0] as FakeElement;
    const slider = descendants(row).find((e) => e.classList.contains("transparency"));
    setSliderValue(slider as unknown as Element, 30);
    fire(slider, "input");
    expect(layers[0]?.getProperty("_op")).toBe(0.3);
    // 0 is falsy, so the box's own value (30%) is taken again.
    setSliderValue(slider as unknown as Element, 0);
    fire(slider, "input");
    expect(layers[0]?.getProperty("_op")).toBe(0.3);
    expect(t.commits).toHaveLength(2);
  });
});

describe("FillProperties copy hint", () => {
  let copy: (() => void) | null = null;
  beforeEach(() => {
    t.uninstall();
    t = installPaintTestDom({
      setMouseOverContext: (_context: unknown, _event: unknown, callback: unknown) => {
        copy = (callback as typeof copy) ?? null;
      },
    });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const hints = (panel: FakeElement) =>
    panel.children.filter((c) => c.classList.contains("copy-info-overlay"));

  it("fades the hint out and leaves it in the panel until the next copy", () => {
    vi.useFakeTimers();
    const { properties, panel } = initPanel();
    const { scene, rect } = rectWithFills(1);
    properties.update(documentOf(scene, t.commits), [rect]);
    fire(panel, "mouseenter");
    (copy as () => void)();
    const hint = hints(panel)[0] as FakeElement;
    expect(hint.textContent).toBe(str("GFillPaintLayerProperties", "text.copy-fill"));
    vi.advanceTimersByTime(1000 + 600);
    expect(hints(panel)).toEqual([hint]);
    expect(hint.style.getPropertyValue("opacity")).toBe("0");
    expect(hint.style.getPropertyValue("top")).toBe("20px");
    (copy as () => void)();
    expect(hints(panel)).toHaveLength(1);
    expect(hints(panel)[0]).not.toBe(hint);
  });

  it("throws without a selected row, as the old empty position() did", () => {
    const { properties, panel } = initPanel();
    const { scene, rect } = rectWithFills(1);
    properties.update(documentOf(scene, t.commits), [rect]);
    properties._setSelectedPaintLayer(null);
    fire(panel, "mouseenter");
    expect(() => (copy as () => void)()).toThrow(TypeError);
    expect(hints(panel)).toEqual([]);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Ellipse } from "../../engine/scene/ellipse.ts";
import { Page } from "../../engine/scene/page.ts";
import { Path } from "../../engine/scene/path.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Scene } from "../../engine/scene/scene.ts";
import type { ContainerApi } from "../../engine/scene/node-container.ts";
import { BorderPaintLayer } from "../../engine/style/border-paint-layer.ts";
import type { PaintLayers } from "../../engine/style/paint-layers.ts";
import { BorderAlignment, BorderMarker } from "../../engine/style/stylable-sets.ts";
import { Text } from "../../engine/text/text.ts";
import { EditorWorkspace } from "../../editor/editor-workspace.ts";
import { ModifiedEvent } from "../../editor/editor.ts";
import { Overlay } from "../dialogs/dialog-container.ts";
import { fake, fire, FakeEvent, type FakeElement } from "../menus/testing/fake-dom.testing.ts";
import { setDragImageElement } from "../shell/globals.ts";
import { SystemDialog } from "../dialogs/system-dialog.ts";
import { Platform } from "../../engine/core/platform.ts";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { VertexContainer } from "../../engine/geometry/vertex-container.ts";
import { Node } from "../../engine/scene/node.ts";
import { LinearGradient } from "../../engine/style/linear-gradient.ts";
import { Editor } from "../../editor/editor.ts";
import { StyleEdManager } from "../../editor/style-ed-manager.ts";
import { clickedPreviews, setPopupPattern } from "./color-deps.testing.ts";
import { getData, str } from "./paint-dom.ts";
import { BorderProperties, newBorderAlignment } from "./border-properties.ts";
import {
  descendants,
  documentOf as paintDocumentOf,
  dropOn,
  installPaintTestDom,
  startDrag,
  type PaintTestDom,
} from "./paint-dom.testing.ts";

// The real paint field builds the chooser popup, which needs a browser DOM.
vi.mock("./color-deps.ts", () => import("./color-deps.testing.ts"));

let t: PaintTestDom;
let dom: PaintTestDom["dom"];
let commits: { name: unknown; data: unknown }[];

beforeEach(() => {
  t = installPaintTestDom();
  dom = t.dom;
  commits = t.commits;
});

afterEach(() => {
  t.uninstall();
});

const documentOf = (scene: Scene) => paintDocumentOf(scene, commits);

const byProperty = (root: FakeElement, property: string) =>
  descendants(root).filter((e) => e.getAttribute("data-property") === property);

function rectWithBorders(count: number): { scene: Scene; rect: Rectangle } {
  const scene = new Scene(new EditorWorkspace());
  const page = new Page();
  scene.appendChild(page);
  const rect = new Rectangle();
  (page as unknown as ContainerApi).appendChild(rect);
  for (let i = 0; i < count; ++i) {
    const layer = new BorderPaintLayer();
    layer.setProperty("_bw", i + 1);
    (rect.getPaintLayers() as PaintLayers).appendChild(layer);
  }
  return { scene, rect };
}

function initPanel(): { properties: BorderProperties; panel: FakeElement; toolbar: FakeElement } {
  const panel = dom.document.createElement("div");
  const toolbar = dom.document.createElement("div");
  toolbar.classList.add("toolbar");
  const properties = new BorderProperties();
  properties.init(panel as unknown as HTMLElement, toolbar as unknown as HTMLElement);
  return { properties, panel, toolbar };
}

describe("newBorderAlignment", () => {
  it("puts borders outside texts, inside shapes and centred on open arcs", () => {
    expect(newBorderAlignment(new Text())).toBe(BorderAlignment.Outside);
    expect(newBorderAlignment(new Rectangle())).toBe(BorderAlignment.Inside);
    const arc = new Ellipse();
    arc.setProperty("etp", Ellipse.Type.Arc);
    expect(newBorderAlignment(arc)).toBe(BorderAlignment.Center);
    expect(newBorderAlignment(new Ellipse())).toBe(BorderAlignment.Inside);
  });

  it("aligns open paths inside, since paths are shapes (old quirk)", () => {
    const path = new Path();
    path.setProperty("closed", false);
    expect(newBorderAlignment(path)).toBe(BorderAlignment.Inside);
  });
});

describe("BorderProperties", () => {
  it("keeps the inherited toString", () => {
    expect(new BorderProperties().toString()).toBe("[Object GProperties]");
  });

  it("builds the toolbar and the advanced stroke settings", () => {
    const { properties, toolbar, panel } = initPanel();
    expect([...panel.classList]).toEqual(["border-properties-panel"]);
    expect([...toolbar.classList]).toEqual(["toolbar", "list-toolbar", "border-toolbar"]);
    expect(
      toolbar.children.map((c) => c.tagName + ":" + (c.getAttribute("data-action") ?? "")),
    ).toEqual(["LABEL:", "BUTTON:stroke-settings", "BUTTON:remove", "BUTTON:add"]);
    const advanced = fake(properties._advancedStrokePanel);
    expect(advanced.style.getPropertyValue("width")).toBe("280px");
    const wrapper = fake(
      (Overlay.of(properties._advancedStrokePanel as HTMLElement) as Overlay).getElement(),
    );
    expect([...wrapper.classList]).toEqual(["g-overlay", "border-settings"]);
    expect(advanced.children.map((c) => c.tagName + "." + c.className)).toEqual([
      "DIV.g-property-row no-label justified",
      "DIV.g-property-row no-label justified",
      "HR.",
      "DIV.g-property-row no-label",
      "HR.",
      "P.",
      "DIV.g-property-row no-label",
      "DIV.g-property-row no-label",
      "DIV.g-property-row no-label",
      "DIV.g-property-row no-label",
      "DIV.g-property-row no-label",
      "DIV.g-property-row no-label",
    ]);
    expect(byProperty(advanced, "_bds")).toHaveLength(4);
    // Dash inputs are form controls, so their columns are labels with captions.
    const dashRow = advanced.children[3] as FakeElement;
    expect(dashRow.children.map((c) => c.className)).toEqual(["columns", "labels"]);
    expect((dashRow.children[0] as FakeElement).children.map((c) => c.tagName)).toEqual([
      "LABEL",
      "LABEL",
      "LABEL",
      "LABEL",
    ]);
    expect(byProperty(advanced, "_blj-miter").map((b) => b.className)).toEqual([
      "g-icon g-flat g-group-element",
    ]);
  });

  it("shows one row per border, newest layer first, and selects the last inserted", () => {
    const { properties, panel, toolbar } = initPanel();
    const { scene, rect } = rectWithBorders(2);
    const layers = (rect.getPaintLayers() as PaintLayers).getBorderLayers();
    expect(properties.update(documentOf(scene), [rect])).toBe(true);
    const blocks = panel.children.filter((c) => c.classList.contains("border-block"));
    expect(blocks).toHaveLength(2);
    expect([...(blocks[0] as FakeElement).classList].slice(0, 4)).toEqual([
      "border-block",
      "g-cursor-hand-open",
      "g-property-row",
      "no-label",
    ]);
    expect((blocks[0] as FakeElement).getAttribute("data-drag-mode")).toBe("1");
    expect(properties._getSelectedPaintLayer()).toBe(layers[1]);
    expect((blocks[0] as FakeElement).classList.contains("g-selected")).toBe(true);
    expect((blocks[1] as FakeElement).classList.contains("g-selected")).toBe(false);
    expect(toolbar.classList.contains("empty-list")).toBe(false);
    // The width boxes show the layer's width (two per row: normal and touch;
    // with no active document the unit is shown).
    expect(byProperty(blocks[1] as FakeElement, "_bw").map((i) => i.value)).toEqual(["1px", "1px"]);
  });

  it("marks the toolbar empty without borders", () => {
    const { properties, toolbar } = initPanel();
    const { scene, rect } = rectWithBorders(0);
    expect(properties.update(documentOf(scene), [rect])).toBe(true);
    expect(toolbar.classList.contains("empty-list")).toBe(true);
    const settings = toolbar.children[1] as FakeElement;
    expect(settings.style.display).toBe("none");
  });

  it("takes elements by their fill property set, as the old panel did", () => {
    const { properties } = initPanel();
    const { scene } = rectWithBorders(0);
    const bordersOnly = {
      hasMixin: () => true,
      getStylePropertySets: () => ["BL"],
    };
    expect(properties.update(documentOf(scene), [bordersOnly as never])).toBe(false);
    expect(properties.update(null, [])).toBe(false);
  });

  it("changes the border at the same index of every inspected element", () => {
    const { properties } = initPanel();
    const a = rectWithBorders(2);
    const b = { rect: new Rectangle() };
    (a.scene.getFirstChild() as unknown as ContainerApi).appendChild(b.rect);
    for (let i = 0; i < 2; ++i) {
      const border = new BorderPaintLayer();
      border.setProperty("_bw", i + 1);
      (b.rect.getPaintLayers() as PaintLayers).appendChild(border);
    }
    properties.update(documentOf(a.scene), [a.rect, b.rect]);
    const layer = (a.rect.getPaintLayers() as PaintLayers).getBorderLayers()[1] as BorderPaintLayer;
    properties._assign(layer, ["_bw"], [7]);
    expect(
      (b.rect.getPaintLayers() as PaintLayers).getBorderLayers().map((l) => l.getProperty("_bw")),
    ).toEqual([1, 7]);
    expect(
      (a.rect.getPaintLayers() as PaintLayers).getBorderLayers().map((l) => l.getProperty("_bw")),
    ).toEqual([1, 7]);
    expect(commits).toHaveLength(1);
    expect(commits[0]?.data).toBeNull();
    // Chooser changes carry the border index for undo.
    properties._assign(layer, ["_op"], [0.5], false, { chooserOn: true, activeStopIdx: 2 });
    expect(commits[1]?.data).toEqual({ borderLayerIndex: 1, chooserOn: true, activeStopIdx: 2 });
    // Temporary changes skip the transaction.
    properties._assign(layer, ["_bw"], [9], true);
    expect(commits).toHaveLength(2);
  });

  it("reopens the undone layer's chooser at its stop on undo and redo (BUG-153)", () => {
    const { properties, panel } = initPanel();
    const { scene, rect } = rectWithBorders(2);
    properties.update(documentOf(scene), [rect]);
    const layer = (rect.getPaintLayers() as PaintLayers).getBorderLayers()[0] as BorderPaintLayer;
    const undo = { evtType: ModifiedEvent.Type.Undo, chooserOn: true, borderLayerIndex: 0 };
    clickedPreviews.length = 0;
    // The old code threw a ReferenceError here.
    properties._updatePaintLayer(layer, { ...undo, activeStopIdx: 2 });
    const block = panel.children.find(
      (c) =>
        c.classList.contains("border-block") &&
        getData(c as unknown as Element, "paintLayer") === layer,
    ) as FakeElement;
    const preview = descendants(block).find((e) => e.classList.contains("preview"));
    expect(preview).toBeDefined();
    expect(clickedPreviews).toEqual([[preview, 2]]);
    clickedPreviews.length = 0;
    properties._updatePaintLayer(layer, { ...undo, evtType: ModifiedEvent.Type.Redo });
    expect(clickedPreviews).toEqual([[preview, null]]);
    clickedPreviews.length = 0;
    // Not an undo, the chooser wasn't open, or another layer: nothing.
    properties._updatePaintLayer(layer, { ...undo, evtType: ModifiedEvent.Type.Raw });
    properties._updatePaintLayer(layer, { ...undo, chooserOn: false });
    properties._updatePaintLayer(layer, { ...undo, borderLayerIndex: 1 });
    expect(clickedPreviews).toEqual([]);
  });
});

describe("BorderProperties advanced stroke settings", () => {
  const advancedOf = (properties: BorderProperties) => fake(properties._advancedStrokePanel);
  const change = (element: FakeElement, value: string) => {
    (element as unknown as HTMLInputElement).value = value;
    fire(element, "change", { bubbles: true });
  };

  it("takes the miter limit only for miter joins and re-renders on a value <= 0", () => {
    const { properties, panel } = initPanel();
    const { scene, rect } = rectWithBorders(1);
    properties.update(documentOf(scene), [rect]);
    const layer = (rect.getPaintLayers() as PaintLayers).getBorderLayers()[0] as BorderPaintLayer;
    const miter = byProperty(advancedOf(properties), "_bml")[0] as FakeElement;
    change(miter, "7");
    expect(layer.getProperty("_bml")).toBe(7);
    expect(commits.map((c) => c.name)).toEqual(["Change Border Properties"]);
    // A value <= 0 rebuilds the rows instead.
    const row = panel.children.find((c) => c.classList.contains("border-block"));
    change(miter, "0");
    expect(layer.getProperty("_bml")).toBe(7);
    expect(commits).toHaveLength(1);
    expect(panel.children.includes(row as FakeElement)).toBe(false);
    // Not a miter join: ignored.
    layer.setProperty("_blj", "round");
    change(miter, "9");
    expect(layer.getProperty("_bml")).toBe(7);
    expect(commits).toHaveLength(1);
  });

  it("builds the dash list from the four boxes, dropping negative and unparsable ones", () => {
    const { properties } = initPanel();
    const { scene, rect } = rectWithBorders(1);
    properties.update(documentOf(scene), [rect]);
    const boxes = byProperty(advancedOf(properties), "_bds");
    ["5", "-1", "abc", "3"].forEach((value, i) => {
      (boxes[i] as unknown as HTMLInputElement).value = value;
    });
    fire(boxes[3], "change", { bubbles: true });
    const layer = (rect.getPaintLayers() as PaintLayers).getBorderLayers()[0] as BorderPaintLayer;
    expect(layer.getProperty("_bds")).toEqual([5, 3]);
  });

  it("writes the marker or null, and shows a pasted marker as Custom", () => {
    const { properties } = initPanel();
    const { scene, rect } = rectWithBorders(1);
    properties.update(documentOf(scene), [rect]);
    const layer = (rect.getPaintLayers() as PaintLayers).getBorderLayers()[0] as BorderPaintLayer;
    const head = byProperty(advancedOf(properties), "_bhm")[0] as FakeElement;
    const custom = head.children[head.children.length - 1] as FakeElement;
    expect(custom.getAttribute("value")).toBe("#");
    expect((custom as unknown as HTMLOptionElement).disabled).toBe(true);
    change(head, BorderMarker.Arrow);
    expect(layer.getProperty("_bhm")).toBe(BorderMarker.Arrow);
    change(head, "");
    expect(layer.getProperty("_bhm")).toBeNull();
    layer.setProperty("_bhm", new VertexContainer());
    properties._updateAdvancedSettings();
    expect((head as unknown as HTMLSelectElement).value).toBe("#");
  });

  it("pastes a copied shape as the marker and alerts without one", () => {
    let clipboard: string | null = null;
    t.uninstall();
    t = installPaintTestDom({ getClipboardContent: () => clipboard });
    dom = t.dom;
    commits = t.commits;
    const alerts: unknown[] = [];
    (window as unknown as { alert: (m: unknown) => void }).alert = (m) => alerts.push(m);
    const { properties } = initPanel();
    const { scene, rect } = rectWithBorders(1);
    properties.update(documentOf(scene), [rect]);
    const layer = (rect.getPaintLayers() as PaintLayers).getBorderLayers()[0] as BorderPaintLayer;
    const paste = descendants(advancedOf(properties)).find(
      (e) => e.tagName === "BUTTON" && e.querySelector(".gravit-icon-paste"),
    ) as FakeElement;
    fire(paste, "click");
    expect(alerts).toEqual([str("GCommonNames", "arrow-paste.alert")]);
    expect(layer.getProperty("_bhm")).toBeNull();
    clipboard = Node.serialize([new Rectangle()]);
    fire(paste, "click");
    expect(alerts).toHaveLength(1);
    expect(layer.getProperty("_bhm")).toBeInstanceOf(VertexContainer);
  });

  it("disables Inside and Outside for open paths, with the mixed title next to closed shapes", () => {
    const { properties } = initPanel();
    const { scene, rect } = rectWithBorders(1);
    const path = new Path();
    path.setProperty("closed", false);
    (path.getPaintLayers() as PaintLayers).appendChild(new BorderPaintLayer());
    (scene.getFirstChild() as unknown as ContainerApi).appendChild(path);
    const button = (alignment: string) =>
      byProperty(advancedOf(properties), "_ba-" + alignment)[0] as FakeElement;
    properties.update(documentOf(scene), [rect, path]);
    expect(button(BorderAlignment.Inside).getAttribute("disabled")).toBe("disabled");
    expect(button(BorderAlignment.Outside).getAttribute("data-title")).toBe(
      str("GBorderPaintLayerProperties", "text.border-alignment.disabled") +
        ": " +
        str("GStylable", "border-alignment.outside"),
    );
    expect(button(BorderAlignment.Center).getAttribute("disabled")).toBeNull();
    properties.update(documentOf(scene), [path]);
    expect(button(BorderAlignment.Inside).getAttribute("disabled")).toBe("disabled");
    expect(button(BorderAlignment.Inside).getAttribute("data-title")).toBe(
      str("GStylable", "border-alignment.inside"),
    );
    properties.update(documentOf(scene), [rect]);
    expect(button(BorderAlignment.Inside).getAttribute("disabled")).toBeNull();
  });
});

describe("BorderProperties drag and chooser", () => {
  let titles: (string | null | undefined)[];
  beforeEach(() => {
    setDragImageElement(dom.document.createElement("div") as unknown as HTMLDivElement);
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
  });

  const rows = (panel: FakeElement) =>
    panel.children.filter((c) => c.classList.contains("border-block"));

  it("moves a row onto another, and duplicates it with Shift", () => {
    const { properties, panel } = initPanel();
    const { scene, rect } = rectWithBorders(3);
    const widths = () =>
      (rect.getPaintLayers() as PaintLayers).getBorderLayers().map((l) => l.getProperty("_bw"));
    const a = (rect.getPaintLayers() as PaintLayers).getBorderLayers()[0];
    properties.update(documentOf(scene), [rect]);
    // Rows are newest first: c, b, a. Drag a (bottom) onto c (top).
    let [top, , bottom] = rows(panel) as [FakeElement, FakeElement, FakeElement];
    expect(startDrag(bottom).defaultPrevented).toBe(false);
    dropOn(top);
    expect(widths()).toEqual([2, 3, 1]);
    expect(titles).toEqual([str("GBorderPaintLayerProperties", "action.move-border")]);
    expect(properties._getSelectedPaintLayer()).toBe(a);
    Platform.modifiers.shiftKey = true;
    [top, , bottom] = rows(panel) as [FakeElement, FakeElement, FakeElement];
    startDrag(bottom); // b
    dropOn(top); // a, the last one
    expect(widths()).toEqual([2, 3, 1, 2]);
    expect(titles[1]).toBe(str("GBorderPaintLayerProperties", "action.duplicate-border"));
  });

  it("doesn't start a drag from a field of the row", () => {
    const { properties, panel } = initPanel();
    const { scene, rect } = rectWithBorders(1);
    properties.update(documentOf(scene), [rect]);
    const row = rows(panel)[0] as FakeElement;
    fire(byProperty(row, "_op")[0] as FakeElement, "mousedown");
    expect(row.classList.contains("g-draggable-disabled")).toBe(true);
    const start = new FakeEvent("dragstart");
    row.dispatchEvent(start);
    expect(start.defaultPrevented).toBe(true);
  });

  it("deletes the border on every element when dragged out of the panel", () => {
    const { properties, panel } = initPanel();
    const a = rectWithBorders(2);
    const b = rectWithBorders(2);
    properties.update(documentOf(a.scene), [a.rect, b.rect]);
    const row = rows(panel)[0] as FakeElement; // the second border
    startDrag(row);
    fire(row, "drag", { clientX: -50, clientY: 10 });
    fire(row, "dragend");
    for (const rect of [a.rect, b.rect])
      expect(
        (rect.getPaintLayers() as PaintLayers).getBorderLayers().map((l) => l.getProperty("_bw")),
      ).toEqual([1]);
    // Ending on its own row first runs the (empty) move, named after fills
    // (see "Dropping a border outside the list is named after fills").
    expect(titles).toEqual([
      str("GFillPaintLayerProperties", "action.move"),
      str("GBorderPaintLayerProperties", "action.remove-border"),
    ]);
  });

  it("hides the selection and starts the style editor while the chooser is open", () => {
    const { properties, panel } = initPanel();
    const { scene, rect } = rectWithBorders(1);
    const doc = documentOf(scene);
    const editor = doc.getEditor() as unknown as Record<string, () => void>;
    const calls: string[] = [];
    editor.hideSelection = () => calls.push("hide");
    editor.resetHideSelection = () => calls.push("reset");
    const updated = vi.spyOn(t.styleEdManager, "updateEditor").mockImplementation(() => {});
    const deactivated = vi.spyOn(t.styleEdManager, "deactivateEditor");
    let locked = true;
    vi.spyOn(t.styleEdManager, "getOverlayLock").mockImplementation(() => locked);
    properties.update(doc, [rect]);
    const swatch = byProperty(rows(panel)[0] as FakeElement, "_pt")[0] as FakeElement;
    const open = () => swatch.dispatchEvent(new CustomEvent("chooseropen") as unknown as FakeEvent);
    const prevented: number[] = [];
    const close = () =>
      swatch.dispatchEvent(
        new CustomEvent("chooserclose", {
          detail: [() => prevented.push(1), { type: "mousedown" }],
        }) as unknown as FakeEvent,
      );
    open();
    expect(calls).toEqual(["hide"]);
    expect(updated).toHaveBeenCalledWith(properties._getSelectedPaintLayer(), "_pt", false);
    expect(properties._styleEdOn).toBe(true);
    expect(properties._chooserElem).toBe(swatch);
    // While the style editor holds the overlay, closing is prevented.
    close();
    expect(prevented).toEqual([1]);
    expect(properties._styleEdOn).toBe(true);
    expect(deactivated).not.toHaveBeenCalled();
    // A CDR document warns about a pattern other than an RGB color.
    locked = false;
    (doc as unknown as { hasCDR: () => boolean }).hasCDR = () => true;
    const warned = vi
      .spyOn(SystemDialog, "showCDRUnsupportedObjectWarning")
      .mockResolvedValue(undefined);
    setPopupPattern(new LinearGradient());
    close();
    expect(prevented).toEqual([1]);
    expect(properties._styleEdOn).toBe(false);
    expect(deactivated).toHaveBeenCalled();
    expect(calls).toEqual(["hide", "reset"]);
    expect(warned).toHaveBeenCalledTimes(1);
    expect(properties._chooserElem).toBeNull();
    setPopupPattern(RGBColor.BLACK);
    open();
    close();
    expect(warned).toHaveBeenCalledTimes(1);
    setPopupPattern(null);
  });

  it("keeps its rows when the style editor's own change updates it", () => {
    const { properties, panel } = initPanel();
    const { scene, rect } = rectWithBorders(1);
    const doc = documentOf(scene);
    properties.update(doc, [rect]);
    const row = rows(panel)[0];
    // Not while the chooser is closed.
    t.styleEdManager.trigger(StyleEdManager.PREPARE_MODIFIED_EVENT);
    expect(properties._styleEditorChange).toBe(false);
    properties._styleEdOn = true;
    t.styleEdManager.trigger(StyleEdManager.PREPARE_MODIFIED_EVENT);
    expect(properties.update(doc, [rect])).toBe(true);
    expect(rows(panel)[0]).toBe(row);
    // The next update renders again.
    properties.update(doc, [rect]);
    expect(rows(panel)[0]).not.toBe(row);
  });
});

describe("BorderProperties copy hint", () => {
  let copy: (() => void) | null = null;
  beforeEach(() => {
    t.uninstall();
    t = installPaintTestDom({
      setMouseOverContext: (_context: unknown, _event: unknown, callback: unknown) => {
        copy = (callback as typeof copy) ?? null;
      },
    });
    dom = t.dom;
    commits = t.commits;
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const hints = (panel: FakeElement) =>
    panel.children.filter((c) => c.classList.contains("copy-info-overlay"));

  it("fades the hint out and leaves it in the panel until the next copy", () => {
    vi.useFakeTimers();
    const { properties, panel } = initPanel();
    const { scene, rect } = rectWithBorders(1);
    properties.update(documentOf(scene), [rect]);
    fire(panel, "mouseenter");
    (copy as () => void)();
    const hint = hints(panel)[0] as FakeElement;
    expect(hint.textContent).toBe(str("GBorderPaintLayerProperties", "text.copy-border"));
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
    const { scene, rect } = rectWithBorders(1);
    properties.update(documentOf(scene), [rect]);
    properties._setSelectedPaintLayer(null);
    fire(panel, "mouseenter");
    expect(() => (copy as () => void)()).toThrow(TypeError);
    expect(hints(panel)).toEqual([]);
  });
});

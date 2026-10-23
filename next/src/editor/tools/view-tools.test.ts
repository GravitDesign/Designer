import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Point } from "../../engine/math/point.ts";
import { Transform } from "../../engine/math/transform.ts";
import { CompoundPath } from "../../engine/scene/compound-path.ts";
import { Layer } from "../../engine/scene/layer.ts";
import type { Node } from "../../engine/scene/node.ts";
import { Path } from "../../engine/scene/path.ts";
import { AnchorPoint } from "../../engine/scene/path-base.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { FillPaintLayer } from "../../engine/style/fill-paint-layer.ts";
import { installFakeDom } from "../view/testing/fake-dom.ts";
import { SceneWidget } from "../view/scene-widget.ts";
import { ConnectorTool } from "./connector-tool.ts";
import { FillTool } from "./fill-tool.ts";
import { HandTool } from "./hand-tool.ts";
import { LayerTool } from "./layer-tool.ts";
import { MagicTool } from "./magic-tool.ts";
import { PointerTool } from "./pointer-tool.ts";
import { SelectTool } from "./select-tool.ts";
import { clearModifiers, releaseTools, setModifiers, setupTools } from "./tool-testing.ts";
import { ZoomTool } from "./zoom-tool.ts";

let uninstall: () => void;
beforeEach(() => {
  uninstall = installFakeDom();
  vi.useFakeTimers();
});
afterEach(() => {
  releaseTools();
  clearModifiers();
  vi.useRealTimers();
  uninstall();
});

function activeLayer(scene: ReturnType<typeof setupTools>["scene"], page: Node): Layer {
  const layer = new Layer();
  (page as unknown as { appendChild(node: Node): void }).appendChild(layer);
  scene.setActiveLayer(layer);
  return layer;
}

function rect(parent: Node, x: number, y: number, w: number, h: number): Rectangle {
  const r = new Rectangle();
  r.setProperty("trf", new Transform(w / 2, 0, 0, h / 2, x + w / 2, y + h / 2));
  r.getPaintLayers()?.appendChild(new FillPaintLayer(RGBColor.BLACK));
  (parent as unknown as { appendChild(node: Node): void }).appendChild(r);
  return r;
}

describe("ZoomTool", () => {
  it("a click zooms in to the next level at the click, with Alt out to the previous one", () => {
    const { manager, view, input } = setupTools();
    manager.activateTool(ZoomTool);
    expect(view.getCursor()).toBe("zoom-plus");
    input.click(100, 100);
    expect(view.getZoom()).toBe(1.5);
    // The clicked scene point stays where it was.
    expect(view.getWorldTransform().mapPoint(new Point(100, 100)).getX()).toBeCloseTo(100, 9);
    setModifiers({ optionKey: true });
    expect(view.getCursor()).toBe("zoom-minus");
    input.click(100, 100);
    expect(view.getZoom()).toBe(1);
    input.click(100, 100);
    expect(view.getZoom()).toBe(0.66);
  });

  it("at the limit the cursor says no zoom and a click does nothing", () => {
    const { manager, view, input } = setupTools();
    view.transform(0, 0, SceneWidget.options.maxZoomFactor);
    manager.activateTool(ZoomTool);
    expect(view.getCursor()).toBe("zoom-none");
    input.click(10, 10);
    expect(view.getZoom()).toBe(SceneWidget.options.maxZoomFactor);
  });

  it("a drag zooms into the dragged area; a short small drag counts as a click", () => {
    const { manager, view, input } = setupTools();
    manager.activateTool(ZoomTool);
    input.down(100, 100);
    input.drag(110, 105);
    input.up(110, 105);
    expect(view.getZoom()).toBe(1.5);
    view.transform(0, 0, 1);
    input.down(100, 100);
    input.drag(300, 200);
    vi.advanceTimersByTime(300);
    input.up(300, 200);
    expect(view.getZoom()).toBeGreaterThan(3);
  });
});

describe("HandTool", () => {
  it("scrolls the view against the drag and shows the closed hand while panning", () => {
    const { manager, view, input } = setupTools();
    manager.activateTool(HandTool);
    expect(view.getCursor()).toBe("hand-open");
    input.down(100, 100);
    input.drag(130, 110);
    expect(view.getCursor()).toBe("hand-closed");
    expect([view.getScrollX(), view.getScrollY()]).toEqual([-30, -10]);
    expect(manager.activateTool(ZoomTool)).toBe(false);
    input.up(130, 110);
    expect(view.getCursor()).toBe("hand-open");
  });
});

describe("FillTool", () => {
  it("can only be activated with paths graphs selected", () => {
    const { manager, editor, page } = setupTools();
    const r = rect(page, 0, 0, 10, 10);
    editor.updateSelection(false, [r]);
    expect(manager.activateTool(FillTool)).toBe(false);
    editor.clearSelection();
    expect(manager.activateTool(FillTool)).toBe(false);
  });
});

describe("LayerTool", () => {
  it("selects the active layer instead of the selection and restores it when left", () => {
    const { manager, editor, scene, page } = setupTools();
    manager.activateTool(PointerTool);
    const layer = activeLayer(scene, page);
    const r = rect(layer, 0, 0, 10, 10);
    editor.updateSelection(false, [r]);
    manager.activateTool(LayerTool);
    expect(editor.getSelection()).toEqual([layer]);
    manager.activateTool(PointerTool);
    expect(editor.getSelection()).toEqual([r]);
  });

  it("picks the layer around a clicked element", () => {
    const { manager, scene, page } = setupTools();
    const layer = activeLayer(scene, page);
    manager.activateTool(LayerTool);
    const r = rect(layer, 0, 0, 10, 10);
    expect((manager.getActiveTool() as LayerTool)._getSelectableElement(r)).toBe(layer);
  });
});

describe("PointerTool", () => {
  it("leaves edit mode for select mode when deactivated", () => {
    const { manager } = setupTools();
    manager.activateTool(PointerTool);
    const pointer = manager.getActiveTool() as PointerTool;
    pointer.setEditMode(SelectTool.EditMode.Transform);
    manager.activateTool(HandTool);
    expect(pointer.getEditMode()).toBe(SelectTool.EditMode.Select);
  });
});

describe("ConnectorTool", () => {
  it("reports itself as the pen tool and only presses on shapes", () => {
    const { manager, scene, input } = setupTools();
    const connector = manager.getTool(23) as ConnectorTool;
    expect(connector).toBeInstanceOf(ConnectorTool);
    expect(String(connector)).toBe("[Object GPenTool]");
    manager.activateTool(connector);
    input.click(400, 300);
    expect(scene.queryAll("*").filter((n) => n instanceof Path)).toEqual([]);
  });
});

describe("MagicTool", () => {
  it("a stroke without a selection stays a selected path", () => {
    const { manager, scene, input } = setupTools();
    manager.activateTool(MagicTool);
    input.dragThrough(
      [100, 100],
      [
        [150, 100],
        [150, 150],
        [100, 150],
        [101, 101],
      ],
    );
    const paths = scene.queryAll("*").filter((n) => n instanceof Path) as Path[];
    expect(paths.length).toBe(1);
  });
});

describe("MagicTool with open sub-paths", () => {
  it("throws when the shaped selection also has an open sub-path (old crash, kept)", () => {
    const { manager, editor, page, input } = setupTools();
    const compound = new CompoundPath();
    const closed = new Path(true);
    for (const [x, y] of [
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100],
    ] as const) {
      const point = new AnchorPoint();
      point.setProperties(["x", "y"], [x, y]);
      closed.getAnchorPoints().appendChild(point);
    }
    const open = new Path(false);
    for (const [x, y] of [
      [200, 0],
      [300, 0],
    ] as const) {
      const point = new AnchorPoint();
      point.setProperties(["x", "y"], [x, y]);
      open.getAnchorPoints().appendChild(point);
    }
    compound.getPaths().appendChild(closed);
    compound.getPaths().appendChild(open);
    (page as unknown as { appendChild(node: Node): void }).appendChild(compound);
    editor.updateSelection(false, [compound]);
    manager.activateTool(MagicTool);
    input.down(50, 50);
    for (const [x, y] of [
      [150, 50],
      [150, 150],
      [50, 150],
      [51, 51],
    ] as const)
      input.drag(x, y);
    expect(() => input.up(51, 51)).toThrow(TypeError);
  });
});

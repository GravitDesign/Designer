import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Ellipse } from "../../engine/scene/ellipse.ts";
import type { Node } from "../../engine/scene/node.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import { ElementFlag } from "../../engine/scene/element-change.ts";
import { Path } from "../../engine/scene/path.ts";
import { Polygon } from "../../engine/scene/polygon.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Slice } from "../../engine/scene/slice.ts";
import type { FontManager } from "../../engine/text/fonts/font-manager.ts";
import { ResolveFontEvent } from "../../engine/text/fonts/font-manager.ts";
import { Text } from "../../engine/text/text.ts";
import { installFakeDom } from "../view/testing/fake-dom.ts";
import { EllipseTool } from "./ellipse-tool.ts";
import { LineTool } from "./line-tool.ts";
import { PolygonTool } from "./polygon-tool.ts";
import { RectangleTool } from "./rectangle-tool.ts";
import { SliceTool } from "./slice-tool.ts";
import { StarTool } from "./star-tool.ts";
import { TextTool } from "./text-tool.ts";
import { clearModifiers, releaseTools, setModifiers, setupTools, trf } from "./tool-testing.ts";
import { TriangleTool } from "./triangle-tool.ts";

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

const name = (tool: unknown): string => String(tool).replace(/^\[Object (.*)\]$/, "$1");

function all<T>(root: Node, cls: abstract new (...args: never[]) => T): T[] {
  return root.queryAll("*").filter((node) => node instanceof cls) as unknown as T[];
}

const props = (node: unknown, names: string[]): unknown[] =>
  names.map((n) => (node as { getProperty(name: string): unknown }).getProperty(n));

describe("RectangleTool", () => {
  it("draws the dragged box in one undo step and goes back to the pointer", () => {
    const { manager, scene, editor, input } = setupTools();
    manager.activateTool(RectangleTool);
    input.dragThrough(
      [100, 50],
      [
        [150, 80],
        [300, 150],
      ],
    );
    const [rect] = all(scene, Rectangle);
    expect(trf(rect as Rectangle)).toEqual([100, 0, 0, 50, 200, 100]);
    expect(editor.getUndoStateName()).toBe("Insert Element(s)");
    expect(editor.getUndoStates().length).toBe(1);
    expect(name(manager.getActiveTool())).toBe("GRectangleTool");
    vi.advanceTimersByTime(0);
    expect(name(manager.getActiveTool())).toBe("GPointerTool");
  });

  it("hides the shape while dragging and shows it at the end", () => {
    const { manager, scene, input } = setupTools();
    manager.activateTool(RectangleTool);
    input.down(10, 10);
    input.drag(60, 60);
    const [rect] = all(scene, Rectangle);
    expect((rect as Rectangle).hasFlag(ElementFlag.NoPaint)).toBe(true);
    input.up(60, 60);
    expect((rect as Rectangle).hasFlag(ElementFlag.NoPaint)).toBe(false);
  });

  it("Shift makes a square and Alt draws from the centre, also when flipped mid-drag", () => {
    const { manager, scene, input } = setupTools();
    manager.activateTool(RectangleTool);
    input.down(100, 100);
    input.drag(160, 130);
    const [rect] = all(scene, Rectangle) as Rectangle[];
    expect(trf(rect as Rectangle)).toEqual([30, 0, 0, 15, 130, 115]);
    setModifiers({ shiftKey: true });
    expect(trf(rect as Rectangle)).toEqual([30, 0, 0, 30, 130, 130]);
    setModifiers({ optionKey: true });
    expect(trf(rect as Rectangle)).toEqual([60, 0, 0, 60, 100, 100]);
    setModifiers({ shiftKey: false, optionKey: false });
    expect(trf(rect as Rectangle)).toEqual([30, 0, 0, 15, 130, 115]);
    input.up(160, 130);
  });

  it("Space moves the shape being drawn", () => {
    const { manager, scene, input } = setupTools();
    manager.activateTool(RectangleTool);
    input.down(100, 100);
    input.drag(150, 150);
    setModifiers({ spaceKey: true });
    // The tool manager switched to the hand tool; the rectangle tool stays
    // active underneath until the drag is over.
    expect(name(manager.getActiveTool())).toBe("GRectangleTool");
    input.drag(170, 160);
    const [rect] = all(scene, Rectangle) as Rectangle[];
    expect(trf(rect as Rectangle)).toEqual([25, 0, 0, 25, 145, 135]);
    setModifiers({ spaceKey: false });
    input.up(170, 160);
  });

  it("a click without a drag creates nothing and ends the job", () => {
    const { manager, scene, input } = setupTools();
    manager.activateTool(RectangleTool);
    input.click(100, 100);
    expect(all(scene, Rectangle)).toEqual([]);
    vi.advanceTimersByTime(0);
    expect(name(manager.getActiveTool())).toBe("GPointerTool");
  });
});

describe("EllipseTool", () => {
  it("draws the dragged box, at least 1 x 1", () => {
    const { manager, scene, input } = setupTools();
    manager.activateTool(EllipseTool);
    input.dragThrough([100, 100], [[100.25, 300]]);
    const [ellipse] = all(scene, Ellipse) as Ellipse[];
    expect(trf(ellipse as Ellipse)).toEqual([0.5, 0, 0, 100, 100.125, 200]);
  });
});

describe("LineTool", () => {
  it("draws a two-point open path without fills", () => {
    const { manager, scene, input } = setupTools();
    manager.activateTool(LineTool);
    input.dragThrough([10, 20], [[110, 70]]);
    const [line] = all(scene, Path) as Path[];
    const points = (line as Path).getAnchorPoints().getChildren();
    expect(points.map((p) => props(p, ["x", "y"]))).toEqual([
      [10, 20],
      [110, 70],
    ]);
    expect(
      ((line as Path).getPaintLayers() as never as { getFillLayers(): unknown[] }).getFillLayers(),
    ).toEqual([]);
  });

  it("Shift snaps to 45° steps, horizontal when the drag is flat", () => {
    const { manager, scene, input } = setupTools();
    manager.activateTool(LineTool);
    setModifiers({ shiftKey: true });
    input.dragThrough([0, 0], [[100, 40]]);
    const [line] = all(scene, Path) as Path[];
    const end = (line as Path).getAnchorPoints().getChildren()[1];
    expect(props(end, ["x", "y"])).toEqual([100, 0]);
  });
});

describe("PolygonTool, TriangleTool, StarTool", () => {
  it("polygon: six points around the press, outer radius to the pointer", () => {
    const { manager, scene, input } = setupTools();
    manager.activateTool(PolygonTool);
    input.dragThrough([100, 100], [[100, 200]]);
    const [polygon] = all(scene, Polygon) as Polygon[];
    const [pts, cx, cy, ir, or, ia, oa] = props(polygon, [
      "pts",
      "cx",
      "cy",
      "ir",
      "or",
      "ia",
      "oa",
    ]);
    expect([pts, cx, cy, or]).toEqual([6, 100, 100, 100]);
    expect(ir).toBeCloseTo(100 * Math.cos(Math.PI / 6), 12);
    expect(oa).toBeCloseTo(Math.PI / 2, 12);
    expect(ia).toBeCloseTo(Math.PI / 2 + Math.PI / 6, 12);
  });

  it("Shift locks the angle (15° for polygons, 18° for stars)", () => {
    const { manager, scene, input } = setupTools();
    manager.activateTool(TriangleTool);
    setModifiers({ shiftKey: true });
    input.dragThrough([0, 0], [[100, 119.18]]);
    manager.activateTool(StarTool, null, true);
    input.dragThrough([0, 0], [[100, 40]]);
    const [triangle, star] = all(scene, Polygon) as Polygon[];
    expect(props(triangle, ["pts"])).toEqual([3]);
    // 50° rounds to 45°.
    expect(props(triangle, ["oa"])[0]).toBeCloseTo(Math.PI / 4, 12);
    const [pts, or, ir, oa] = props(star, ["pts", "or", "ir", "oa"]) as number[];
    expect(pts).toBe(5);
    expect(ir).toBeCloseTo((or as number) * 0.5, 12);
    expect(oa).toBeCloseTo(Math.PI / 10, 12);
  });
});

describe("SliceTool", () => {
  it("inserts the slice only at drag end", () => {
    const { manager, scene, input } = setupTools();
    manager.activateTool(SliceTool);
    input.down(10, 20);
    input.drag(60, 100);
    expect(all(scene, Slice)).toEqual([]);
    input.up(60, 100);
    const [slice] = all(scene, Slice) as Slice[];
    expect(props(slice, ["x", "y", "w", "h"])).toEqual([10, 20, 50, 80]);
  });
});

describe("TextTool", () => {
  it("a click places an auto-sized text and opens it 10 ms later", () => {
    const { manager, scene, editor, input } = setupTools();
    manager.activateTool(TextTool);
    const open = vi.spyOn(editor, "openInlineEditor").mockReturnValue(true);
    input.move(50, 60);
    input.click(50, 60);
    const [text] = all(scene, Text) as Text[];
    expect(props(text, ["aw", "ah"])).toEqual([true, true]);
    expect(editor.getUndoStateName()).toBe("Insert text");
    expect(open).not.toHaveBeenCalled();
    vi.advanceTimersByTime(10);
    expect(open).toHaveBeenCalledWith(text, expect.anything());
  });

  it("a drag makes a fixed-width text from the box; the stand-in goes again", () => {
    const { manager, scene, input } = setupTools();
    manager.activateTool(TextTool);
    vi.spyOn(manager.getActiveTool() as TextTool, "_getDefaultMeasure").mockReturnValue({
      height: 20,
    });
    input.dragThrough([10, 10], [[210, 110]]);
    const texts = all(scene, Text) as Text[];
    expect(texts.length).toBe(1);
    expect(props(texts[0], ["aw", "ah"])).toEqual([false, false]);
  });

  it("a narrow drag gives an auto width, a low one an auto height", () => {
    const { manager, scene, input } = setupTools();
    manager.activateTool(TextTool);
    vi.spyOn(manager.getActiveTool() as TextTool, "_getDefaultMeasure").mockReturnValue({
      height: 20,
    });
    input.dragThrough([10, 10], [[13, 25]]);
    const [text] = all(scene, Text) as Text[];
    expect(props(text, ["aw", "ah"])).toEqual([true, true]);
  });

  it("keeps an empty measure for good when the font isn't resolved yet", () => {
    const { manager, scene } = setupTools();
    // A font manager whose app never resolves a font.
    const fonts = scene.getWorkspace()?.getFontManager() as FontManager;
    fonts.addEventListener(ResolveFontEvent, () => {});
    manager.activateTool(TextTool);
    const tool = manager.getActiveTool() as TextTool;
    const text = new Text();
    text.setProperties(["_tff", "_tfi", "_tfw", "_tfs"], ["Open Sans", 20, 400, "N"]);
    const first = tool._getDefaultMeasure(text);
    expect(first).toEqual({});
    expect(tool._getDefaultMeasure(text)).toBe(first);
  });
});

describe("selection after drawing", () => {
  it("the new shape is selected", () => {
    const { manager, scene, input } = setupTools();
    manager.activateTool(RectangleTool);
    input.dragThrough([0, 0], [[20, 20]]);
    const [rect] = all(scene, Rectangle) as Rectangle[];
    expect((rect as Rectangle).hasFlag(NodeFlag.Selected)).toBe(true);
  });
});

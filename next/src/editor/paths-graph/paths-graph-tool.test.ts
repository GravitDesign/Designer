import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Key } from "../../engine/core/key.ts";
import type { Node } from "../../engine/scene/node.ts";
import { PathsGraph } from "../../engine/scene/paths-graph/paths-graph.ts";
import type { PGAnchor } from "../../engine/scene/paths-graph/pg-anchor.ts";
import type { PGEdge } from "../../engine/scene/paths-graph/pg-edge.ts";
import { AnchorPoint } from "../../engine/scene/path-base.ts";
import { Cursor } from "../cursor.ts";
import { clearModifiers, pause, setModifiers, setupPathTool } from "../tools/path-testing.ts";
import { EditorOptions } from "../editor-options.ts";
import { installFakeDom } from "../view/testing/fake-dom.ts";
import type { PathsGraphEditor } from "./paths-graph-editor.ts";
import { PathsGraphTool } from "./paths-graph-tool.ts";

let uninstall: () => void;
beforeEach(() => {
  uninstall = installFakeDom();
  vi.useFakeTimers();
});
afterEach(() => {
  clearModifiers();
  vi.useRealTimers();
  uninstall();
});

const setup = () => setupPathTool(new PathsGraphTool());

/** Clicks at each point, far enough apart in time not to be double clicks. */
function clicks(input: ReturnType<typeof setup>["input"], points: [number, number][]): void {
  for (const [x, y] of points) {
    input.move(x, y);
    input.click(x, y);
    pause(1000);
  }
}

function graphs(page: { getChildren(): Node[] }): PathsGraph[] {
  return page.getChildren().filter((n): n is PathsGraph => n instanceof PathsGraph);
}

function anchorPoints(graph: PathsGraph): number[][] {
  return (graph.getAnchors().getChildren() as PGAnchor[]).map((a) => [
    a.getProperty("x") as number,
    a.getProperty("y") as number,
  ]);
}

describe("GPathsGraphTool", () => {
  it("draws a closed line into a new paths graph", () => {
    const { page, input, tool, editor } = setup();
    expect(tool.getCursor()).toBe(Cursor.PenStart);
    clicks(input, [
      [100, 100],
      [220, 100],
      [160, 190],
      [100, 100],
    ]);
    input.keyDown(Key.Constant.ESC);
    const [graph] = graphs(page);
    expect(graphs(page)).toHaveLength(1);
    const found = graph as PathsGraph;
    expect(anchorPoints(found)).toEqual([
      [100, 100],
      [220, 100],
      [160, 190],
    ]);
    expect(found.getEdges().getChildren()).toHaveLength(3);
    expect(found.getFacets().getChildren()).toHaveLength(1);
    expect(editor.getUndoStateName()).toBe("Insert Element(s)");
  });

  it("ends an open line with Esc", () => {
    const { page, input } = setup();
    clicks(input, [
      [100, 100],
      [200, 100],
    ]);
    input.keyDown(Key.Constant.ESC);
    const graph = graphs(page)[0] as PathsGraph;
    expect(anchorPoints(graph)).toEqual([
      [100, 100],
      [200, 100],
    ]);
    expect(graph.getEdges().getChildren()).toHaveLength(1);
    expect(graph.getFacets().getChildren()).toHaveLength(0);
  });

  it("shows the end cursor over an anchor of the line's graph", () => {
    const { input, tool } = setup();
    clicks(input, [[100, 100]]);
    input.move(300, 300);
    expect(tool.getCursor()).toBe(Cursor.Pen);
    input.move(100, 100);
    expect(tool.getCursor()).toBe(Cursor.PenEnd);
  });

  it("switches to the subselect tool on Enter", () => {
    const { input, manager } = setup();
    clicks(input, [[100, 100]]);
    input.keyDown(Key.Constant.ENTER);
    expect(manager.calls).toContain("activateSubSelect");
  });

  it("throws on a Shift move right after the first click (old bug, kept)", () => {
    const { input } = setup();
    clicks(input, [[100, 100]]);
    setModifiers({ shiftKey: true });
    // The move constrains against the graph itself, which has no anchor points.
    expect(() => input.move(150, 120)).toThrow("getAnchorPoints is not a function");
  });
});

/** Edges as [source, destination, first point, last point] with x, y, hlx, hly, hrx, hry, tp, ah. */
function edgeData(graph: PathsGraph): unknown[] {
  const anchors = graph.getAnchors().getChildren();
  return (graph.getEdges().getChildren() as PGEdge[]).map((edge) => {
    const points = edge.getPathBase().getAnchorPoints().getChildren() as AnchorPoint[];
    return [
      anchors.indexOf(edge.getSource() as Node),
      anchors.indexOf(edge.getDestination() as Node),
      ...points.map((p) =>
        ["x", "y", "hlx", "hly", "hrx", "hry", "tp", "ah"].map((n) => p.getProperty(n)),
      ),
    ];
  });
}

const undoNames = (editor: { getUndoStates(): { name: string }[] }): string[] =>
  editor.getUndoStates().map((state) => state.name);

describe("GPathsGraphTool branches", () => {
  it("drags handles out of a new point after the first click", () => {
    const { page, input } = setup();
    clicks(input, [[100, 100]]);
    input.move(200, 100);
    input.down(200, 100);
    input.drag(230, 130);
    input.drag(240, 140);
    input.up(240, 140);
    pause(1000);
    input.keyDown(Key.Constant.ESC);
    // The new point mirrors its handles around itself; the first point
    // keeps the automatic handle it had (now fixed, ah false).
    expect(edgeData(graphs(page)[0] as PathsGraph)).toEqual([
      [
        0,
        1,
        [100, 100, null, null, 139.026286, 100, "R", false],
        [200, 100, 160, 60, 240, 140, "TS", false],
      ],
    ]);
  });

  it("drags only the right handle when Alt is held at the press", () => {
    const { page, input } = setup();
    clicks(input, [[100, 100]]);
    input.move(200, 100);
    setModifiers({ optionKey: true });
    input.down(200, 100);
    input.drag(230, 130);
    input.drag(240, 140);
    input.up(240, 140);
    setModifiers({ optionKey: false });
    pause(1000);
    input.keyDown(Key.Constant.ESC);
    // Asymmetric; the left handle is the automatic one of the press.
    expect(edgeData(graphs(page)[0] as PathsGraph)).toEqual([
      [
        0,
        1,
        [100, 100, null, null, null, null, "R", false],
        [200, 100, 160.973714, 100, 240, 140, "TA", false],
      ],
    ]);
  });

  it("flips the preview point between symmetric and asymmetric with Alt", () => {
    const { input, tool } = setup();
    clicks(input, [[100, 100]]);
    input.move(200, 150);
    const point = tool._editPt as AnchorPoint;
    expect(tool._newPoint).toBe(true);
    setModifiers({ optionKey: true });
    expect(point.getProperty("tp")).toBe(AnchorPoint.Type.Symmetric);
    setModifiers({ optionKey: false });
    expect(point.getProperty("tp")).toBe(AnchorPoint.Type.Asymmetric);
  });

  it("starts a new line at an anchor or an edge pressed in Edit mode", () => {
    const { page, input, editor } = setup();
    clicks(input, [
      [100, 100],
      [300, 100],
    ]);
    input.keyDown(Key.Constant.ESC);
    pause(1000);
    clicks(input, [
      [300, 100],
      [300, 200],
    ]);
    input.keyDown(Key.Constant.ESC);
    pause(1000);
    expect(graphs(page)).toHaveLength(1);
    const graph = graphs(page)[0] as PathsGraph;
    expect(anchorPoints(graph)).toEqual([
      [100, 100],
      [300, 100],
      [300, 200],
    ]);
    expect(edgeData(graph).map((edge) => (edge as number[]).slice(0, 2))).toEqual([
      [0, 1],
      [1, 2],
    ]);
    // On an edge: the edge is split there and the new line starts at the new anchor.
    clicks(input, [
      [200, 100],
      [200, 250],
    ]);
    input.keyDown(Key.Constant.ESC);
    expect(anchorPoints(graph)).toEqual([
      [100, 100],
      [300, 100],
      [300, 200],
      [200, 100],
      [200, 250],
    ]);
    expect(edgeData(graph).map((edge) => (edge as number[]).slice(0, 2))).toEqual([
      [0, 3],
      [3, 1],
      [1, 2],
      [3, 4],
    ]);
    // Only the graph's creation is an undo step. The old app is the same:
    // extra/paths-graph-editing still shows "Insert Element(s)" after the
    // anchor move (see "Paths graph edits leave no undo step" in
    // QUESTIONS.md).
    expect(undoNames(editor)).toEqual(["Insert Element(s)"]);
  });

  it("ends a line on an edge of the graph, splitting it", () => {
    const { page, input } = setup();
    clicks(input, [
      [100, 100],
      [300, 100],
    ]);
    input.keyDown(Key.Constant.ESC);
    pause(1000);
    clicks(input, [
      [100, 100],
      [200, 200],
      [200, 100],
    ]);
    const graph = graphs(page)[0] as PathsGraph;
    expect(anchorPoints(graph)).toEqual([
      [100, 100],
      [300, 100],
      [200, 100],
      [200, 200],
    ]);
    expect(edgeData(graph).map((edge) => (edge as number[]).slice(0, 2))).toEqual([
      [0, 2],
      [2, 1],
      [0, 3],
      [3, 2],
    ]);
    expect(graph.getFacets().getChildren()).toHaveLength(1);
  });

  it("ends the line on a double click", () => {
    const { page, input, tool, manager } = setup();
    clicks(input, [[100, 100]]);
    input.move(200, 100);
    input.click(200, 100);
    input.down(200, 100);
    input.up(200, 100);
    expect(tool._mode).toBe(PathsGraphTool.Mode.Edit);
    expect(manager.calls).not.toContain("notifyJobDone");
    const graph = graphs(page)[0] as PathsGraph;
    // The line is dropped, not inserted: only the start anchor stays (see
    // "Paths graph tool double click drops the line" in QUESTIONS.md).
    expect(anchorPoints(graph)).toEqual([[100, 100]]);
    expect(graph.getEdges().getChildren()).toHaveLength(0);
  });

  it("reports the job done on a double click with the edit behaviour", () => {
    const saved = EditorOptions.selectDoubleClickBehavior;
    EditorOptions.selectDoubleClickBehavior = "edit";
    try {
      const { input, tool, manager } = setup();
      clicks(input, [[100, 100]]);
      input.move(200, 100);
      input.click(200, 100);
      input.down(200, 100);
      expect(manager.calls).toContain("notifyJobDone");
      expect(tool._mode).toBe(PathsGraphTool.Mode.Append);
    } finally {
      EditorOptions.selectDoubleClickBehavior = saved;
    }
  });

  it("drops the preview point when deactivated", () => {
    const { page, input, tool, view } = setup();
    clicks(input, [[100, 100]]);
    input.move(200, 150);
    const editor = tool._graphEditor as PathsGraphEditor;
    expect(tool._newPoint).toBe(true);
    expect(editor._pbEditor).toBeTruthy();
    const preview = (editor._pbEditor as NonNullable<typeof editor._pbEditor>)._elementPreview;
    expect(preview).toBeTruthy();
    tool.deactivate(view);
    expect((editor._pbEditor as NonNullable<typeof editor._pbEditor>)._elementPreview).toBeNull();
    expect(tool._graphEditor).toBeNull();
    expect(tool._editPt).toBeNull();
    const graph = graphs(page)[0] as PathsGraph;
    expect(anchorPoints(graph)).toEqual([[100, 100]]);
  });
});

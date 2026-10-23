import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Key } from "../../engine/core/key.ts";
import type { Node } from "../../engine/scene/node.ts";
import { PathsGraph } from "../../engine/scene/paths-graph/paths-graph.ts";
import type { PGAnchor } from "../../engine/scene/paths-graph/pg-anchor.ts";
import { Cursor } from "../cursor.ts";
import { clearModifiers, pause, setModifiers, setupPathTool } from "../tools/path-testing.ts";
import { installFakeDom } from "../view/testing/fake-dom.ts";
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

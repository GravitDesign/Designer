import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Key } from "../../engine/core/key.ts";
import { MouseEvent } from "../../engine/core/mouse-event.ts";
import type { VertexContainer } from "../../engine/geometry/vertex-container.ts";
import { Vertex } from "../../engine/geometry/vertex.ts";
import { Point } from "../../engine/math/point.ts";
import { AnchorPoint, PathBase } from "../../engine/scene/path-base.ts";
import { Path } from "../../engine/scene/path.ts";
import { PathsGraph } from "../../engine/scene/paths-graph/paths-graph.ts";
import type { PGEdge } from "../../engine/scene/paths-graph/pg-edge.ts";
import type { FillPaintLayer } from "../../engine/style/fill-paint-layer.ts";
import { LinearGradient } from "../../engine/style/linear-gradient.ts";
import { PartInfo } from "../element-editors/base-editor.ts";
import { ElementEditor } from "../element-editors/element-editor.ts";
import type { GradientStyleEditor } from "../element-editors/gradient-style-editor.ts";
import { PathsGraphEditor } from "../paths-graph/paths-graph-editor.ts";
import { isPathsGraphPart } from "./select/paths-graph.ts";
import { Cursor } from "../cursor.ts";
import { EditorOptions } from "../editor-options.ts";
import { installFakeDom } from "../view/testing/fake-dom.ts";
import { LassoTool, type LassoAreaSelector } from "./lasso-tool.ts";
import { SelectTool } from "./select-tool.ts";
import { clearModifiers, group, Input, rect, setupTool } from "./select/testing.ts";
import { SubSelectTool } from "./sub-select-tool.ts";

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

const selection = (editor: { getSelection(): unknown[] | null }): unknown[] =>
  editor.getSelection() || [];

function path(points: [number, number][]): Path {
  const p = new Path(false);
  for (const [x, y] of points) {
    const anchor = new PathBase.AnchorPoint();
    anchor.setProperties(["x", "y"], [x, y]);
    p.getAnchorPoints().appendChild(anchor);
  }
  return p;
}

describe("SubSelectTool", () => {
  it("selects the shape inside a group on the first click", async () => {
    const s = setupTool(new SubSelectTool());
    const input = new Input(s.view);
    const g = group(s.page);
    const child = rect(g, 100, 100, 120, 100);
    rect(g, 240, 100, 120, 100);
    await input.click(150, 150);
    expect(selection(s.editor)).toEqual([child]);
  });

  it("shows the inverse select cursors", () => {
    const s = setupTool(new SubSelectTool());
    const input = new Input(s.view);
    rect(s.page, 100, 100, 200, 120);
    input.move(600, 500);
    expect(s.tool.getCursor()).toBe(Cursor.SelectInverse);
    input.move(200, 160);
    expect(s.tool.getCursor()).toBe(Cursor.SelectDotInverse);
  });

  it("takes items but not groups, and selects parts only while something is selected", () => {
    const s = setupTool(new SubSelectTool());
    const g = group(s.page);
    const child = rect(g, 0, 0, 10, 10);
    expect(s.tool._getSelectableElement(g)).toBeNull();
    expect(s.tool._getSelectableElement(child)).toBe(child);
    expect(s.tool._selectAcceptor(g)).toBe(false);
    expect(s.tool._getCollisionFlags()).not.toBeNull();
    s.editor.updateSelection(false, [child]);
    expect(s.tool._getCollisionFlags()).toBeNull();
  });

  it("switches to the path tool on Tab with one path selected", () => {
    const s = setupTool(new SubSelectTool());
    const input = new Input(s.view);
    const p = path([
      [100, 100],
      [300, 250],
    ]);
    s.page.appendChild(p);
    s.editor.updateSelection(false, [p]);
    input.keyDown(Key.Constant.TAB);
    expect(s.manager.calls).toEqual(["activateOldPathTool"]);
  });

  it("finishes on an unhandled double click when it was entered by one", () => {
    const s = setupTool(new SubSelectTool());
    const before = EditorOptions.selectDoubleClickBehavior;
    EditorOptions.selectDoubleClickBehavior = SelectTool._DblClick.SubSelectSwitch;
    try {
      const event = new MouseEvent.DblClick();
      event.client = new Point(600, 500);
      expect(s.tool._mouseDblClick(event)).toBe(true);
      expect(s.manager.calls).toEqual(["notifyJobDone"]);
    } finally {
      EditorOptions.selectDoubleClickBehavior = before;
    }
  });

  it("selects on release only and leaves the selection mode when deactivated", async () => {
    const s = setupTool(new SubSelectTool());
    const input = new Input(s.view);
    expect(s.tool._releaseOnlySelection).toBe(true);
    expect(s.editor.hasSelectionDetail()).toBe(true);
    const a = rect(s.page, 100, 100, 200, 120);
    input.down(200, 160);
    expect(selection(s.editor)).toEqual([]);
    await input.up(200, 160);
    expect(selection(s.editor)).toEqual([a]);
    s.tool.deactivate(s.view);
    expect(s.editor.hasSelectionDetail()).toBe(false);
  });
});

describe("LassoTool", () => {
  it("shows the lasso cursor where the subselect tool shows its arrow", () => {
    const s = setupTool(new LassoTool());
    const input = new Input(s.view);
    rect(s.page, 100, 100, 200, 120);
    input.move(600, 500);
    expect(s.tool.getCursor()).toBe(Cursor.Lasso);
    input.move(200, 160);
    expect(s.tool.getCursor()).toBe(Cursor.SelectDotInverse);
  });

  it("follows the pointer and replaces runs of 20 points with fitted curves", () => {
    const selector = new LassoTool()._areaSelector;
    selector.startArea(new Point(0, 0));
    // A gentle curve in steps of about 1.5 px, so the squared steps stay
    // under 400 and only the point count triggers the fit.
    const at = (i: number): Point => new Point(i * 1.5, 0.02 * i * i);
    for (let i = 1; i <= 19; i++) selector.expandToPoint(at(i));
    const commands = (): number[] => {
      const out: number[] = [];
      const v = new Vertex();
      selector._vertexContainer.rewindVertices(0);
      while (selector._vertexContainer.readVertex(v)) out.push(v.command);
      return out;
    };
    expect(commands().filter((c) => c === Vertex.Command.Curve2)).toEqual([]);
    selector.expandToPoint(at(20));
    const fitted = commands();
    expect(fitted[0]).toBe(Vertex.Command.Move);
    expect(fitted.filter((c) => c === Vertex.Command.Curve2).length % 3).toBe(0);
    expect(fitted.filter((c) => c === Vertex.Command.Curve2).length).toBeGreaterThan(0);
    // The point that triggered the fit follows as a line.
    expect(fitted[fitted.length - 1]).toBe(Vertex.Command.Line);
  });

  it("skips pointer steps shorter than one pixel", () => {
    const selector = new LassoTool()._areaSelector;
    selector.startArea(new Point(0, 0));
    selector.expandToPoint(new Point(0.5, 0.5));
    expect(selector._vertexContainer.getCount()).toBe(1);
    selector.expandToPoint(new Point(2, 0));
    expect(selector._vertexContainer.getCount()).toBe(2);
  });

  it("selects the shapes the free-hand outline touches", async () => {
    const s = setupTool(new LassoTool());
    const input = new Input(s.view);
    const a = rect(s.page, 100, 100, 50, 50);
    rect(s.page, 400, 400, 50, 50);
    input.down(50, 50);
    for (const [x, y] of [
      [60, 60],
      [120, 70],
      [200, 200],
      [70, 200],
    ] as [number, number][]) {
      input.drag(x, y);
    }
    await input.up(70, 200);
    expect(selection(s.editor)).toEqual([a]);
  });
});

describe("SubSelectTool gradient drag", () => {
  it("drags a gradient end without panning or closing the style editor, and commits its data", async () => {
    const s = setupTool(new SubSelectTool());
    const input = new Input(s.view);
    const r = rect(s.page, 100, 100, 200, 120);
    s.editor.updateSelection(false, [r]);
    const fill = r.getPaintLayers()?.getFirstChild() as FillPaintLayer;
    fill.setProperty("_pt", new LinearGradient());
    const manager = s.tool._styleEdManager as NonNullable<SubSelectTool["_styleEdManager"]>;
    const gradientEditor = manager.getActiveEditor() as GradientStyleEditor;
    expect(gradientEditor).not.toBeNull();
    const pan = vi.spyOn(s.tool, "beginPan");
    const deactivate = vi.spyOn(manager, "deactivateEditor");
    const commit = vi.spyOn(s.editor, "commitTransaction");
    // The gradient's start stop sits at the left middle of the rectangle.
    input.move(100, 160);
    input.down(100, 160);
    input.drag(101, 160);
    vi.advanceTimersByTime(40);
    input.drag(130, 160);
    input.drag(150, 170);
    expect(s.tool._editorMovePartInfo?.editor).toBe(gradientEditor);
    expect(manager.getActiveEditor()).toBe(gradientEditor);
    expect(pan).not.toHaveBeenCalled();
    expect(deactivate).not.toHaveBeenCalled();
    await input.up(150, 170);
    expect(manager.getActiveEditor()).toBe(gradientEditor);
    expect(commit.mock.calls).toEqual([["Modify Gradient", gradientEditor.getEditorData()]]);
    expect(gradientEditor.getEditorData()).toEqual({
      chooserOn: true,
      fillLayerIndex: 0,
      activeStopIdx: 0,
    });
  });
});

describe("SubSelectTool over a paths graph", () => {
  function graphSetup() {
    const s = setupTool(new SubSelectTool());
    const input = new Input(s.view);
    const base = new PathBase();
    for (const [x, y] of [
      [100, 100],
      [300, 100],
      [300, 300],
      [100, 300],
      [100, 100],
    ] as [number, number][]) {
      const point = new AnchorPoint();
      point.setProperties(["x", "y"], [x, y]);
      base.getAnchorPoints().appendChild(point);
    }
    const graph = new PathsGraph();
    graph.addGraphLine(base, null, null, null, true);
    s.page.appendChild(graph);
    s.editor.updateSelection(false, [graph]);
    const editor = ElementEditor.getEditor(graph) as unknown as PathsGraphEditor;
    return { ...s, input, graph, editor };
  }

  it("highlights the unselected edge under the pointer through highlightPart", () => {
    const { input, graph, editor } = graphSetup();
    expect(editor).toBeInstanceOf(PathsGraphEditor);
    const edges = graph.getEdges().getChildren() as PGEdge[];
    input.move(200, 100);
    const part = editor._highlightPart as { type: number; edge: PGEdge } | null;
    expect(part?.type).toBe(PathsGraphEditor.PartType.Segment);
    expect(edges).toContain(part?.edge);
  });

  it("throws on a paths graph part with a null id, as the old checks did", () => {
    // The old code read id.type without a null check.
    const { editor } = graphSetup();
    const info = new PartInfo(editor as never, null, null, false, true);
    expect(() => isPathsGraphPart(info, "Point")).toThrow(TypeError);
    expect(isPathsGraphPart(info)).toBe(true);
  });
});

describe("LassoTool auto-pan", () => {
  it("moves the fitted outline, the pending points and the current point by a translation", () => {
    const selector = new LassoTool()._areaSelector as LassoAreaSelector;
    selector.startArea(new Point(0, 0));
    const at = (i: number): Point => new Point(i * 1.5, 0.02 * i * i);
    for (let i = 1; i <= 22; i++) selector.expandToPoint(at(i));
    const first = (container: VertexContainer): [number, number] => {
      const v = new Vertex();
      container.rewindVertices(0);
      container.readVertex(v);
      return [v.x, v.y];
    };
    const processed = selector._processedVertices as VertexContainer;
    expect(processed.getCount()).toBeGreaterThan(0);
    const outlineStart = first(selector._vertexContainer);
    const processedStart = first(processed);
    const pending = (selector._currentPoints as Point[]).map((p) => [p.getX(), p.getY()]);
    expect(pending.length).toBeGreaterThan(0);
    selector.translate(new Point(10, 0));
    selector.expandToPoint(at(23));
    expect(first(selector._vertexContainer)).toEqual([outlineStart[0] + 10, outlineStart[1]]);
    expect(first(selector._processedVertices as VertexContainer)).toEqual([
      processedStart[0] + 10,
      processedStart[1],
    ]);
    // The kept points moved; the new one is appended as given.
    expect((selector._currentPoints as Point[]).map((p) => [p.getX(), p.getY()])).toEqual([
      ...pending.map(([x, y]) => [(x as number) + 10, y]),
      [at(23).getX(), at(23).getY()],
    ]);
    expect(selector._current?.getX()).toBe(at(23).getX());
    expect(selector._trf).toBeNull();
  });
});

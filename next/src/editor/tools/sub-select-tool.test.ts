import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Key } from "../../engine/core/key.ts";
import { MouseEvent } from "../../engine/core/mouse-event.ts";
import { Vertex } from "../../engine/geometry/vertex.ts";
import { Point } from "../../engine/math/point.ts";
import { PathBase } from "../../engine/scene/path-base.ts";
import { Path } from "../../engine/scene/path.ts";
import { Cursor } from "../cursor.ts";
import { EditorOptions } from "../editor-options.ts";
import { installFakeDom } from "../view/testing/fake-dom.ts";
import { LassoTool } from "./lasso-tool.ts";
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

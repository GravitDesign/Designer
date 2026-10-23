import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Key } from "../../engine/core/key.ts";
import { MouseEvent } from "../../engine/core/mouse-event.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import { AnchorPoint, PathBase } from "../../engine/scene/path-base.ts";
import { Cursor } from "../cursor.ts";
import { EditorOptions } from "../editor-options.ts";
import { PathBaseEditor } from "../element-editors/path-base-editor.ts";
import { installFakeDom } from "../view/testing/fake-dom.ts";
import {
  at,
  clearModifiers,
  pause,
  pathAt,
  paths,
  points,
  polyline,
  setModifiers,
  setupPathTool,
} from "./path-testing.ts";
import { PenTool } from "./pen-tool.ts";

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

const setup = () => setupPathTool(new PenTool());

/** Separate clicks, each after the double-click window. */
function clicks(input: ReturnType<typeof setup>["input"], ...pts: [number, number][]): void {
  for (const [x, y] of pts) {
    pause();
    input.click(x, y);
  }
}

describe("PenTool clicks", () => {
  it("places corner points into one new path and names the undo steps", () => {
    const { page, editor, input, tool } = setup();
    expect(tool.getCursor()).toBe(Cursor.PenStart);
    clicks(input, [100, 100]);
    expect(editor.getUndoStateName()).toBe("Insert Element(s)");
    clicks(input, [250, 100], [250, 250]);
    const path = pathAt(page);
    expect(paths(page)).toHaveLength(1);
    expect(points(path, ["x", "y", "hlx", "hrx"])).toEqual([
      [100, 100, null, null],
      [250, 100, null, null],
      [250, 250, null, null],
    ]);
    expect(editor.getUndoStateName()).toBe("Append Point");
    expect(tool.getCursor()).toBe(Cursor.Pen);
  });

  it("ignores a second press within the double-click time and finishes the path", () => {
    const { page, input, tool } = setup();
    clicks(input, [100, 100], [250, 100]);
    input.click(250, 250); // within 300 ms of the last press
    expect(points(pathAt(page, 0))).toEqual([
      [100, 100],
      [250, 100],
    ]);
    expect(tool._mode).toBe(PenTool.Mode.Edit);
  });

  it("Escape ends the path, deselects it and hands back to the default tool", () => {
    const { page, input, manager, editor } = setup();
    clicks(input, [100, 100], [250, 100]);
    pause();
    input.move(300, 300);
    input.keyDown(Key.Constant.ESC);
    expect(manager.calls).toContain("notifyJobDone");
    expect(pathAt(page, 0).hasFlag(NodeFlag.Selected)).toBe(false);
    expect(editor.getSelection() ?? []).toEqual([]);
  });

  it("Enter ends the path and switches to the subselect tool", () => {
    const { input, manager } = setup();
    clicks(input, [100, 100], [250, 100]);
    input.keyDown(Key.Constant.ENTER);
    expect(manager.calls).toEqual(["activateSubSelect"]);
  });

  it("a right click places a rounded corner, Alt+right click a connector", () => {
    const { page, input } = setup();
    clicks(input, [100, 100]);
    const first = pathAt(page, 0).getAnchorPoints().getFirstChild() as AnchorPoint;
    // A plain click leaves the point as it is born: a rounded corner of
    // size 0. The right click sets the same values explicitly.
    first.setProperties(["tp", "cu"], [AnchorPoint.Type.Asymmetric, false]);
    pause();
    input.down(250, 100, MouseEvent.BUTTON_RIGHT);
    input.up(250, 100, MouseEvent.BUTTON_RIGHT);
    pause();
    setModifiers({ optionKey: true });
    input.down(250, 250, MouseEvent.BUTTON_RIGHT);
    input.up(250, 250, MouseEvent.BUTTON_RIGHT);
    setModifiers({ optionKey: false });
    expect(points(pathAt(page, 0), ["tp", "cu"]).slice(1)).toEqual([
      [PathBase.CornerType.Rounded, true],
      [AnchorPoint.Type.Connector, true],
    ]);
  });
});

describe("PenTool handles", () => {
  it("a click-drag pulls symmetric handles out of the new point", () => {
    const { page, input } = setup();
    clicks(input, [100, 200]);
    pause();
    input.down(250, 120);
    input.drag(280, 120);
    input.drag(320, 120);
    input.up(320, 120);
    expect(points(pathAt(page, 0), ["x", "y", "tp", "hlx", "hly", "hrx", "hry"])[1]).toEqual([
      250,
      120,
      AnchorPoint.Type.Symmetric,
      180,
      120,
      320,
      120,
    ]);
  });

  it("Alt during the drag breaks the pair: only the outgoing handle follows", () => {
    const { page, input } = setup();
    clicks(input, [100, 200]);
    pause();
    input.down(250, 120);
    input.drag(280, 120);
    setModifiers({ optionKey: true });
    input.drag(300, 160);
    input.up(300, 160);
    setModifiers({ optionKey: false });
    expect(points(pathAt(page, 0), ["tp", "hlx", "hly", "hrx", "hry"])[1]).toEqual([
      AnchorPoint.Type.Asymmetric,
      220,
      120,
      300,
      160,
    ]);
  });

  it("Shift constrains the next point to 45° steps", () => {
    const { page, input } = setup();
    clicks(input, [100, 100]);
    setModifiers({ shiftKey: true });
    clicks(input, [250, 130]);
    setModifiers({ shiftKey: false });
    expect(points(pathAt(page, 0))[1]).toEqual([250, 100]);
  });
});

describe("PenTool Space", () => {
  /** Places (100, 200), presses at (250, 120), drags, then drags 20, 30 further with Space. */
  function spaceDrag(originX: number, originY: number): unknown[] {
    const { input, tool, view } = setup();
    view.transform(-originX, -originY, 1);
    const at = (x: number, y: number): [number, number] => [x + originX, y + originY];
    pause();
    input.click(...at(100, 200));
    pause();
    input.down(...at(250, 120));
    input.drag(...at(280, 120));
    setModifiers({ spaceKey: true });
    input.drag(...at(300, 150));
    const point = tool._editPt as AnchorPoint;
    const out = [point.getProperty("x"), point.getProperty("y")];
    setModifiers({ spaceKey: false });
    input.up(...at(300, 150));
    return out;
  }

  it("moves the anchor point being placed by the pointer delta", () => {
    expect(spaceDrag(0, 0)).toEqual([270, 150]);
  });

  it("in a scrolled view throws the anchor off by the scroll (old bug, kept)", () => {
    // The point's scene position plus the delta is read as a view
    // position; see "Pen Space in a scrolled view" in the BUGS-FIXED
    // candidates.
    expect(spaceDrag(400, 200)).toEqual([270 - 400, 150 - 200]);
  });
});

describe("PenTool closing and joining", () => {
  it("clicking the first point closes the path and shows its fill", () => {
    const { page, input, tool, editor } = setup();
    clicks(input, [100, 100], [250, 100], [250, 250]);
    pause();
    input.move(100, 100);
    expect(tool.getCursor()).toBe(Cursor.PenEnd);
    clicks(input, [100, 100]);
    const path = pathAt(page, 0);
    expect(path.getProperty("closed")).toBe(true);
    expect(points(path)).toHaveLength(3);
    expect(editor.getUndoStateName()).toBe("Modify Path Properties");
    const fills = path.getPaintLayers()?.getFillLayers() ?? [];
    expect(fills.length).toBeGreaterThan(0);
    expect(fills.every((f) => f.getProperty("_vs") === true)).toBe(true);
  });

  it("with leaveWhenClosePath the tool exits once the path is closed", () => {
    const { input, manager } = setup();
    EditorOptions.leaveWhenClosePath = true;
    try {
      clicks(input, [100, 100], [250, 100], [250, 250], [100, 100]);
      pause();
      // The first move only picks the closed path up again (see
      // "leaveWhenClosePath waits for the second move" in QUESTIONS.md).
      input.move(120, 120);
      expect(manager.calls).not.toContain("notifyJobDone");
      input.move(130, 120);
      expect(manager.calls).toContain("notifyJobDone");
    } finally {
      EditorOptions.leaveWhenClosePath = false;
    }
  });

  it("clicking the end of another open path joins it", () => {
    const { page, input, editor } = setup();
    polyline(page, [
      [100, 300],
      [200, 300],
    ]);
    clicks(input, [100, 100], [200, 100]);
    pause();
    input.move(200, 300);
    clicks(input, [200, 300]);
    const all = paths(page);
    expect(all).toHaveLength(1);
    expect(points(at(all, 0))).toEqual([
      [100, 100],
      [200, 100],
      [200, 300],
      [100, 300],
    ]);
    expect(editor.getUndoStateName()).toBe("Join Paths");
  });
});

describe("PenTool on an existing path", () => {
  it("removes handles, deletes a corner point and inserts on a segment", () => {
    const { page, input, editor } = setup();
    const path = polyline(
      page,
      [
        [100, 100],
        [300, 100],
        [300, 250],
        [100, 250],
      ],
      true,
    );
    const second = path.getAnchorPoints().getChildByIndex(1) as AnchorPoint;
    second.setProperties(["hlx", "hly", "hrx", "hry"], [260, 60, 340, 140]);
    editor.updateSelection(false, [path]);
    clicks(input, [300, 100]);
    expect(points(path, ["hlx", "hrx"])[1]).toEqual([null, null]);
    expect(editor.getUndoStateName()).toBe("Modify Point Properties");
    clicks(input, [300, 250]);
    expect(points(path)).toEqual([
      [100, 100],
      [300, 100],
      [100, 250],
    ]);
    expect(editor.getUndoStateName()).toBe("Delete Point");
    clicks(input, [100, 175]);
    expect(points(path)).toHaveLength(4);
    expect(editor.getUndoStateName()).toBe("Insert Point");
  });
});

describe("PenTool light switch", () => {
  // The tool manager deactivates the pen lightly for a temporary switch
  // (holding D, Space) and activates it normally when it comes back.
  function afterDeactivation(light: boolean) {
    const { page, input, tool, view, editor } = setup();
    clicks(input, [100, 100], [250, 100]);
    tool.deactivate(view, light);
    const path = pathAt(page, 0);
    const pathEditor = (path as unknown as { __editor__: { getActiveExtendingMode(): unknown } })
      .__editor__;
    const state = {
      extending: pathEditor.getActiveExtendingMode(),
      pathResize: editor.hasPathResize(),
    };
    tool.activate(view);
    clicks(input, [270, 250]);
    return { state, points: points(path) };
  }

  it("a light deactivation keeps the extending mode and the path resize state", () => {
    const { state, points: pts } = afterDeactivation(true);
    expect(state).toEqual({ extending: PathBaseEditor.ExtendingMode.End, pathResize: false });
    expect(pts).toEqual([
      [100, 100],
      [250, 100],
      [270, 250],
    ]);
  });

  it("a full deactivation stops extending and restores path resizing", () => {
    const { state } = afterDeactivation(false);
    expect(state).toEqual({ extending: PathBaseEditor.ExtendingMode.Off, pathResize: true });
  });
});

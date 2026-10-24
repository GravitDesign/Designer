import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Key } from "../../engine/core/key.ts";
import { MouseEvent } from "../../engine/core/mouse-event.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import { AnchorPoint, PathBase } from "../../engine/scene/path-base.ts";
import { Cursor } from "../cursor.ts";
import { EditorOptions } from "../editor-options.ts";
import { PathBaseEditor } from "../element-editors/path-base-editor.ts";
import { installFakeDom, runAllFrames } from "../view/testing/fake-dom.ts";
import {
  at,
  clearModifiers,
  pause,
  pathAt,
  paths,
  points,
  polyline,
  dragThrough,
  oldApp,
  oldPaths,
  savedPaths,
  scenarioView,
  setModifiers,
  setupPathTool,
} from "./path-testing.ts";
import { PenTool } from "./pen-tool.ts";
import { CompoundPath } from "../../engine/scene/compound-path.ts";
import { Path } from "../../engine/scene/path.ts";
import type { Page } from "../../engine/scene/page.ts";

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

  it("BUG-046: moves the anchor by the pointer delta in a scrolled view too", () => {
    // The old code read the point's scene position plus the delta as a
    // view position: [270 - 400, 150 - 200].
    expect(spaceDrag(400, 200)).toEqual([270, 150]);
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

// The cases below replay the parity scenarios in
// parity/scenarios/editor-tools/cases-pen-branches.ts; the expected
// points, undo names and tools come from the old app's recordings of
// them (pen-branches.recorded.json).
type Setup = ReturnType<typeof setup>;
const scenarioSetup = () => scenarioView(setup());
const newPaths = savedPaths;

/** The CURVE fixture: smooth points with handles, selected. */
function curve(s: Setup): Path {
  const path = polyline(s.page, [
    [100, 200],
    [250, 120],
    [400, 200],
  ]);
  const handles = [
    [60, 240, 140, 160],
    [200, 120, 300, 120],
    [360, 160, 440, 240],
  ];
  handles.forEach((h, i) => {
    const point = path.getAnchorPoints().getChildByIndex(i) as AnchorPoint;
    point.setProperties(["hlx", "hly", "hrx", "hry"], h);
    point.setProperty("tp", AnchorPoint.Type.Symmetric);
  });
  s.editor.updateSelection(false, [path]);
  return path;
}

/** The POLY_SELECTED fixture. */
function polySelected(s: Setup): Path {
  const path = polyline(s.page, [
    [100, 100],
    [300, 250],
    [100, 250],
  ]);
  s.editor.updateSelection(false, [path]);
  return path;
}

/** Corner point at (100, 200), then a curve point at (250, 120) dragged to (320, 120). */
function curveStart(input: Setup["input"]): void {
  clicks(input, [100, 200]);
  dragThrough(
    input,
    [250, 120],
    [
      [280, 120],
      [320, 120],
    ],
  );
}

describe("PenTool from the first point (Prepend)", () => {
  it("inserts before the first point, mirrors the handles and projects a connector handle", () => {
    const id = "pen/continue-from-first-point";
    const s = scenarioSetup();
    polySelected(s);
    const { input, editor, page } = s;
    input.move(500, 400);
    clicks(input, [100, 100]);
    expect(editor.getUndoStateName()).toBe(oldApp(id).probes["first-point-picked"]?.undo);
    pause();
    input.move(500, 400);
    dragThrough(
      input,
      [50, 50],
      [
        [60, 40],
        [80, 30],
      ],
    );
    setModifiers({ optionKey: true });
    dragThrough(
      input,
      [0, 100],
      [
        [-20, 120],
        [-40, 150],
      ],
      MouseEvent.BUTTON_RIGHT,
    );
    setModifiers({ optionKey: false });
    expect(editor.getUndoStateName()).toBe(oldApp(id).probes["prepended-connector"]?.undo);
    pause();
    input.move(400, 400);
    input.keyDown(Key.Constant.ESC);
    expect(newPaths(paths(page))).toEqual(oldPaths(id));
  });
});

describe("PenTool Alt held before the press", () => {
  it("on the end point just dragged: the press drops its outgoing handle, the drag adds nothing", () => {
    const id = "pen/alt-press-on-end-point";
    const { input, page, editor } = scenarioSetup();
    curveStart(input);
    pause();
    input.move(400, 300);
    setModifiers({ optionKey: true });
    dragThrough(
      input,
      [250, 120],
      [
        [270, 140],
        [290, 170],
      ],
    );
    setModifiers({ optionKey: false });
    pause();
    input.move(400, 300);
    input.keyDown(Key.Constant.ESC);
    expect(newPaths(paths(page))).toEqual(oldPaths(id));
    expect(editor.getUndoStateName()).toBe(oldApp(id).undo);
  });

  it("on a middle point in Edit mode: the outgoing handle moves by the drag", () => {
    const id = "pen/alt-drag-existing-point";
    const s = scenarioSetup();
    curve(s);
    const { input, page, editor, tool } = s;
    input.move(500, 400);
    setModifiers({ optionKey: true });
    dragThrough(
      input,
      [250, 120],
      [
        [260, 135],
        [270, 150],
      ],
    );
    setModifiers({ optionKey: false });
    expect(newPaths(paths(page))).toEqual(oldPaths(id));
    // 300 + 20, 120 + 30: the handle the point had plus the drag.
    expect(points(pathAt(page), ["tp", "hrx", "hry"])[1]).toEqual([
      AnchorPoint.Type.Asymmetric,
      320,
      150,
    ]);
    expect(editor.getUndoStateName()).toBe(oldApp(id).undo);
    expect(String(tool)).toBe("[Object GPenTool]");
  });
});

describe("PenTool handles around closing", () => {
  it("a click on the point just dragged drops its outgoing handle and adds no point", () => {
    const id = "pen/click-dragged-point";
    const { input, page, editor } = scenarioSetup();
    curveStart(input);
    pause();
    input.move(400, 300);
    clicks(input, [250, 120]);
    expect(editor.getUndoStateName()).toBe(oldApp(id).probes["after-click"]?.undo);
    pause();
    input.move(400, 300);
    input.keyDown(Key.Constant.ESC);
    expect(newPaths(paths(page))).toEqual(oldPaths(id));
  });

  it("closing with a drag next to an end without a handle keeps that side straight", () => {
    const id = "pen/close-drag-straight-end";
    const { input, page, editor } = scenarioSetup();
    clicks(input, [100, 100], [250, 100], [250, 250]);
    pause();
    input.move(110, 110);
    dragThrough(
      input,
      [100, 100],
      [
        [80, 120],
        [60, 140],
      ],
    );
    expect(editor.getUndoStateName()).toBe(oldApp(id).undo);
    input.keyDown(Key.Constant.ESC);
    expect(newPaths(paths(page))).toEqual(oldPaths(id));
    expect(points(pathAt(page), ["tp", "hrx", "hry"])[0]).toEqual([
      AnchorPoint.Type.Asymmetric,
      null,
      null,
    ]);
  });
});

describe("PenTool right-button drags", () => {
  it("Alt+right drag: a connector handle on the line from the previous point, none when dragged back", () => {
    const id = "pen/connector-handle-drag";
    const { input, page } = scenarioSetup();
    clicks(input, [100, 100]);
    setModifiers({ optionKey: true });
    dragThrough(
      input,
      [250, 100],
      [
        [280, 110],
        [300, 120],
      ],
      MouseEvent.BUTTON_RIGHT,
    );
    setModifiers({ optionKey: false });
    pause();
    input.move(400, 400);
    setModifiers({ optionKey: true });
    dragThrough(
      input,
      [250, 250],
      [
        [250, 230],
        [252, 220],
      ],
      MouseEvent.BUTTON_RIGHT,
    );
    setModifiers({ optionKey: false });
    pause();
    input.move(400, 400);
    input.keyDown(Key.Constant.ESC);
    expect(newPaths(paths(page))).toEqual(oldPaths(id));
  });

  it("right drag sets the rounded corner's shoulder to the drag distance, none when dragged back", () => {
    const id = "pen/rounded-shoulder-drag";
    const { input, page } = scenarioSetup();
    clicks(input, [100, 100]);
    dragThrough(
      input,
      [250, 100],
      [
        [270, 100],
        [280, 104],
      ],
      MouseEvent.BUTTON_RIGHT,
    );
    pause();
    input.move(400, 400);
    dragThrough(
      input,
      [250, 250],
      [
        [270, 250],
        [250, 250],
      ],
      MouseEvent.BUTTON_RIGHT,
    );
    pause();
    input.move(400, 400);
    input.keyDown(Key.Constant.ESC);
    expect(newPaths(paths(page))).toEqual(oldPaths(id));
    expect(points(pathAt(page), ["cr"])[1]?.[0]).toBeCloseTo(Math.hypot(30, 4), 4);
  });
});

describe("PenTool Edit mode", () => {
  it("a drag from a middle point pulls symmetric handles", () => {
    const id = "pen/edit-drag-middle-point";
    const s = scenarioSetup();
    polySelected(s);
    s.input.move(500, 400);
    dragThrough(
      s.input,
      [300, 250],
      [
        [320, 250],
        [340, 260],
      ],
    );
    expect(newPaths(paths(s.page))).toEqual(oldPaths(id));
    expect(s.editor.getUndoStateName()).toBe(oldApp(id).undo);
  });

  it("a click on a segment of a compound path's sub-path inserts a point there", () => {
    const id = "pen/compound-path-segment";
    const s = scenarioSetup();
    const compound = new CompoundPath();
    for (const y of [100, 250]) {
      const path = new Path();
      for (const x of [100, 300]) {
        const point = new AnchorPoint();
        point.setProperties(["x", "y"], [x, y]);
        path.getAnchorPoints().appendChild(point);
      }
      compound.getPaths().appendChild(path);
    }
    s.page.appendChild(compound);
    s.editor.updateSelection(false, [compound]);
    s.input.move(500, 400);
    s.input.move(200, 250);
    clicks(s.input, [200, 250]);
    const subPaths = compound.getPaths().getChildren() as Path[];
    expect(newPaths(subPaths)).toEqual(oldPaths(id));
    expect(s.editor.getUndoStateName()).toBe(oldApp(id).undo);
  });

  it('with selectDoubleClickBehavior "edit" a double press ends the job', () => {
    const id = "pen/double-press-edit-option";
    const previous = EditorOptions.selectDoubleClickBehavior;
    EditorOptions.selectDoubleClickBehavior = "edit";
    try {
      const { input, page, manager } = scenarioSetup();
      clicks(input, [100, 100], [250, 100]);
      input.click(250, 100); // within the double-click time
      expect(manager.calls).toContain("notifyJobDone");
      expect(oldApp(id).probes["after-double-press"]?.tool).toBe("GPointerTool");
      expect(newPaths(paths(page))).toEqual(oldPaths(id));
    } finally {
      EditorOptions.selectDoubleClickBehavior = previous;
    }
  });
});

describe("PenTool Shift replay", () => {
  it("pressing Shift replays the last move, constrained to 45°", () => {
    const id = "pen/shift-replays-move";
    const { input, page, tool } = scenarioSetup();
    clicks(input, [100, 100]);
    pause();
    input.move(250, 130);
    const preview = () => {
      const point = tool._editPt as AnchorPoint;
      return [point.getProperty("x"), point.getProperty("y")];
    };
    // The old app's preview box: 30 high before Shift, flat after it.
    expect(preview()).toEqual([250, 130]);
    expect(oldApp(id).probes["before-shift"]?.preview[0]?.[3]).toBe(30);
    setModifiers({ shiftKey: true });
    expect(preview()).toEqual([250, 100]);
    expect(oldApp(id).probes["shift-replayed"]?.preview[0]?.[3]).toBe(0);
    clicks(input, [250, 130]);
    setModifiers({ shiftKey: false });
    pause();
    input.move(400, 400);
    input.keyDown(Key.Constant.ESC);
    expect(newPaths(paths(page))).toEqual(oldPaths(id));
  });
});

describe("PenTool on another page", () => {
  it("a path started over the second page goes there, in that page's coordinates", () => {
    const s = setup();
    const first = s.scene.getActivePage() as Page;
    first.setProperties(["w", "h"], [300, 200]);
    const second = s.scene.insertPage() as Page;
    second.setProperties(["w", "h"], [300, 200]);
    s.view.getViewConfiguration().multiPageView = true;
    s.view.transform(0, 0, 1);
    runAllFrames();
    s.scene.setActivePage(first);
    // Page 2 sits to the right of page 1 in the multi-page layout.
    const offset = s.view.getWorldTransform(second).getTranslation().getX();
    expect(offset).toBeGreaterThan(300);
    clicks(s.input, [offset + 128, 100], [offset + 178, 150]);
    expect(s.scene.getActivePage()).toBe(second);
    expect(paths(first as never)).toEqual([]);
    expect(points(pathAt(second as never))).toEqual([
      [128, 100],
      [178, 150],
    ]);
  });
});

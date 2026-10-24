import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Key } from "../../engine/core/key.ts";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Point } from "../../engine/math/point.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import type { Page } from "../../engine/scene/page.ts";
import { Path } from "../../engine/scene/path.ts";
import { FillPaintLayer } from "../../engine/style/fill-paint-layer.ts";
import { Cursor } from "../cursor.ts";
import { installFakeDom, runAllFrames } from "../view/testing/fake-dom.ts";
import { MouseEvent } from "../../engine/core/mouse-event.ts";
import { EditorOptions } from "../editor-options.ts";
import { FreehandTool } from "./freehand-tool.ts";
import {
  at,
  clearModifiers,
  pathAt,
  paths,
  points,
  polyline,
  setModifiers,
  setupPathTool,
} from "./path-testing.ts";

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

/** The `_vs` (visible) flag of each fill layer. */
const fillsShown = (path: Path): unknown[] =>
  (path.getPaintLayers()?.getFillLayers() ?? []).map((f) => f.getProperty("_vs"));

const setup = () => setupPathTool(new FreehandTool());
type Input = ReturnType<typeof setup>["input"];

function stroke(input: Input, from: [number, number], through: [number, number][]): void {
  input.down(...from);
  for (const p of through) input.drag(...p);
  const last = through[through.length - 1] as [number, number];
  input.up(...last);
}

/** A loop with many small steps, back near its start. */
function loop(cx: number, cy: number, r: number, n = 24): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 1; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    out.push([Math.round(cx + r * Math.cos(a)), Math.round(cy + r * 0.7 * Math.sin(a))]);
  }
  return out;
}

describe("FreehandTool strokes", () => {
  it("draws one selected open path with fitted curves and its own undo step", () => {
    const { page, input, tool, editor } = setup();
    expect(tool.getCursor()).toBe(Cursor.PenStart);
    stroke(
      input,
      [100, 200],
      [
        [140, 180],
        [180, 170],
        [220, 190],
        [260, 230],
        [300, 240],
        [340, 220],
      ],
    );
    const path = pathAt(page);
    expect(paths(page)).toHaveLength(1);
    expect(path.getProperty("closed")).toBe(false);
    expect(path.hasFlag(NodeFlag.Selected)).toBe(true);
    const pts = points(path, ["x", "y", "hrx"]);
    expect(at(pts, 0).slice(0, 2)).toEqual([100, 200]);
    expect(at(pts, -1).slice(0, 2)).toEqual([340, 220]);
    // Fitted: fewer points than samples, with handles.
    expect(pts.length).toBeLessThan(7);
    expect(at(pts, 0)[2]).not.toBeNull();
    expect(editor.getUndoStateName()).toBe("Create freehand path");
    // The new path's fill stays hidden on an open stroke.
    expect(fillsShown(path)).toEqual([false]);
  });

  it("closes a loop that ends within 15 px of its start and shows its fill", () => {
    const { page, input } = setup();
    stroke(input, [300, 200], loop(200, 200, 100));
    const path = pathAt(page);
    expect(path.getProperty("closed")).toBe(true);
    expect(fillsShown(path)).toEqual([true]);
  });

  /** A closed loop drawn while a filled closed path with fill visibility `fvs` is selected. */
  function loopWithSelected(fvs: boolean): unknown[] {
    const { page, input, editor } = setup();
    const other = polyline(
      page,
      [
        [500, 100],
        [600, 100],
        [600, 200],
      ],
      true,
    );
    other.getPaintLayers()?.appendChild(new FillPaintLayer(RGBColor.BLACK));
    other.setProperty("fvs", fvs);
    editor.updateSelection(false, [other]);
    stroke(input, [300, 200], loop(200, 200, 100));
    const created = paths(page).find((p) => p !== other) as Path;
    expect(created.getProperty("closed")).toBe(true);
    return fillsShown(created);
  }

  it("keeps the new fill hidden when the selection had a closed path with hidden fill", () => {
    // The new path takes the selected path's style, fill included.
    expect(loopWithSelected(false)).toEqual([false]);
    expect(loopWithSelected(true)).toEqual([true]);
  });

  it("BUG-052: a click without moving leaves an open path with a second point 1 px right", () => {
    const { page, input } = setup();
    input.click(100, 100);
    const path = pathAt(page, 0);
    // The old code closed it and merged the two points: [[100, 100]], closed.
    expect([points(path), path.getProperty("closed")]).toEqual([
      [
        [100, 100],
        [101, 100],
      ],
      false,
    ]);
    expect(path.hasFlag(NodeFlag.Selected)).toBe(true);
  });

  it("Shift continues with straight segments until Shift goes up", () => {
    const { page, input } = setup();
    input.down(100, 100);
    input.drag(120, 110);
    input.drag(150, 130);
    setModifiers({ shiftKey: true });
    input.drag(250, 130);
    input.up(250, 130);
    input.move(300, 250);
    input.down(300, 250);
    input.up(300, 250);
    expect(pathAt(page, 0).hasFlag(NodeFlag.Selected)).toBe(false);
    setModifiers({ shiftKey: false });
    const pts = points(pathAt(page, 0));
    expect(pts.slice(-3)).toEqual([
      [250, 130],
      [300, 250],
      [300, 250],
    ]);
    expect(pathAt(page, 0).hasFlag(NodeFlag.Selected)).toBe(true);
  });

  it("BUG-042: Shift up finishes the stroke in the multi-page view too", () => {
    const { scene, view, page, input } = setup();
    (page as unknown as Page).setProperties(["w", "h"], [400, 300]);
    (scene.insertPage() as Page).setProperties(["w", "h"], [400, 300]);
    scene.setActivePage(page as unknown as Page);
    view.getViewConfiguration().multiPageView = true;
    view.transform(0, 0, 1);
    runAllFrames();
    input.down(100, 100);
    input.drag(120, 110);
    input.drag(150, 130);
    setModifiers({ shiftKey: true });
    input.drag(250, 130);
    input.up(250, 130);
    input.move(300, 250);
    input.down(300, 250);
    input.up(300, 250);
    // The old code threw here: TypeError from Rect.containsPoint.
    setModifiers({ shiftKey: false });
    expect(points(pathAt(page, 0)).slice(-2)).toEqual([
      [300, 250],
      [300, 250],
    ]);
    expect(pathAt(page, 0).hasFlag(NodeFlag.Selected)).toBe(true);
  });
});

describe("FreehandTool continuing a stroke", () => {
  /** Two strokes with `gap` ms between the hover after the first and the second press. */
  function secondStart(gap: number): Point | null {
    const { input, tool } = setup();
    vi.setSystemTime(1_700_000_000_000);
    stroke(
      input,
      [100, 100],
      [
        [130, 120],
        [160, 140],
      ],
    );
    input.move(170, 100);
    input.move(170, 130);
    vi.setSystemTime(1_700_000_000_000 + gap);
    input.down(170, 140);
    const start = (tool._smoothingManager as { _startingPoint: Point | null })._startingPoint;
    input.up(170, 140);
    return start;
  }

  it("within 500 ms smoothing starts from the newest hover position away from the press", () => {
    expect(secondStart(499)).toEqual(new Point(170, 100));
  });

  it("after 500 ms the stroke starts fresh", () => {
    expect(secondStart(500)).toBeNull();
  });
});

describe("FreehandTool keys", () => {
  it("digits set _bop on the new path, each in its own undo step (old quirk, kept)", () => {
    // _bop is the legacy border opacity, which a path neither paints nor
    // saves; see "Freehand digits set _bop" in QUESTIONS.md.
    const { page, input, editor } = setup();
    input.keyDown("5");
    expect(editor.hasUndoState()).toBe(false);
    stroke(
      input,
      [100, 100],
      [
        [150, 120],
        [200, 160],
      ],
    );
    const path = pathAt(page, 0);
    input.keyDown("3");
    expect(path.getProperty("_bop")).toBe(0.3);
    input.keyDown("0");
    expect(path.getProperty("_bop")).toBe(1);
    editor.undoState();
    expect(path.getProperty("_bop")).toBe(0.3);
    editor.undoState();
    editor.undoState();
    expect(paths(page)).toHaveLength(0);
  });

  it("Escape hands back to the default tool, Enter switches to subselect", () => {
    const { input, manager } = setup();
    input.keyDown(Key.Constant.ENTER);
    input.keyDown(Key.Constant.ESC);
    expect(manager.calls).toEqual(["activateSubSelect", "notifyJobDone"]);
  });

  it("ignores Escape while the button is down", () => {
    const { input, manager } = setup();
    input.down(100, 100);
    input.keyDown(Key.Constant.ESC);
    expect(manager.calls).toEqual([]);
    input.up(100, 100);
  });
});

describe("FreehandTool smoothing", () => {
  /** Six samples `step` apart along a slight curve. */
  function sampled(step: number): unknown[][] {
    const path = new Path();
    const smoothing = new FreehandTool._SmoothingManager();
    smoothing.begin(path);
    smoothing.start(null);
    for (let i = 0; i <= 5; i++) smoothing.move(new Point(i * step, (i * i) % 7));
    return points(path, ["hrx"]);
  }

  it("fits a run once it has more than 4 points and over 400 summed squared steps", () => {
    const fitted = sampled(10);
    expect(fitted.length).toBeLessThan(6);
    expect(at(fitted, 0)).not.toEqual([null]);
  });

  it("keeps plain samples below that distance", () => {
    expect(sampled(5)).toEqual([[null], [null], [null], [null], [null], [null]]);
  });
});

describe("FreehandTool closing highlight", () => {
  it("highlights the stroke while its end is within 15 px of its start", () => {
    const { page, input } = setup();
    input.down(100, 100);
    input.drag(200, 100);
    input.drag(200, 200);
    const path = pathAt(page);
    expect(path.hasFlag(NodeFlag.Highlighted)).toBe(false);
    input.drag(110, 105);
    expect(path.hasFlag(NodeFlag.Highlighted)).toBe(true);
    input.drag(130, 105);
    expect(path.hasFlag(NodeFlag.Highlighted)).toBe(false);
    input.up(130, 105);
  });

  it("measures the 15 px in view pixels: at zoom 2 the end must be within 7.5 scene px", () => {
    const { page, input, view } = setup();
    view.transform(0, 0, 2);
    // View (200, 200) is scene (100, 100).
    input.down(200, 200);
    input.drag(400, 200);
    input.drag(400, 400);
    const path = pathAt(page);
    // Scene (110, 100): 10 scene px, 20 view px away.
    input.drag(220, 200);
    expect(path.hasFlag(NodeFlag.Highlighted)).toBe(false);
    // Scene (105, 100): 5 scene px, 10 view px away.
    input.drag(210, 200);
    expect(path.hasFlag(NodeFlag.Highlighted)).toBe(true);
    input.up(210, 200);
  });
});

describe("FreehandTool right button and double click", () => {
  it("a pointer move that reports the right button during a stroke extends it", () => {
    const { page, tool, view } = setup();
    const rightMove = (x: number, y: number) => {
      const event = new MouseEvent.Move();
      event.client = new Point(x, y);
      event.button = MouseEvent.BUTTON_RIGHT;
      view.trigger(event);
    };
    // The press goes to the tool only, so the view tracks no drag and sends
    // no Drag events: only the move handler's right-button branch draws.
    const down = new MouseEvent.Down();
    down.client = new Point(100, 100);
    down.button = MouseEvent.BUTTON_LEFT;
    tool._mouseDown(down);
    const path = pathAt(page);
    rightMove(150, 120);
    rightMove(200, 160);
    expect(points(path)).toEqual([
      [100, 100],
      [150, 120],
      [200, 160],
    ]);
  });

  it('a double click hands back to the default tool only with selectDoubleClickBehavior "edit"', () => {
    const saved = EditorOptions.selectDoubleClickBehavior;
    try {
      const { view, manager } = setup();
      const dblClick = () => {
        const event = new MouseEvent.DblClick();
        event.client = new Point(100, 100);
        event.button = MouseEvent.BUTTON_LEFT;
        view.trigger(event);
      };
      EditorOptions.selectDoubleClickBehavior = null;
      dblClick();
      expect(manager.calls).toEqual([]);
      EditorOptions.selectDoubleClickBehavior = "edit";
      dblClick();
      expect(manager.calls).toEqual(["notifyJobDone"]);
    } finally {
      EditorOptions.selectDoubleClickBehavior = saved;
    }
  });
});

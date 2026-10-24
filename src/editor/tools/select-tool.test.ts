import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Key } from "../../engine/core/key.ts";
import { MouseEvent } from "../../engine/core/mouse-event.ts";
import { Platform } from "../../engine/core/platform.ts";
import { Point } from "../../engine/math/point.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import type { Node } from "../../engine/scene/node.ts";
import { Cursor } from "../cursor.ts";
import { EditorOptions } from "../editor-options.ts";
import { ElementEditor } from "../element-editors/element-editor.ts";
import type { SceneEditor } from "../element-editors/scene-editor.ts";
import { installFakeDom } from "../view/testing/fake-dom.ts";
import { PointerTool } from "./pointer-tool.ts";
import { SelectTool } from "./select-tool.ts";
import { clearModifiers, group, Input, rect, setModifiers, setupTool } from "./select/testing.ts";

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

function setup() {
  const s = setupTool(new SelectTool());
  return { ...s, input: new Input(s.view) };
}

const selection = (editor: { getSelection(): unknown[] | null }): unknown[] =>
  editor.getSelection() || [];

const trf = (node: Node): number[] =>
  (node as unknown as { getProperty(n: string): { getMatrix(): number[] } })
    .getProperty("trf")
    .getMatrix();

/** A press, a drag through `points` (the 33 ms move delay passes first) and a release. */
async function dragThrough(
  input: Input,
  from: [number, number],
  points: [number, number][],
): Promise<void> {
  input.down(from[0], from[1]);
  input.drag(from[0] + 1, from[1]);
  vi.advanceTimersByTime(40);
  for (const [x, y] of points) input.drag(x, y);
  const last = points[points.length - 1] as [number, number];
  await input.up(last[0], last[1]);
}

describe("SelectTool clicks", () => {
  it("selects the clicked element and clears on empty space", async () => {
    const { page, editor, input } = setup();
    const a = rect(page, 100, 100, 200, 120);
    const b = rect(page, 400, 120, 100, 100);
    await input.click(200, 160);
    expect(selection(editor)).toEqual([a]);
    await input.click(450, 170);
    expect(selection(editor)).toEqual([b]);
    await input.click(650, 450);
    expect(selection(editor)).toEqual([]);
  });

  it("toggles with Shift", async () => {
    const { page, editor, input } = setup();
    const a = rect(page, 100, 100, 200, 120);
    const b = rect(page, 400, 120, 100, 100);
    await input.click(200, 160);
    setModifiers({ shiftKey: true });
    await input.click(450, 170);
    expect(selection(editor)).toEqual([a, b]);
    await input.click(200, 160);
    expect(selection(editor)).toEqual([b]);
  });

  it("selects the group first, then goes one level deeper on the next click", async () => {
    const { page, editor, input } = setup();
    const g = group(page);
    const child = rect(g, 100, 100, 120, 100);
    const sibling = rect(g, 240, 100, 120, 100);
    await input.click(150, 150);
    expect(selection(editor)).toEqual([g]);
    await input.click(150, 150);
    expect(selection(editor)).toEqual([child]);
    await input.click(300, 150);
    expect(selection(editor)).toEqual([sibling]);
  });

  it("cycles through the stack under the pointer with Meta", async () => {
    const { page, editor, input } = setup();
    const a = rect(page, 100, 100, 200, 150);
    const b = rect(page, 120, 120, 200, 150);
    const c = rect(page, 140, 140, 200, 150);
    setModifiers({ metaKey: true });
    const picks: unknown[] = [];
    for (let i = 0; i < 4; i++) {
      await input.click(200, 200);
      picks.push(selection(editor)[0]);
    }
    expect(picks).toEqual([c, b, a, c]);
  });

  it("shows the hovered element with a dot cursor and highlights it", () => {
    const { page, tool, input } = setup();
    const a = rect(page, 100, 100, 200, 120);
    input.move(600, 500);
    expect(tool.getCursor()).toBe(Cursor.Select);
    input.move(200, 160);
    expect(tool.getCursor()).toBe(Cursor.SelectDot);
    expect(a.hasFlag(NodeFlag.Highlighted)).toBe(true);
    input.move(600, 500);
    expect(a.hasFlag(NodeFlag.Highlighted)).toBe(false);
  });
});

describe("SelectTool marquee", () => {
  it("selects what it touches, and with Alt only what it encloses", async () => {
    const { page, editor, input } = setup();
    const a = rect(page, 100, 100, 200, 120);
    const b = rect(page, 400, 120, 100, 100);
    input.down(50, 50);
    input.drag(150, 150);
    input.drag(420, 200);
    await input.up(420, 200);
    expect(selection(editor)).toEqual([a, b]);

    setModifiers({ optionKey: true });
    input.down(50, 50);
    input.drag(200, 200);
    input.drag(420, 250);
    await input.up(420, 250);
    expect(selection(editor)).toEqual([a]);
  });

  it("highlights while dragging and follows modifier changes mid-drag", async () => {
    const { page, editor, input } = setup();
    const a = rect(page, 100, 100, 200, 120);
    const b = rect(page, 400, 120, 100, 100);
    input.down(50, 50);
    // The first drag step only starts the area.
    input.drag(60, 60);
    expect(a.hasFlag(NodeFlag.Highlighted)).toBe(false);
    input.drag(420, 250);
    expect(a.hasFlag(NodeFlag.Highlighted) && b.hasFlag(NodeFlag.Highlighted)).toBe(true);
    setModifiers({ optionKey: true });
    expect(a.hasFlag(NodeFlag.Highlighted)).toBe(true);
    expect(b.hasFlag(NodeFlag.Highlighted)).toBe(false);
    await input.up(420, 250);
    expect(selection(editor)).toEqual([a]);
  });

  it("moves instead of growing while Space is held", async () => {
    const { page, editor, input } = setup();
    rect(page, 100, 100, 50, 50);
    const far = rect(page, 400, 400, 50, 50);
    input.down(50, 50);
    input.drag(60, 60);
    input.drag(150, 150);
    setModifiers({ spaceKey: true });
    // The 100 × 100 marquee moves to end at (460, 460): it now covers 360..460.
    input.drag(460, 460);
    setModifiers({ spaceKey: false });
    input.drag(461, 461);
    await input.up(461, 461);
    expect(selection(editor)).toEqual([far]);
  });

  it("starts a marquee on an element while X is held", async () => {
    const { page, editor, input } = setup();
    const a = rect(page, 100, 100, 200, 120);
    const b = rect(page, 400, 120, 100, 100);
    input.keyDown(Key.Constant.X);
    input.down(200, 160);
    input.drag(300, 300);
    input.drag(520, 420);
    await input.up(520, 420);
    input.keyUp(Key.Constant.X);
    // The element under the press point is left out.
    expect(selection(editor)).toEqual([b]);
    expect(a.hasFlag(NodeFlag.Selected)).toBe(false);
  });
});

describe("SelectTool moving", () => {
  it("drags the element under the pointer and commits one transaction", async () => {
    const { page, editor, input } = setup();
    const a = rect(page, 100, 100, 200, 120);
    await dragThrough(
      input,
      [200, 160],
      [
        [220, 170],
        [237, 183],
      ],
    );
    expect(selection(editor)).toEqual([a]);
    expect(trf(a)).toEqual([100, 0, 0, 60, 237, 183]);
    expect(editor.getUndoStateName()).toBe("Transform Selection");
  });

  it("constrains to the axis with Shift", async () => {
    const { page, input } = setup();
    const a = rect(page, 100, 100, 200, 120);
    input.down(200, 160);
    setModifiers({ shiftKey: true });
    input.drag(201, 160);
    vi.advanceTimersByTime(40);
    input.drag(290, 180);
    await input.up(290, 180);
    expect(trf(a)).toEqual([100, 0, 0, 60, 290, 160]);
  });

  it("drops a copy with Alt", async () => {
    const { page, editor, input } = setup();
    const a = rect(page, 100, 100, 200, 120);
    await input.click(200, 160);
    setModifiers({ optionKey: true });
    await dragThrough(
      input,
      [200, 160],
      [
        [240, 200],
        [300, 260],
      ],
    );
    expect(page.getChildren().length).toBe(2);
    expect(trf(a)).toEqual([100, 0, 0, 60, 200, 160]);
    expect(trf(page.getChildren()[1] as Node)).toEqual([100, 0, 0, 60, 300, 260]);
    expect(editor.getUndoStateName()).toBe("Transform & Clone Selection");
  });

  it("BUG-054: shows the duplicate cursor once an Alt drag moves", async () => {
    const { page, tool, manager, input } = setup();
    rect(page, 100, 100, 200, 120);
    await input.click(200, 160);
    const shown: string[] = [];
    manager._updateActiveToolCursor = () => shown.push(tool.getCursor());
    setModifiers({ optionKey: true });
    input.down(200, 160);
    input.drag(201, 160);
    vi.advanceTimersByTime(40);
    // The old code showed the cursor only before the move started, while
    // it was still the plain select cursor.
    expect(shown[shown.length - 1]).toBe(Cursor.SelectPlus);
    await input.up(201, 160);
  });
});

describe("SelectTool keys", () => {
  it("nudges by the small and big cursor distance and applies on release", () => {
    const { page, editor, input } = setup();
    const a = rect(page, 100, 100, 200, 120);
    editor.updateSelection(false, [a]);
    input.keyDown(Key.Constant.RIGHT);
    input.keyUp(Key.Constant.RIGHT);
    expect(trf(a)).toEqual([100, 0, 0, 60, 201, 160]);
    setModifiers({ shiftKey: true });
    input.keyDown(Key.Constant.UP);
    input.keyUp(Key.Constant.UP);
    const moved = trf(a);
    // The nudge goes through the transform, so x carries rounding.
    expect(moved[4]).toBeCloseTo(201, 9);
    expect(moved[5]).toBe(150);
  });

  it("BUG-053: leaves Cmd/Ctrl with Up or Down to the arrange shortcut", () => {
    const { page, editor, input } = setup();
    const a = rect(page, 100, 100, 200, 120);
    editor.updateSelection(false, [a]);
    setModifiers({ metaKey: true });
    input.keyDown(Key.Constant.DOWN);
    input.keyUp(Key.Constant.DOWN);
    setModifiers({ metaKey: true, shiftKey: true });
    input.keyDown(Key.Constant.UP);
    input.keyUp(Key.Constant.UP);
    // The old code moved the rect down by 1, then up by 10.
    expect(trf(a)).toEqual([100, 0, 0, 60, 200, 160]);
    expect(editor.hasUndoState()).toBe(false);
    // Left and right still nudge (collisionless for pages).
    clearModifiers();
    setModifiers({ metaKey: true });
    input.keyDown(Key.Constant.RIGHT);
    input.keyUp(Key.Constant.RIGHT);
    expect(trf(a)).toEqual([100, 0, 0, 60, 201, 160]);
  });

  it("ignores the arrows while Space is held", () => {
    const { page, editor, input } = setup();
    const a = rect(page, 100, 100, 200, 120);
    editor.updateSelection(false, [a]);
    setModifiers({ spaceKey: true });
    input.keyDown(Key.Constant.RIGHT);
    input.keyUp(Key.Constant.RIGHT);
    expect(trf(a)).toEqual([100, 0, 0, 60, 200, 160]);
  });

  it("resizes from the arrow's side with + and from the opposite one with -", () => {
    const { page, editor, input } = setup();
    const a = rect(page, 100, 100, 200, 120);
    editor.updateSelection(false, [a]);
    setModifiers({ plusKey: true });
    input.keyDown(Key.Constant.RIGHT);
    input.keyUp(Key.Constant.RIGHT);
    setModifiers({ plusKey: false });
    const grown = trf(a);
    expect(grown[0]).toBeCloseTo(100.5, 9);
    expect(grown[4]).toBeCloseTo(200.5, 9);
    setModifiers({ minusKey: true });
    input.keyDown(Key.Constant.RIGHT);
    input.keyUp(Key.Constant.RIGHT);
    const shrunk = trf(a);
    expect(shrunk[0]).toBeCloseTo(100, 9);
  });

  it("switches to the subselect tool on Enter for a non-text selection", () => {
    const { page, editor, input, manager } = setup();
    const a = rect(page, 100, 100, 200, 120);
    editor.updateSelection(false, [a]);
    input.keyDown(Key.Constant.ENTER);
    expect(manager.calls).toEqual(["activateSubSelect"]);
  });

  it("asks the manager to finish on Escape", () => {
    const { manager } = setup();
    setModifiers({ escapeKey: true });
    expect(manager.calls).toEqual(["notifyJobDone"]);
  });
});

describe("SelectTool edit modes", () => {
  it("opens the transform box in Transform mode and closes it again", () => {
    const { page, editor, scene, tool } = setup();
    const a = rect(page, 100, 100, 200, 120);
    editor.updateSelection(false, [a]);
    const events: unknown[] = [];
    tool.addEventListener(SelectTool.Event, (event) => events.push(event.args));
    tool.setEditMode(SelectTool.EditMode.Transform);
    const sceneEditor = ElementEditor.getEditor<SceneEditor>(scene) as SceneEditor;
    expect(sceneEditor.isTransformBoxActive()).toBe(true);
    expect(tool._mode).toBe(SelectTool._Mode.Transforming);
    expect(tool.isDeactivatable()).toBe(true);
    tool.setEditMode(SelectTool.EditMode.Select);
    expect(sceneEditor.isTransformBoxActive()).toBe(false);
    expect(events).toEqual([
      { mode: 1, previousMode: 0 },
      { mode: 0, previousMode: 1 },
    ]);
  });

  it("leaves Transform mode on a press far outside the box", async () => {
    const { page, editor, tool, input } = setup();
    const a = rect(page, 100, 100, 200, 120);
    editor.updateSelection(false, [a]);
    tool.setEditMode(SelectTool.EditMode.Transform);
    await input.click(700, 550);
    expect(tool.getEditMode()).toBe(SelectTool.EditMode.Select);
  });
});

describe("SelectTool guide lines", () => {
  it("shows the resize cursor over a ruler guide and drags it", async () => {
    const { scene, tool, input, view } = setup();
    scene.setProperty("vgl", [300]);
    view.getViewConfiguration().guideLinesVisible = true;
    input.move(301, 200);
    expect(tool._guideLineUnderMouse).toEqual({ isVertical: true, guideIndex: 0 });
    expect(tool.getCursor()).toBe(Cursor.SelectResizeHoriz);
    const start = vi.spyOn(view, "startMoveGuideLine");
    const finish = vi.spyOn(view, "finishMoveGuideLine");
    input.down(301, 200);
    expect(tool._mode).toBe(SelectTool._Mode.MoveGuideLine);
    input.drag(350, 200);
    await input.up(350, 200);
    expect(start).toHaveBeenCalledWith(true, 0);
    expect(finish).toHaveBeenCalled();
  });

  it("ignores hidden guide lines", () => {
    const { scene, tool, input, view } = setup();
    scene.setProperty("hgl", [200]);
    view.getViewConfiguration().guideLinesVisible = false;
    input.move(100, 200);
    expect(tool._guideLineUnderMouse).toBeNull();
  });
});

describe("SelectTool selectable elements", () => {
  it("finds the top item of a hit, or the hit itself when deep", () => {
    const { page, tool } = setup();
    const g = group(page);
    const child = rect(g, 0, 0, 10, 10);
    expect(tool._getSelectableElement(child)).toBe(g);
    expect(tool._getSelectableElement(child, true)).toBe(child);
  });

  it("keeps a repeated first element when deep (indexOf starts at 1)", () => {
    // See "Selectable elements may repeat the first one" in QUESTIONS.md.
    const { page, tool } = setup();
    const a = rect(page, 0, 0, 10, 10);
    const b = rect(page, 20, 0, 10, 10);
    expect(tool._getSelectableElements([a, b, a], true)).toEqual([a, b, a]);
    expect(tool._getSelectableElements([a, b, a])).toEqual([a, b]);
  });

  it("uses touching collisions by default and enclosed ones with Alt, swapped by invertSelectionMode", () => {
    const { tool } = setup();
    const partial = 0;
    expect(tool._getCollisionFlags()).not.toBe(partial);
    const touching = tool._getCollisionFlags() as number;
    Platform.modifiers.optionKey = true;
    const enclosed = tool._getCollisionFlags() as number;
    expect(touching).not.toBe(enclosed);
    EditorOptions.invertSelectionMode = true;
    try {
      expect(tool._getCollisionFlags()).toBe(touching);
    } finally {
      EditorOptions.invertSelectionMode = false;
    }
  });

  it("does not treat two slow presses as a double click", async () => {
    const { page, tool, input } = setup();
    rect(page, 100, 100, 200, 120);
    const now = vi.spyOn(Date.prototype, "getTime");
    now.mockReturnValueOnce(1000).mockReturnValueOnce(1400);
    await input.click(200, 160);
    await input.click(200, 160);
    expect(
      tool._mouseDblClick(
        Object.assign(new MouseEvent.DblClick(), { client: new Point(200, 160) }),
      ),
    ).toBe(true);
    expect(tool._mDownTime1).toBeNull();
  });
});

describe("SelectTool distance helper on click (touch layout)", () => {
  it("toggles between the page and the clicked element with Alt held, keeping the selection", async () => {
    const before = EditorOptions.distanceHelperBehaviour;
    EditorOptions.distanceHelperBehaviour = SelectTool._DistanceHelperBehaviour.Click;
    try {
      // The pointer tool allows the distance helper (showDistance).
      const s = setupTool(new PointerTool());
      const input = new Input(s.view);
      const a = rect(s.page, 100, 100, 100, 100);
      rect(s.page, 400, 100, 100, 100);
      s.editor.updateSelection(false, [a]);
      const refresh = vi.spyOn(s.editor.getDistanceHelper(), "refreshVisuals");
      input.move(450, 150);
      setModifiers({ optionKey: true });
      expect(s.tool._isDistanceHelperActivatedByClick()).toBe(true);
      expect(s.tool.catchesContextMenu()).toBe(true);
      // Hovering doesn't measure in this mode, only releases do.
      input.move(451, 150);
      expect(refresh).not.toHaveBeenCalled();
      const targets: number[][] = [];
      for (let i = 0; i < 3; i++) {
        await input.click(451, 150);
        const call = refresh.mock.calls[i] as unknown as [
          unknown,
          { getX(): number; getWidth(): number },
        ];
        targets.push([call[1].getX(), call[1].getWidth()]);
        expect(selection(s.editor)).toEqual([a]);
      }
      // The page first, then the element under the pointer, then the page again.
      const page = (
        s.scene.getActivePage() as NonNullable<ReturnType<typeof s.scene.getActivePage>>
      ).getGeometryBBox() as unknown as {
        getX(): number;
        getWidth(): number;
      };
      expect(targets).toEqual([
        [page.getX(), page.getWidth()],
        [400, 100],
        [page.getX(), page.getWidth()],
      ]);
    } finally {
      EditorOptions.distanceHelperBehaviour = before;
    }
  });
});

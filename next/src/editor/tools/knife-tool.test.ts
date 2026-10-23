import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MouseEvent } from "../../engine/core/mouse-event.ts";
import type { Node } from "../../engine/scene/node.ts";
import type { Path } from "../../engine/scene/path.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Cursor } from "../cursor.ts";
import { installFakeDom } from "../view/testing/fake-dom.ts";
import { KnifeTool } from "./knife-tool.ts";
import {
  clearModifiers,
  ellipse,
  pause,
  points,
  rect,
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

const setup = () => setupPathTool(new KnifeTool());
type Input = ReturnType<typeof setup>["input"];

function cut(input: Input, from: [number, number], through: [number, number][]): void {
  pause();
  input.down(...from);
  for (const p of through) input.drag(...p);
  const last = through[through.length - 1] as [number, number];
  input.up(...last);
}

const names = (nodes: Node[]): string[] => nodes.map((n) => n.getNodeName());

/** The y range of a path's anchor points (page coordinates). */
function yRange(path: Path): [number, number] {
  const ys = points(path).map((p) => {
    const trf = path.getTransform();
    return trf
      ? trf.mapPoint({ getX: () => p[0], getY: () => p[1] } as never).getY()
      : (p[1] as number);
  });
  return [Math.min(...ys), Math.max(...ys)];
}

describe("KnifeTool", () => {
  it("cuts a crossed rectangle into a top and a bottom path, selected", () => {
    const { page, input, tool, editor } = setup();
    expect(tool.getCursor()).toBe(Cursor.Knife);
    rect(page, 100, 100, 200, 140);
    cut(
      input,
      [80, 170],
      [
        [200, 170],
        [330, 170],
      ],
    );
    const children = page.getChildren();
    expect(names(children)).toEqual(["path", "path"]);
    const ranges = (children as Path[]).map(yRange).sort((a, b) => a[0] - b[0]);
    expect(ranges).toEqual([
      [100, 170],
      [170, 240],
    ]);
    expect(editor.getSelection()).toEqual(children);
    expect(editor.getUndoStateName()).toBe("Cut shape(s)");
  });

  it("with a selection cuts only the selected shapes", () => {
    const { page, input, editor } = setup();
    const r = rect(page, 100, 100, 200, 140);
    const e = ellipse(page, 350, 100, 140, 140);
    editor.updateSelection(false, [e]);
    cut(
      input,
      [80, 170],
      [
        [300, 175],
        [520, 180],
      ],
    );
    const children = page.getChildren();
    expect(children[0]).toBe(r);
    expect(names(children)).toEqual(["rectangle", "path", "path"]);
  });

  it("leaves a shape the line doesn't cross alone", () => {
    const { page, input, editor } = setup();
    const r = rect(page, 100, 100, 200, 140);
    cut(
      input,
      [80, 300],
      [
        [200, 300],
        [330, 300],
      ],
    );
    expect(page.getChildren()).toEqual([r]);
    expect(r).toBeInstanceOf(Rectangle);
    expect(editor.getSelection() ?? []).toEqual([]);
  });

  it("Shift constrains the cut line to 45° steps", () => {
    const { page, input } = setup();
    rect(page, 100, 100, 200, 140);
    pause();
    input.down(80, 130);
    setModifiers({ shiftKey: true });
    input.drag(200, 150);
    input.drag(330, 160);
    input.up(330, 160);
    setModifiers({ shiftKey: false });
    // Constrained to the horizontal through y = 130.
    const ranges = (page.getChildren() as Path[]).map(yRange).sort((a, b) => a[0] - b[0]);
    expect(ranges).toEqual([
      [100, 130],
      [130, 240],
    ]);
  });

  it("with Alt at the press the release only shapes the line; letting Alt go cuts", () => {
    const { page, input } = setup();
    rect(page, 100, 100, 200, 140);
    pause();
    setModifiers({ optionKey: true });
    input.down(80, 170);
    input.drag(150, 120);
    input.up(150, 120);
    expect(names(page.getChildren())).toEqual(["rectangle"]);
    // Alt up replays a press and release at the last position, which a
    // press within the double-click time would swallow.
    pause();
    setModifiers({ optionKey: false });
    // The curve ends inside the rectangle and crosses its outline once:
    // the rectangle is opened there into one path.
    expect(names(page.getChildren())).toEqual(["path"]);
  });

  it("right clicks add rounded points to the line and cut at every release", () => {
    const { page, input } = setup();
    rect(page, 100, 100, 200, 140);
    pause();
    input.down(80, 130, MouseEvent.BUTTON_RIGHT);
    input.up(80, 130, MouseEvent.BUTTON_RIGHT);
    expect(names(page.getChildren())).toEqual(["rectangle"]);
    expect((page.getChildren()[0] as Rectangle).getParent()).not.toBeNull();
  });
});

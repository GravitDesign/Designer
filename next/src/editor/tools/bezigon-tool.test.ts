import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Key } from "../../engine/core/key.ts";
import { MouseEvent } from "../../engine/core/mouse-event.ts";
import { AnchorPoint } from "../../engine/scene/path-base.ts";
import { Cursor } from "../cursor.ts";
import { installFakeDom } from "../view/testing/fake-dom.ts";
import { BezigonTool } from "./bezigon-tool.ts";
import {
  clearModifiers,
  pause,
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

const setup = () => setupPathTool(new BezigonTool());
type Input = ReturnType<typeof setup>["input"];

function clicks(input: Input, ...pts: [number, number][]): void {
  for (const [x, y] of pts) {
    pause();
    input.click(x, y);
  }
}

describe("BezigonTool", () => {
  it("places points with automatic handles", () => {
    const { page, input } = setup();
    clicks(input, [100, 200], [250, 100], [400, 200]);
    const path = pathAt(page, 0);
    expect(points(path, ["x", "y", "ah"])).toEqual([
      [100, 200, true],
      [250, 100, true],
      [400, 200, true],
    ]);
  });

  it("dragging moves the point just placed", () => {
    const { page, input, editor } = setup();
    clicks(input, [100, 200]);
    pause();
    input.down(250, 100);
    input.drag(260, 110);
    input.drag(280, 130);
    input.up(280, 130);
    clicks(input, [400, 200]);
    expect(points(pathAt(page, 0))).toEqual([
      [100, 200],
      [280, 130],
      [400, 200],
    ]);
    expect(editor.getUndoStateName()).toBe("Append Point");
  });

  it("Alt+click places a symmetric point, Alt+right click a connector", () => {
    const { page, input } = setup();
    clicks(input, [100, 200]);
    setModifiers({ optionKey: true });
    clicks(input, [250, 100]);
    pause();
    input.down(300, 250, MouseEvent.BUTTON_RIGHT);
    input.up(300, 250, MouseEvent.BUTTON_RIGHT);
    setModifiers({ optionKey: false });
    expect(points(pathAt(page, 0), ["tp"]).slice(1)).toEqual([
      [AnchorPoint.Type.Symmetric],
      [AnchorPoint.Type.Connector],
    ]);
  });

  it("a plain right click adds nothing; Alt+right click does", () => {
    const { page, input } = setup();
    clicks(input, [100, 200]);
    pause();
    input.down(250, 100, MouseEvent.BUTTON_RIGHT);
    input.up(250, 100, MouseEvent.BUTTON_RIGHT);
    // Only a left press or Alt+right press counts; the right press above
    // was ignored, so this connector point is the second one.
    pause();
    setModifiers({ optionKey: true });
    input.down(300, 250, MouseEvent.BUTTON_RIGHT);
    input.up(300, 250, MouseEvent.BUTTON_RIGHT);
    setModifiers({ optionKey: false });
    expect(points(pathAt(page, 0))).toEqual([
      [100, 200],
      [300, 250],
    ]);
  });

  it("clicking the first point closes the path; Enter switches to subselect", () => {
    const { page, input, manager, tool, editor } = setup();
    clicks(input, [100, 100]);
    setModifiers({ shiftKey: true });
    clicks(input, [250, 120]);
    setModifiers({ shiftKey: false });
    clicks(input, [250, 250], [100, 100]);
    const path = pathAt(page, 0);
    expect(path.getProperty("closed")).toBe(true);
    expect(points(path)).toEqual([
      [100, 100],
      [250, 100],
      [250, 250],
    ]);
    expect(tool.getCursor()).toBe(Cursor.PenEnd);
    expect(editor.getUndoStateName()).toBe("Modify Path Properties");
    input.keyDown(Key.Constant.ENTER);
    expect(manager.calls).toEqual(["activateSubSelect"]);
  });

  it("shows the end cursor over another open path's end and joins it on click", () => {
    const { page, input, tool, editor } = setup();
    polyline(page, [
      [100, 300],
      [200, 300],
    ]);
    clicks(input, [100, 100], [200, 100]);
    pause();
    input.move(200, 300);
    expect(tool.getCursor()).toBe(Cursor.PenEnd);
    clicks(input, [200, 300]);
    expect(paths(page)).toHaveLength(1);
    expect(points(pathAt(page, 0))).toEqual([
      [100, 100],
      [200, 100],
      [200, 300],
      [100, 300],
    ]);
    expect(editor.getUndoStateName()).toBe("Join Paths");
  });
});

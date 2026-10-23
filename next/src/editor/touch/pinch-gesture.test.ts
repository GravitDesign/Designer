import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Point } from "../../engine/math/point.ts";
import { SceneWidget } from "../view/scene-widget.ts";
import { GestureHelper } from "./gesture-helper.ts";
import { PinchGesture } from "./pinch-gesture.ts";
import { setTouchHost, type TouchView } from "./touch-host.ts";
import { FakeTarget, installTouchGlobals, touchAt, touchEvent } from "./touch-testing.ts";

const t = (event: unknown): TouchEvent => event as TouchEvent;

interface FakeView {
  calls: unknown[][];
  zoom: number;
}

function fakeView(): FakeView & TouchView {
  const view: FakeView = { calls: [], zoom: 1 };
  return Object.assign(view, {
    startTouchMode: () => view.calls.push(["startTouchMode"]),
    endTouchMode: () => view.calls.push(["endTouchMode"]),
    scrollBy: (dx: number, dy: number) => view.calls.push(["scrollBy", dx, dy]),
    getZoom: () => view.zoom,
    zoomAt: (point: Point, zoom: number) =>
      view.calls.push(["zoomAt", point.getX(), point.getY(), zoom]),
    getViewTransform: () => ({ mapPoint: (p: Point) => p }) as never,
    // The middle touch has only a page position.
    _convertClientPositionFromMousePosition: (event: globalThis.MouseEvent) =>
      new Point(event.pageX, event.pageY),
  });
}

let view: FakeView & TouchView;
beforeEach(() => {
  installTouchGlobals();
  view = fakeView();
  setTouchHost({
    getActiveView: () => view,
    getContextMenu: () => null,
    getActiveTool: () => null,
    triggerContextMenu: () => {},
  });
});
afterEach(() => {
  setTouchHost(null);
  vi.unstubAllGlobals();
});

function pinch(): {
  helper: GestureHelper;
  move(ax: number, ay: number, bx: number, by: number): void;
} {
  const target = new FakeTarget();
  const helper = new GestureHelper();
  helper.addGesture(new PinchGesture());
  const a = touchAt(1, 200, 200, target);
  const b = touchAt(2, 300, 200, target);
  helper.touchStart(t(touchEvent("touchstart", [a, b], [a, b])));
  return {
    helper,
    move(ax, ay, bx, by) {
      const ma = touchAt(1, ax, ay, target);
      const mb = touchAt(2, bx, by, target);
      helper.touchMove(t(touchEvent("touchmove", [ma, mb], [ma, mb])));
    },
  };
}

describe("PinchGesture", () => {
  it("does nothing while both fingers stay within 10 pixels of where they came down", () => {
    const { move } = pinch();
    move(190, 205, 310, 195);
    expect(view.calls).toEqual([["startTouchMode"]]);
  });

  it("zooms around the fingers' middle by the distance change over the pinch factor", () => {
    const { move } = pinch();
    move(190, 200, 310, 200);
    move(180, 200, 320, 200);
    const factor = SceneWidget.options.pinchToZoomFactor;
    expect(view.calls[1]).toEqual(["zoomAt", 250, 200, 1 + 20 / factor]);
  });

  it("keeps the zoom at the minimum when pinching in", () => {
    view.zoom = SceneWidget.options.minZoomFactor;
    const { move } = pinch();
    move(240, 200, 260, 200);
    expect(view.calls[1]?.[3]).toBe(SceneWidget.options.minZoomFactor);
  });

  it("scrolls against a two-finger move at the same distance", () => {
    const { move } = pinch();
    move(190, 200, 310, 200);
    move(180, 200, 320, 200);
    move(190, 212, 330, 212);
    // Both fingers' moves added, divided by 2 / dpi.
    expect(view.calls[2]).toEqual(["scrollBy", -10, -12]);
  });

  it("ends touch mode when the last finger is up", () => {
    const { helper, move } = pinch();
    move(180, 200, 320, 200);
    const target = new FakeTarget();
    const a = touchAt(1, 180, 200, target);
    const b = touchAt(2, 320, 200, target);
    helper.touchEnd(t(touchEvent("touchend", [a], [b])));
    expect(view.calls.at(-1)?.[0]).toBe("zoomAt");
    helper.touchEnd(t(touchEvent("touchend", [], [a])));
    expect(view.calls.at(-1)).toEqual(["endTouchMode"]);
  });
});

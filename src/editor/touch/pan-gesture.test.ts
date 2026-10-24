import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GestureHelper } from "./gesture-helper.ts";
import { PanGesture } from "./pan-gesture.ts";
import { FakeTarget, installTouchGlobals, touchAt, touchEvent } from "./touch-testing.ts";

const t = (event: unknown): TouchEvent => event as TouchEvent;

beforeEach(() => {
  installTouchGlobals();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function setup(): GestureHelper {
  const helper = new GestureHelper();
  helper.addGesture(new PanGesture());
  helper.setDelayedTouchEventsEnabled(false);
  return helper;
}

describe("PanGesture", () => {
  it("turns a cancelable touchmove into a mousemove at the finger", () => {
    const target = new FakeTarget();
    const helper = setup();
    const down = touchAt(1, 10, 10, target);
    helper.touchStart(t(touchEvent("touchstart", [down], [down])));
    const moved = touchAt(1, 50, 60, target);
    helper.touchMove(t(touchEvent("touchmove", [moved], [moved])));
    expect(target.dispatched).toEqual([
      expect.objectContaining({ type: "mousemove", clientX: 50, clientY: 60, cancelable: true }),
    ]);
  });

  it("ignores a touchmove the page can't cancel (the browser scrolls)", () => {
    const target = new FakeTarget();
    const helper = setup();
    const down = touchAt(1, 10, 10, target);
    helper.touchStart(t(touchEvent("touchstart", [down], [down])));
    const moved = touchAt(1, 50, 60, target);
    helper.touchMove(t(touchEvent("touchmove", [moved], [moved], false)));
    expect(target.types()).toEqual([]);
  });

  it("moves only the fingers that were down at the touch start", () => {
    const target = new FakeTarget();
    const helper = setup();
    const first = touchAt(1, 10, 10, target);
    helper.touchStart(t(touchEvent("touchstart", [first], [first])));
    // A second finger joins without a touch start reaching the gesture.
    const second = touchAt(2, 80, 80, target);
    const movedFirst = touchAt(1, 20, 20, target);
    helper.touchMove(t(touchEvent("touchmove", [movedFirst, second], [movedFirst, second])));
    expect(target.dispatched.map((e) => [e.type, e.clientX])).toEqual([["mousemove", 20]]);
  });

  it("sends no mousemove after a touchcancel or touchend until the next start", () => {
    const target = new FakeTarget();
    const helper = setup();
    const down = touchAt(1, 10, 10, target);
    const moved = touchAt(1, 50, 60, target);
    helper.touchStart(t(touchEvent("touchstart", [down], [down])));
    helper.touchCancel(t(touchEvent("touchcancel", [], [down])));
    helper.touchMove(t(touchEvent("touchmove", [moved], [moved])));
    helper.touchStart(t(touchEvent("touchstart", [down], [down])));
    helper.touchEnd(t(touchEvent("touchend", [], [down])));
    helper.touchMove(t(touchEvent("touchmove", [moved], [moved])));
    expect(target.types()).toEqual([]);
  });
});

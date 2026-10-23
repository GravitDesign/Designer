import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GestureHelper } from "./gesture-helper.ts";
import { TapGesture, type TapGestureConfig } from "./tap-gesture.ts";
import { FakeTarget, installTouchGlobals, touchAt, touchEvent } from "./touch-testing.ts";

const t = (event: unknown): TouchEvent => event as TouchEvent;

beforeEach(() => {
  installTouchGlobals();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function setup(config?: Partial<TapGestureConfig>): GestureHelper {
  const helper = new GestureHelper();
  helper.addGesture(new TapGesture(config));
  helper.setDelayedTouchEventsEnabled(false);
  helper.setClickSuppressionEnabled(true);
  return helper;
}

describe("TapGesture", () => {
  it("turns a tap into mousedown, mouseup and click at the finger", () => {
    const target = new FakeTarget();
    const helper = setup();
    const finger = touchAt(1, 30, 40, target);
    helper.touchStart(t(touchEvent("touchstart", [finger], [finger])));
    helper.touchEnd(t(touchEvent("touchend", [], [finger])));
    expect(target.types()).toEqual(["mousedown", "mouseup", "click"]);
    expect(target.dispatched[0]).toMatchObject({ clientX: 30, clientY: 40, button: 0 });
  });

  it("adds a dblclick for a second tap within 300 ms and 25 pixels", () => {
    const target = new FakeTarget();
    const helper = setup();
    const first = touchAt(1, 30, 40, target);
    const second = touchAt(2, 40, 50, target);
    helper.touchStart(t(touchEvent("touchstart", [first], [first])));
    helper.touchEnd(t(touchEvent("touchend", [], [first])));
    vi.advanceTimersByTime(300);
    helper.touchStart(t(touchEvent("touchstart", [second], [second])));
    helper.touchEnd(t(touchEvent("touchend", [], [second])));
    expect(target.types()).toEqual([
      "mousedown",
      "mouseup",
      "click",
      "mousedown",
      "mouseup",
      "click",
      "dblclick",
    ]);
  });

  it("sends no dblclick after 300 ms or beyond 25 pixels", () => {
    const target = new FakeTarget();
    const helper = setup();
    const finger = touchAt(1, 30, 40, target);
    for (let i = 0; i < 2; i++) {
      helper.touchStart(t(touchEvent("touchstart", [finger], [finger])));
      helper.touchEnd(t(touchEvent("touchend", [], [finger])));
      vi.advanceTimersByTime(301);
    }
    expect(target.types()).not.toContain("dblclick");
    helper.touchStart(t(touchEvent("touchstart", [finger], [finger])));
    helper.touchEnd(t(touchEvent("touchend", [], [finger])));
    // Within 300 ms but 30 pixels away.
    const far = touchAt(2, 60, 40, target);
    helper.touchStart(t(touchEvent("touchstart", [far], [far])));
    helper.touchEnd(t(touchEvent("touchend", [], [far])));
    expect(target.types()).not.toContain("dblclick");
  });

  it("sends no click for a swipe, and the swipe's mouseup can't be cancelled", () => {
    const target = new FakeTarget();
    const helper = setup();
    const finger = touchAt(1, 30, 40, target);
    helper.touchStart(t(touchEvent("touchstart", [finger], [finger])));
    helper.touchMove(t(touchEvent("touchmove", [finger], [finger])));
    helper.touchEnd(t(touchEvent("touchend", [], [finger])));
    expect(target.types()).toEqual(["mousedown", "mouseup"]);
    expect(target.dispatched[0]?.cancelable).toBe(true);
    expect(target.dispatched[1]?.cancelable).toBe(false);
  });

  it("treats two nearby fingers as a two-finger tap: only mouseups, within the delay", () => {
    const target = new FakeTarget();
    const other = new FakeTarget();
    const helper = setup({
      doubleTapDetection: TapGesture.DetectionMode.Nearby,
      doubleTapThreshold: 200,
    });
    const a = touchAt(1, 10, 10, target);
    const b = touchAt(2, 100, 10, other);
    // On different targets only the Nearby detection finds the pair.
    const start = touchEvent("touchstart", [a, b], [a, b]);
    start.targetTouches = [a];
    helper.touchStart(t(start));
    expect(target.types()).toEqual([]);
    helper.touchEnd(t(touchEvent("touchend", [], [a, b])));
    expect(target.types()).toEqual(["mouseup"]);
    expect(other.types()).toEqual(["mouseup"]);
  });

  it("sends nothing when a two-finger tap ends after the delay", () => {
    const target = new FakeTarget();
    const helper = setup();
    const a = touchAt(1, 10, 10, target);
    const b = touchAt(2, 100, 10, target);
    helper.touchStart(t(touchEvent("touchstart", [a, b], [a, b])));
    vi.advanceTimersByTime(101);
    helper.touchEnd(t(touchEvent("touchend", [], [a, b])));
    expect(target.types()).toEqual([]);
  });

  it("dispatches mouse events with every field the old initMouseEvent set", () => {
    const target = new FakeTarget();
    const helper = setup();
    const finger = { ...touchAt(1, 30, 40, target), screenX: 130, screenY: 240 };
    helper.touchStart(t(touchEvent("touchstart", [finger], [finger])));
    expect(target.dispatched[0]).toEqual({
      type: "mousedown",
      bubbles: true,
      cancelable: true,
      view: window,
      detail: 1,
      screenX: 130,
      screenY: 240,
      clientX: 30,
      clientY: 40,
      button: 0,
      relatedTarget: null,
    });
  });

  it("answers a touchcancel with a cancelable mouseup and no click, even for a swipe", () => {
    const target = new FakeTarget();
    const helper = setup();
    const finger = touchAt(1, 30, 40, target);
    helper.touchStart(t(touchEvent("touchstart", [finger], [finger])));
    helper.touchMove(t(touchEvent("touchmove", [finger], [finger])));
    helper.touchCancel(t(touchEvent("touchcancel", [], [finger])));
    expect(target.types()).toEqual(["mousedown", "mouseup"]);
    expect(target.dispatched[1]).toMatchObject({ cancelable: true, clientX: 30, clientY: 40 });
  });
});

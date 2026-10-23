import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Gesture } from "./gesture.ts";
import { GestureHelper } from "./gesture-helper.ts";
import type { GestureState } from "./gesture-state.ts";
import type { TouchEventInfo } from "./touch-event-info.ts";
import {
  FakeTarget,
  installTouchGlobals,
  touchAt,
  touchEvent,
  type FakeTouchEvent,
} from "./touch-testing.ts";

/** Records its calls; activates always and returns `stops` from every handler. */
class RecordingGesture extends Gesture {
  calls: string[] = [];
  constructor(
    readonly stops = false,
    readonly fails = false,
  ) {
    super();
  }
  override canActivate(): boolean {
    return true;
  }
  override activate(event: TouchEventInfo, state: GestureState): void {
    super.activate(event, state);
    this.calls.push("activate");
  }
  override deactivate(event: TouchEventInfo, state: GestureState): void {
    super.deactivate(event, state);
    this.calls.push("deactivate");
  }
  override start(): boolean {
    this.calls.push("start");
    if (this.fails) throw new Error("broken gesture");
    return this.stops;
  }
  override move(): boolean {
    this.calls.push("move");
    return this.stops;
  }
}

const asTouch = (event: FakeTouchEvent): TouchEvent => event as unknown as TouchEvent;

beforeEach(() => {
  installTouchGlobals();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("GestureHelper", () => {
  const target = new FakeTarget();
  const one = touchAt(1, 10, 10, target);
  const two = touchAt(2, 50, 10, target);

  it("holds a single-finger start back for 50 ms", () => {
    const helper = new GestureHelper();
    const gesture = new RecordingGesture();
    helper.addGesture(gesture);
    helper.touchStart(asTouch(touchEvent("touchstart", [one], [one])));
    vi.advanceTimersByTime(49);
    expect(gesture.calls).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(gesture.calls).toEqual(["activate", "start"]);
  });

  it("delivers the held-back start before the next event", () => {
    const helper = new GestureHelper();
    const gesture = new RecordingGesture();
    helper.addGesture(gesture);
    helper.touchStart(asTouch(touchEvent("touchstart", [one], [one])));
    helper.touchMove(asTouch(touchEvent("touchmove", [one], [one])));
    expect(gesture.calls).toEqual(["activate", "start", "move"]);
  });

  it("drops the held-back start when a second finger comes down", () => {
    const helper = new GestureHelper();
    const gesture = new RecordingGesture();
    helper.addGesture(gesture);
    helper.touchStart(asTouch(touchEvent("touchstart", [one], [one])));
    helper.touchStart(asTouch(touchEvent("touchstart", [one, two], [two])));
    vi.advanceTimersByTime(100);
    // Only the two-finger start, at once.
    expect(gesture.calls).toEqual(["activate", "start"]);
  });

  it("starts at once without delayed touch events", () => {
    const helper = new GestureHelper();
    const gesture = new RecordingGesture();
    helper.addGesture(gesture);
    helper.setDelayedTouchEventsEnabled(false);
    helper.touchStart(asTouch(touchEvent("touchstart", [one], [one])));
    expect(gesture.calls).toEqual(["activate", "start"]);
  });

  it("deactivates the gestures after one that returns true", () => {
    const helper = new GestureHelper();
    const first = new RecordingGesture(true);
    const second = new RecordingGesture();
    helper.addGesture(first);
    helper.addGesture(second);
    helper.setDelayedTouchEventsEnabled(false);
    helper.touchStart(asTouch(touchEvent("touchstart", [one], [one])));
    expect(first.calls).toEqual(["activate", "start"]);
    expect(second.calls).toEqual(["deactivate"]);
    // A later gesture stays deactivated and gets no move.
    helper.touchMove(asTouch(touchEvent("touchmove", [one], [one])));
    expect(second.calls).toEqual(["deactivate", "deactivate"]);
  });

  it("deactivates a gesture that throws and goes on with the next", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const helper = new GestureHelper();
    const broken = new RecordingGesture(false, true);
    const next = new RecordingGesture();
    helper.addGesture(broken);
    helper.addGesture(next);
    helper.setDelayedTouchEventsEnabled(false);
    helper.touchStart(asTouch(touchEvent("touchstart", [one], [one])));
    expect(broken.calls).toEqual(["activate", "start", "deactivate"]);
    expect(next.calls).toEqual(["activate", "start"]);
    expect(errors).toHaveBeenCalledWith("GGestureHelper", expect.any(Error));
    errors.mockRestore();
  });

  it("counts a move as a swipe only with click suppression", () => {
    const helper = new GestureHelper();
    helper.setDelayedTouchEventsEnabled(false);
    helper.touchStart(asTouch(touchEvent("touchstart", [one], [one])));
    helper.touchMove(asTouch(touchEvent("touchmove", [one], [one])));
    helper.touchEnd(asTouch(touchEvent("touchend", [], [one])));
    expect(helper._state.isSwiping()).toBe(false);
    helper.setClickSuppressionEnabled(true);
    helper.touchStart(asTouch(touchEvent("touchstart", [one], [one])));
    helper.touchMove(asTouch(touchEvent("touchmove", [one], [one])));
    helper.touchEnd(asTouch(touchEvent("touchend", [], [one])));
    expect(helper._state.isSwiping()).toBe(true);
  });

  it("drops the held-back start on a system gesture, for good", () => {
    const helper = new GestureHelper();
    const gesture = new RecordingGesture();
    helper.addGesture(gesture);
    helper.touchStart(asTouch(touchEvent("touchstart", [one], [one])));
    helper.gestureStart(asTouch(touchEvent("gesturestart", [one], [])));
    vi.advanceTimersByTime(100);
    // The end doesn't deliver it either.
    helper.touchEnd(asTouch(touchEvent("touchend", [], [one])));
    expect(gesture.calls).toEqual([]);
    // The next touch start is held back and delivered as usual.
    helper.touchStart(asTouch(touchEvent("touchstart", [one], [one])));
    vi.advanceTimersByTime(50);
    expect(gesture.calls).toEqual(["activate", "start"]);
  });

  it("counts a page scroll during the touch as a swipe with click suppression", () => {
    const helper = new GestureHelper();
    helper.setDelayedTouchEventsEnabled(false);
    helper.setClickSuppressionEnabled(true);
    helper.touchStart(asTouch(touchEvent("touchstart", [one], [one])));
    helper.scroll();
    helper.touchEnd(asTouch(touchEvent("touchend", [], [one])));
    expect(helper._state.isSwiping()).toBe(true);
  });
});

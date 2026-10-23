import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentTouchTarget } from "./document-touch-target.ts";
import { EditorTouchTarget } from "./editor-touch-target.ts";
import { SimpleTouchTarget } from "./simple-touch-target.ts";
import { setTouchHost } from "./touch-host.ts";
import { FakeTarget, installTouchGlobals, touchAt, touchEvent } from "./touch-testing.ts";
import { SelectTool } from "../tools/select-tool.ts";

/** A fake target where the DOM type is wanted. */
const et = (target: FakeTarget): EventTarget => target as unknown as EventTarget;

let fakeDocument: FakeTarget;
beforeEach(() => {
  fakeDocument = installTouchGlobals();
  vi.useFakeTimers();
});
afterEach(() => {
  setTouchHost(null);
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("TouchTarget", () => {
  it("forwards a move only once the finger is 20 pixels from where it came down", () => {
    const element = new FakeTarget();
    const target = new DocumentTouchTarget(et(element));
    const helper = target._gestureHelper;
    const down = touchAt(1, 100, 100, element);
    // A forwarded move makes the touch a swipe.
    element.fire(touchEvent("touchstart", [down], [down]));
    const near = touchAt(1, 119, 81, element);
    element.fire(touchEvent("touchmove", [near], [near]));
    expect(helper._swiping).toBe(false);
    const far = touchAt(1, 120, 100, element);
    element.fire(touchEvent("touchmove", [far], [far]));
    expect(helper._swiping).toBe(true);
  });

  it("leaves events another handler cancelled alone", () => {
    const element = new FakeTarget();
    new SimpleTouchTarget(et(element));
    const finger = touchAt(1, 10, 10, element);
    const start = touchEvent("touchstart", [finger], [finger]);
    start.defaultPrevented = true;
    element.fire(start);
    expect(element.types()).toEqual([]);
  });

  it("stops listening on deactivate and moves to a new element on activate", () => {
    const first = new FakeTarget();
    const second = new FakeTarget();
    const target = new SimpleTouchTarget(et(first));
    target.activate(et(second));
    const finger = touchAt(1, 10, 10, first);
    first.fire(touchEvent("touchstart", [finger], [finger]));
    expect(first.types()).toEqual([]);
    const other = touchAt(1, 10, 10, second);
    second.fire(touchEvent("touchstart", [other], [other]));
    expect(second.types()).toEqual(["mousedown"]);
    target.deactivate(et(second));
    second.fire(touchEvent("touchstart", [other], [other]));
    expect(second.types()).toEqual(["mousedown"]);
  });

  it("listens to page scrolls only with click suppression", () => {
    const element = new FakeTarget();
    const target = new DocumentTouchTarget(et(element));
    expect(fakeDocument.listeners.get("scroll")?.length).toBe(1);
    target.setClickSuppressionEnabled(false);
    expect(fakeDocument.listeners.get("scroll")?.length).toBe(0);
  });
});

describe("DocumentTouchTarget", () => {
  it("cancels the events it handles, but leaves touches on a select to the browser", () => {
    const element = new FakeTarget();
    new DocumentTouchTarget(et(element));
    const finger = touchAt(1, 10, 10, element);
    const start = touchEvent("touchstart", [finger], [finger]);
    element.fire(start);
    expect(start.defaultPrevented).toBe(true);
    const select = new FakeTarget();
    select.tagName = "SELECT";
    const onSelect = touchAt(2, 10, 10, select);
    const selectStart = touchEvent("touchstart", [onSelect], [onSelect]);
    element.fire(selectStart);
    expect(selectStart.defaultPrevented).toBe(false);
  });
});

describe("EditorTouchTarget", () => {
  it("ignores a further finger while the select tool drags a selection area", () => {
    const tool = Object.create(SelectTool.prototype) as SelectTool;
    let selecting = true;
    tool.hasSelectedArea = () => selecting;
    setTouchHost({
      getActiveView: () => null,
      getContextMenu: () => null,
      getActiveTool: () => tool,
      triggerContextMenu: () => {},
    });
    const element = new FakeTarget();
    const target = new EditorTouchTarget(et(element));
    const start = vi.spyOn(target._gestureHelper, "touchStart");
    const a = touchAt(1, 10, 10, element);
    element.fire(touchEvent("touchstart", [a], [a]));
    expect(start).toHaveBeenCalledTimes(1);
    const b = touchAt(2, 50, 10, element);
    element.fire(touchEvent("touchstart", [a, b], [b]));
    expect(start).toHaveBeenCalledTimes(1);
    selecting = false;
    element.fire(touchEvent("touchstart", [a, b], [b]));
    expect(start).toHaveBeenCalledTimes(2);
  });

  it("opens the context menu after a 500 ms press of one finger", () => {
    const menu = vi.fn();
    setTouchHost({
      getActiveView: () => null,
      getContextMenu: () => null,
      getActiveTool: () => null,
      triggerContextMenu: menu,
    });
    const element = new FakeTarget();
    new EditorTouchTarget(et(element));
    const finger = touchAt(1, 30, 40, element);
    element.fire(touchEvent("touchstart", [finger], [finger]));
    vi.advanceTimersByTime(549);
    expect(menu).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(menu).toHaveBeenCalledWith(element, 30, 40);
  });

  it("doesn't open the context menu when the finger is lifted first", () => {
    const menu = vi.fn();
    setTouchHost({
      getActiveView: () => null,
      getContextMenu: () => null,
      getActiveTool: () => null,
      triggerContextMenu: menu,
    });
    const element = new FakeTarget();
    new EditorTouchTarget(et(element));
    const finger = touchAt(1, 30, 40, element);
    element.fire(touchEvent("touchstart", [finger], [finger]));
    vi.advanceTimersByTime(300);
    element.fire(touchEvent("touchend", [], [finger]));
    vi.advanceTimersByTime(1000);
    expect(menu).not.toHaveBeenCalled();
    // The tap still went through, after the 50 ms delayed start.
    expect(element.types()).toEqual(["mousedown", "mouseup", "click"]);
  });

  it("drops the context menu on a touchcancel and sends a mouseup without a click", () => {
    const menu = vi.fn();
    setTouchHost({
      getActiveView: () => null,
      getContextMenu: () => null,
      getActiveTool: () => null,
      triggerContextMenu: menu,
    });
    const element = new FakeTarget();
    new EditorTouchTarget(et(element));
    const finger = touchAt(1, 30, 40, element);
    element.fire(touchEvent("touchstart", [finger], [finger]));
    vi.advanceTimersByTime(300);
    const cancel = touchEvent("touchcancel", [], [finger]);
    element.fire(cancel);
    vi.advanceTimersByTime(1000);
    expect(menu).not.toHaveBeenCalled();
    expect(element.types()).toEqual(["mousedown", "mouseup"]);
    expect(element.dispatched[1]?.cancelable).toBe(true);
    expect(cancel.defaultPrevented).toBe(true);
  });

  it("drops the context menu on a system gesture", () => {
    const menu = vi.fn();
    setTouchHost({
      getActiveView: () => null,
      getContextMenu: () => null,
      getActiveTool: () => null,
      triggerContextMenu: menu,
    });
    const element = new FakeTarget();
    new EditorTouchTarget(et(element));
    const finger = touchAt(1, 30, 40, element);
    element.fire(touchEvent("touchstart", [finger], [finger]));
    vi.advanceTimersByTime(100);
    element.fire(touchEvent("gesturestart", [finger], []));
    vi.advanceTimersByTime(1000);
    expect(menu).not.toHaveBeenCalled();
  });
});

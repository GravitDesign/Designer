import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LongPressEvent } from "./long-press-event.ts";
import { FakeTarget, installTouchGlobals } from "./touch-testing.ts";

/** An element with a long-press delay attribute and a parent of the given class. */
class FakeElement extends FakeTarget {
  attributes: Record<string, string> = {};
  parentElement: { className: string };
  constructor(parentClass: string) {
    super();
    this.parentElement = { className: parentClass };
  }
  getAttribute(name: string): string | null {
    return this.attributes[name] ?? null;
  }
}

let fakeDocument: FakeTarget;
beforeEach(() => {
  fakeDocument = installTouchGlobals();
  vi.useFakeTimers();
  vi.stubGlobal("window", {
    requestAnimationFrame: (callback: () => void) => setTimeout(callback, 16),
    cancelAnimationFrame: (handle: number) => clearTimeout(handle),
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function press(element: FakeElement, x = 30, y = 40): void {
  for (const listener of fakeDocument.listeners.get("mousedown") ?? [])
    listener({ type: "mousedown", target: element, clientX: x, clientY: y });
}

const longPresses = (element: FakeElement): unknown[] =>
  element.dispatched.filter((e) => e.type === "long-press");

describe("LongPressEvent", () => {
  it("dispatches long-press with the position after the delay", () => {
    new LongPressEvent().startup();
    const element = new FakeElement("g-scene-widget");
    press(element);
    vi.advanceTimersByTime(480);
    expect(longPresses(element)).toHaveLength(0);
    vi.advanceTimersByTime(40);
    expect(longPresses(element)).toHaveLength(1);
    expect((longPresses(element)[0] as CustomEvent).detail).toEqual({ clientX: 30, clientY: 40 });
  });

  it("uses the element's data-long-press-delay", () => {
    new LongPressEvent().startup();
    const element = new FakeElement("g-scene-widget");
    element.attributes["data-long-press-delay"] = "100";
    press(element);
    vi.advanceTimersByTime(120);
    expect(longPresses(element)).toHaveLength(1);
  });

  it("is cancelled by a mouse move or a release", () => {
    new LongPressEvent().startup();
    const element = new FakeElement("g-scene-widget");
    press(element);
    for (const listener of fakeDocument.listeners.get("mousemove") ?? [])
      listener({ type: "mousemove" });
    press(element);
    for (const listener of fakeDocument.listeners.get("mouseup") ?? [])
      listener({ type: "mouseup" });
    vi.advanceTimersByTime(1000);
    expect(longPresses(element)).toHaveLength(0);
  });

  it("swallows the next trusted release outside a scene widget", () => {
    new LongPressEvent().startup();
    const element = new FakeElement("g-sidebar");
    press(element);
    vi.advanceTimersByTime(600);
    const release = {
      type: "mouseup",
      isTrusted: true,
      stopImmediatePropagation: vi.fn(),
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    };
    for (const listener of [...(fakeDocument.listeners.get("mouseup") ?? [])]) listener(release);
    expect(release.preventDefault).toHaveBeenCalledTimes(1);
  });
});

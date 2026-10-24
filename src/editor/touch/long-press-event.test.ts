import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Platform, PlatformType, WebBrowser } from "../../engine/core/platform.ts";
import { DocumentTouchTarget } from "./document-touch-target.ts";
import { LongPressEvent } from "./long-press-event.ts";
import { FakeTarget, installTouchGlobals, touchAt, touchEvent } from "./touch-testing.ts";

/** What an SVG element has as className: an object, not a string. */
interface AnimatedString {
  baseVal: string;
  animVal: string;
}

/** An element with a long-press delay attribute and a parent of the given class. */
class FakeElement extends FakeTarget {
  attributes: Record<string, string> = {};
  parentElement: { className: string | AnimatedString };
  constructor(parentClass: string | AnimatedString) {
    super();
    this.parentElement = { className: parentClass };
  }
  getAttribute(name: string): string | null {
    return this.attributes[name] ?? null;
  }
}

let fakeDocument: FakeTarget;

/** The fake document and a window whose animation frames are 16 ms timers. */
function installGlobals(): void {
  fakeDocument = installTouchGlobals();
  vi.stubGlobal("window", {
    requestAnimationFrame: (callback: () => void) => setTimeout(callback, 16),
    cancelAnimationFrame: (handle: number) => clearTimeout(handle),
  });
}

const touchDevice = PlatformType.isTouchDevice;
const browser = Platform.webBrowser;
beforeEach(() => {
  installGlobals();
  vi.useFakeTimers();
});
afterEach(() => {
  PlatformType.isTouchDevice = touchDevice;
  Platform.webBrowser = browser;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function press(element: FakeElement, x = 30, y = 40): void {
  for (const listener of fakeDocument.listeners.get("mousedown") ?? [])
    listener({ type: "mousedown", target: element, clientX: x, clientY: y });
}

/** A touchstart of one finger on `element`, through the document's listeners. */
function touchStart(element: FakeElement, x = 30, y = 40): void {
  const finger = touchAt(1, x, y, element);
  fakeDocument.fire({ ...touchEvent("touchstart", [finger], [finger]), target: element });
}

const longPresses = (element: FakeElement): unknown[] =>
  element.dispatched.filter((e) => e.type === "long-press");

interface Release {
  type: string;
  isTrusted: boolean;
  stopImmediatePropagation: ReturnType<typeof vi.fn>;
  preventDefault: ReturnType<typeof vi.fn>;
  stopPropagation: ReturnType<typeof vi.fn>;
}

/** A mouseup through the document's mouseup listeners, returned to check what was cancelled. */
function release(isTrusted = true): Release {
  const event: Release = {
    type: "mouseup",
    isTrusted,
    stopImmediatePropagation: vi.fn(),
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  };
  for (const listener of [...(fakeDocument.listeners.get("mouseup") ?? [])]) listener(event);
  return event;
}

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

  it("doesn't start on a press another handler already cancelled", () => {
    new LongPressEvent().startup();
    const element = new FakeElement("g-sidebar");
    for (const listener of fakeDocument.listeners.get("mousedown") ?? [])
      listener({
        type: "mousedown",
        target: element,
        clientX: 1,
        clientY: 2,
        defaultPrevented: true,
      });
    vi.advanceTimersByTime(1000);
    expect(longPresses(element)).toHaveLength(0);
  });

  it("swallows the next trusted release outside a scene widget", () => {
    new LongPressEvent().startup();
    const element = new FakeElement("g-sidebar");
    press(element);
    vi.advanceTimersByTime(600);
    // An untrusted release passes and leaves the swallower in place.
    expect(release(false).preventDefault).not.toHaveBeenCalled();
    const swallowed = release();
    expect(swallowed.preventDefault).toHaveBeenCalledTimes(1);
    expect(swallowed.stopPropagation).toHaveBeenCalledTimes(1);
    expect(swallowed.stopImmediatePropagation).toHaveBeenCalledTimes(1);
    // Only that one release.
    expect(release().preventDefault).not.toHaveBeenCalled();
  });

  it("doesn't swallow the release inside a scene widget", () => {
    new LongPressEvent().startup();
    const element = new FakeElement("g-scene-widget");
    press(element);
    vi.advanceTimersByTime(600);
    expect(longPresses(element)).toHaveLength(1);
    expect(release().preventDefault).not.toHaveBeenCalled();
  });

  it("doesn't swallow the release when a listener cancelled the long-press event", () => {
    new LongPressEvent().startup();
    const element = new FakeElement("g-sidebar");
    element.dispatchEvent = (event) => {
      element.dispatched.push(event);
      return false;
    };
    press(element);
    vi.advanceTimersByTime(600);
    expect(longPresses(element)).toHaveLength(1);
    expect(release().preventDefault).not.toHaveBeenCalled();
  });

  // See "Long press inside an SVG doesn't swallow the release" in QUESTIONS.md.
  it("doesn't swallow the release when the parent's className isn't a string (SVG)", () => {
    new LongPressEvent().startup();
    const element = new FakeElement({ baseVal: "g-icon", animVal: "g-icon" });
    press(element);
    vi.advanceTimersByTime(600);
    expect(longPresses(element)).toHaveLength(1);
    expect(release().preventDefault).not.toHaveBeenCalled();
  });

  describe("on a touch device", () => {
    beforeEach(() => {
      PlatformType.isTouchDevice = true;
    });

    it("starts on touchstart and reports the finger's position", () => {
      new LongPressEvent().startup();
      const element = new FakeElement("g-scene-widget");
      touchStart(element);
      vi.advanceTimersByTime(600);
      expect((longPresses(element)[0] as CustomEvent).detail).toEqual({
        clientX: 30,
        clientY: 40,
      });
    });

    it("survives a touchmove within 20 pixels, not one of 20", () => {
      new LongPressEvent().startup();
      const element = new FakeElement("g-scene-widget");
      touchStart(element);
      const near = touchAt(1, 49, 21, element);
      fakeDocument.fire(touchEvent("touchmove", [near], [near]));
      vi.advanceTimersByTime(600);
      expect(longPresses(element)).toHaveLength(1);
      touchStart(element);
      const far = touchAt(1, 50, 40, element);
      fakeDocument.fire(touchEvent("touchmove", [far], [far]));
      vi.advanceTimersByTime(600);
      expect(longPresses(element)).toHaveLength(1);
    });

    // The old module started when it loaded, before GDesigner created its
    // document touch target. The touchstart listener order matters wherever
    // the document target's preventDefault takes effect (a non-passive
    // listener, as here).
    it("starts only when registered before the document touch target", () => {
      const element = new FakeElement("g-scene-widget");
      new DocumentTouchTarget(fakeDocument as unknown as EventTarget);
      new LongPressEvent().startup();
      touchStart(element);
      vi.advanceTimersByTime(600);
      expect(longPresses(element)).toHaveLength(0);

      installGlobals();
      new LongPressEvent().startup();
      new DocumentTouchTarget(fakeDocument as unknown as EventTarget);
      touchStart(element);
      vi.advanceTimersByTime(600);
      expect(longPresses(element)).toHaveLength(1);
    });
  });

  describe("on Safari with touch", () => {
    beforeEach(() => {
      PlatformType.isTouchDevice = true;
      Platform.webBrowser = WebBrowser.Safari;
    });

    it("listens to the touches passively in the capture phase", () => {
      const add = vi.spyOn(fakeDocument, "addEventListener");
      new LongPressEvent().startup();
      const options = (type: string): unknown[] =>
        add.mock.calls.filter((call) => call[0] === type).map((call) => (call as unknown[])[2]);
      const passiveCapture = { passive: true, capture: true };
      // The long-press start listener is in the bubble phase; Safari's in the capture phase.
      expect(options("touchstart")).toEqual([undefined, passiveCapture]);
      // The timer reset and Safari's touch end.
      expect(options("touchend")).toEqual([true, passiveCapture]);
      expect(options("touchcancel")).toEqual([passiveCapture]);
      expect(options("mousedown")).toEqual([true]);
    });

    it("stops a trusted cancelable mousedown while a trusted touch is down", () => {
      const longPress = new LongPressEvent();
      longPress.startup();
      const mousedown = (isTrusted: boolean, cancelable: boolean): ReturnType<typeof vi.fn> => {
        const stop = vi.fn();
        for (const listener of fakeDocument.listeners.get("mousedown") ?? [])
          listener({ type: "mousedown", isTrusted, cancelable, stopImmediatePropagation: stop });
        return stop;
      };
      const element = new FakeElement("g-scene-widget");
      const finger = touchAt(1, 30, 40, element);
      const touch = (type: string, isTrusted: boolean): void =>
        fakeDocument.fire({ ...touchEvent(type, [finger], [finger]), target: element, isTrusted });
      expect(mousedown(true, true)).not.toHaveBeenCalled();
      touch("touchstart", false);
      expect(mousedown(true, true)).not.toHaveBeenCalled();
      touch("touchstart", true);
      expect(mousedown(true, true)).toHaveBeenCalledTimes(1);
      expect(mousedown(false, true)).not.toHaveBeenCalled();
      expect(mousedown(true, false)).not.toHaveBeenCalled();
      touch("touchend", false);
      expect(mousedown(true, true)).toHaveBeenCalledTimes(1);
      touch("touchcancel", true);
      expect(mousedown(true, true)).not.toHaveBeenCalled();
    });
  });
});

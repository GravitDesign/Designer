/**
 * Fakes for the touch layer's unit tests, which run in Node: touch events,
 * touches, targets that record the mouse events dispatched on them, and
 * the DOM globals the gestures create (MouseEvent, Touch, window).
 */
import { vi } from "vitest";

export interface Dispatched {
  type: string;
  cancelable: boolean;
  clientX: number;
  clientY: number;
  button: number;
  /** The rest of the mouse event's init dictionary, as given. */
  bubbles?: boolean;
  detail?: number;
  screenX?: number;
  screenY?: number;
  view?: unknown;
  relatedTarget?: unknown;
}

/** An element stand-in that records dispatched events and holds listeners. */
export class FakeTarget {
  dispatched: Dispatched[] = [];
  listeners = new Map<string, ((event: unknown) => void)[]>();
  tagName = "DIV";

  dispatchEvent(event: Dispatched): boolean {
    this.dispatched.push(event);
    return true;
  }

  addEventListener(type: string, listener: (event: unknown) => void): void {
    const list = this.listeners.get(type) ?? [];
    list.push(listener);
    this.listeners.set(type, list);
  }

  removeEventListener(type: string, listener: (event: unknown) => void): void {
    const list = this.listeners.get(type) ?? [];
    this.listeners.set(
      type,
      list.filter((l) => l !== listener),
    );
  }

  fire(event: FakeTouchEvent): void {
    for (const listener of this.listeners.get(event.type) ?? []) listener(event);
  }

  types(): string[] {
    return this.dispatched.map((e) => e.type);
  }
}

export interface FakeTouch {
  identifier: number;
  clientX: number;
  clientY: number;
  screenX: number;
  screenY: number;
  pageX: number;
  pageY: number;
  target: FakeTarget;
}

export function touchAt(identifier: number, x: number, y: number, target: FakeTarget): FakeTouch {
  return {
    identifier,
    clientX: x,
    clientY: y,
    screenX: x,
    screenY: y,
    pageX: x,
    pageY: y,
    target,
  };
}

export interface FakeTouchEvent {
  type: string;
  touches: FakeTouch[];
  targetTouches: FakeTouch[];
  changedTouches: FakeTouch[];
  cancelable: boolean;
  defaultPrevented: boolean;
  isTrusted: boolean;
  /** The element the event was dispatched on, for listeners that read it. */
  target?: FakeTarget;
  preventDefault(): void;
  stopPropagation(): void;
}

/** A touch event; `down` are the touches still down, `changed` the ones this event is about. */
export function touchEvent(
  type: string,
  down: FakeTouch[],
  changed: FakeTouch[],
  cancelable = true,
): FakeTouchEvent {
  const event: FakeTouchEvent = {
    type,
    touches: down,
    targetTouches: down,
    changedTouches: changed,
    cancelable,
    defaultPrevented: false,
    isTrusted: true,
    preventDefault() {
      if (this.cancelable) this.defaultPrevented = true;
    },
    stopPropagation() {},
  };
  return event;
}

/** Installs MouseEvent, Touch, window and document fakes; returns the document. */
export function installTouchGlobals(): FakeTarget {
  // Keeps the whole init dictionary, so tests can check every field the
  // gestures pass (the old code's initMouseEvent arguments).
  class FakeMouseEvent {
    type: string;
    cancelable: boolean;
    clientX: number;
    clientY: number;
    button: number;
    constructor(type: string, init: Record<string, unknown>) {
      Object.assign(this, init);
      this.type = type;
      this.cancelable = !!init.cancelable;
      this.clientX = init.clientX as number;
      this.clientY = init.clientY as number;
      this.button = init.button as number;
    }
  }
  // A Touch made from an init dictionary: the client position defaults to 0.
  const FakeTouchClass = function (this: object, init: Record<string, unknown>) {
    Object.assign(this, { clientX: 0, clientY: 0 }, init);
  };
  const document = new FakeTarget();
  vi.stubGlobal("MouseEvent", FakeMouseEvent);
  vi.stubGlobal("Touch", FakeTouchClass);
  vi.stubGlobal("window", {});
  vi.stubGlobal("document", document);
  return document;
}

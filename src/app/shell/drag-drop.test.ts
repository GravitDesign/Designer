import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Designer } from "./designer.ts";
import { DataTransfer, DragDropTouch, startDragDropTouch } from "./drag-drop.ts";
import { setDesigner } from "./globals.ts";

type Listener = (event: FakeEvent) => void;

interface FakeEvent {
  type: string;
  defaultPrevented: boolean;
  preventDefault(): void;
  [key: string]: unknown;
}

/** Every drag event any fake element received, as "type@id". */
const log: string[] = [];

class FakeListeners {
  readonly entries: { type: string; listener: Listener; capture: boolean }[] = [];

  addEventListener(type: string, listener: Listener, options?: boolean | { capture?: boolean }) {
    const capture = typeof options === "object" ? !!options.capture : !!options;
    if (
      this.entries.some((e) => e.type === type && e.listener === listener && e.capture === capture)
    )
      return;
    this.entries.push({ type, listener, capture });
  }

  removeEventListener(type: string, listener: Listener, options?: boolean | { capture?: boolean }) {
    const capture = typeof options === "object" ? !!options.capture : !!options;
    const index = this.entries.findIndex(
      (e) => e.type === type && e.listener === listener && e.capture === capture,
    );
    if (index >= 0) this.entries.splice(index, 1);
  }

  run(event: FakeEvent, capture: boolean | null) {
    for (const entry of [...this.entries])
      if (entry.type === event.type && (capture === null || entry.capture === capture))
        entry.listener(event);
  }
}

class FakeClassList {
  readonly items: string[] = [];
  add(name: string) {
    if (!this.items.includes(name)) this.items.push(name);
  }
  remove(name: string) {
    const index = this.items.indexOf(name);
    if (index >= 0) this.items.splice(index, 1);
  }
  contains(name: string) {
    return this.items.includes(name);
  }
}

class FakeElement extends FakeListeners {
  readonly classList = new FakeClassList();
  readonly attributes = new Map<string, string>();
  readonly dataset: Record<string, string> = {};
  readonly style: Record<string, string> = {};
  readonly children: FakeElement[] = [];
  parentElement: FakeElement | null = null;
  draggable = false;

  constructor(readonly id: string) {
    super();
  }

  append(child: FakeElement) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  appendChild(child: FakeElement) {
    return this.append(child);
  }

  removeChild(child: FakeElement) {
    this.children.splice(this.children.indexOf(child), 1);
    child.parentElement = null;
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }

  hasAttribute(name: string) {
    return this.attributes.has(name);
  }

  removeAttribute(name: string) {
    this.attributes.delete(name);
  }

  getBoundingClientRect() {
    return { left: 0, top: 0, width: 50, height: 20 };
  }

  cloneNode(): FakeElement {
    const copy = new FakeElement(this.id + "-copy");
    for (const [name, value] of this.attributes) copy.attributes.set(name, value);
    for (const name of this.classList.items) copy.classList.add(name);
    copy.draggable = this.draggable;
    for (const child of this.children) copy.append(child.cloneNode());
    return copy;
  }

  dispatchEvent(event: FakeEvent) {
    log.push(event.type + "@" + this.id);
    this.run(event, null);
    return !event.defaultPrevented;
  }
}

const documentListeners = new FakeListeners();
const body = new FakeElement("body");
let elementAtPoint: FakeElement | null = null;

const fakeDocument = {
  ontouchstart: null,
  body,
  addEventListener: documentListeners.addEventListener.bind(documentListeners),
  removeEventListener: documentListeners.removeEventListener.bind(documentListeners),
  elementFromPoint: () => elementAtPoint,
  createEvent: (): FakeEvent => {
    const event: FakeEvent = {
      type: "",
      defaultPrevented: false,
      preventDefault() {
        event.defaultPrevented = true;
      },
      initEvent(type: string) {
        event.type = type;
      },
    };
    return event;
  },
};

/** A trusted touch event with one finger at (x, y) over target (none for touchend). */
function touch(type: string, target: FakeElement, x: number, y: number): FakeEvent {
  const point = { target, clientX: x, clientY: y, pageX: x, pageY: y, screenX: x, screenY: y };
  const event: FakeEvent = {
    type,
    target,
    isTrusted: true,
    cancelable: true,
    defaultPrevented: false,
    touches: type === "touchend" || type === "touchcancel" ? [] : [point],
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    preventDefault() {
      event.defaultPrevented = true;
    },
  };
  return event;
}

/** Document capture listeners, then the target's own, then document bubble listeners. */
function fire(target: FakeElement, event: FakeEvent) {
  documentListeners.run(event, true);
  target.run(event, null);
  documentListeners.run(event, false);
}

let parent: FakeElement;
let source: FakeElement;
let dropTarget: FakeElement;

beforeAll(() => {
  vi.stubGlobal("document", fakeDocument);
  vi.stubGlobal("window", { addEventListener() {}, removeEventListener() {} });
  vi.stubGlobal("getComputedStyle", () => ({ length: 0, pointerEvents: "auto" }));
  vi.stubGlobal(
    "HTMLCanvasElement",
    class FakeCanvas {
      width = 0;
    },
  );
  setDesigner({ getContextMenu: () => null } as unknown as Designer);
  startDragDropTouch();
});

beforeEach(() => {
  vi.useFakeTimers();
  log.length = 0;
  body.children.length = 0;
  parent = new FakeElement("parent");
  source = parent.append(new FakeElement("source"));
  source.setAttribute("draggable", "true");
  source.draggable = true;
  dropTarget = new FakeElement("target");
  dropTarget.addEventListener("dragover", (event) => event.preventDefault());
  elementAtPoint = dropTarget;
});

afterEach(() => {
  fire(source, touch("touchend", source, 0, 0));
  vi.useRealTimers();
});

describe("DragDropTouch", () => {
  it("starts once and listens on the document", () => {
    const instance = DragDropTouch.getInstance();
    const count = documentListeners.entries.length;
    expect(startDragDropTouch()).toBe(instance);
    expect(documentListeners.entries.length).toBe(count);
    expect(documentListeners.entries.map((e) => e.type)).toEqual([
      "touchstart",
      "touchend",
      "touchcancel",
      "dragstart",
      "touchstart",
    ]);
    expect(() => new DragDropTouch()).toThrow();
  });

  it("drags after a move past the threshold and drops on touchend", () => {
    fire(source, touch("touchstart", source, 10, 10));
    vi.advanceTimersByTime(150);
    fire(source, touch("touchmove", source, 32, 10));

    expect(log).toEqual([
      "dragstart@source",
      "dragenter@target",
      "drag@source",
      "dragenter@target",
      "dragover@target",
    ]);
    const image = body.children[0] as FakeElement;
    expect(image.classList.items).toEqual(["g-dragging-shadow-element"]);
    expect(image.hasAttribute("draggable")).toBe(false);
    expect(image.style.opacity).toBe("0.5");
    expect(image.style.zIndex).toBe("999999");
    expect(image.style["touch-action"]).toBe("none");
    // Offset is where the finger went down inside the source (10, 10).
    expect(image.style.transform).toBe("translate3d(22px, 0px, 0px)");

    log.length = 0;
    fire(source, touch("touchend", source, 0, 0));
    expect(log).toEqual(["drop@target", "dragend@source"]);
    expect(body.children.length).toBe(0);
  });

  it("does not drag on a move too early, too short or too far", () => {
    fire(source, touch("touchstart", source, 10, 10));
    vi.advanceTimersByTime(50);
    fire(source, touch("touchmove", source, 32, 10));
    vi.advanceTimersByTime(100);
    fire(source, touch("touchmove", source, 30, 10));
    fire(source, touch("touchmove", source, 40, 10));
    expect(log).toEqual([]);
    fire(source, touch("touchmove", source, 35, 10));
    expect(log[0]).toBe("dragstart@source");
  });

  it("drops nothing when no dragover was prevented", () => {
    dropTarget.entries.length = 0;
    fire(source, touch("touchstart", source, 10, 10));
    vi.advanceTimersByTime(150);
    fire(source, touch("touchmove", source, 32, 10));
    log.length = 0;
    fire(source, touch("touchend", source, 0, 0));
    expect(log).toEqual(["dragend@source"]);
  });

  it("waits for a long press in press-and-hold mode", () => {
    source.dataset.dragMode = "1";
    fire(source, touch("touchstart", source, 10, 10));
    fire(source, touch("touchmove", source, 15, 10));
    expect(log).toEqual([]);

    vi.advanceTimersByTime(500);
    expect(log).toEqual(["draginit@source"]);
    expect(source.classList.items).toEqual(["g-draggable"]);
    expect(parent.classList.items).toEqual(["g-draggable-parent"]);

    log.length = 0;
    fire(source, touch("touchmove", source, 40, 10));
    expect(log.slice(0, 2)).toEqual(["draginit@source", "dragstart@source"]);
    expect(source.classList.items).toEqual([]);
    expect(parent.classList.items).toEqual([]);
    expect((body.children[0] as FakeElement).classList.items).toEqual([
      "g-dragging-shadow-element",
      "g-draggable-drag-image",
    ]);
  });

  it("cancels press-and-hold when the finger moves too far first", () => {
    source.dataset.dragMode = "1";
    fire(source, touch("touchstart", source, 10, 10));
    fire(source, touch("touchmove", source, 40, 10));
    vi.advanceTimersByTime(500);
    expect(log).toEqual([]);
  });
});

describe("DataTransfer", () => {
  it("stores data by format", () => {
    const data = new DataTransfer();
    expect(data.dropEffect).toBe("move");
    expect(data.effectAllowed).toBe("all");
    data.setData("text", "a");
    expect(data.types).toEqual(["text"]);
    expect(data.getData("text")).toBe("a");
    expect(data.getData("other")).toBe("");
    data.clearData("text");
    expect(data.types).toEqual([]);
    data.clearData();
    expect(() => data.types).toThrow();
  });
});

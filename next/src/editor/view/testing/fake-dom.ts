// A minimal DOM for the view tests in Node: divs, spans and text areas
// with style, classes, attributes, children and listeners, the canvases
// of engine/paint/testing/fake-canvas.ts, a document with the focus and
// capture listeners, and a window whose animation frames run only when a
// test asks (runFrames). Nothing is laid out: offsetWidth and the boxes
// are 0, so widgets fall back to the sizes they were given.
import { PaintCanvas } from "../../../engine/paint/paint-canvas.ts";
import { FakeCanvas, installFakeCanvas } from "../../../engine/paint/testing/fake-canvas.ts";

type Listener = (event: FakeDomEvent) => void;

export interface FakeDomEvent {
  type: string;
  target?: unknown;
  [key: string]: unknown;
}

export class FakeElement {
  readonly tagName: string;
  style: Record<string, string> = {};
  className = "";
  innerHTML = "";
  textContent = "";
  value = "";
  selectionStart = 0;
  children: (FakeElement | FakeCanvas)[] = [];
  parentNode: FakeElement | null = null;
  offsetWidth = 0;
  offsetHeight = 0;
  offsetLeft = 0;
  offsetTop = 0;
  private readonly attributes = new Map<string, string>();
  readonly listeners = new Map<string, Listener[]>();

  constructor(tagName: string) {
    this.tagName = tagName.toUpperCase();
  }

  get firstChild(): FakeElement | FakeCanvas | null {
    return this.children[0] ?? null;
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, String(value));
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  appendChild<T extends FakeElement | FakeCanvas>(child: T): T {
    detach(child);
    this.children.push(child);
    setParent(child, this);
    return child;
  }

  insertBefore<T extends FakeElement | FakeCanvas>(child: T, reference: unknown): T {
    detach(child);
    const index = this.children.indexOf(reference as FakeElement);
    if (index < 0) this.children.push(child);
    else this.children.splice(index, 0, child);
    setParent(child, this);
    return child;
  }

  removeChild<T extends FakeElement | FakeCanvas>(child: T): T {
    const index = this.children.indexOf(child);
    if (index < 0) throw new Error("not a child");
    this.children.splice(index, 1);
    setParent(child, null);
    return child;
  }

  addEventListener(type: string, listener: Listener): void {
    const list = this.listeners.get(type) ?? [];
    list.push(listener);
    this.listeners.set(type, list);
  }

  removeEventListener(type: string, listener: Listener): void {
    const list = this.listeners.get(type) ?? [];
    const index = list.indexOf(listener);
    if (index >= 0) list.splice(index, 1);
  }

  /** Calls the element's listeners for `event.type` (no bubbling). */
  dispatch(event: FakeDomEvent): void {
    event.target ??= this;
    for (const listener of (this.listeners.get(event.type) ?? []).slice()) listener(event);
  }

  getBoundingClientRect(): { left: number; top: number; width: number; height: number } {
    return { left: 0, top: 0, width: 0, height: 0 };
  }

  focus(): void {
    fakeDocument.activeElement = this;
  }

  setSelectionRange(start: number): void {
    this.selectionStart = start;
  }
}

function detach(child: FakeElement | FakeCanvas): void {
  const parent = (child as { parentNode?: FakeElement | null }).parentNode;
  if (parent) parent.removeChild(child);
}

function setParent(child: FakeElement | FakeCanvas, parent: FakeElement | null): void {
  (child as { parentNode?: FakeElement | null }).parentNode = parent;
}

interface FakeDocument {
  activeElement: unknown;
  body: FakeElement;
  documentElement: { clientLeft: number; clientTop: number };
  listeners: Map<string, Listener[]>;
  createElement(tag: string): FakeElement | FakeCanvas;
  addEventListener(type: string, listener: Listener, capture?: boolean): void;
  removeEventListener(type: string, listener: Listener, capture?: boolean): void;
}

const fakeDocument: FakeDocument = {
  activeElement: null,
  body: new FakeElement("body"),
  documentElement: { clientLeft: 0, clientTop: 0 },
  listeners: new Map(),
  createElement(tag: string) {
    return tag === "canvas" ? new FakeCanvas() : new FakeElement(tag);
  },
  addEventListener(type, listener) {
    const list = this.listeners.get(type) ?? [];
    list.push(listener);
    this.listeners.set(type, list);
  },
  removeEventListener(type, listener) {
    const list = this.listeners.get(type) ?? [];
    const index = list.indexOf(listener);
    if (index >= 0) list.splice(index, 1);
  },
};

let frames = new Map<number, (time: number) => void>();
let nextFrame = 1;

/** Runs the animation frames scheduled so far (not those they schedule); returns how many ran. */
export function runFrames(): number {
  const due = frames;
  frames = new Map();
  for (const callback of due.values()) callback(0);
  return due.size;
}

/** Runs frames until none is scheduled (at most `limit` rounds). */
export function runAllFrames(limit = 50): void {
  for (let i = 0; i < limit && frames.size > 0; i++) runFrames();
}

export function pendingFrames(): number {
  return frames.size;
}

/** The fake window while the fake DOM is installed. */
let currentWindow: { devicePixelRatio: number } | null = null;

/**
 * Sets the fake window's devicePixelRatio and makes PaintCanvas read it
 * again (it caches the screen DPI). The fake DOM's undo function sets it
 * back to 1.
 */
export function setDevicePixelRatio(ratio: number): void {
  if (!currentWindow) throw new Error("the fake DOM is not installed");
  currentWindow.devicePixelRatio = ratio;
  PaintCanvas._initScreenDPI();
}

/** The document of the fake DOM. */
export function fakeDom(): FakeDocument {
  return fakeDocument;
}

/** Installs the fake DOM (and the fake canvases); returns an undo function. */
export function installFakeDom(): () => void {
  const uninstallCanvas = installFakeCanvas();
  const globals = globalThis as unknown as Record<string, unknown>;
  const names = ["document", "window", "getComputedStyle", "requestAnimationFrame"];
  const saved = names.map((name) => [name, globals[name]] as const);
  fakeDocument.activeElement = null;
  fakeDocument.body = new FakeElement("body");
  fakeDocument.listeners.clear();
  frames = new Map();
  globals.document = fakeDocument;
  const fakeWindow = {
    devicePixelRatio: 1,
    pageXOffset: 0,
    pageYOffset: 0,
    screen: { availWidth: 1600 },
    getComputedStyle(element: FakeElement) {
      return {
        getPropertyValue: (name: string) =>
          name === "color" ? element.style.color || "black" : "",
      };
    },
    requestAnimationFrame(callback: (time: number) => void): number {
      const id = nextFrame++;
      frames.set(id, callback);
      return id;
    },
    cancelAnimationFrame(id: number): void {
      frames.delete(id);
    },
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
  };
  globals.window = fakeWindow;
  globals.requestAnimationFrame = fakeWindow.requestAnimationFrame;
  currentWindow = fakeWindow;
  return () => {
    if (fakeWindow.devicePixelRatio !== 1) setDevicePixelRatio(1);
    currentWindow = null;
    for (const [name, value] of saved) {
      if (value === undefined) Reflect.deleteProperty(globals, name);
      else globals[name] = value;
    }
    uninstallCanvas();
  };
}

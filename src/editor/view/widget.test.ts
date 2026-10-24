import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { KeyEvent } from "../../engine/core/key-event.ts";
import { Key } from "../../engine/core/key.ts";
import { MouseEvent } from "../../engine/core/mouse-event.ts";
import type { Point } from "../../engine/math/point.ts";
import {
  fakeDom,
  installFakeDom,
  type FakeDomEvent,
  type FakeElement,
} from "./testing/fake-dom.ts";
import { Widget } from "./widget.ts";

let uninstall: () => void;
beforeEach(() => {
  uninstall = installFakeDom();
});
afterEach(() => uninstall());

const element = (widget: Widget): FakeElement => widget._htmlElement as unknown as FakeElement;

/** A DOM mouse event on the widget's div. */
function mouse(
  widget: Widget,
  type: string,
  x: number,
  y: number,
  extra: Partial<FakeDomEvent> = {},
) {
  const prevented: string[] = [];
  const event: FakeDomEvent = {
    type,
    target: widget._htmlElement,
    clientX: x,
    clientY: y,
    pageX: x,
    pageY: y,
    button: 0,
    buttons: 1,
    detail: 1,
    preventDefault: () => prevented.push("preventDefault"),
    stopPropagation: () => prevented.push("stopPropagation"),
    stopImmediatePropagation: () => prevented.push("stopImmediatePropagation"),
    ...extra,
  };
  element(widget).dispatch(event);
  return prevented;
}

const xy = (point: Point) => [point.getX(), point.getY()];

describe("Widget", () => {
  it("moves and sizes its div, and reports the given size while not laid out", () => {
    const widget = new Widget();
    widget.move(10, 20);
    widget.resize(300, 200);
    expect(element(widget).style).toMatchObject({
      left: "10px",
      top: "20px",
      position: "absolute",
      width: "300px",
      height: "200px",
      overflowX: "hidden",
    });
    expect([widget.getX(), widget.getY(), widget.getWidth(), widget.getHeight()]).toEqual([
      10, 20, 300, 200,
    ]);
    element(widget).offsetWidth = 640;
    expect(widget.getWidth()).toBe(640);
    widget.move(undefined, undefined);
    expect(element(widget).style.position).toBe("");
  });

  it("listens to a DOM event only while an engine listener is registered", () => {
    const widget = new Widget();
    const first = (): void => {};
    const second = (): void => {};
    widget.addEventListener(MouseEvent.Down, first);
    widget.addEventListener(MouseEvent.Down, second);
    expect(element(widget).listeners.get("mousedown")).toHaveLength(1);
    widget.removeEventListener(MouseEvent.Down, first);
    expect(element(widget).listeners.get("mousedown")).toHaveLength(1);
    widget.removeEventListener(MouseEvent.Down, second);
    expect(element(widget).listeners.get("mousedown")).toHaveLength(0);
    expect(widget._inputEventCache).toBeNull();
  });

  it("keeps the DOM listener when a listener added twice is removed (old counting)", () => {
    // See "A listener added twice keeps the widget listening" in QUESTIONS.md.
    const widget = new Widget();
    const listener = (): void => {};
    widget.addEventListener(MouseEvent.Down, listener);
    widget.addEventListener(MouseEvent.Down, listener);
    widget.removeEventListener(MouseEvent.Down, listener);
    expect(widget.hasEventListeners(MouseEvent.Down)).toBe(false);
    expect(element(widget).listeners.get("mousedown")).toHaveLength(1);
  });

  it("turns DOM mouse events into engine events and prevents the default of a press", () => {
    const widget = new Widget();
    const seen: string[] = [];
    widget.addEventListener(MouseEvent.Down, (event: MouseEvent) => {
      seen.push("down " + xy(event.client).join(",") + " button " + event.button);
    });
    const prevented = mouse(widget, "mousedown", 30, 40, { button: 2, buttons: 2 });
    expect(seen).toEqual(["down 30,40 button 2"]);
    expect(prevented).toEqual(["preventDefault"]);
  });

  it("captures moves and releases on the document from a press to the release", () => {
    const widget = new Widget();
    const seen: string[] = [];
    widget.addEventListener(MouseEvent.Down, () => seen.push("down"));
    widget.addEventListener(MouseEvent.Move, (event: MouseEvent) =>
      seen.push("move " + event.button),
    );
    widget.addEventListener(MouseEvent.Release, () => seen.push("release"));
    mouse(widget, "mousedown", 1, 1);
    const document = fakeDom();
    expect([...document.listeners.keys()].sort()).toEqual(["mousemove", "mouseup"]);
    // A move outside the widget arrives through the capture, with the
    // button from `buttons` (right held, middle not).
    const outside = {
      type: "mousemove",
      target: {},
      clientX: 5,
      clientY: 5,
      pageX: 5,
      pageY: 5,
      button: 0,
      buttons: 2,
      preventDefault() {},
      stopPropagation() {},
      stopImmediatePropagation() {},
    };
    for (const listener of document.listeners.get("mousemove") ?? []) listener(outside);
    mouse(widget, "mouseup", 5, 5);
    expect(seen).toEqual(["down", "move 2", "release"]);
    expect(document.listeners.get("mousemove")).toHaveLength(0);
  });

  it("makes drag events from a press, a move of a pixel or more and the release", () => {
    const widget = new Widget();
    const seen: string[] = [];
    widget.addEventListener(MouseEvent.DragStart, (event: MouseEvent) =>
      seen.push("start " + xy(event.client).join(",")),
    );
    widget.addEventListener(MouseEvent.Drag, (event: MouseEvent) =>
      seen.push("drag " + xy(event.client).join(",") + " delta " + xy(event.clientDelta).join(",")),
    );
    widget.addEventListener(MouseEvent.DragEnd, (event: MouseEvent) =>
      seen.push("end " + xy(event.clientStart).join(",")),
    );
    mouse(widget, "mousedown", 10, 10);
    mouse(widget, "mousemove", 10.5, 10);
    expect(seen).toEqual([]);
    mouse(widget, "mousemove", 13, 10);
    mouse(widget, "mousemove", 20, 14);
    mouse(widget, "mouseup", 20, 14);
    expect(seen).toEqual([
      "start 10,10",
      "drag 13,10 delta 3,0",
      "drag 20,14 delta 7,4",
      "end 10,10",
    ]);
  });

  it("drags with the left and middle button only, unless right drag is on", () => {
    const widget = new Widget();
    let starts = 0;
    widget.addEventListener(MouseEvent.DragStart, () => starts++);
    mouse(widget, "mousedown", 0, 0, { button: 2 });
    mouse(widget, "mousemove", 9, 9, { button: 2, buttons: 2 });
    mouse(widget, "mouseup", 9, 9, { button: 2 });
    expect(starts).toBe(0);
    widget.setRightDrag(true);
    mouse(widget, "mousedown", 0, 0, { button: 2 });
    mouse(widget, "mousemove", 9, 9, { button: 2, buttons: 2 });
    expect(starts).toBe(1);
  });

  it("keeps Tab in the widget and fills key events", () => {
    const widget = new Widget();
    const keys: unknown[] = [];
    widget.addEventListener(KeyEvent.Down, (event: KeyEvent) => keys.push(event.key));
    const prevented: string[] = [];
    element(widget).dispatch({
      type: "keydown",
      code: "Tab",
      keyCode: 9,
      charCode: 0,
      timeStamp: 5,
      preventDefault: () => prevented.push("tab"),
      stopPropagation() {},
    });
    expect(prevented).toEqual(["tab"]);
    expect(keys).toEqual([Key.Constant.TAB]);
  });

  it("ignores input while disabled", () => {
    const widget = new Widget();
    let downs = 0;
    widget.addEventListener(MouseEvent.Down, () => downs++);
    widget.setEnabled(false);
    expect(element(widget).className).toBe("g-disabled");
    mouse(widget, "mousedown", 0, 0);
    widget.setEnabled(true);
    mouse(widget, "mousedown", 0, 0);
    expect(downs).toBe(1);
  });

  it("shows the cursor through one g-cursor class", () => {
    const widget = new Widget();
    element(widget).className = "a";
    widget.setCursor("select");
    widget.setCursor("cross");
    expect(element(widget).className).toBe("a g-cursor-cross");
    // The first cursor added the cursor style sheet.
    const sheet = fakeDom().body.children.find(
      (child) => "tagName" in child && child.tagName === "STYLE",
    ) as FakeElement | undefined;
    expect(sheet?.textContent).toContain(".g-cursor-cross");
    widget.setCursor(null);
    expect(element(widget).className).toBe("a");
  });

  it("focuses the first child with tabindex 0", () => {
    const widget = new Widget();
    const plain = document.createElement("div");
    const focusable = widget._createHTMLElement(true);
    widget._htmlElement.appendChild(plain);
    widget._htmlElement.appendChild(focusable);
    expect(widget.focus()).toBe(true);
    expect(fakeDom().activeElement).toBe(focusable);
    widget.setDisplayed(false);
    expect(widget.focus()).toBe(false);
  });
});

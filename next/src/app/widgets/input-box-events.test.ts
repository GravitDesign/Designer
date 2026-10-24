import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  FakeElement,
  FakeEvent,
  fire,
  installFakeDom,
  type FakeDomHandle,
  type FakeEventInit,
} from "../menus/testing/fake-dom.testing.ts";
import { InputBox, HOVER_BORDER, SCRUB_CURSOR, type InputBoxOptions } from "./input-box.ts";

let dom: FakeDomHandle;
let scrubbing: boolean;
const globals = globalThis as Record<string, unknown>;
const savedEvent = globals.Event;
const savedHTMLElement = globals.HTMLElement;

beforeEach(() => {
  dom = installFakeDom();
  scrubbing = true;
  // The box fires its change events with `new Event(...)`, and checks the
  // scroll parent with instanceof HTMLElement.
  globals.Event = FakeEvent;
  globals.HTMLElement = FakeElement;
});

afterEach(() => {
  globals.Event = savedEvent;
  globals.HTMLElement = savedHTMLElement;
  dom.uninstall();
});

interface Harness {
  box: InputBox;
  input: FakeElement;
  panel: FakeElement;
  changes: string[];
  selected: number;
}

function setup(options: InputBoxOptions = {}, value = "10"): Harness {
  const panel = dom.document.createElement("div");
  panel.className = "properties-panel";
  const row = dom.document.createElement("div");
  panel.append(row);
  dom.document.body.append(panel);
  const input = dom.document.createElement("input");
  row.append(input);
  const harness = { input, panel, changes: [] as string[], selected: 0 } as Harness;
  Object.assign(input, { select: () => ++harness.selected });
  harness.box = new InputBox(
    input as unknown as HTMLInputElement,
    {
      scene: () => ({ getProperty: () => "px", getOptimalDecimalsCount: () => 2 }),
      scrubbingEnabled: () => scrubbing,
      touchDevice: () => false,
      ...options,
    } as InputBoxOptions,
  );
  harness.box.value(value);
  input.addEventListener("change", () => harness.changes.push(input.value));
  return harness;
}

function send(target: FakeElement, type: string, init: FakeEventInit, extra = {}): FakeEvent {
  const event = new FakeEvent(type, init);
  Object.assign(event, extra);
  target.dispatchEvent(event);
  return event;
}

describe("InputBox keys and wheel (UI-FIELD-159)", () => {
  it("steps on the arrow keys, fires change and takes the focus", () => {
    const { input, changes } = setup();
    const up = send(input, "keydown", { keyCode: 38 });
    expect(up.defaultPrevented).toBe(true);
    expect(changes).toEqual(["11"]);
    expect(dom.document.activeElement).toBe(input);
    send(input, "keydown", { keyCode: 40, shiftKey: true });
    // The change listener of the box runs first and normalises the text.
    expect(changes).toEqual(["11", "1"]);
  });

  it("ignores the arrows without keyIncrement", () => {
    const { input, changes } = setup({ keyIncrement: false });
    expect(send(input, "keydown", { keyCode: 38 }).defaultPrevented).toBe(false);
    expect(changes).toEqual([]);
  });

  it("blurs on Enter only with triggerChangeOnEnter", () => {
    const { input } = setup();
    input.focus();
    send(input, "keydown", { keyCode: 13 });
    expect(dom.document.activeElement).toBeNull();
    const other = setup({ triggerChangeOnEnter: false });
    other.input.focus();
    send(other.input, "keydown", { keyCode: 13 });
    expect(dom.document.activeElement).toBe(other.input);
  });

  it("steps on the wheel only while focused, by deltaX before deltaY", () => {
    const { input, changes } = setup();
    const unfocused = send(input, "wheel", {}, { deltaX: 0, deltaY: 5 });
    expect(unfocused.defaultPrevented).toBe(false);
    expect(changes).toEqual([]);
    input.focus();
    expect(send(input, "wheel", {}, { deltaX: 0, deltaY: 5 }).defaultPrevented).toBe(true);
    expect(changes).toEqual(["9"]);
    send(input, "wheel", {}, { deltaX: -3, deltaY: 5 });
    expect(changes).toEqual(["9", "10"]);
  });
});

describe("InputBox scrubbing (UI-FIELD-159)", () => {
  it("shows the scrub cursor on hover only while the setting is on", () => {
    const { input } = setup();
    scrubbing = false;
    fire(input, "mouseenter");
    expect(input.style).not.toHaveProperty("cursor");
    scrubbing = true;
    fire(input, "mouseenter");
    expect(input.style).toMatchObject({ cursor: SCRUB_CURSOR, border: HOVER_BORDER });
    fire(input, "mouseleave");
    expect(input.style).toMatchObject({ cursor: "", border: "" });
  });

  it("arms on the first move, then steps by the pixels moved, and resets on mouseup", () => {
    const { input, panel, changes } = setup();
    const html = dom.document.documentElement;
    const body = dom.document.body;
    input.focus();
    send(input, "mousedown", {}, { which: 1 });
    expect(panel.className).toBe("properties-panel noscroll");
    send(html, "mousemove", { pageY: 100 });
    expect(changes).toEqual(["10"]);
    expect(html.style).toMatchObject({ cursor: SCRUB_CURSOR, userSelect: "none" });
    expect(body.style).toMatchObject({ pointerEvents: "none" });
    send(html, "mousemove", { pageY: 95 });
    expect(changes).toEqual(["10", "15"]);
    send(input, "mouseup", {}, { which: 1 });
    expect(panel.className).toBe("properties-panel");
    expect(html.style).toMatchObject({ cursor: "", userSelect: "" });
    expect(body.style).toMatchObject({ pointerEvents: "" });
    // A desktop scrub ends with the field blurred.
    expect(dom.document.activeElement).toBeNull();
    send(html, "mousemove", { pageY: 50 });
    expect(changes).toEqual(["10", "15"]);
  });

  it("doesn't scrub with the setting off or for another button", () => {
    const { input, panel, changes } = setup();
    send(input, "mousedown", {}, { which: 3 });
    scrubbing = false;
    send(input, "mousedown", {}, { which: 1 });
    send(dom.document.documentElement, "mousemove", { pageY: 10 });
    expect(changes).toEqual([]);
    expect(panel.className).toBe("properties-panel");
  });

  it("treats a click without a move as a click inside: no more scrub cursor", () => {
    const { input, box } = setup();
    send(input, "mousedown", {}, { which: 1 });
    send(input, "mouseup", {}, { which: 1 });
    expect(box.insideClicked).toBe(true);
    fire(input, "mouseenter");
    expect(input.style).toMatchObject({ cursor: "" });
    fire(input, "focusout");
    expect(box.insideClicked).toBe(false);
  });
});

describe("InputBox focus and detach (UI-FIELD-159)", () => {
  it("selects the text once, on the first click after the focus", () => {
    const harness = setup();
    fire(harness.input, "click");
    expect(harness.selected).toBe(0);
    fire(harness.input, "focusin");
    fire(harness.input, "click");
    fire(harness.input, "click");
    expect(harness.selected).toBe(1);
  });

  it("removes every listener on detach", () => {
    const { input, box } = setup();
    const types = ["change", "focusin", "focusout", "click", "wheel", "keydown"];
    types.push("mouseenter", "mouseleave", "mousedown", "mouseup");
    // The test's own change listener stays.
    box.detach();
    expect(types.map((type) => input.listenerCount(type))).toEqual([1, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(InputBox.of(input as unknown as Element)).toBeNull();
  });
});

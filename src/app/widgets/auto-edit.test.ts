import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  FakeElement,
  FakeEvent,
  fake,
  fire,
  installFakeDom,
  type FakeDomHandle,
} from "../menus/testing/fake-dom.testing.ts";
import type { Designer } from "../shell/designer.ts";
import { resetGlobals, setDesigner } from "../shell/globals.ts";
import { AutoEdit } from "./auto-edit.ts";

let dom: FakeDomHandle;
let executed: unknown[][];
let touch: boolean;

/** The fake has no layout list; the old offset() only needs one box. */
const proto = FakeElement.prototype as unknown as Record<string, unknown>;
proto.getClientRects ??= function (this: FakeElement) {
  return [this.box];
};
proto.select ??= () => undefined;
(globalThis as Record<string, unknown>).Element ??= FakeElement;

beforeEach(() => {
  dom = installFakeDom();
  executed = [];
  touch = false;
  setDesigner({
    isTouchEnabled: () => touch,
    executeAction: (...args: unknown[]) => executed.push(args),
  } as unknown as Designer);
});

afterEach(() => {
  resetGlobals();
  dom.uninstall();
});

/**
 * A layer name element with an auto edit. Removing the focused field
 * fires blur first, as Chromium (and so Electron) does: checked in the
 * old app's page, where only jQuery's remove(), which unbinds first,
 * kept that blur from reaching the old handler.
 */
function setup(text = "Layer 1"): { edit: AutoEdit; element: FakeElement; submitted: string[] } {
  const element = dom.document.createElement("div");
  element.textContent = text;
  element.box = { left: 10, top: 20, width: 100, height: 18 };
  dom.document.body.append(element);
  const submitted: string[] = [];
  const edit = new AutoEdit(element as unknown as HTMLElement, {
    submitCallback: (value) => submitted.push(value),
  });
  return { edit, element, submitted };
}

function field(): FakeElement {
  const input = dom.document.querySelector(".g-auto-edit");
  if (!input) throw new Error("no field");
  const remove = input.remove.bind(input);
  input.remove = () => {
    if (input.parentElement && dom.document.activeElement === input) {
      dom.document.activeElement = null;
      fire(input, "blur", { bubbles: false });
    }
    remove();
  };
  return input;
}

function key(input: FakeElement, type: string, keyCode: number, code: string, shift = false) {
  const event = new FakeEvent(type, { keyCode, shiftKey: shift });
  Object.assign(event, { code });
  input.dispatchEvent(event);
  return event;
}

describe("AutoEdit (UI-FIELD-171)", () => {
  it("opens on double click over the element with the text selected", () => {
    const { element } = setup();
    fire(element, "dblclick");
    const input = field();
    expect(input.tagName).toBe("INPUT");
    expect(input.getAttribute("type")).toBe("text");
    expect(input.value).toBe("Layer 1");
    expect(input.style.cssText).toBe(
      "position: absolute; left: 10px; top: 20px; width: 100px; height: 18px;",
    );
    expect(dom.document.activeElement).toBe(input);
  });

  it("submits once on Enter, though removing the field fires blur", () => {
    const { edit, submitted } = setup();
    edit.open();
    const input = field();
    input.value = "Renamed";
    key(input, "keyup", 13, "Enter");
    expect(submitted).toEqual(["Renamed"]);
    expect(dom.document.querySelector(".g-auto-edit")).toBeNull();
    expect(edit.input).toBeNull();
  });

  it("cancels a changed name on Escape", () => {
    const { edit, submitted } = setup();
    edit.open();
    const input = field();
    input.value = "Renamed";
    key(input, "keyup", 27, "Escape");
    expect(submitted).toEqual([]);
    expect(dom.document.querySelector(".g-auto-edit")).toBeNull();
  });

  it("submits on blur, unchanged names too, but never an empty one", () => {
    const { edit, submitted } = setup();
    edit.open();
    fire(field(), "blur");
    // close() forgets the original text first, as the old code did.
    expect(submitted).toEqual(["Layer 1"]);
    edit.open();
    const input = field();
    input.value = "";
    fire(input, "blur");
    expect(submitted).toEqual(["Layer 1"]);
  });

  it("submits on Tab, then cycles the layer focus and renames the next layer", () => {
    const { edit, submitted } = setup();
    edit.open();
    const input = field();
    input.value = "A";
    const event = key(input, "keydown", 9, "Tab");
    expect(submitted).toEqual(["A"]);
    expect(executed).toEqual([
      ["view.cycle-through-layers.next", ["focus"]],
      ["edit.rename-layer"],
    ]);
    expect(event.defaultPrevented).toBe(true);
    expect(event.propagationStopped).toBe(true);
    edit.open();
    key(field(), "keydown", 9, "Tab", true);
    expect(executed[2]).toEqual(["view.cycle-through-layers.previous", ["focus"]]);
  });

  it("submits on a click outside the field in touch mode", () => {
    touch = true;
    const { edit, submitted } = setup();
    edit.open();
    const input = field();
    input.value = "B";
    expect(dom.document.listenerCount("click")).toBe(1);
    fire(input, "click");
    expect(submitted).toEqual([]);
    fire(dom.document.body, "click");
    expect(submitted).toEqual(["B"]);
    expect(dom.document.listenerCount("click")).toBe(0);
  });

  it("closes an open field before opening a new one", () => {
    const { edit } = setup();
    edit.open();
    edit.open();
    expect(dom.document.querySelectorAll(".g-auto-edit")).toHaveLength(1);
    expect(fake(edit.input).parentElement).toBe(dom.document.body);
  });
});

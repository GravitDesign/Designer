import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Overlay } from "../dialogs/dialog-container.ts";
import {
  click,
  find,
  installShapeTestDom,
  type ShapeTestDom,
} from "../inspector/shape-panels-dom.testing.ts";
import type { FakeElement } from "../menus/testing/fake-dom.testing.ts";
import { CornerTypePicker } from "./corner-type-select.ts";

let env: ShapeTestDom;
beforeEach(() => {
  env = installShapeTestDom();
});
afterEach(() => {
  vi.restoreAllMocks();
  env.uninstall();
});

/** An inline width, set with style.width or style.setProperty. */
// The fake style keeps transform as a plain property (the code under test assigns style.transform).
const transformOf = (element: FakeElement) =>
  (element.style as unknown as { transform?: string }).transform;
const widthOf = (element: FakeElement) =>
  element.style.getPropertyValue("width") || (element.style as unknown as { width?: string }).width;

const buttonsOf = (root: FakeElement) => root.querySelectorAll("button[data-corner-type]");

describe("CornerTypePicker inline", () => {
  function inline(rotate?: number): { element: FakeElement; picker: CornerTypePicker } {
    const element = env.dom.document.createElement("div");
    env.dom.document.body.appendChild(element);
    const picker = new CornerTypePicker(
      element as unknown as HTMLElement,
      rotate === undefined ? { notOverlay: true } : { notOverlay: true, rotate },
    );
    return { element, picker };
  }

  it("builds five buttons at 20% with their titles and unrotated icons", () => {
    const { element, picker } = inline();
    expect(CornerTypePicker.of(element as unknown as Element)).toBe(picker);
    const buttons = buttonsOf(element);
    expect(
      buttons.map((b) => [b.getAttribute("data-corner-type"), b.getAttribute("data-title")]),
    ).toEqual([
      ["R", "Round"],
      ["U", "Round2"],
      ["B", "Bevel"],
      ["I", "Inset"],
      ["F", "Fancy"],
    ]);
    expect(element.querySelectorAll(".column").map(widthOf)).toEqual(Array(5).fill("20%"));
    expect(transformOf(find(buttons[0], "span"))).toBe("rotate(0deg)");
    expect(transformOf(find(buttonsOf(inline(90).element)[0] as FakeElement, "span"))).toBe(
      "rotate(90deg)",
    );
  });

  it("sets the value on a click and dispatches a bubbling cornertypechange", () => {
    const { element, picker } = inline();
    const parent = element.parentElement as FakeElement;
    const details: unknown[] = [];
    parent.addEventListener("cornertypechange", (event) =>
      details.push((event as unknown as { detail: unknown }).detail),
    );
    const bevel = buttonsOf(element)[2] as FakeElement;
    click(find(bevel, "span"));
    expect(picker.value()).toBe("B");
    expect(details).toEqual(["B"]);
    expect(env.stats).toContainEqual(["cornertypes_click_change", "Bevel"]);
    expect(buttonsOf(element).filter((b) => b.classList.contains("g-active"))).toEqual([bevel]);
  });

  it("reports an unknown type to the statistics as unkn", () => {
    const { element } = inline();
    const button = buttonsOf(element)[0] as FakeElement;
    button.setAttribute("data-corner-type", "Z");
    click(button);
    expect(env.stats).toContainEqual(["cornertypes_click_change", "unkn"]);
  });

  it("marks the type's buttons in every picker of the page", () => {
    const first = inline();
    const second = inline();
    first.picker.update("I");
    const active = (root: FakeElement) =>
      buttonsOf(root)
        .filter((b) => b.classList.contains("g-active"))
        .map((b) => b.getAttribute("data-corner-type"));
    expect([active(first.element), active(second.element)]).toEqual([["I"], ["I"]]);
    second.picker.value("F");
    expect([active(first.element), active(second.element)]).toEqual([["F"], ["F"]]);
    // update() doesn't change the value.
    expect(first.picker.value()).toBe(null);
  });
});

describe("CornerTypePicker in an overlay", () => {
  function overlayPicker() {
    const opened: Overlay[] = [];
    const closed: Overlay[] = [];
    vi.spyOn(Overlay.prototype, "open").mockImplementation(function (this: Overlay) {
      opened.push(this);
      return this;
    });
    vi.spyOn(Overlay.prototype, "close").mockImplementation(function (this: Overlay) {
      closed.push(this);
      return this;
    });
    const element = env.dom.document.createElement("button");
    const picker = new CornerTypePicker(element as unknown as HTMLElement, { rotate: 180 });
    return { element, picker, opened, closed };
  }

  it("shows the value as the icon of its span, rotated, and no class for null", () => {
    const { element, picker } = overlayPicker();
    const span = find(element, "span");
    picker.value("U");
    expect(picker.value()).toBe("U");
    expect([span.getAttribute("class"), transformOf(span)]).toEqual([
      "gravit-icon-corner-inverse-rounded",
      "rotate(180deg)",
    ]);
    picker.value(null);
    expect(span.getAttribute("class")).toBe(null);
  });

  it("opens the buttons in an overlay on a click and closes it after a pick", () => {
    const { element, picker, opened, closed } = overlayPicker();
    const details: unknown[] = [];
    element.addEventListener("cornertypechange", (event) =>
      details.push((event as unknown as { detail: unknown }).detail),
    );
    click(element);
    expect(env.stats).toContainEqual(["cornertypes_click_open"]);
    expect(opened).toHaveLength(1);
    const overlay = opened[0] as Overlay;
    const content = overlay.getContent() as unknown as FakeElement;
    expect(widthOf(content)).toBe("200px");
    expect(overlay.options.clazz).toBe("corner-picker-overlay");
    click(buttonsOf(content)[4] as FakeElement);
    expect(details).toEqual(["F"]);
    expect(picker.value()).toBe("F");
    expect(closed).toEqual([overlay]);
  });

  it("doesn't close anything in inline mode", () => {
    const closed = vi.spyOn(Overlay.prototype, "close");
    const element = env.dom.document.createElement("div");
    new CornerTypePicker(element as unknown as HTMLElement, { notOverlay: true });
    click(buttonsOf(element)[0] as FakeElement);
    expect(closed).not.toHaveBeenCalled();
  });
});

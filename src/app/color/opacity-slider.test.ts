import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fire, installFakeDom, type FakeElement } from "./fake-dom.testing.ts";
import { InputSlider, OPACITY_DEFAULT } from "./opacity-slider.ts";

let body: FakeElement;

beforeEach(() => {
  body = installFakeDom().body;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function make(options: ConstructorParameters<typeof InputSlider>[1]) {
  const element = document.createElement("div") as unknown as FakeElement;
  body.appendChild(element);
  const slider = new InputSlider(element as unknown as HTMLElement, options);
  const track = element.children[0] as FakeElement;
  const thumb = track.children[0] as FakeElement;
  return { element, slider, track, thumb };
}

describe("InputSlider (UI-FIELD-167)", () => {
  it("builds the old classes and attributes, starting at 50 clamped to the range", () => {
    const opacity = make({ ...OPACITY_DEFAULT });
    expect(opacity.element.className).toBe("g-input-slider custom opacity");
    expect(opacity.element.getAttribute("value")).toBe("50");
    expect(opacity.element.getAttribute("min")).toBe("0");
    expect(opacity.element.getAttribute("max")).toBe("100");
    // A custom slider without a background writes no background.
    expect(opacity.element.getAttribute("style")).toBeNull();
    expect(opacity.track.className).toBe("g-input-slider-track custom");
    expect(opacity.thumb.className).toBe("g-input-slider-thumb custom");
    const small = make({ min: 60, max: 90 });
    expect(small.element.className).toBe("g-input-slider generic");
    expect(small.element.getAttribute("value")).toBe("60");
    const hue = make({ min: 0, max: 360, background: "linear-gradient(red, blue)" });
    expect(hue.element.className).toBe("g-input-slider custom");
    expect(hue.element.style.getPropertyValue("background")).toBe("linear-gradient(red, blue)");
  });

  it("returns the value rounded to maxDecimal as formatNumber's string", () => {
    const { slider } = make({ min: 0, max: 10, step: 0.25 });
    slider.value(3.14159);
    expect(slider.value()).toBe("3.14");
    const whole = make({ min: 0, max: 100 }).slider;
    whole.value(41.6);
    expect(whole.value()).toBe("42");
    // value(undefined) is a getter, as before.
    expect(whole.value(undefined)).toBe("42");
  });

  it("clamps the value and moves the thumb to its percentage", () => {
    const { slider, thumb, element } = make({ min: 10, max: 200 });
    slider.value(500);
    expect(element.getAttribute("value")).toBe("200");
    expect(thumb.style.getPropertyValue("left")).toBe("100%");
    slider.value(105);
    expect(thumb.style.getPropertyValue("left")).toBe("50%");
    slider.value(-4);
    expect(element.getAttribute("value")).toBe("10");
  });

  it("redraws the filled part of a generic slider", () => {
    const { slider, track } = make({ min: 0, max: 100 });
    slider.value(30);
    slider.value(70);
    const backgrounds = track.querySelectorAll(".g-input-slider-background");
    expect(backgrounds.length).toBe(1);
    expect((backgrounds[0] as FakeElement).style.getPropertyValue("width")).toBe("70%");
    const custom = make({ ...OPACITY_DEFAULT });
    custom.slider.value(70);
    expect(custom.track.querySelectorAll(".g-input-slider-background").length).toBe(0);
  });

  it("toggles the disabled attribute like jQuery's attr", () => {
    const { slider, element } = make({ min: 0, max: 100 });
    slider.disabled(true);
    expect(element.getAttribute("disabled")).toBe("disabled");
    expect(slider.disabled()).toBe("disabled");
    slider.disabled(false);
    expect(element.hasAttribute("disabled")).toBe(false);
  });

  it("fires input while dragging and change on mouse up, reading the pointer", () => {
    const { element, track, thumb } = make({ min: 0, max: 100 });
    element.rect = { left: 100, top: 0, width: 210, height: 10 };
    track.rect = { left: 100, top: 0, width: 200, height: 10 };
    const inputs: string[] = [];
    let changes = 0;
    element.addEventListener("input", () => inputs.push(element.getAttribute("value") as string));
    element.addEventListener("change", () => changes++);
    // A trusted press on the track: the track and the slider both take it.
    fire(track, "mousedown", { button: 0, isTrusted: true, clientX: 155 });
    // x = 155 - 100 - 10 / 2 = 50 px of 200: 25%.
    expect(inputs).toEqual(["25", "25"]);
    expect(thumb.style.getPropertyValue("left")).toBe("25%");
    fire(window, "mousemove", { isTrusted: true, clientX: 205 });
    expect(inputs[inputs.length - 1]).toBe("50");
    fire(window, "mouseup", { clientX: 205, cancelable: true });
    expect(changes).toBe(1);
    // Not dragging any more: moves don't change it.
    fire(window, "mousemove", { isTrusted: true, clientX: 300 });
    expect(element.getAttribute("value")).toBe("50");
  });

  it("ignores presses while disabled", () => {
    const { element, track, slider } = make({ min: 0, max: 100 });
    track.rect = { left: 0, top: 0, width: 100, height: 10 };
    slider.disabled(true);
    let inputs = 0;
    element.addEventListener("input", () => inputs++);
    fire(track, "mousedown", { button: 0, isTrusted: true, clientX: 60 });
    expect(inputs).toBe(0);
    expect(element.getAttribute("value")).toBe("50");
  });
});

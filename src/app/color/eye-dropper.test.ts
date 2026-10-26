import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventTarget } from "../../engine/core/event-target.ts";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { ToolChangedEvent } from "../../editor/tools/tool-manager.ts";
import type { Designer } from "../shell/designer.ts";
import { resetGlobals, setDesigner } from "../shell/globals.ts";
import { EyeDropper } from "./eye-dropper.ts";
import { FakeElement, fire, installFakeDom } from "./fake-dom.testing.ts";
import { onPatternEvent } from "./pattern-target.ts";

let body: FakeElement;
let inside = true;
const toolManager = new EventTarget();

/** The canvas pixel under the mouse: always this color. */
const PIXEL = [12, 200, 255, 255];

beforeEach(() => {
  body = installFakeDom().body;
  inside = true;
  const context = {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    scale: vi.fn(),
    fillText: vi.fn(),
    getImageData: () => ({ data: Uint8ClampedArray.from(PIXEL) }),
  };
  vi.spyOn(FakeElement.prototype, "getContext").mockReturnValue(context as never);
  vi.stubGlobal("CanvasRenderingContext2D", { prototype: { imageSmoothingEnabled: true } });
  const source = document.createElement("canvas");
  const activeWindow = {
    viewContainsMouse: () => inside,
    getView: () => ({
      getSceneCanvas: () => ({ getBitmap: () => ({ getHTMLElement: () => source }) }),
    }),
  };
  setDesigner({
    getWindows: () => ({ getActiveWindow: () => activeWindow }),
    getToolManager: () => toolManager,
    isTouchEnabled: () => false,
    stats: () => undefined,
  } as unknown as Designer);
});

afterEach(() => {
  resetGlobals();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function dropper() {
  const element = document.createElement("div") as unknown as FakeElement;
  body.appendChild(element);
  return { element, dropper: new EyeDropper(element as unknown as HTMLElement) };
}

const picker = () =>
  document.querySelector(".g-eye-dropper-picker") as unknown as FakeElement | null;

describe("EyeDropper (UI-COLOR-029)", () => {
  it("is a button with the picker icon and tooltip", () => {
    const { element } = dropper();
    expect(element.className).toBe("g-button");
    expect(element.getAttribute("data-title")).toBe("Pick a color from anywhere on the canvas");
    expect((element.children[0] as FakeElement).className).toBe("gravit-icon-picker");
  });

  it("shows the loupe at the click and the pixel under the mouse", () => {
    const { element } = dropper();
    fire(element, "click", { pageX: 400, pageY: 300 });
    expect(element.classList.contains("g-active")).toBe(true);
    const loupe = picker() as FakeElement;
    expect(loupe.className).toBe("g-eye-dropper-picker g-cursor-pixel");
    expect(loupe.parentElement).toBe(body);
    const label = loupe.querySelector(".g-eye-dropper-preview-color") as FakeElement;
    expect(label.textContent).toBe("R:12 G:200 B:255 #0CC8FF");
    expect(label.style.getPropertyValue("top")).toBe("305px");
    expect(label.style.getPropertyValue("left")).toBe("345px");
    const preview = loupe.querySelector(".g-eye-dropper-preview") as FakeElement;
    expect(preview.style.getPropertyValue("box-shadow")).toBe("0 0 0 5px rgb(12,200,255)");
  });

  it("picks on the next mouse down and fires colorchange", () => {
    const { element } = dropper();
    const picked: number[][] = [];
    onPatternEvent(element as unknown as Element, "colorchange", (_e, rgba) =>
      picked.push([...rgba]),
    );
    fire(element, "click", { pageX: 400, pageY: 300 });
    fire(document, "mousedown", {});
    expect(picked).toEqual([PIXEL]);
    expect(picker()).toBeNull();
    expect(element.classList.contains("g-active")).toBe(false);
  });

  it("picks nothing outside the view, and Escape ends it", () => {
    const { element } = dropper();
    const picked: unknown[] = [];
    onPatternEvent(element as unknown as Element, "colorchange", (_e, rgba) => picked.push(rgba));
    inside = false;
    fire(element, "click", { pageX: 10, pageY: 10 });
    const pointer = (picker() as FakeElement).querySelector(
      ".g-eye-dropper-color-pointer",
    ) as FakeElement;
    expect(pointer.getAttribute("style")).toBe("display: none !important");
    fire(document, "keydown", { keyCode: 27 });
    expect(picker()).toBeNull();
    fire(document, "mousedown", {});
    expect(picked).toEqual([]);
  });

  it("remembers the field's paint for the loupe's current preview", () => {
    const { element, dropper: d } = dropper();
    d.setValue(new RGBColor([255, 0, 0]));
    fire(element, "click", { pageX: 400, pageY: 300 });
    const current = (picker() as FakeElement).querySelector(
      ".color-preview.current",
    ) as FakeElement;
    expect(current.style.getPropertyValue("background")).toContain(
      "linear-gradient(#FF0000, #FF0000)",
    );
  });

  it("ends picking without a color on a tool change (BUG-156)", () => {
    const { element, dropper: d } = dropper();
    const picked: unknown[] = [];
    onPatternEvent(element as unknown as Element, "colorchange", (_e, rgba) => picked.push(rgba));
    fire(element, "click", { pageX: 400, pageY: 300 });
    toolManager.trigger(new ToolChangedEvent(null, null));
    expect(picker()).toBeNull();
    expect(d.isActive()).toBe(false);
    expect(element.classList.contains("g-active")).toBe(false);
    // The next mouse down anywhere picks nothing.
    fire(document, "mousedown", {});
    expect(picked).toEqual([]);
    // And the next start listens for a tool change again.
    fire(element, "click", { pageX: 400, pageY: 300 });
    expect(d.isActive()).toBe(true);
    toolManager.trigger(new ToolChangedEvent(null, null));
    expect(d.isActive()).toBe(false);
  });

  it("does nothing inside a disabled field", () => {
    const disabled = document.createElement("div") as unknown as FakeElement;
    disabled.className = "g-disabled";
    body.appendChild(disabled);
    const element = document.createElement("div") as unknown as FakeElement;
    disabled.appendChild(element);
    const d = new EyeDropper(element as unknown as HTMLElement);
    fire(element, "click", { pageX: 1, pageY: 1 });
    expect(d.isActive()).toBe(false);
  });
});

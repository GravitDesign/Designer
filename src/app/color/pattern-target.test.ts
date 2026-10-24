import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CMYKColor } from "../../engine/color/cmyk-color.ts";
import { Color } from "../../engine/color/color.ts";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { LinearGradient } from "../../engine/style/linear-gradient.ts";
import { Pattern } from "../../engine/style/pattern.ts";
import { resetGlobals, setDragImageElement } from "../shell/globals.ts";
import { fire, installFakeDom, type FakeElement } from "./fake-dom.testing.ts";
import { onPatternEvent, PatternTarget } from "./pattern-target.ts";

let body: FakeElement;

beforeEach(() => {
  body = installFakeDom().body;
  const image = document.createElement("div") as unknown as FakeElement;
  body.appendChild(image);
  setDragImageElement(image as unknown as HTMLDivElement);
});

afterEach(() => {
  resetGlobals();
  vi.unstubAllGlobals();
});

class Transfer {
  data = new Map<string, string>();
  effectAllowed = "";
  dropEffect = "";
  image: unknown = null;
  sourceElement?: unknown;
  setData(type: string, value: string) {
    this.data.set(type, value);
  }
  getData(type: string) {
    return this.data.get(type) ?? "";
  }
  setDragImage(image: unknown) {
    this.image = image;
  }
}

function target(options?: ConstructorParameters<typeof PatternTarget>[1]) {
  const element = document.createElement("span") as unknown as FakeElement;
  body.appendChild(element);
  return { element, target: new PatternTarget(element as unknown as HTMLElement, options) };
}

describe("PatternTarget (EDT-DND-011, UI-COLOR-026)", () => {
  it("holds a pattern, deserializing strings", () => {
    const { target: t } = target();
    expect(t.value()).toBeNull();
    t.value("C#[255,0,0]");
    expect(t.value()).toBeInstanceOf(RGBColor);
    expect(Pattern.serialize(t.value())).toBe("C#[255,0,0]");
    t.value(undefined);
    expect(t.value()).toBeNull();
  });

  it("starts a drag of the held pattern as its MIME type, and none without one", () => {
    const { element, target: t } = target();
    expect(element.getAttribute("draggable")).toBe("true");
    expect(element.getAttribute("data-drag-mode")).toBe("1");
    const empty = fire(element, "dragstart", { dataTransfer: new Transfer() });
    expect(empty.defaultPrevented).toBe(true);
    t.value(new RGBColor([0, 128, 255]));
    const dragged: unknown[] = [];
    onPatternEvent(element as unknown as Element, "patterndrag", (_e, p) => dragged.push(p));
    const transfer = new Transfer();
    fire(element, "dragstart", { dataTransfer: transfer });
    expect(transfer.getData(Pattern.MIME_TYPE)).toBe("C#[0,128,255]");
    expect(transfer.effectAllowed).toBe("move");
    expect(transfer.sourceElement).toBe(element);
    expect(dragged).toEqual([t.value()]);
    const image = transfer.image as FakeElement;
    expect(image.style.getPropertyValue("width")).toBe("20px");
    expect(image.style.getPropertyValue("background")).toContain(
      "linear-gradient(#0080FF, #0080FF)",
    );
  });

  it("takes drops of accepted types and reports change only when the pattern differs", () => {
    const { element, target: t } = target();
    t.types([Color]);
    const changes: unknown[] = [];
    const drops: unknown[] = [];
    onPatternEvent(element as unknown as Element, "patternchange", (_e, p) => changes.push(p));
    onPatternEvent(element as unknown as Element, "patterndrop", (_e, p) => drops.push(p));
    const drop = (blob: string) => {
      const transfer = new Transfer();
      transfer.setData(Pattern.MIME_TYPE, blob);
      return fire(element, "drop", { dataTransfer: transfer });
    };
    // A gradient isn't a Color: refused.
    drop(Pattern.serialize(new LinearGradient()) as string);
    expect(drops.length).toBe(0);
    const event = drop("C#[1,2,3]");
    expect(event.defaultPrevented).toBe(true);
    expect(changes.length).toBe(1);
    expect(drops.length).toBe(1);
    expect(Pattern.serialize(t.value())).toBe("C#[1,2,3]");
    // The same pattern again: dropped, but no change.
    drop("C#[1,2,3]");
    expect(changes.length).toBe(1);
    expect(drops.length).toBe(2);
    drop(Pattern.serialize(new CMYKColor([0, 1, 0, 0])) as string);
    expect(changes.length).toBe(2);
  });

  it("accepts every pattern without types, and nothing with allowDrop false", () => {
    const open = target();
    const transfer = new Transfer();
    transfer.setData(Pattern.MIME_TYPE, Pattern.serialize(new LinearGradient()) as string);
    fire(open.element, "drop", { dataTransfer: transfer });
    expect(open.target.value()).toBeInstanceOf(LinearGradient);
    const closed = target({ allowDrop: false, allowDrag: false });
    expect(closed.element.getAttribute("draggable")).toBeNull();
    fire(closed.element, "drop", { dataTransfer: transfer });
    expect(closed.target.value()).toBeNull();
  });
});

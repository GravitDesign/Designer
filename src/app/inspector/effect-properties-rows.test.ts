import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Platform } from "../../engine/core/platform.ts";
import { GMath } from "../../engine/math/math.ts";
import type { ContainerApi } from "../../engine/scene/node-container.ts";
import { Page } from "../../engine/scene/page.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Scene } from "../../engine/scene/scene.ts";
import type { Effect } from "../../engine/style/effect.ts";
import { BlurEffect } from "../../engine/style/effects/blur-effect.ts";
import { DropShadowEffect } from "../../engine/style/effects/drop-shadow-effect.ts";
import { OverlayEffect } from "../../engine/style/effects/overlay-effect.ts";
import { GLColorAdjustEffect } from "../../engine/style/webgl/effects/gl-color-adjust-effect.ts";
import { GLOuterGlowEffect } from "../../engine/style/webgl/effects/gl-outer-glow-effect.ts";
import { GLRecolourEffect } from "../../engine/style/webgl/effects/gl-recolour-effect.ts";
import { WebGLEffect } from "../../engine/style/webgl/webgl-effect.ts";
import { EditorWorkspace } from "../../editor/editor-workspace.ts";
import { Editor, ModifiedEvent } from "../../editor/editor.ts";
import { fire, FakeEvent, type FakeElement } from "../menus/testing/fake-dom.testing.ts";
import { setDragImageElement } from "../shell/globals.ts";
import { clickedPreviews, setSliderValue, sliderValue } from "./color-deps.testing.ts";
import { EffectProperties } from "./effect-properties.ts";
import { str } from "./paint-dom.ts";
import {
  descendants,
  documentOf,
  dropOn,
  installPaintTestDom,
  startDrag,
  type PaintTestDom,
} from "./paint-dom.testing.ts";

// The real paint field builds the chooser popup, which needs a browser DOM.
vi.mock("./color-deps.ts", () => import("./color-deps.testing.ts"));

let t: PaintTestDom;
let touch: boolean;
/** The callback the last row hover handed to setMouseOverContext. */
let copyCallback: ((event?: unknown) => void) | null;
let titles: (string | null | undefined)[];

function install(): void {
  t = installPaintTestDom({
    isTouchEnabled: () => touch,
    setMouseOverContext: (_context: unknown, _event: unknown, callback: unknown) => {
      copyCallback = (callback as typeof copyCallback) ?? null;
    },
  });
  setDragImageElement(t.dom.document.createElement("div") as unknown as HTMLDivElement);
}

beforeEach(() => {
  touch = false;
  copyCallback = null;
  install();
  titles = [];
  vi.spyOn(Editor, "tryRunTransaction").mockImplementation((_node, fn, name) => {
    fn();
    titles.push(name);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  Platform.modifiers.shiftKey = false;
  clickedPreviews.length = 0;
  setDragImageElement(null);
  t.uninstall();
});

const KEY = "GEffectProperties";

function rectWith(...effects: Effect[]): { scene: Scene; rect: Rectangle } {
  const scene = new Scene(new EditorWorkspace());
  const page = new Page();
  scene.appendChild(page);
  const rect = new Rectangle();
  (page as unknown as ContainerApi).appendChild(rect);
  for (const effect of effects) rect.getEffects()?.appendChild(effect);
  return { scene, rect };
}

/** A second element in the same scene, with its own effects. */
function besides(scene: Scene, ...effects: Effect[]): Rectangle {
  const rect = new Rectangle();
  (scene.getFirstChild() as unknown as ContainerApi).appendChild(rect);
  for (const effect of effects) rect.getEffects()?.appendChild(effect);
  return rect;
}

function shadow(x: number): DropShadowEffect {
  const effect = new DropShadowEffect();
  effect.setProperty("x", x);
  return effect;
}

function initPanel(): { properties: EffectProperties; panel: FakeElement } {
  const panel = t.dom.document.createElement("div");
  const toolbar = t.dom.document.createElement("div");
  const properties = new EffectProperties();
  properties.init(panel as unknown as HTMLElement, toolbar as unknown as HTMLElement);
  return { properties, panel };
}

const rows = (panel: FakeElement) =>
  descendants(panel).filter((e) => e.classList.contains("effect-block"));
const headerOf = (row: FakeElement) =>
  row.children.find((c) => c.classList.contains("effect-header")) as FakeElement;
const xs = (rect: Rectangle) => {
  const out: unknown[] = [];
  for (let e = rect.getEffects()?.getFirstChild() ?? null; e; e = e.getNext())
    out.push((e as Effect).getProperty("x"));
  return out;
};
const byProperty = (root: FakeElement, property: string) =>
  descendants(root).filter((e) => e.getAttribute("data-property") === property);
const change = (element: FakeElement, value: string) => {
  (element as unknown as HTMLInputElement).value = value;
  fire(element, "change");
};

describe("EffectProperties row drag", () => {
  it("moves a row onto another and duplicates it with Shift; a drop keeps the effect", () => {
    const { properties, panel } = initPanel();
    const { scene, rect } = rectWith(shadow(1), shadow(2), shadow(3));
    properties.update(documentOf(scene, t.commits), [rect]);
    // Newest on top: 3, 2, 1. Drag 1 onto 3.
    let [top, , bottom] = rows(panel) as [FakeElement, FakeElement, FakeElement];
    expect(startDrag(bottom, headerOf(bottom)).defaultPrevented).toBe(false);
    dropOn(top);
    fire(bottom, "dragend");
    expect(xs(rect)).toEqual([2, 3, 1]);
    expect(titles).toEqual([str(KEY, "action.move")]);
    Platform.modifiers.shiftKey = true;
    [top, , bottom] = rows(panel) as [FakeElement, FakeElement, FakeElement];
    startDrag(bottom, headerOf(bottom)); // 2
    dropOn(top); // 1, the last one
    fire(bottom, "dragend");
    expect(xs(rect)).toEqual([2, 3, 1, 2]);
    expect(titles).toEqual([str(KEY, "action.move"), str(KEY, "action.duplicate")]);
  });

  it("moves a row down in front of the target", () => {
    const { properties, panel } = initPanel();
    // Blurs, as the effect list keeps shadows (pre effects) in front of others.
    const blur = (r: number) => {
      const effect = new BlurEffect();
      effect.setProperty("r", r);
      return effect;
    };
    const { scene, rect } = rectWith(blur(1), blur(2), blur(3));
    properties.update(documentOf(scene, t.commits), [rect]);
    const [top, middle] = rows(panel) as [FakeElement, FakeElement, FakeElement];
    startDrag(top, headerOf(top)); // 3
    dropOn(middle); // 2
    const radii: unknown[] = [];
    for (let e = rect.getEffects()?.getFirstChild() ?? null; e; e = e.getNext())
      radii.push((e as Effect).getProperty("r"));
    expect(radii).toEqual([1, 3, 2]);
  });

  it("allows a drop on the dragged row itself only with Shift", () => {
    const { properties, panel } = initPanel();
    const { scene, rect } = rectWith(shadow(1), shadow(2));
    properties.update(documentOf(scene, t.commits), [rect]);
    const row = rows(panel)[0] as FakeElement;
    startDrag(row, headerOf(row));
    const overlay = () =>
      row.children.find((c) => c.classList.contains("grid-drag-overlay")) as FakeElement;
    const over = () => {
      const event = new FakeEvent("dragover");
      (event as unknown as { dataTransfer: object }).dataTransfer = {};
      overlay().dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(over()).toBe(false);
    Platform.modifiers.shiftKey = true;
    expect(over()).toBe(true);
  });

  it("starts a drag only from the header, and in touch mode only from a press in it", () => {
    const { properties, panel } = initPanel();
    const { scene, rect } = rectWith(shadow(1), shadow(2));
    properties.update(documentOf(scene, t.commits), [rect]);
    const [first, second] = rows(panel) as [FakeElement, FakeElement];
    const settingsField = byProperty(first, "x")[0] as FakeElement;
    expect(startDrag(first, settingsField).defaultPrevented).toBe(true);
    expect(first.classList.contains("g-draggable-disabled")).toBe(true);
    // The press allows dragging for every row (shared state); the touch
    // layout also wants this row's own press to be in its header.
    fire(headerOf(first), "mousedown");
    const start = () => {
      const event = new FakeEvent("dragstart");
      (event as unknown as { dataTransfer: object }).dataTransfer = { setData() {} };
      second.dispatchEvent(event);
      return event.defaultPrevented;
    };
    touch = true;
    expect(start()).toBe(true);
    touch = false;
    expect(start()).toBe(false);
  });

  it("removes a row's effect from every element when the drag ends without a drop", () => {
    const { properties, panel } = initPanel();
    const { scene, rect } = rectWith(shadow(1), shadow(2));
    const other = besides(scene, shadow(1), shadow(2));
    properties.update(documentOf(scene, t.commits), [rect, other]);
    const row = rows(panel)[0] as FakeElement; // shadow 2
    startDrag(row, headerOf(row));
    fire(row, "dragend");
    expect(xs(rect)).toEqual([1]);
    expect(xs(other)).toEqual([1]);
    expect(titles).toEqual([str(KEY, "action.remove")]);
  });
});

describe("EffectProperties forms", () => {
  it("commits a typed value with no undo data, and the chooser change with its stop", () => {
    const { properties, panel } = initPanel();
    const own = shadow(1);
    const { scene, rect } = rectWith(new DropShadowEffect(), own);
    const equal = shadow(1);
    const other = besides(scene, new DropShadowEffect(), equal);
    properties.update(documentOf(scene, t.commits), [rect, other]);
    const row = rows(panel)[0] as FakeElement;
    change(byProperty(row, "x")[0] as FakeElement, "12");
    expect(own.getProperty("x")).toBe(12);
    expect(equal.getProperty("x")).toBe(12);
    expect(t.commits).toEqual([{ name: str(KEY, "action.change-properties"), data: null }]);
    const color = byProperty(row, "pat")[0] as FakeElement;
    const red = new RGBColor([255, 0, 0]);
    color.dispatchEvent(
      new CustomEvent("patternchange", { detail: [red, 0.5, false, true, 3] }) as never,
    );
    expect(own.getProperty("pat")).toBe(red);
    expect(equal.getProperty("opc")).toBe(0.5);
    expect(t.commits[1]?.data).toEqual({ effectIndex: 1, chooserOn: true, activeStopIdx: 3 });
    // The opacity box shows the chooser's opacity.
    expect((byProperty(row, "opc")[0] as unknown as HTMLInputElement).value).toBe("50%");
  });

  it("writes temporary changes to every equal effect without a transaction", () => {
    const { properties, panel } = initPanel();
    const own = shadow(1);
    const { scene, rect } = rectWith(own);
    const equal = shadow(1);
    const other = besides(scene, equal);
    properties.update(documentOf(scene, t.commits), [rect, other]);
    const color = byProperty(rows(panel)[0] as FakeElement, "pat")[0] as FakeElement;
    color.dispatchEvent(
      new CustomEvent("patternchange", { detail: [undefined, 0.3, true] }) as never,
    );
    for (const effect of [own, equal]) {
      expect(effect.getProperty("opc", false, false, true)).toBe(0.3);
      expect(effect.getProperty("opc")).not.toBe(0.3);
    }
    expect(t.commits).toEqual([]);
  });

  it("ignores the sidebar's updates during its own transaction", () => {
    const { properties, panel } = initPanel();
    const { scene, rect } = rectWith(shadow(1));
    const doc = documentOf(scene, t.commits);
    properties.update(doc, [rect]);
    const row = rows(panel)[0];
    const editor = doc.getEditor() as unknown as { commitTransaction: (...a: unknown[]) => void };
    const commit = editor.commitTransaction;
    const during: boolean[] = [];
    editor.commitTransaction = (...args) => {
      during.push(properties.update(doc, [rect]));
      commit(...args);
    };
    change(byProperty(row as FakeElement, "x")[0] as FakeElement, "5");
    expect(during).toEqual([true]);
    expect(rows(panel)[0]).toBe(row);
    expect(properties._ownChange).toBe(false);
  });

  it("re-opens the chooser of the undone effect at its stop", () => {
    const { properties, panel } = initPanel();
    const { scene, rect } = rectWith(shadow(1), shadow(2));
    const doc = documentOf(scene, t.commits);
    const undo = { evtType: ModifiedEvent.Type.Undo, chooserOn: true, effectIndex: 0 };
    properties.update(doc, [rect], { ...undo, activeStopIdx: 2 });
    const bottom = rows(panel)[1] as FakeElement; // effect 0
    const preview = descendants(bottom).find((e) => e.classList.contains("preview"));
    expect(clickedPreviews).toEqual([[preview, 2]]);
    clickedPreviews.length = 0;
    properties.update(doc, [rect], { ...undo, evtType: ModifiedEvent.Type.Redo });
    expect(clickedPreviews.map(([, stop]) => stop)).toEqual([null]);
    clickedPreviews.length = 0;
    properties.update(doc, [rect], { ...undo, evtType: ModifiedEvent.Type.Raw });
    properties.update(doc, [rect], { ...undo, chooserOn: false });
    expect(clickedPreviews).toEqual([]);
  });

  it("maps the color adjust boxes and sliders between percent or degrees and -1..1", () => {
    const { properties, panel } = initPanel();
    const effect = new GLColorAdjustEffect();
    const { scene, rect } = rectWith(effect);
    properties.update(documentOf(scene, t.commits), [rect]);
    const row = rows(panel)[0] as FakeElement;
    const box = (name: string) =>
      byProperty(row, name).find((e) => e.tagName === "INPUT") as FakeElement;
    const slider = (name: string) =>
      byProperty(row, name).find((e) => e.classList.contains("g-input-slider")) as FakeElement;
    const before = effect.getProperty("shp");
    // Degrees -180..180 for the hue.
    change(box("hue"), "90");
    expect(effect.getProperty("shp")).toEqual({
      brightness: 0,
      contrast: 0,
      hue: 0.5,
      saturation: 0,
    });
    expect(sliderValue(slider("hue") as unknown as Element)).toBe(90);
    // A copy, not the old object.
    expect(effect.getProperty("shp")).not.toBe(before);
    expect(t.commits).toHaveLength(1);
    // Percent -100..100 for the others; the slider also sets the box.
    setSliderValue(slider("saturation") as unknown as Element, 50);
    fire(slider("saturation"), "input");
    expect((effect.getProperty("shp") as { saturation: number }).saturation).toBe(0.5);
    expect((box("saturation") as unknown as HTMLInputElement).value).toBe("50%");
    expect(t.commits).toHaveLength(2);
    // Shown values: hue in degrees, the others in percent.
    effect.setProperty("shp", { brightness: -0.5, contrast: 0, hue: -0.25, saturation: 0 });
    properties.update(documentOf(scene, t.commits), [rect]);
    const shown = rows(panel)[0] as FakeElement;
    const value = (name: string) =>
      (byProperty(shown, name).find((e) => e.tagName === "INPUT") as unknown as HTMLInputElement)
        .value;
    expect([value("brightness"), value("hue")]).toEqual(["-50", String(-45)]);
  });

  it("recolours the recolour effect's saturation slider when its hue changes", () => {
    const { properties, panel } = initPanel();
    const effect = new GLRecolourEffect();
    const { scene, rect } = rectWith(effect);
    properties.update(documentOf(scene, t.commits), [rect]);
    const row = rows(panel)[0] as FakeElement;
    const saturation = byProperty(row, "saturation").find((e) =>
      e.classList.contains("g-input-slider"),
    ) as FakeElement;
    const kept = sliderValue(saturation as unknown as Element);
    const inputs: number[] = [];
    saturation.addEventListener("input", () => inputs.push(1));
    const hue = byProperty(row, "hue").find((e) =>
      e.classList.contains("g-input-slider"),
    ) as FakeElement;
    // 0..360 degrees for the recolour hue.
    setSliderValue(hue as unknown as Element, 90);
    fire(hue, "input");
    expect((effect.getProperty("shp") as { hue: number }).hue).toBe(
      GMath.normalizeValue(90, 0, 360, 0, 1),
    );
    // Once from the hue slider, once more from the hue box it updates.
    expect(inputs).toEqual([1, 1]);
    expect(sliderValue(saturation as unknown as Element)).toBe(kept);
  });

  it("transforms a slider value with the effect's transform, to three decimals", () => {
    const { properties, panel } = initPanel();
    const effect = new GLOuterGlowEffect();
    const { scene, rect } = rectWith(effect);
    properties.update(documentOf(scene, t.commits), [rect]);
    const row = rows(panel)[0] as FakeElement;
    const radius = byProperty(row, "radius").find((e) =>
      e.classList.contains("g-input-slider"),
    ) as FakeElement;
    expect(sliderValue(radius as unknown as Element)).toBe(
      Number(effect.propertyInverseTransform("radius", 5).toFixed(3)),
    );
    setSliderValue(radius as unknown as Element, 20);
    fire(radius, "input");
    const expected = Number(
      WebGLEffect.polynomialTransform(20, 2, GLOuterGlowEffect.RANGES.radius as never).toFixed(3),
    );
    expect((effect.getProperty("shp", false, false, true) as { radius: number }).radius).toBe(
      expected,
    );
    // The box the slider updates commits the value at once (see "WebGL
    // effect sliders commit on every move" in QUESTIONS.md).
    expect((effect.getProperty("shp") as { radius: number }).radius).toBe(expected);
    expect(t.commits).toEqual([{ name: str(KEY, "action.change-properties"), data: null }]);
    // The color row writes color and opacity into a copy of shp.
    const color = descendants(row).find((e) => e.classList.contains("g-pattern-chooser"));
    color?.dispatchEvent(
      new CustomEvent("patternchange", {
        detail: [new RGBColor([1, 2, 3]), 0.5, false, true],
      }) as never,
    );
    const shp = effect.getProperty("shp") as { color: unknown; opacity: { value: number } };
    expect(shp.color).toEqual([1, 2, 3]);
    expect(shp.opacity).toEqual({ type: "opacity", value: 0.5 });
    expect(t.commits.at(-1)?.data).toEqual({ effectIndex: 0, chooserOn: true });
  });

  it("keeps the overlay chooser open while the style editor holds it", () => {
    const { properties, panel } = initPanel();
    const { scene, rect } = rectWith(new OverlayEffect());
    properties.update(documentOf(scene, t.commits), [rect]);
    const color = byProperty(rows(panel)[0] as FakeElement, "pat")[0] as FakeElement;
    const updated = vi.spyOn(t.styleEdManager, "updateEditor").mockImplementation(() => {});
    const deactivated = vi.spyOn(t.styleEdManager, "deactivateEditor");
    let locked = true;
    vi.spyOn(t.styleEdManager, "getOverlayLock").mockImplementation(() => locked);
    color.dispatchEvent(new CustomEvent("chooseropen") as never);
    expect(updated).toHaveBeenCalledTimes(1);
    expect(properties._styleEdOn).toBe(true);
    expect(properties._chooserElem).toBe(color);
    const prevented: number[] = [];
    const close = () =>
      color.dispatchEvent(
        new CustomEvent("chooserclose", { detail: [() => prevented.push(1), {}] }) as never,
      );
    close();
    expect(prevented).toEqual([1]);
    expect(properties._styleEdOn).toBe(true);
    expect(deactivated).not.toHaveBeenCalled();
    locked = false;
    close();
    expect(prevented).toEqual([1]);
    expect(properties._styleEdOn).toBe(false);
    expect(deactivated).toHaveBeenCalledTimes(1);
    expect(properties._chooserElem).toBeNull();
  });
});

describe("EffectProperties copy hint", () => {
  it("fades the hint out over the hovered row and leaves it in the panel", () => {
    vi.useFakeTimers();
    const { properties, panel } = initPanel();
    const { scene, rect } = rectWith(shadow(1));
    properties.update(documentOf(scene, t.commits), [rect]);
    const row = rows(panel)[0] as FakeElement;
    const enter = fire(row, "mouseenter");
    expect(copyCallback).not.toBeNull();
    (copyCallback as (event: unknown) => void)(enter);
    const hints = () => panel.children.filter((c) => c.classList.contains("copy-info-overlay"));
    expect(hints()).toHaveLength(1);
    const hint = hints()[0] as FakeElement;
    expect(hint.textContent).toBe(str(KEY, "text.copy-effect"));
    vi.advanceTimersByTime(1000 + 600);
    expect(hints()).toEqual([hint]);
    expect(hint.style.getPropertyValue("opacity")).toBe("0");
    expect(hint.style.getPropertyValue("top")).toBe("20px");
    // The next copy replaces it.
    (copyCallback as (event: unknown) => void)(enter);
    expect(hints()).toHaveLength(1);
    expect(hints()[0]).not.toBe(hint);
  });

  it("throws for an event outside an effect row, as the old empty position() did", () => {
    const { properties, panel } = initPanel();
    const { scene, rect } = rectWith(shadow(1));
    properties.update(documentOf(scene, t.commits), [rect]);
    fire(rows(panel)[0], "mouseenter");
    expect(() => (copyCallback as (event: unknown) => void)({ target: panel })).toThrow(TypeError);
    // Without an event the hint goes to the top.
    (copyCallback as (event?: unknown) => void)();
    const hint = panel.children.find((c) => c.classList.contains("copy-info-overlay"));
    expect(hint?.style.getPropertyValue("top")).toBe("0px");
  });
});

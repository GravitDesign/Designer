import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Transform } from "../../engine/math/transform.ts";
import { Image } from "../../engine/scene/image.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { FakeEvent, type FakeElement } from "../menus/testing/fake-dom.testing.ts";
import type { Overlay } from "../dialogs/dialog-container.ts";
import { SettingChangedEvent } from "../shell/setting-changed-event.ts";
import type { InspectedElements } from "./properties.ts";
import { RectangleProperties } from "./rectangle-properties.ts";
import {
  change,
  check,
  click,
  documentOf,
  find,
  installShapeTestDom,
  sceneWith,
  type ShapeTestDom,
} from "./shape-panels-dom.testing.ts";

let env: ShapeTestDom;
beforeEach(() => {
  env = installShapeTestDom();
});
afterEach(() => env.uninstall());

const MODIFY = "commit Modify Rectangle Properties";
const CORNERS = "commit Change corners";

/** A 200 x 100 rectangle (shorter side 100). */
function rectangle(): Rectangle {
  const rect = new Rectangle();
  rect.setProperty("trf", new Transform(100, 0, 0, 50, 0, 0));
  return rect;
}

interface Shown {
  properties: RectangleProperties;
  panel: FakeElement;
  advanced: FakeElement;
  log: string[];
}

function shown(...rects: Rectangle[]): Shown {
  const log: string[] = [];
  const document = documentOf(sceneWith(...rects), log);
  const panel = env.dom.document.createElement("div");
  env.dom.document.body.appendChild(panel);
  const properties = new RectangleProperties();
  properties.init(panel as unknown as HTMLElement);
  expect(properties.update(document, rects as unknown as InspectedElements)).toBe(true);
  const advanced = properties._advancedPanel as unknown as FakeElement;
  return { properties, panel, advanced, log };
}

function slide(slider: FakeElement, value: number, type: "input" | "change"): void {
  slider.setAttribute("value", String(value));
  slider.dispatchEvent(new FakeEvent(type));
}

describe("RectangleProperties fields", () => {
  it("toggles uniform corners and shows the per-corner fields only without them", () => {
    const rect = rectangle();
    const { advanced, log } = shown(rect);
    const uniform = find(advanced, 'input[data-property="uf"]');
    const corners = find(advanced, ".corners-panel");
    expect((uniform as unknown as { checked: boolean }).checked).toBe(true);
    expect(corners.style.display).toBe("none");
    check(uniform, false);
    expect(rect.getProperty("uf")).toBe(false);
    expect(corners.style.display).toBe("");
    expect(log).toEqual(["begin", MODIFY]);
    expect(env.stats).toContainEqual(["rectangleproperties_toggle_uniform", "disabled"]);
    check(uniform, true);
    expect(rect.getProperty("uf")).toBe(true);
    expect(corners.style.display).toBe("none");
  });

  it("writes autoscale corners, which images can't change", () => {
    const rect = rectangle();
    const { advanced, log } = shown(rect);
    const scale = find(advanced, 'input[data-property="csc"]');
    expect((scale as unknown as { disabled: boolean }).disabled).toBe(false);
    check(scale, false);
    expect(rect.getProperty("csc")).toBe(false);
    expect(log).toEqual(["begin", MODIFY]);

    const image = shown(new Image()).advanced;
    expect(
      (find(image, 'input[data-property="csc"]') as unknown as { disabled: boolean }).disabled,
    ).toBe(true);
  });

  it("takes a per-corner smoothness of 0 or more and restores the box otherwise", () => {
    const rect = rectangle();
    rect.setProperty("uf", false);
    const { advanced, log } = shown(rect);
    const input = find(advanced, 'input[data-property="tl_sx"]');
    change(input, "5");
    expect(rect.getProperty("tl_sx")).toBe(5);
    expect(input.value).toBe("5");
    expect(log).toEqual(["begin", MODIFY]);
    change(input, "-3");
    expect(rect.getProperty("tl_sx")).toBe(5);
    expect(input.value).toBe("5");
    change(input, "abc");
    expect(input.value).toBe("5");
    expect(log).toEqual(["begin", MODIFY]);
  });

  it("toggles a corner's lock, which disables its vertical smoothness", () => {
    const rect = rectangle();
    rect.setProperty("uf", false);
    const { advanced, log } = shown(rect);
    const lock = find(advanced, 'button[data-property="tl_uf"]');
    const vertical = find(advanced, 'input[data-property="tl_sy"]') as unknown as {
      disabled: boolean;
    };
    expect(lock.classList.contains("g-active")).toBe(true);
    expect(vertical.disabled).toBe(true);
    click(lock);
    expect(rect.getProperty("tl_uf")).toBe(false);
    expect(lock.classList.contains("g-active")).toBe(false);
    expect(vertical.disabled).toBe(false);
    expect(log).toEqual(["begin", MODIFY]);
    click(lock);
    expect(rect.getProperty("tl_uf")).toBe(true);
  });

  it("slides the radius temporarily with the box following, then commits on change", () => {
    const rect = rectangle();
    const { panel, log } = shown(rect);
    const slider = find(panel, '.g-input-slider[data-property="corners-radius"]');
    const box = find(panel, 'input[type="text"][data-property="corners-radius"]');
    slider.dispatchEvent(new FakeEvent("mousedown"));
    expect(log).toEqual(["hide"]);
    env.dom.document.dispatchEvent(new FakeEvent("mouseup"));
    expect(log).toEqual(["hide", "reset-hide"]);
    slide(slider, 50, "input");
    // 50% of half the shorter side, without a transaction.
    expect(rect.getProperty("tl_sx", false, undefined, true)).toBe(25);
    expect(rect.getProperty("tl_sx")).toBe(0);
    expect(box.value).toBe("25");
    expect(log).toEqual(["hide", "reset-hide"]);
    slide(slider, 20, "change");
    expect(rect.getProperty("tl_sx")).toBe(10);
    expect(log).toEqual(["hide", "reset-hide", "begin", CORNERS]);
  });

  it("writes uniform corners and the radius from the radius box", () => {
    const rect = rectangle();
    rect.setProperty("uf", false);
    const { panel, log } = shown(rect);
    const box = find(panel, 'input[type="text"][data-property="corners-radius"]');
    change(box, "7");
    expect([rect.getProperty("uf"), rect.getProperty("tl_sx")]).toEqual([true, 7]);
    expect(log).toEqual(["begin", MODIFY]);
    const slider = find(panel, '.g-input-slider[data-property="corners-radius"]');
    expect(slider.getAttribute("value")).toBe("14");
  });

  it("gives a corner type to rectangles without radius 25% of half the shorter side", () => {
    const rect = rectangle();
    const { advanced, log } = shown(rect);
    click(find(advanced, '[data-property="corners-type"] button[data-corner-type="B"]'));
    expect([rect.getProperty("tl_ct"), rect.getProperty("tl_sx")]).toEqual(["B", 12.5]);
    expect(log).toEqual(["begin", CORNERS]);
  });

  it("disables the fields of a rectangle without geometry", () => {
    const rect = rectangle();
    vi.spyOn(rect, "getGeometryBBox").mockReturnValue(null);
    const { panel, advanced } = shown(rect);
    const slider = find(panel, '.g-input-slider[data-property="corners-radius"]') as unknown as {
      disabled: boolean;
    };
    const box = find(panel, 'input[type="text"][data-property="corners-radius"]') as unknown as {
      disabled: boolean;
    };
    expect([slider.disabled, box.disabled]).toEqual([true, true]);
    expect(find(advanced, '[data-property="corners-type"]').classList.contains("g-disabled")).toBe(
      true,
    );
  });

  it("refreshes the boxes on a decimals_num setting change only", () => {
    const rect = rectangle();
    const { properties, panel } = shown(rect);
    const box = find(panel, 'input[type="text"][data-property="corners-radius"]');
    box.value = "typed";
    properties._settingChanged(new SettingChangedEvent("other", null, null));
    expect(box.value).toBe("typed");
    properties._settingChanged(new SettingChangedEvent("decimals_num", null, 2));
    expect(box.value).toBe("0");
  });

  it("opens the advanced overlay and marks the current corner type", () => {
    const rect = rectangle();
    rect.setProperty("tl_ct", "I");
    const { properties, panel, advanced } = shown(rect);
    // The overlay itself is not under test: opening puts the panel into the page.
    const opened: unknown[] = [];
    const overlay = properties._advancedOverlay as Overlay;
    overlay.open = (target) => {
      opened.push(target);
      env.dom.document.body.appendChild(advanced);
      return overlay;
    };
    const button = find(panel, ".g-advanced-setting");
    expect(
      env.dom.document.querySelectorAll('[data-property="corners-type"] button.g-active'),
    ).toEqual([]);
    click(find(button, "span"));
    expect(opened).toEqual([button]);
    expect(env.stats).toContainEqual(["rectangleproperties_open_advanced"]);
    const active = env.dom.document
      .querySelectorAll('[data-property="corners-type"] button.g-active')
      .map((button) => button.getAttribute("data-corner-type"));
    expect(active).toEqual(["I"]);
  });
});

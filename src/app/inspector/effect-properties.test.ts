import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Node } from "../../engine/scene/node.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import type { Effect } from "../../engine/style/effect.ts";
import { BlurEffect } from "../../engine/style/effects/blur-effect.ts";
import { DropShadowEffect } from "../../engine/style/effects/drop-shadow-effect.ts";
import { MirrorEffect } from "../../engine/style/effects/mirror-effect.ts";
import {
  fake,
  fire,
  installFakeDom,
  type FakeDomHandle,
} from "../menus/testing/fake-dom.testing.ts";
import type { Designer } from "../shell/designer.ts";
import { resetGlobals, setDesigner } from "../shell/globals.ts";
import { colorSliderBackground, ColorStops } from "./color-stops.ts";
import {
  compareCategories,
  effectTable,
  entryOf,
  partAssign,
  type EffectEntry,
} from "./effect-forms.ts";
import { EffectProperties } from "./effect-properties.ts";
import { EffectsButton } from "./effects-button.ts";
import { EffectsPanel, type EffectsPanelItem } from "./effects-panel.ts";

// The real paint field builds the chooser popup, which needs a browser DOM.
vi.mock("./color-deps.ts", () => import("./color-deps.testing.ts"));

// The table is built by the first panel's constructor.
const properties = new EffectProperties();

function names(entries: EffectEntry[]): string[] {
  return entries.map((entry) => entry.i18n);
}

describe("effect table", () => {
  it("lists the most used effects in the old add panel order", () => {
    expect(names(effectTable().filter((entry) => entry.mostUsed && !entry.hidden))).toEqual([
      "GBlurEffect",
      "GGLVignetteEffect",
      "GGLColorAdjustEffect",
      "GGLRecolourEffect",
      "GOverlayEffect",
      "GMirrorEffect",
      "GCurvedShadowEffect",
      "GDropShadowEffect",
      "GInnerShadowEffect",
    ]);
  });

  it("hides the legacy effects from the add panel but keeps their forms", () => {
    expect(names(effectTable().filter((entry) => entry.hidden))).toEqual([
      "GGLBrightnessContrastEffect",
      "GGLHueSaturationEffect",
      "GColorAdjustMultiEffect",
    ]);
  });

  it("finds an effect's entry by instance and by class and rejects others", () => {
    expect(entryOf(new DropShadowEffect()).i18n).toBe("GDropShadowEffect");
    expect(entryOf(BlurEffect).i18n).toBe("GBlurEffect");
    expect(() => entryOf(Rectangle)).toThrow("Invalid effect/class");
  });

  it("maps the localized categories to the English statistics names", () => {
    expect(EffectProperties.EngCat("Most Used")).toBe("MostUsed");
    expect(EffectProperties.EngCat("Distortion")).toBe("Distortion");
    expect(EffectProperties.EngCat("anything else")).toBe("Shadow");
  });

  it("sorts the categories like the old select: Other ends up before Shadow", () => {
    // The categories in the order the table meets them.
    const found = ["Blur", "Artistic", "Adjust", "Other", "Shadow", "Distortion"];
    expect(found.sort(compareCategories("Other"))).toEqual([
      "Adjust",
      "Artistic",
      "Blur",
      "Distortion",
      "Other",
      "Shadow",
    ]);
  });
});

describe("EffectProperties", () => {
  it("adds a singleton effect only once per element", () => {
    const rectangle = new Rectangle();
    const effects = rectangle.getEffects() as unknown as Parameters<
      EffectProperties["_validateInsertation"]
    >[0];
    expect(properties._validateInsertation(effects, new MirrorEffect())).toBe(true);
    effects.appendChild(new MirrorEffect());
    expect(properties._validateInsertation(effects, new MirrorEffect())).toBe(false);
    // Not singletons: any number.
    effects.appendChild(new DropShadowEffect());
    expect(properties._validateInsertation(effects, new DropShadowEffect())).toBe(true);
  });

  it("edits the effect at the same place of every other selected element", () => {
    const first = new Rectangle();
    const second = new Rectangle();
    const third = new Rectangle();
    const own = new DropShadowEffect();
    first.getEffects()?.appendChild(own);
    // Same class, same index: an equal effect.
    const sameIndex = new DropShadowEffect();
    sameIndex.setProperty("x", 20);
    second.getEffects()?.appendChild(sameIndex);
    // Same class at another index: not equal (x differs), not matched.
    const otherIndex = new DropShadowEffect();
    otherIndex.setProperty("x", 30);
    third.getEffects()?.appendChild(new BlurEffect());
    third.getEffects()?.appendChild(otherIndex);
    properties._elements = [first, second, third] as unknown as EffectProperties["_elements"];
    const seen: Effect[] = [];
    properties._iterateEqualEffects(own, (effect) => seen.push(effect));
    expect(seen).toEqual([sameIndex]);
    // With `all`, the element's own effect counts too.
    const all: Effect[] = [];
    properties._iterateEqualEffects(own, (effect) => all.push(effect), true);
    expect(all).toEqual([own, sameIndex]);
    properties._elements = [];
  });

  it("prefixes the names of a multi effect part with the part's node name", () => {
    const assign = vi.fn();
    partAssign("GGLSepiaEffect", assign)(["shp", "vs"], [{ amount: 1 }, true], true);
    expect(assign).toHaveBeenCalledWith(
      ["GGLSepiaEffect&shp", "GGLSepiaEffect&vs"],
      [{ amount: 1 }, true],
      true,
    );
  });

  it("keeps the old class string the inspector sorts panels by", () => {
    expect(String(properties)).toBe("[Object GEffectProperties]");
    expect(Node.getName(BlurEffect)).toBe("blurEffect");
  });
});

describe("color sliders", () => {
  it("draws the brightness range from black to white every 20 units", () => {
    expect(
      colorSliderBackground({ min: -100, max: 100, stops: ColorStops.DefaultStops.Luminosity }),
    ).toBe(
      "linear-gradient(90deg,#000000 10%,#333333 20%,#666666 30%,#999999 40%,#CCCCCC 50%," +
        "#FFFFFF 60%,#FFFFFF 70%,#FFFFFF 80%,#FFFFFF 90%,#FFFFFF 100%,#FFFFFF 110.00000000000001%)",
    );
  });

  it("starts the saturation stops at white for the given hue", () => {
    const stops = ColorStops.DefaultStops.Saturation(0);
    expect(stops(0)).toEqual([255, 255, 255]);
    expect(stops(100)).toEqual([255, 0, 0]);
  });
});

describe("EffectsPanel", () => {
  let dom: FakeDomHandle;
  beforeEach(() => {
    dom = installFakeDom();
    setDesigner({ stats: () => undefined } as unknown as Designer);
  });
  afterEach(() => {
    resetGlobals();
    dom.uninstall();
  });

  it("fills the grid up to a multiple of three and replaces the tiles on every call", () => {
    const panel = new EffectsPanel((category) => category);
    const added: unknown[] = [];
    const entries = effectTable()
      .filter((entry) => entry.mostUsed)
      .slice(0, 4)
      .map((entry) => ({
        ...entry,
        cb: (clazz: unknown) => added.push(clazz),
      })) as unknown as EffectsPanelItem[];
    panel.addItems(entries);
    // Padded in place with empty tiles.
    expect(entries.length).toBe(6);
    expect(entries[5]).toBeInstanceOf(EffectsButton);
    const content = fake(panel._content);
    expect(content.children.length).toBe(6);
    expect(content.children[0]?.textContent).toBe("Blur");
    expect(content.children[5]?.children.length).toBe(0);
    panel.addItems(entries);
    expect(content.children.length).toBe(6);
    fire(content.children[1], "click");
    expect(added).toEqual([(effectTable().filter((e) => e.mostUsed)[1] as EffectEntry).clazz]);
    expect(String(panel)).toBe("[Object GEffectsPanel]");
  });

  it("highlights a tile while the mouse is over it", () => {
    const button = new EffectsButton(
      "Blur",
      "gravit-icon-blur-effect",
      BlurEffect,
      () => {},
      false,
      undefined,
      (c) => c,
    );
    fire(button._htmlElement, "mouseover");
    expect([...fake(button._htmlElement).classList]).toEqual(["g-effects-button", "active"]);
    fire(button._htmlElement, "mouseout");
    expect([...fake(button._htmlElement).classList]).toEqual(["g-effects-button"]);
  });
});

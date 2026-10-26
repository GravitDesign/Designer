import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { EventTarget } from "../../engine/core/event-target.ts";
import { CMYKColor } from "../../engine/color/cmyk-color.ts";
import { Color } from "../../engine/color/color.ts";
import { HSVColor } from "../../engine/color/hsv-color.ts";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Node } from "../../engine/scene/node.ts";
import { AngularGradient } from "../../engine/style/angular-gradient.ts";
import { Background } from "../../engine/style/background.ts";
import { Gradient } from "../../engine/style/gradient.ts";
import { LinearGradient } from "../../engine/style/linear-gradient.ts";
import { NoisePattern } from "../../engine/style/noise-pattern.ts";
import { Pattern } from "../../engine/style/pattern.ts";
import { RadialGradient } from "../../engine/style/radial-gradient.ts";
import { Swatch } from "../../engine/style/swatch.ts";
import { TexturePattern } from "../../engine/style/texture-pattern.ts";
import type { Designer } from "../shell/designer.ts";
import { resetGlobals, setDesigner } from "../shell/globals.ts";
import { Menu } from "../menus/menu.ts";
import { InputBox } from "../widgets/input-box.ts";
import { Platform } from "../../engine/core/platform.ts";
import { Group } from "../../engine/scene/group.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { PatternTarget } from "./pattern-target.ts";
import { StyleEdManager, StyleEditorEvent } from "../../editor/style-ed-manager.ts";
import {
  PatternChooser,
  PatternChooserWidget,
  resetPatternChoosers,
  setTouchPatternChooserClass,
  swatchScope,
  createPatternChoosers,
  patternChoosers,
  type PatternChooserSettings,
} from "./color-chooser.ts";
import { fire, installFakeDom, type FakeElement } from "./fake-dom.testing.ts";
import { onPatternEvent } from "./pattern-target.ts";
import { TouchPatternChooser } from "./pattern-chooser.ts";
import { SwatchesChangedEvent } from "./swatches-changed-event.ts";

/** The designer as the chooser uses it: swatches by scope, no document. */
class FakeDesigner extends EventTarget {
  swatches: Record<string, Node[]> = { global: [], document: [] };
  touch = false;
  setCalls: string[] = [];
  getSwatches(scope: string): Node[] | undefined {
    return this.swatches[scope];
  }
  setSwatches(scope: string, list: Node[]): void {
    this.setCalls.push(scope);
    this.swatches[scope] = list;
    this.trigger(new SwatchesChangedEvent(scope));
  }
  activeDocument: unknown = null;
  clipboard: string | null = null;
  storage: unknown = null;
  getActiveDocument(): unknown {
    return this.activeDocument;
  }
  getClipboardContent(): string | null {
    return this.clipboard;
  }
  getDefaultStorage(): unknown {
    return this.storage;
  }
  styleEdManager: unknown = null;
  getWorkspace() {
    return { getStyleEdManager: () => this.styleEdManager };
  }
  isTouchEnabled(): boolean {
    return this.touch;
  }
  isTouchDevice(): boolean {
    return false;
  }
  getSetting(_key: string, fallback?: unknown): unknown {
    return fallback;
  }
  stats(): void {}
}

let body: FakeElement;
let app: FakeDesigner;

beforeEach(() => {
  body = installFakeDom().body;
  app = new FakeDesigner();
  setDesigner(app as unknown as Designer);
  resetPatternChoosers();
});

afterEach(() => {
  resetPatternChoosers();
  resetGlobals();
  vi.unstubAllGlobals();
});

/** A chooser with its internals reachable for the assertions. */
type Inside = PatternChooser & Record<string, unknown>;

function chooser(touch = false): { chooser: Inside; root: FakeElement } {
  const instance = (touch ? new TouchPatternChooser() : new PatternChooser()) as unknown as Inside;
  return { chooser: instance, root: instance.getElement() as unknown as FakeElement };
}

function open(instance: PatternChooser, settings: Partial<PatternChooserSettings> = {}) {
  const target = document.createElement("div") as unknown as FakeElement;
  body.appendChild(target);
  instance.open(target as unknown as HTMLElement, settings);
  return target;
}

const q = (root: FakeElement, selector: string) => root.querySelector(selector) as FakeElement;
const all = (root: FakeElement, selector: string) => root.querySelectorAll(selector);
const display = (element: FakeElement) => element.style.getPropertyValue("display");
const box = (input: FakeElement) => (InputBox.of(input as unknown as Element) as InputBox).value();

describe("PatternChooser layout (UI-COLOR-001, UI-COLOR-002)", () => {
  it("builds the toolbar, editors and palettes in the old order", () => {
    const { root } = chooser();
    expect(root.className).toBe("pattern-chooser");
    expect(root.children.map((c) => c.className)).toEqual([
      "toolbar",
      "gradient-editor",
      "pattern-editor",
      "noise-editor",
      "color-editor",
      "gradient-actions",
      "palettes",
    ]);
    const types = all(root, ".pattern-type-select option").map((o) => o.textContent);
    expect(types).toEqual([
      "Color Fill",
      "Linear Gradient",
      "Radial Gradient",
      "Angular Gradient",
      "Texture Fill",
      "Noise",
      "Background Fill",
    ]);
    expect(all(root, ".colormode-selector option").map((o) => [o.textContent, o.selected])).toEqual(
      [
        ["RGB", true],
        ["HSB", false],
        ["CMYK", false],
      ],
    );
    // No Pro badges: the licence is dropped.
    expect(q(root, ".colormode-selector").className).toBe("colormode-selector");
    expect(
      all(root, ".chooser button").map((b) => [b.getAttribute("data-palette"), b.className]),
    ).toEqual([
      ["colors", "g-active"],
      ["swatches", ""],
      ["used", ""],
      ["mixer", ""],
    ]);
  });

  it("fills the colors palette with 12 greys and the 12 base colors", () => {
    const { root } = chooser();
    const rows = all(root, ".colors-palette > .swatches");
    expect(rows.length).toBe(2);
    const backgrounds = all(root, ".colors-palette .swatch").map((s) =>
      s.style.getPropertyValue("background").replace(/,url\(.*$/, ""),
    );
    expect(backgrounds.length).toBe(24);
    expect(backgrounds[0]).toBe("linear-gradient(#000000, #000000)");
    expect(backgrounds[1]).toBe("linear-gradient(#171717, #171717)");
    expect(backgrounds[11]).toBe("linear-gradient(#FFFFFF, #FFFFFF)");
    expect(backgrounds[13]).toBe("linear-gradient(#FF0000, #FF0000)");
    expect(all(root, ".colors-palette .swatch")[0]?.getAttribute("draggable")).toBe("false");
  });

  it("gives the mixer four rows of ten swatches without a draggable attribute", () => {
    const { root } = chooser();
    for (const name of ["tints", "shades", "tones", "mixes"])
      expect(all(root, `.mixer-palette [data-container="${name}"] .swatch`).length).toBe(10);
    expect(q(root, '.mixer-palette [data-container="tints"]').className).toBe("swatches");
    expect(q(root, ".mixer-palette .swatch").hasAttribute("draggable")).toBe(false);
  });

  it("starts in RGB with hex, R, G, B and alpha boxes", () => {
    const { root } = chooser();
    const labels = all(root, ".color-components > label");
    expect(labels.map((l) => l.style.getPropertyValue("width"))).toEqual([
      "27%",
      "15%",
      "15%",
      "15%",
      "18%",
    ]);
    expect(labels.map((l) => l.querySelector("span")?.textContent)).toEqual([
      "Hex",
      "R",
      "G",
      "B",
      "A",
    ]);
    expect(box(q(root, "[data-opacity] input"))).toBe("100");
  });
});

describe("PatternChooser patterns (UI-COLOR-003, UI-COLOR-012)", () => {
  it("shows a color in the boxes without telling the field on set_pattern", () => {
    const { chooser: c, root } = chooser();
    const onPattern = vi.fn();
    open(c, { onPattern });
    c.setPattern(new RGBColor([255, 0, 0]));
    expect(q(root, "[data-css] input").value).toBe("#FF0000");
    expect(all(root, "[data-component-index] input").map(box)).toEqual(["255", "0", "0"]);
    expect(display(q(root, ".gradient-editor"))).toBe("none");
    expect(display(q(root, ".color-editor"))).toBe("");
    expect(onPattern).not.toHaveBeenCalled();
  });

  it("sends typed components as the new color", () => {
    const { chooser: c, root } = chooser();
    const onPattern = vi.fn();
    open(c, { onPattern });
    c.setPattern(new RGBColor([255, 0, 0]));
    const green = all(root, "[data-component-index] input")[1] as FakeElement;
    green.value = "128";
    fire(green, "change");
    expect(onPattern).toHaveBeenCalledTimes(1);
    const [pattern, transient, stop] = onPattern.mock.calls[0] as [Pattern, boolean, unknown];
    expect(Pattern.serialize(pattern)).toBe("C#[255,128,0]");
    expect(transient).toBe(false);
    expect(stop).toBeNull();
  });

  it("edits gradients with one stop handle per stop; rotation only for linear ones", () => {
    const { chooser: c, root } = chooser();
    open(c);
    c.setPattern(new LinearGradient());
    expect(display(q(root, ".gradient-editor"))).toBe("");
    expect(all(root, ".gradient-editor .stop").length).toBe(2);
    expect(all(root, ".gradient-editor .stop.g-active").length).toBe(1);
    expect(display(q(root, '[data-action="rotate-left"]'))).toBe("");
    c.setPattern(new RadialGradient());
    expect(display(q(root, '[data-action="rotate-left"]'))).toBe("none");
    expect(display(q(root, '[data-action="exchange"]'))).toBe("");
  });

  it("reverses the stops with the exchange button", () => {
    const { chooser: c, root } = chooser();
    const onPattern = vi.fn();
    open(c, { onPattern });
    c.setPattern(new LinearGradient());
    q(root, '[data-action="exchange"]').click();
    const sent = onPattern.mock.calls.at(-1)?.[0] as Gradient;
    expect(sent.getStops().map((s) => [s.position, Pattern.serialize(s.color)])).toEqual([
      [0, "C#[0,0,0]"],
      [1, "C#[255,255,255]"],
    ]);
  });

  it("shows only the swatches palette for textures and noise", () => {
    const { chooser: c, root } = chooser();
    open(c);
    c.setPattern(new NoisePattern(0.4));
    expect(display(q(root, ".noise-editor"))).toBe("");
    expect(display(q(root, ".pattern-editor"))).toBe("none");
    expect(
      all(root, ".chooser button").map((b) => [b.getAttribute("data-palette"), display(b)]),
    ).toEqual([
      ["colors", "none"],
      ["swatches", ""],
      ["used", "none"],
      ["mixer", "none"],
    ]);
    expect(box(q(root, '[type="text"][data-property="noise_amount"]'))).toBe("40");
    c.setPattern(new Background());
    expect(display(q(root, ".palettes"))).toBe("none");
    expect(display(q(root, ".color-editor"))).toBe("none");
  });

  it("switches to CMYK boxes and hides the map; the touch chooser's boxes get no width", () => {
    const { chooser: c, root } = chooser();
    open(c);
    c.setPattern(new CMYKColor([0, 1, 1, 0]));
    const labels = all(root, ".color-components .cymk-label");
    expect(labels.map((l) => l.querySelector("span")?.textContent)).toEqual(["C", "M", "Y", "K"]);
    expect(labels.map((l) => l.style.getPropertyValue("width"))).toEqual([
      "18%",
      "18%",
      "18%",
      "18%",
    ]);
    expect(labels.map((l) => box(l.querySelector("input") as FakeElement))).toEqual([
      "0",
      "100",
      "100",
      "0",
    ]);
    expect(display(q(root, ".color-map"))).toBe("none");
    expect(q(root, ".color-editor").classList.contains("cmyk-mode")).toBe(true);
    const touch = chooser(true);
    touch.chooser.setColorMode(PatternChooser.ColorMode.CMYK);
    expect(all(touch.root, ".cymk-label").map((l) => l.style.getPropertyValue("width"))).toEqual([
      "",
      "",
      "",
      "",
    ]);
  });

  it("follows an HSB color into the HSB mode", () => {
    const { chooser: c, root } = chooser();
    open(c);
    c.setPattern(new HSVColor([120, 0.5, 0.25]));
    expect(all(root, ".colormode-selector option").map((o) => o.selected)).toEqual([
      false,
      true,
      false,
    ]);
    expect(all(root, "[data-component-index] input").map(box)).toEqual(["120", "50", "25"]);
  });

  it("offers only the types the field allows, and hides the toolbar for singleOption", () => {
    const { chooser: c, root } = chooser();
    c._updateSettings({ types: [Color, Gradient] }, true);
    expect(all(root, ".pattern-type-select option").map((o) => o.textContent)).toEqual([
      "Color Fill",
      "Linear Gradient",
      "Radial Gradient",
      "Angular Gradient",
    ]);
    c._updateSettings({ singleOption: true }, true);
    expect(display(q(root, ".toolbar"))).toBe("none");
    c._updateSettings({ types: [TexturePattern] }, true);
    expect(display(q(root, ".toolbar"))).toBe("");
    expect(all(root, ".pattern-type-select option").map((o) => o.textContent)).toEqual([
      "Texture Fill",
    ]);
    c._updateSettings({ hasOpacity: false }, true);
    expect(q(root, ".g-input-slider.opacity").getAttribute("disabled")).toBe("disabled");
  });
});

describe("PatternChooser swatches (UI-SWATCH-001, UI-SWATCH-003)", () => {
  it("adds the current paint to the document swatches and lists it", () => {
    const { chooser: c, root } = chooser();
    open(c);
    c.setPattern(new RGBColor([10, 20, 30]));
    q(root, '.chooser button[data-palette="swatches"]').click();
    const add = q(root, ".swatches-palette.document .swatch-button");
    add.click();
    expect(app.setCalls).toEqual(["document"]);
    expect(
      Pattern.serialize((app.swatches.document?.[0] as Swatch).getProperty("_pt") as Pattern),
    ).toBe("C#[10,20,30]");
    // The palette listens while it shows, so the new swatch is listed, and marked active.
    const listed = all(root, ".swatches-wrapper.document .swatch");
    expect(listed.length).toBe(1);
    expect(listed[0]?.classList.contains("g-active")).toBe(true);
    expect(listed[0]?.getAttribute("draggable")).toBe("true");
  });

  it("keeps the pattern when a color swatch is picked for a gradient (only the stop changes)", () => {
    const { chooser: c, root } = chooser();
    const onPattern = vi.fn();
    open(c, { onPattern });
    c.setPattern(new LinearGradient());
    const red = all(root, ".colors-palette .swatch")[13] as FakeElement;
    red.click();
    const sent = onPattern.mock.calls.at(-1)?.[0] as Pattern;
    expect(sent).toBeInstanceOf(LinearGradient);
    expect(Pattern.serialize((sent as Gradient).getStops()[0]?.color)).toBe("C#[255,0,0]");
  });

  it("lists the scopes of every pattern kind", () => {
    expect(swatchScope("global", new RGBColor())).toBe("global");
    expect(swatchScope("document", new LinearGradient())).toBe("document-linear-gradient");
    expect(swatchScope("global", new RadialGradient())).toBe("global-radial-gradient");
    expect(swatchScope("global", new AngularGradient())).toBe("global-angular-gradient");
    expect(swatchScope("global", new TexturePattern())).toBe("global-texture-pattern");
    expect(swatchScope("global", new NoisePattern())).toBe("global-noise-pattern");
    expect(swatchScope("global", null)).toBe("global");
  });

  it("starts new gradients from the gradient's stops, or white to black with the color first", () => {
    const stops = PatternChooser.getGradientStopsFromCurrentPattern(new RGBColor([1, 2, 3]));
    expect(stops.map((s) => Pattern.serialize(s.color))).toEqual(["C#[1,2,3]", "C#[0,0,0]"]);
    const black = PatternChooser.getGradientStopsFromCurrentPattern(new RGBColor([0, 0, 0]));
    expect(Pattern.serialize(black[0]?.color)).toBe("C#[255,255,255]");
  });
});

describe("PatternChooser quirks kept from the old code", () => {
  it("relayouts keep the top unless the pattern is the background fill", () => {
    // See "The touch chooser module changes the desktop chooser's relayout" in QUESTIONS.md.
    const { chooser: c } = chooser();
    open(c);
    const relayout = vi.spyOn(c.getOverlay(), "relayout");
    c.setPattern(new RGBColor([1, 2, 3]));
    expect(relayout).toHaveBeenLastCalledWith({ preserveTop: true });
    c.setPattern(new Background());
    expect(relayout).toHaveBeenLastCalledWith({ preserveTop: false });
    q(c.getElement() as unknown as FakeElement, '.chooser button[data-palette="mixer"]').click();
    expect(relayout).toHaveBeenLastCalledWith({ preserveTop: true });
  });

  it("never selects the noise type of the pattern in the type select", () => {
    // See "The noise type select doesn't follow the pattern" in QUESTIONS.md.
    const { chooser: c, root } = chooser();
    open(c);
    const noise = new NoisePattern();
    noise.setType(NoisePattern.Type.Black);
    c.setPattern(noise);
    const select = q(root, '[data-property="noise_type"]');
    expect(select.children.some((o) => o.hasAttribute("selected"))).toBe(false);
  });

  it("keeps listening to swatch changes after leaving the swatches palette", () => {
    // See "The swatches palette never stops listening" in QUESTIONS.md.
    const { chooser: c, root } = chooser();
    open(c);
    c.setPattern(new RGBColor([5, 5, 5]));
    q(root, '.chooser button[data-palette="swatches"]').click();
    q(root, '.chooser button[data-palette="colors"]').click();
    app.setSwatches("document", [new Swatch(new RGBColor([9, 9, 9]))]);
    expect(all(root, ".swatches-wrapper.document .swatch").length).toBe(1);
  });
});

describe("PatternChooser and the canvas gradient editor", () => {
  /**
   * An active StyleEdManager whose editor does what the gradient editors do:
   * without noEvent, updatePartSelection reports the stop back as
   * ActivePointChange (gradient-style-editor.ts updatePartSelection).
   */
  class FakeStyleEdManager extends EventTarget {
    calls: unknown[][] = [];
    events = 0;
    editor = {
      updatePartSelection: (
        toggle: boolean,
        parts: { idx: number }[] | null,
        noEvent?: boolean,
      ) => {
        this.calls.push([toggle, parts, noEvent]);
        if (!noEvent) this.handleEditorPartUpdate(parts ? (parts[0] ?? null) : null);
      },
      getPartsSelectionLength: () => 0,
      getPartSelection: () => null,
    };
    isActivated(): boolean {
      return true;
    }
    getActiveEditor() {
      return this.editor;
    }
    handleEditorPartUpdate(part: { idx: number } | null): void {
      this.events++;
      this.trigger(
        new StyleEditorEvent(
          StyleEdManager.EditorEventType.ActivePointChange,
          part ? { idx: part.idx } : null,
        ),
      );
    }
  }

  it("selects the stop on the canvas without an ActivePointChange echo or extra onPattern", () => {
    const manager = new FakeStyleEdManager();
    app.styleEdManager = manager;
    const { chooser: c } = chooser();
    const onPattern = vi.fn();
    open(c, { onPattern });
    c.setPattern(new LinearGradient());
    manager.calls.length = 0;
    onPattern.mockClear();
    c.setActiveGradientStopByIdx(1);
    expect(manager.calls).toEqual([[false, [{ type: expect.anything(), idx: 1 }], true]]);
    expect(manager.events).toBe(0);
    expect(onPattern).not.toHaveBeenCalled();
  });
});

describe("TouchPatternChooser long-press menu (kept quirks)", () => {
  /** Long-presses `target` and activates menu item `index` (0: document, 1: global). */
  function longPress(target: FakeElement, index: number): void {
    const spy = vi.spyOn(Menu.prototype, "open").mockImplementation(() => {});
    fire(target, "long-press");
    const menu = spy.mock.contexts[0] as Menu | undefined;
    spy.mockRestore();
    expect(menu).toBeInstanceOf(Menu);
    (menu as Menu).getItem(index)?.activate();
  }
  const added = (scope: string) =>
    (app.swatches[scope] ?? []).map((s) => [
      Pattern.serialize((s as Swatch).getProperty("_pt") as Pattern),
      (s as Swatch).getProperty("_op"),
    ]);

  it("adds the current color, not the pressed one, with the pressed swatch's opacity", () => {
    app.touch = true;
    const { chooser: c, root } = chooser(true);
    open(c);
    c.setPattern(new RGBColor([10, 20, 30]));
    (c as unknown as { _updateOpacity(opacity: number): void })._updateOpacity(0.5);
    const red = all(root, ".colors-palette .swatch")[13] as FakeElement;
    longPress(red, 0);
    expect(added("document")).toEqual([["C#[10,20,30]", 1]]);
  });

  it("adds the current gradient with the pressed swatch's whole pattern as first stop color", () => {
    app.touch = true;
    app.swatches["document-linear-gradient"] = [];
    app.swatches["global-linear-gradient"] = [];
    const { chooser: c, root } = chooser(true);
    open(c);
    c.setPattern(new LinearGradient());
    const red = all(root, ".colors-palette .swatch")[13] as FakeElement;
    longPress(red, 1);
    const list = app.swatches["global-linear-gradient"] as Swatch[];
    expect(list.length).toBe(1);
    const gradient = list[0]?.getProperty("_pt") as Gradient;
    expect(gradient).toBeInstanceOf(LinearGradient);
    expect(Pattern.serialize(gradient.getStops()[0]?.color)).toBe("C#[255,0,0]");
    // A gradient swatch pressed: its gradient becomes the stop's "color".
    app.swatches["global-linear-gradient"] = [
      new Swatch(
        new LinearGradient([
          { position: 0, color: new RGBColor([1, 2, 3]), opacity: 1 },
          { position: 1, color: new RGBColor([4, 5, 6]), opacity: 1 },
        ] as never),
        1,
      ),
    ];
    q(root, '.chooser button[data-palette="swatches"]').click();
    const swatch = q(root, ".swatches-wrapper.global .swatch");
    longPress(swatch, 0);
    const doc = app.swatches["document-linear-gradient"] as Swatch[];
    expect(doc.length).toBe(1);
    const stop = (doc[0]?.getProperty("_pt") as Gradient).getStops()[0]?.color;
    expect(stop).toBeInstanceOf(LinearGradient);
  });

  it("adds the hex box's paint to the document swatches, even from the global item", () => {
    app.touch = true;
    const { chooser: c, root } = chooser(true);
    open(c);
    c.setPattern(new RGBColor([10, 20, 30]));
    longPress(q(root, "[data-css] input"), 1);
    expect(app.setCalls).toEqual(["document"]);
    expect(added("document")).toEqual([["C#[10,20,30]", 1]]);
  });
  it("toggles the advanced texture settings and the expand icon", () => {
    app.touch = true;
    const { chooser: c, root } = chooser(true);
    open(c);
    const advanced = q(root, ".pattern-advanced-settings");
    const icon = q(root, "#expand-icon");
    const before = display(advanced);
    q(root, ".advanced-option").click();
    expect(display(advanced)).toBe("none" === before ? "block" : "none");
    expect(icon.className).toBe("expand-icon gravit-icon-down");
    q(root, ".advanced-option").click();
    expect(display(advanced)).toBe("none" === before ? "none" : "block");
    expect(icon.className).toBe("expand-icon gravit-icon-right");
  });
});

describe("PatternChooser branches without a parity scenario (R7-C-103)", () => {
  afterEach(() => {
    Platform.modifiers.optionKey = false;
    vi.restoreAllMocks();
  });

  it("option-click on a swatch selects matching elements, closes the choosers and opens the fill", () => {
    const calls: unknown[][] = [];
    const nodes = [{}];
    const editor = {
      addEventListener() {},
      removeEventListener() {},
      keysOff() {},
      keysOn() {},
      selectFromPattern: (pattern: Pattern, all: boolean) => {
        calls.push(["selectFromPattern", Pattern.serialize(pattern), all]);
        return nodes;
      },
      updateSelection: (toggle: boolean, selection: unknown) =>
        calls.push(["updateSelection", toggle, selection === nodes]),
      blinkSelection: (time: number, count: number) => calls.push(["blink", time, count]),
    };
    app.activeDocument = { getEditor: () => editor, getScene: () => null };
    const { chooser: c, root } = chooser();
    open(c);
    c.setPattern(new RGBColor([10, 20, 30]));
    expect(c.isOpenned()).toBe(true);
    // Two fill rows: one previews blue, one red.
    const panel = document.createElement("div") as unknown as FakeElement;
    panel.className = "fill-properties-panel";
    body.appendChild(panel);
    const clicked: string[] = [];
    for (const color of [new RGBColor([0, 0, 255]), new RGBColor([255, 0, 0])]) {
      const field = document.createElement("div") as unknown as FakeElement;
      field.className = "g-pattern-chooser";
      const preview = document.createElement("div") as unknown as FakeElement;
      preview.className = "preview";
      field.appendChild(preview);
      panel.appendChild(field);
      new PatternTarget(preview as unknown as HTMLElement, {
        allowDrag: false,
        allowDrop: false,
      }).pattern = color;
      preview.addEventListener("click", () => clicked.push(Pattern.serialize(color) as string));
    }
    Platform.modifiers.optionKey = true;
    (all(root, ".colors-palette .swatch")[13] as FakeElement).click();
    expect(calls).toEqual([
      ["selectFromPattern", "C#[255,0,0]", true],
      ["updateSelection", false, true],
      ["blink", 2000, 4],
    ]);
    expect(c.isOpenned()).toBe(false);
    expect(clicked).toEqual(["C#[255,0,0]"]);
  });

  it("paste without a shape on the clipboard alerts with the texture message (BUG-133)", () => {
    const { chooser: c, root } = chooser();
    const onPattern = vi.fn();
    open(c, { onPattern });
    c.setPattern(new TexturePattern());
    app.clipboard = null;
    q(root, ".paste-btn").click();
    expect(window.alert).toHaveBeenCalledTimes(1);
    expect(window.alert).toHaveBeenCalledWith(
      "Select a shape, copy it to clipboard then paste it as texture here.",
    );
    expect(onPattern).not.toHaveBeenCalled();
  });

  it("paste with a group makes the group the texture", () => {
    const { chooser: c, root } = chooser();
    const onPattern = vi.fn();
    open(c, { onPattern });
    c.setPattern(new TexturePattern());
    const group = new Group();
    group.appendChild(new Rectangle());
    app.clipboard = Node.serialize([group]) as string;
    // Rendering the node texture needs a canvas: catch the update instead.
    const update = vi.spyOn(
      c as unknown as { _updatePattern(...a: unknown[]): void },
      "_updatePattern",
    );
    update.mockImplementation(() => {});
    q(root, ".paste-btn").click();
    expect(window.alert).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(1);
    const [sent, source] = update.mock.calls[0] as [TexturePattern & { _node: unknown }, string];
    expect(sent).toBeInstanceOf(TexturePattern);
    expect(sent._node).toBeInstanceOf(Group);
    expect(source).toBe("texture_paste");
  });

  it("choose image prompts for the image types and makes the file the texture", async () => {
    const prompts: unknown[][] = [];
    app.storage = {
      canPromptOpen: () => true,
      openPrompt: (types: unknown, done: (item: unknown) => void, multiple: boolean) => {
        prompts.push([types, multiple]);
        done({ read: (callback: (data: unknown) => void) => callback(new Uint8Array([1, 2])) });
      },
    };
    class FakeReader {
      result: string | null = null;
      onload: (() => void) | null = null;
      readAsDataURL(blob: Blob): void {
        void blob.arrayBuffer().then((buffer) => {
          this.result = "data:image/png;base64," + buffer.byteLength;
          this.onload?.();
        });
      }
    }
    vi.stubGlobal("FileReader", FakeReader);
    const { chooser: c, root } = chooser();
    const onPattern = vi.fn();
    open(c, { onPattern });
    c.setPattern(new TexturePattern());
    // Loading the image needs a browser: catch the update instead.
    const update = vi.spyOn(
      c as unknown as { _updatePattern(...a: unknown[]): void },
      "_updatePattern",
    );
    update.mockImplementation(() => {});
    vi.spyOn(TexturePattern.prototype, "setTexture").mockImplementation(function (
      this: TexturePattern,
      texture: unknown,
    ) {
      (this as unknown as { _url: unknown })._url = texture;
    });
    q(root, ".pattern-choose-image-button").click();
    expect(prompts).toEqual([[PatternChooser.enableFileTypes, false]]);
    await vi.waitFor(() => expect(update).toHaveBeenCalled());
    const [sent, source] = update.mock.calls[0] as [TexturePattern & { _url: unknown }, string];
    expect(sent).toBeInstanceOf(TexturePattern);
    expect(sent._url).toBe("data:image/png;base64,2");
    expect(source).toBe("texture_upload");
  });

  it("toggles the advanced texture settings with the desktop Advanced button", () => {
    const { chooser: c, root } = chooser();
    open(c);
    const advanced = q(root, ".pattern-advanced-settings");
    const before = display(advanced);
    const caption = Locale.get(new LocaleKey("GCommonNames", "text.advanced"));
    const toggle = all(root, "button").find((b) => b.innerHTML === caption) as FakeElement;
    toggle.click();
    expect(display(advanced)).toBe("none" === before ? "block" : "none");
    toggle.click();
    expect(display(advanced)).toBe(before === "none" ? "none" : "block");
  });
});

describe("PatternChooserWidget (UI-COLOR-025)", () => {
  function widget(options = {}) {
    createPatternChoosers();
    const element = document.createElement("div") as unknown as FakeElement;
    body.appendChild(element);
    return {
      element,
      field: new PatternChooserWidget(element as unknown as HTMLElement, options),
    };
  }

  it("keeps an option that updateSettings passes as undefined ($.extend)", () => {
    const { element, field } = widget();
    field.updateSettings({ asButton: undefined, label: "x" });
    q(element, ".preview").click();
    expect(element.classList.contains("g-active")).toBe(true);
  });

  it("builds the preview with its eye dropper", () => {
    const { element } = widget();
    expect(element.className).toBe("g-pattern-chooser");
    const preview = q(element, ".preview");
    expect(preview.className).toBe("preview g-button");
    expect(q(preview, ".eyedropper").className).toBe("eyedropper eye-drop");
    expect(widget({ noEyedropper: true }).element.className).toBe("g-pattern-chooser only-picker");
    expect(q(widget({ simplified: true }).element, ".eyedropper")).toBeNull();
  });

  it("shows its value and opacity in the preview", () => {
    const { element, field } = widget();
    field.value(new RGBColor([255, 0, 0])).opacity(0.5);
    expect(q(element, ".preview").style.getPropertyValue("background")).toContain(
      "rgba(255,0,0,0.5)",
    );
    expect(Pattern.serialize(field.value())).toBe("C#[255,0,0]");
    expect(field.opacity()).toBe(0.5);
  });

  it("opens the chooser on a click and passes its changes on as patternchange", () => {
    const { element, field } = widget({ types: [Color] });
    field.value(new RGBColor([0, 0, 255]));
    const changes: unknown[][] = [];
    onPatternEvent(element as unknown as Element, "patternchange", (_e, ...args) =>
      changes.push(args),
    );
    let opened = 0;
    onPatternEvent(element as unknown as Element, "chooseropen", () => opened++);
    q(element, ".preview").click();
    expect(opened).toBe(1);
    expect(element.classList.contains("g-active")).toBe(true);
    const chooserRoot = patternChoosers().normal?.getElement() as unknown as FakeElement;
    expect(chooserRoot.isConnected).toBe(true);
    expect(all(chooserRoot, ".pattern-type-select option").map((o) => o.textContent)).toEqual([
      "Color Fill",
    ]);
    const red = all(chooserRoot, "[data-component-index] input")[0] as FakeElement;
    red.value = "255";
    fire(red, "change");
    const [pattern, opacity, transient, fromChooser, stop] = changes.at(-1) as unknown[];
    expect(Pattern.serialize(pattern as Pattern)).toBe("C#[255,0,255]");
    expect([opacity, transient, fromChooser, stop]).toEqual([undefined, false, true, null]);
    // The field took the new value too.
    expect(Pattern.serialize(field.value())).toBe("C#[255,0,255]");
    field.close();
    expect(chooserRoot.isConnected).toBe(false);
    expect(element.classList.contains("g-active")).toBe(false);
  });

  it("stays open when a chooserclose listener prevents it", () => {
    const { element, field } = widget();
    onPatternEvent(element as unknown as Element, "chooserclose", (_e, prevent) => prevent());
    q(element, ".preview").click();
    field.close();
    expect(patternChoosers().normal?.isOpenned()).toBe(true);
    expect(element.classList.contains("g-active")).toBe(true);
  });

  it("picks the touch chooser in touch mode", () => {
    setTouchPatternChooserClass(TouchPatternChooser);
    app.touch = true;
    const { element } = widget();
    q(element, ".preview").click();
    const touch = patternChoosers().touch as PatternChooser;
    expect(touch).toBeInstanceOf(TouchPatternChooser);
    expect(touch.isOpenned()).toBe(true);
    const wrapper = (touch.getElement() as unknown as FakeElement).parentElement as FakeElement;
    expect(wrapper.className).toBe("g-overlay pattern-chooser-overlay no-padding");
    expect(wrapper.style.getPropertyValue("right")).not.toBe("");
  });
});

describe("Swatch", () => {
  it("counts a CMYK pattern as CMYK", () => {
    expect(new Swatch(new CMYKColor([0, 0, 0, 1])).isCMYK()).toBe(true);
  });
});

// PageProperties' preset select and field availability on a fake DOM: the
// preset table filtered by the scene unit (with nested sizes and hidden
// categories), the size lock (plkt) and the template preset rule.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Block } from "../../engine/scene/block.ts";
import { Page } from "../../engine/scene/page.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { EditorWorkspace } from "../../editor/editor-workspace.ts";
import type { Document } from "../document/document.ts";
import type { FakeElement } from "../menus/testing/fake-dom.testing.ts";
import type { Designer } from "../shell/designer.ts";
import { resetGlobals, setDesigner } from "../shell/globals.ts";
import { Presets, type Preset } from "../welcome/presets.ts";
import { installDocumentPanelsDom, type DocumentPanelsDom } from "./document-panels-dom.testing.ts";
import { PageProperties } from "./page-properties.ts";

let env: DocumentPanelsDom;

beforeEach(() => {
  env = installDocumentPanelsDom();
  setDesigner({
    isTouchEnabled: () => false,
    getWindows: () => ({ getActiveWindow: () => null }),
    addEventListener() {},
    removeEventListener() {},
  } as unknown as Designer);
});

afterEach(() => {
  vi.restoreAllMocks();
  resetGlobals();
  env.uninstall();
});

function layout(name: string, unit: string, width: number, height: number, extra = {}) {
  return { id: name, name, localeClass: null, unit, width, height, ...extra };
}

/** A preset table with nested sizes, a hidden category and one without px sizes. */
function table(): Preset[] {
  const preset = (id: string, layouts: unknown[], extra = {}) =>
    ({
      id,
      name: id,
      nameEn: id,
      subTitle: "",
      localeClass: null,
      icon: "",
      layouts,
      ...extra,
    }) as Preset;
  return [
    preset("screens", [
      layout("Phone", "px", 390, 844),
      layout("Paper", "mm", 210, 297, { dpi: 300 }),
      layout("Group", "px", 0, 0, {
        dpi: 144,
        includes: [
          layout("Small", "px", 100, 50, { displaySize: true }),
          layout("Big", "px", 200, 100),
        ],
      }),
    ]),
    preset("secret", [layout("Hidden", "px", 10, 10)], { hidden: true }),
    preset("print", [layout("A4", "mm", 210, 297, { dpi: 300 })]),
  ];
}

function sceneIn(unit: string): Scene {
  const scene = new Scene(new EditorWorkspace());
  scene.setProperty("ut", unit);
  return scene;
}

function panelWith(...children: FakeElement[]): FakeElement {
  const root = env.make("div");
  for (const child of children) root.appendChild(child);
  return root;
}

function propertiesFor(panel: FakeElement, document: Partial<Document>): PageProperties {
  const properties = new PageProperties();
  properties._panel = panel as unknown as HTMLElement;
  properties._document = document as Document;
  return properties;
}

const values = (select: FakeElement) =>
  select.children.map((group) => [
    group.getAttribute("label"),
    group.style.getPropertyValue("display"),
    group.children.map((option) => option.getAttribute("value") + " " + option.textContent),
  ]);

describe("PageProperties._updatePresetSizes", () => {
  it("lists Infinite Canvas, then the sizes in the scene's unit, nested sizes flattened", () => {
    vi.spyOn(Presets, "getPresets").mockReturnValue(table());
    const a = env.make("select", { "data-property": "preset-size" });
    const b = env.make("select", { "data-property": "preset-size" });
    a.appendChild(env.make("option"));
    const scene = sceneIn("px");
    const properties = propertiesFor(panelWith(a, b), { getScene: () => scene });
    properties._updatePresetSizes();
    const expected = [
      ["Custom Size", "", ["@infinite Infinite Canvas"]],
      // the nested sizes take their parent's dpi
      ["screens", "", ["390x844x72 Phone", "100x50x144 Small 100x50", "200x100x144 Big"]],
      // a hidden category stays in the select, hidden
      ["secret", "none", ["10x10x72 Hidden"]],
      // "print" has no px size: left out
    ];
    expect(values(a)).toEqual(expected);
    expect(values(b)).toEqual(expected);
    expect(a.children[1]?.children[0]?.getAttribute("data-preset-id")).toBe("screens");
  });

  it("uses the old document's unit when the panel has no document", () => {
    vi.spyOn(Presets, "getPresets").mockReturnValue(table());
    const select = env.make("select", { "data-property": "preset-size" });
    const properties = propertiesFor(panelWith(select), {});
    properties._document = null;
    const scene = sceneIn("mm");
    properties._oldDocument = { getScene: () => scene } as unknown as Document;
    properties._updatePresetSizes();
    expect(values(select).map((group) => group[0])).toEqual(["Custom Size", "screens", "print"]);
    expect(values(select)[1]?.[2]).toEqual(["210x297x300 Paper"]);
  });
});

describe("PageProperties.updatePropertiesAvailability", () => {
  /** The fields the method touches, w with its own tooltip. */
  function fields() {
    const preset = env.make("select", { "data-property": "preset-size" });
    const custom = env.make("option", { value: "@custom" });
    const known = env.make("option", { value: "390x844x72", "data-preset-id": "preset-uiux" });
    preset.appendChild(custom);
    preset.appendChild(known);
    const width = env.make("input", { "data-property": "w", "data-title": "Width" });
    const rotate = env.make("button", { "data-property": "rotate-canvas" });
    const master = env.make("select", { "data-property": "master-page" });
    const background = env.make("div", { "data-property": "bck" });
    const panel = panelWith(preset, width, rotate, master, background);
    return { panel, preset, width, rotate, master, background };
  }

  const wrappers = (panel: FakeElement) =>
    panel.children.flatMap((child, index) =>
      child.classList.contains("tooltip-wrapper")
        ? [(panel.children[index - 1] as FakeElement).getAttribute("data-property")]
        : [],
    );

  it("disables everything for a size-locked page and says why, then restores the tooltips", () => {
    const f = fields();
    const page = new Page();
    page.setProperties(["w", "h", "plkt"], [100, 100, Block.ProgramLck.NoSizeChanges]);
    const properties = propertiesFor(f.panel, { isDocumentFromTemplate: () => false });
    properties.updatePropertiesAvailability(page);
    for (const field of [f.preset, f.width, f.rotate, f.master])
      expect(field.getAttribute("disabled")).not.toBeNull();
    // %name isn't in this text, so the field's own title is gone
    expect(f.width.getAttribute("data-title")).toBe("This property can’t be changed");
    expect(f.width.getAttribute("default-data-title")).toBe("Width");
    // the master select's i18n is only set in the unlocked branch
    expect(f.master.getAttribute("data-title")).toBe("This property can’t be changed");
    expect(wrappers(f.panel)).toEqual(["preset-size", "master-page", "bck"]);

    page.setProperties(["plkt", "bck"], [Block.ProgramLck.NoLock, RGBColor.WHITE]);
    properties.updatePropertiesAvailability(page);
    for (const field of [f.preset, f.width, f.rotate, f.master, f.background])
      expect(field.getAttribute("disabled")).toBeNull();
    expect(f.width.getAttribute("data-title")).toBe("Width");
    // no title before: none after
    expect(f.rotate.getAttribute("data-title")).toBeNull();
    expect(f.master.getAttribute("i18n")).toBe("text.plkt-no-size-changes");
    expect(wrappers(f.panel)).toEqual([]);
  });

  it("explains an infinite page's disabled rotate button with the field's name", () => {
    const f = fields();
    f.rotate.setAttribute("data-title", "Rotate");
    const page = new Page();
    page.setProperties(["w", "h", "bck"], [0, 0, RGBColor.WHITE]);
    const properties = propertiesFor(f.panel, { isDocumentFromTemplate: () => false });
    properties.updatePropertiesAvailability(page);
    expect(f.rotate.getAttribute("disabled")).not.toBeNull();
    expect(f.rotate.getAttribute("data-title")).toBe(
      "Rotate - this property can’t be changed with an infinite canvas",
    );
  });

  it("locks the preset select of a template document on a size without preset id", () => {
    // _excludedPresets is [undefined] (no MERCH type), so options without
    // data-preset-id count as excluded: see "Q-307 Page presets excluded
    // for templates" in QUESTIONS.md.
    const f = fields();
    const page = new Page();
    page.setProperties(["w", "h"], [100, 100]);
    const properties = propertiesFor(f.panel, { isDocumentFromTemplate: () => true });
    f.preset.value = "@custom";
    properties.updatePropertiesAvailability(page);
    expect(f.preset.getAttribute("disabled")).not.toBeNull();
    // excluded: disabled fields get no "can't be changed" title or wrapper
    expect(f.preset.getAttribute("data-title")).toBeNull();
    expect(f.rotate.getAttribute("data-title")).toBeNull();
    expect(wrappers(f.panel)).toEqual(["bck"]);

    f.preset.value = "390x844x72";
    properties.updatePropertiesAvailability(page);
    expect(f.preset.getAttribute("disabled")).toBeNull();
    expect(wrappers(f.panel)).toEqual(["bck"]);
  });
});

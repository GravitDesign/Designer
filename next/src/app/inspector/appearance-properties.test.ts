import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Page } from "../../engine/scene/page.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Scene } from "../../engine/scene/scene.ts";
import type { ContainerApi } from "../../engine/scene/node-container.ts";
import { EditorWorkspace } from "../../editor/editor-workspace.ts";
import { fake, fire, type FakeElement } from "../menus/testing/fake-dom.testing.ts";
import { Node } from "../../engine/scene/node.ts";
import { PGEdge } from "../../engine/scene/paths-graph/pg-edge.ts";
import { PGFacet } from "../../engine/scene/paths-graph/pg-facet.ts";
import { ElementEditor } from "../../editor/element-editors/element-editor.ts";
import { SettingChangedEvent } from "../shell/setting-changed-event.ts";
import { setSliderValue } from "./color-deps.testing.ts";
import { str } from "./paint-dom.ts";
import { AppearanceProperties } from "./appearance-properties.ts";
import { sliderValue } from "./color-deps.ts";
import {
  descendants,
  documentOf,
  installPaintTestDom,
  type PaintTestDom,
} from "./paint-dom.testing.ts";

// The real slider and paint field need a browser DOM.
vi.mock("./color-deps.ts", () => import("./color-deps.testing.ts"));

let t: PaintTestDom;

beforeEach(() => {
  t = installPaintTestDom();
});

afterEach(() => {
  t.uninstall();
});

function scene(): { scene: Scene; page: Page } {
  const s = new Scene(new EditorWorkspace());
  const page = new Page();
  s.appendChild(page);
  return { scene: s, page };
}

function rect(page: Page): Rectangle {
  const r = new Rectangle();
  (page as unknown as ContainerApi).appendChild(r);
  return r;
}

function initPanel(): { properties: AppearanceProperties; panel: FakeElement } {
  const panel = t.dom.document.createElement("div");
  const properties = new AppearanceProperties();
  properties.init(panel as unknown as HTMLElement);
  return { properties, panel };
}

const byProperty = (root: FakeElement, property: string) =>
  descendants(root).filter((e) => e.getAttribute("data-property") === property);

describe("AppearanceProperties", () => {
  it("has the old name", () => {
    expect(new AppearanceProperties().toString()).toBe("[Object GAppearanceProperties]");
  });

  it("builds the opacity, blending and style rows", () => {
    const { panel } = initPanel();
    expect(panel.children.map((c) => c.className)).toEqual([
      "appearance-opacity-property g-property-row",
      "appearance-blending-property g-property-row",
      "g-property-row appearance-style-property",
    ]);
    const select = byProperty(panel, "_sbl")[0] as FakeElement;
    // The blend groups, then the mask modes.
    const groups = select.children.filter((c) => c.tagName === "OPTGROUP");
    expect(groups.map((g) => g.getAttribute("label"))).toEqual([
      "Darken image",
      "Lighten image",
      "Boost contrast",
      "Adjust colors",
      "Invert colors",
      "Masking",
    ]);
    expect(
      (groups[groups.length - 1] as FakeElement).children.map((o) => o.getAttribute("value")),
    ).toEqual(["m", "!m"]);
  });

  it("shows the opacity and blend mode of the first element", () => {
    const { properties, panel } = initPanel();
    const { scene: s, page } = scene();
    const a = rect(page);
    a.setProperty("_stop", 0.4);
    a.setProperty("_sbl", "multiply");
    expect(properties.update(documentOf(s, t.commits), [a, rect(page)])).toBe(true);
    const input = byProperty(panel, "_stop").find((e) => e.tagName === "INPUT");
    expect((input as unknown as HTMLInputElement).value).toBe("40%");
    expect(sliderValue(byProperty(panel, "_stop")[0] as unknown as Element)).toBe(40);
    expect((byProperty(panel, "_sbl")[0] as unknown as HTMLSelectElement).value).toBe("multiply");
  });

  it("writes the blend mode to every inspected element in one transaction", () => {
    const { properties, panel } = initPanel();
    const { scene: s, page } = scene();
    const a = rect(page);
    const b = rect(page);
    properties.update(documentOf(s, t.commits), [a, b]);
    const select = byProperty(panel, "_sbl")[0] as FakeElement;
    (select as unknown as HTMLSelectElement).value = "!m";
    fire(select, "change", { bubbles: true });
    expect(a.getProperty("_sbl")).toBe("!m");
    expect(b.getProperty("_sbl")).toBe("!m");
    expect(t.commits.map((c) => c.name)).toEqual(["Change blending mode"]);
  });

  it("takes no page", () => {
    const { properties } = initPanel();
    const { scene: s, page } = scene();
    expect(properties.update(documentOf(s, t.commits), [page])).toBe(false);
  });

  it("shows No Shared Style and keeps the sync button disabled without a shared style", () => {
    const { properties, panel } = initPanel();
    const { scene: s, page } = scene();
    properties.update(documentOf(s, t.commits), [rect(page)]);
    const field = descendants(panel).find((e) => e.classList.contains("g-styles-field"));
    expect(field?.textContent).toBe("No Shared Style");
    const sync = descendants(panel).find((e) => e.classList.contains("g-style-sync"));
    expect(sync?.classList.contains("g-disabled")).toBe(true);
  });
});

describe("AppearanceProperties opacity, sync and parts", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** Gives `element` a shared style link (the panel only asks hasProperty("sref")). */
  const linked = (element: Rectangle, style: unknown) => {
    const has = element.hasProperty.bind(element);
    vi.spyOn(element, "hasProperty").mockImplementation((name, custom) =>
      name === "sref" ? true : has(name, custom),
    );
    vi.spyOn(element, "getReferencedStyle").mockReturnValue(style as never);
  };
  const field = (panel: FakeElement, clazz: string) =>
    descendants(panel).find((e) => e.classList.contains(clazz)) as FakeElement;
  const opacityBox = (panel: FakeElement) =>
    byProperty(panel, "_stop").find((e) => e.tagName === "INPUT") as FakeElement;
  const opacitySlider = (panel: FakeElement) =>
    byProperty(panel, "_stop").find((e) => e.tagName === "DIV") as FakeElement;

  it("drags the opacity slider as a temporary change that also updates the box", () => {
    const { properties, panel } = initPanel();
    const { scene: s, page } = scene();
    const a = rect(page);
    const b = rect(page);
    properties.update(documentOf(s, t.commits), [a, b]);
    setSliderValue(opacitySlider(panel) as unknown as Element, 40);
    fire(opacitySlider(panel), "input");
    for (const element of [a, b]) {
      expect(element.getProperty("_stop", false, false, true)).toBe(0.4);
      expect(element.getProperty("_stop")).toBe(1);
    }
    expect((opacityBox(panel) as unknown as HTMLInputElement).value).toBe("40%");
    expect(t.commits).toEqual([]);
    fire(opacitySlider(panel), "change");
    expect(a.getProperty("_stop")).toBe(0.4);
    expect(b.getProperty("_stop")).toBe(0.4);
    expect(t.commits.map((c) => c.name)).toEqual(["Change opacity"]);
  });

  it("divides the typed opacity by 100", () => {
    const { properties, panel } = initPanel();
    const { scene: s, page } = scene();
    const a = rect(page);
    properties.update(documentOf(s, t.commits), [a]);
    (opacityBox(panel) as unknown as HTMLInputElement).value = "25";
    fire(opacityBox(panel), "change");
    expect(a.getProperty("_stop")).toBe(0.25);
    expect(t.commits.map((c) => c.name)).toEqual(["Change opacity"]);
  });

  it("syncs a changed element back into its shared style", () => {
    t.uninstall();
    const previews: unknown[] = [];
    t = installPaintTestDom({
      getStylePreview: () => "preview.png",
      createNewStylePreview: (...args: unknown[]) => {
        previews.push(args);
        return "new.png";
      },
    });
    const { properties, panel } = initPanel();
    const { scene: s, page } = scene();
    const a = rect(page);
    const assigned: unknown[] = [];
    const style = {
      getProperty: (name: string) => (name === "name" ? "Red" : null),
      assignStyleFrom: (from: unknown) => assigned.push(from),
    };
    linked(a, style);
    let equal = false;
    vi.spyOn(a, "equalsStyle").mockImplementation(() => equal);
    properties.update(documentOf(s, t.commits), [a]);
    const sync = field(panel, "g-style-sync");
    expect(sync.classList.contains("g-disabled")).toBe(false);
    expect(field(panel, "g-styles-field").textContent).toBe("Red");
    const preview = field(panel, "g-styles-preview");
    expect(preview.children[0]?.getAttribute("src")).toBe("preview.png");
    fire(sync, "click");
    expect(assigned).toEqual([a]);
    expect(previews).toEqual([[style, true, false]]);
    expect(preview.children.map((c) => c.getAttribute("src"))).toEqual(["new.png"]);
    expect(sync.classList.contains("g-disabled")).toBe(true);
    // Disabled: a second click does nothing.
    fire(sync, "click");
    expect(assigned).toHaveLength(1);
    // In sync with its style: nothing to sync.
    equal = true;
    properties.update(documentOf(s, t.commits), [a]);
    expect(sync.classList.contains("g-disabled")).toBe(true);
  });

  it("shows Multiple Selection, disabled, for several elements with a shared style", () => {
    const { properties, panel } = initPanel();
    const { scene: s, page } = scene();
    const a = rect(page);
    const b = rect(page);
    linked(a, null);
    linked(b, {});
    properties.update(documentOf(s, t.commits), [a, b]);
    const styles = field(panel, "g-styles-field");
    expect(styles.textContent).toBe(str("GAppearanceProperties", "text.multiple-selection"));
    expect(styles.classList.contains("g-disabled")).toBe(true);
    expect(fake(field(panel, "g-styles-preview")).style.getPropertyValue("display")).toBe("none");
  });

  it("reads and writes through the element editor's selected parts", () => {
    const { properties, panel } = initPanel();
    const { scene: s, page } = scene();
    const a = rect(page);
    let opacities = [0.2, 0.2];
    const applied: unknown[] = [];
    vi.spyOn(ElementEditor, "getEditor").mockReturnValue({
      getPartsProperty: (name: string) =>
        name === "_stop" ? { values: opacities } : { values: ["screen", "multiply"] },
      applyPropertiesToParts: (names: string[], values: unknown[]) => {
        applied.push([names, values]);
        return true;
      },
    } as never);
    properties.update(documentOf(s, t.commits), [a]);
    expect((opacityBox(panel) as unknown as HTMLInputElement).value).toBe("20%");
    // The blend mode is the first part's.
    expect((byProperty(panel, "_sbl")[0] as unknown as HTMLSelectElement).value).toBe("screen");
    // Parts with different opacities: null, shown as 0.
    opacities = [0.2, 0.5];
    properties._updateProperties();
    expect((opacityBox(panel) as unknown as HTMLInputElement).value).toBe("0%");
    (opacityBox(panel) as unknown as HTMLInputElement).value = "60";
    fire(opacityBox(panel), "change");
    expect(applied).toEqual([[["_stop"], [0.6]]]);
    expect(a.getProperty("_stop")).toBe(1);
  });

  it("updates when an edge or facet of an inspected paths graph is selected", () => {
    const { properties } = initPanel();
    const { scene: s, page } = scene();
    const a = rect(page);
    properties.update(documentOf(s, t.commits), [a]);
    const updated = vi.spyOn(properties, "_updateProperties");
    const part = (proto: object, owner: unknown) =>
      Object.assign(Object.create(proto) as object, {
        getParent: () => ({ getParent: () => owner }),
      });
    const flag = (node: unknown, value = Node.Flag.Selected) =>
      properties._afterFlagChange({ flag: value, node } as never);
    flag(part(PGEdge.prototype, a));
    flag(part(PGFacet.prototype, a));
    expect(updated).toHaveBeenCalledTimes(2);
    flag(part(PGEdge.prototype, rect(page)));
    flag(part(PGEdge.prototype, a), Node.Flag.Highlighted);
    flag(Object.assign(new Rectangle(), { getParent: () => ({ getParent: () => a }) }));
    expect(updated).toHaveBeenCalledTimes(2);
  });

  it("shows the refresh icon instead of the Sync text in touch mode", () => {
    let touch = true;
    t.uninstall();
    t = installPaintTestDom({ isTouchEnabled: () => touch });
    const { properties, panel } = initPanel();
    const { scene: s, page } = scene();
    properties.update(documentOf(s, t.commits), [rect(page)]);
    const sync = field(panel, "g-style-sync");
    expect(sync.children.map((c) => c.className)).toEqual(["g-style-sync-refresh-item"]);
    touch = false;
    properties._settingChanged(new SettingChangedEvent("other", null, null));
    expect(sync.children).toHaveLength(1);
    properties._settingChanged(new SettingChangedEvent("touch", true, false));
    expect(sync.children).toHaveLength(0);
    expect(sync.textContent).toBe(str("GAppearanceProperties", "action.sync"));
  });
});

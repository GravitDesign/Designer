import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Page } from "../../engine/scene/page.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Scene } from "../../engine/scene/scene.ts";
import type { ContainerApi } from "../../engine/scene/node-container.ts";
import { EditorWorkspace } from "../../editor/editor-workspace.ts";
import { fire, type FakeElement } from "../menus/testing/fake-dom.testing.ts";
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

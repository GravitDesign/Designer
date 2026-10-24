// SceneProperties on a fake DOM: the unit, dpi, grid and color mode
// handlers, and the touch layout switch (color mode row below dpi, the
// dpi label, the unit title).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Page } from "../../engine/scene/page.ts";
import { Scene } from "../../engine/scene/scene.ts";
import type { ContainerApi } from "../../engine/scene/node-container.ts";
import { EditorWorkspace } from "../../editor/editor-workspace.ts";
import { SystemDialog } from "../dialogs/system-dialog.ts";
import type { Document } from "../document/document.ts";
import { FakeEvent, type FakeElement } from "../menus/testing/fake-dom.testing.ts";
import type { Designer } from "../shell/designer.ts";
import { resetGlobals, setDesigner } from "../shell/globals.ts";
import { SettingChangedEvent } from "../shell/setting-changed-event.ts";
import { installDocumentPanelsDom, type DocumentPanelsDom } from "./document-panels-dom.testing.ts";
import type { InspectedElements } from "./properties.ts";
import { SceneProperties } from "./scene-properties.ts";

let env: DocumentPanelsDom;
let touch: boolean;
let log: string[];
let settings: Record<string, unknown>;
let colorModeElms: unknown[][];

beforeEach(() => {
  env = installDocumentPanelsDom();
  touch = false;
  log = [];
  settings = {};
  colorModeElms = [];
});

afterEach(() => {
  vi.restoreAllMocks();
  resetGlobals();
  env.uninstall();
});

/** The panel inited and updated for the page of a fresh scene. */
function setup(withChild = false) {
  const scene = new Scene(new EditorWorkspace());
  const page = new Page();
  scene.appendChild(page);
  scene.setActivePage(page);
  if (withChild) (page as unknown as ContainerApi).appendChild(new Rectangle());
  const document = {
    getScene: () => scene,
    hasCDR: () => false,
    getEditor: () => ({
      beginTransaction: () => log.push("begin"),
      commitTransaction: (name: string) => log.push("commit " + name),
    }),
    setColorModeElms: (children: unknown[]) => colorModeElms.push(children),
  } as unknown as Document;
  setDesigner({
    addEventListener() {},
    removeEventListener() {},
    stats: (...args: unknown[]) => log.push("stats " + args.join(" ")),
    isTouchEnabled: () => touch,
    getSetting: (key: string, fallback: unknown) => (key in settings ? settings[key] : fallback),
    setSetting: (key: string, value: unknown) => (settings[key] = value),
    getActiveDocument: () => document,
  } as unknown as Designer);
  const panel = env.make("div");
  const properties = new SceneProperties();
  properties.init(panel as unknown as HTMLElement, env.make("div") as unknown as HTMLElement);
  expect(properties.update(document, [page] as unknown as InspectedElements)).toBe(true);
  return { scene, page, panel, properties };
}

function find(root: FakeElement, selector: string): FakeElement {
  const found = root.querySelector(selector);
  if (!found) throw new Error("No element for " + selector);
  return found;
}

function change(element: FakeElement, value?: string): void {
  if (value !== undefined) element.value = value;
  element.dispatchEvent(new FakeEvent("change"));
}

describe("SceneProperties handlers", () => {
  it("writes the unit in its own transaction", () => {
    const { scene, panel } = setup();
    change(find(panel, 'select[data-property="ut"]'), "mm");
    expect(scene.getProperty("ut")).toBe("mm");
    expect(log).toEqual([
      "stats sceneproperties_change_canvas-unit mm",
      "begin",
      "commit Change canvas unit",
    ]);
  });

  it("writes the grid sizes in their own transactions", () => {
    // The restore branch (stringToPoint null) isn't reachable through the
    // box: its value() reads unparsable text as "0".
    const { scene, panel } = setup();
    change(find(panel, 'input[data-property="gx"]'), "25");
    change(find(panel, 'input[data-property="gy"]'), "30");
    change(find(panel, 'input[data-property="gaw"]'), "40");
    expect([scene.getProperty("gx"), scene.getProperty("gy"), scene.getProperty("gaw")]).toEqual([
      25, 30, 40,
    ]);
    expect(log.filter((entry) => entry.startsWith("stats"))).toEqual([
      "stats sceneproperties_change_rect-grid-settings width",
      "stats sceneproperties_change_rect-grid-settings height",
      "stats sceneproperties_change_axono-grid-settings size",
    ]);
    expect(log.filter((entry) => entry.startsWith("commit"))).toEqual(
      Array(3).fill("commit Change grid settings"),
    );
  });

  it("falls back to 72 dpi for an empty dpi box", () => {
    const { scene, panel } = setup();
    scene.setProperty("dpi", 300);
    const field = find(panel, '[data-property="dpi"]');
    find(field, "input").value = "";
    change(field);
    expect(scene.getProperty("dpi")).toBe(72);
    expect(log).toEqual([
      "stats sceneproperties_change_canvas-dpi 72",
      "begin",
      "commit Change canvas dpi",
    ]);
  });

  it("switches the grid mode and shows its row", () => {
    const { scene, panel } = setup();
    const radio = find(panel, 'input[data-property="gm-axo"]');
    change(radio);
    expect(scene.getProperty("gm")).toBe("axo");
    const rows = panel.querySelectorAll("[data-grid-mode]");
    expect(rows.map((row) => row.style.getPropertyValue("display"))).toEqual(["none", ""]);
    change(find(panel, 'input[data-property="gm-"]'));
    expect(scene.getProperty("gm")).toBe(null);
    expect(log.filter((entry) => entry.startsWith("stats"))).toEqual([
      "stats sceneproperties_change_grid-mode isometric",
      "stats sceneproperties_change_grid-mode off",
    ]);
  });

  it("reminds about existing content when the color mode changes, and recolors it", () => {
    const alert = vi.spyOn(SystemDialog, "alert").mockImplementation(() => undefined as never);
    const { scene, page, panel } = setup(true);
    change(find(panel, 'select[data-property="cm"]'), "CMYK");
    expect(alert).toHaveBeenCalledTimes(1);
    expect(settings.color_mode).toBe("CMYK");
    expect(scene.getProperty("cm")).toBe("CMYK");
    expect(colorModeElms).toEqual([page.getChildren()]);
    expect(log.slice(-2)).toEqual(["begin", "commit Change color mode"]);
  });

  it("changes the color mode of an empty page without the reminder", () => {
    const alert = vi.spyOn(SystemDialog, "alert").mockImplementation(() => undefined as never);
    const { panel } = setup(false);
    change(find(panel, 'select[data-property="cm"]'), "HSB");
    expect(alert).not.toHaveBeenCalled();
    expect(colorModeElms).toHaveLength(1);
  });
});

describe("SceneProperties touch layout", () => {
  const order = (panel: FakeElement) =>
    panel.children
      .filter((child) => child.tagName === "DIV")
      .map((child) =>
        child._classes.filter((name) => name !== "g-property-row" && name !== "no-label").join(" "),
      );

  it("moves the color mode row below dpi and labels the dpi box, and back", () => {
    const { panel, properties } = setup();
    const desktop = [
      "unit-row",
      "color-mode-row",
      "dpi-row",
      "grid-mode",
      "grid-mode-type",
      "grid-mode-type",
    ];
    expect(order(panel)).toEqual(desktop);
    expect(find(panel, ".unit-title-column span").textContent).toBe("Unit");

    touch = true;
    properties._settingChanged(new SettingChangedEvent("touch", false, true));
    expect(order(panel)).toEqual([
      "unit-row",
      "dpi-row",
      "color-mode-row",
      // the grid is off: no mode-on
      "grid-mode",
      "grid-mode-type",
      "grid-mode-type",
    ]);
    const dpiText = panel.querySelectorAll(".dpi-text");
    expect(dpiText).toHaveLength(1);
    expect(dpiText[0]?.textContent).toBe("DPI");
    expect(find(panel, ".unit-title-column span").textContent).toBe("Units");
    // turning the grid on re-runs the layout: mode-on, and no second label
    change(find(panel, 'input[data-property="gm-box"]'));
    expect(find(panel, ".grid-mode").classList.contains("mode-on")).toBe(true);
    expect(panel.querySelectorAll(".dpi-text")).toHaveLength(1);

    touch = false;
    properties._settingChanged(new SettingChangedEvent("touch", true, false));
    expect(order(panel)).toEqual(desktop);
    expect(panel.querySelectorAll(".dpi-text")).toHaveLength(0);
    expect(find(panel, ".unit-title-column span").textContent).toBe("Unit");
  });
});

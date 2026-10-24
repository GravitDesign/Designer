import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Ellipse } from "../../engine/scene/ellipse.ts";
import { Page } from "../../engine/scene/page.ts";
import { Path } from "../../engine/scene/path.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Scene } from "../../engine/scene/scene.ts";
import type { ContainerApi } from "../../engine/scene/node-container.ts";
import { BorderPaintLayer } from "../../engine/style/border-paint-layer.ts";
import type { PaintLayers } from "../../engine/style/paint-layers.ts";
import { BorderAlignment } from "../../engine/style/stylable-sets.ts";
import { Text } from "../../engine/text/text.ts";
import { EditorWorkspace } from "../../editor/editor-workspace.ts";
import { ModifiedEvent } from "../../editor/editor.ts";
import { StyleEdManager } from "../../editor/style-ed-manager.ts";
import { Overlay } from "../dialogs/dialog-container.ts";
import type { Document } from "../document/document.ts";
import {
  fake,
  FakeElement,
  installFakeDom,
  type FakeDomHandle,
} from "../menus/testing/fake-dom.testing.ts";
import type { Designer } from "../shell/designer.ts";
import { setDesigner } from "../shell/globals.ts";
import { BorderProperties, newBorderAlignment } from "./border-properties.ts";

// The real paint field builds the chooser popup, which needs a browser DOM.
vi.mock("./color-deps.ts", () => import("./color-deps.testing.ts"));

// The fake DOM has no element classes; paint-dom's `:input` check uses them.
const TAGS: Record<string, string> = {
  HTMLInputElement: "INPUT",
  HTMLSelectElement: "SELECT",
  HTMLTextAreaElement: "TEXTAREA",
  HTMLButtonElement: "BUTTON",
};
const g = globalThis as unknown as Record<string, unknown>;
const savedClasses: Record<string, unknown> = {};

/**
 * The selectors the panel queries (attributes, descendant and child
 * combinators, :first-child, :last-child), which the shared fake DOM's
 * matcher doesn't have.
 */
function matchCompound(element: FakeElement, compound: string): boolean {
  const re =
    /^([a-z*]+)|\.([\w-]+)|\[([\w-]+)(?:(\^?=)"?([^"\]]*)"?)?\]|:(first-child|last-child)/gi;
  let rest = compound;
  let m: RegExpExecArray | null;
  re.lastIndex = 0;
  while (rest.length && (m = re.exec(rest)) && m.index === 0) {
    const [all, tag, cls, attr, op, value, pseudo] = m;
    if (tag && tag !== "*" && element.tagName.toLowerCase() !== tag.toLowerCase()) return false;
    if (cls && !element.classList.contains(cls)) return false;
    if (attr) {
      const actual = element.getAttribute(attr);
      if (actual === null) return false;
      if (op === "=" && actual !== value) return false;
      if (op === "^=" && !actual.startsWith(value as string)) return false;
    }
    if (pseudo) {
      const siblings = element.parentElement ? element.parentElement.children : [element];
      const index = siblings.indexOf(element);
      if (pseudo === "first-child" && index !== 0) return false;
      if (pseudo === "last-child" && index !== siblings.length - 1) return false;
    }
    rest = rest.slice(all.length);
    re.lastIndex = 0;
  }
  return rest.length === 0;
}

/** `parts` alternate compound, combinator (">" or " "), compound, ... */
function matchChain(element: FakeElement | null, parts: string[]): boolean {
  if (!element) return false;
  const last = parts[parts.length - 1] as string;
  if (last === ":scope") return true;
  if (!matchCompound(element, last)) return false;
  if (parts.length === 1) return true;
  const combinator = parts[parts.length - 2];
  const before = parts.slice(0, -2);
  if (combinator === ">") return matchChain(element.parentElement, before);
  for (let n = element.parentElement; n; n = n.parentElement)
    if (matchChain(n, before)) return true;
  return false;
}

const savedMatches = FakeElement.prototype.matches;
function patchMatches(): void {
  FakeElement.prototype.matches = function (this: FakeElement, selector: string): boolean {
    return selector.split(",").some((one) => {
      const parts = one
        .trim()
        .split(/\s*(>)\s*|\s+/)
        .map((part) => (part === undefined ? " " : part))
        .filter((part) => part !== "");
      return matchChain(this, parts);
    });
  };
}

let dom: FakeDomHandle;
let commits: { name: unknown; data: unknown }[];

beforeEach(() => {
  dom = installFakeDom();
  patchMatches();
  for (const [name, tag] of Object.entries(TAGS)) {
    savedClasses[name] = g[name];
    g[name] = {
      [Symbol.hasInstance]: (value: unknown) => (value as FakeElement | null)?.tagName === tag,
    };
  }
  commits = [];
  const styleEdManager = new StyleEdManager();
  setDesigner({
    stats() {},
    isTouchEnabled: () => false,
    getOpacityIncrement: () => 1,
    getActiveDocument: () => null,
    getWorkspace: () => ({ getStyleEdManager: () => styleEdManager }),
    getRightSidebars: () => ({ getSidebar: () => ({ trigger() {} }) }),
    setMouseOverContext() {},
    getContextMenu: () => ({ trigger() {} }),
  } as unknown as Designer);
});

afterEach(() => {
  setDesigner(null);
  FakeElement.prototype.matches = savedMatches;
  for (const name of Object.keys(TAGS)) g[name] = savedClasses[name];
  dom.uninstall();
});

function descendants(root: FakeElement): FakeElement[] {
  const out: FakeElement[] = [];
  const walk = (node: FakeElement) => {
    for (const child of node.children) {
      out.push(child);
      walk(child);
    }
  };
  walk(root);
  return out;
}

const byProperty = (root: FakeElement, property: string) =>
  descendants(root).filter((e) => e.getAttribute("data-property") === property);

function rectWithBorders(count: number): { scene: Scene; rect: Rectangle } {
  const scene = new Scene(new EditorWorkspace());
  const page = new Page();
  scene.appendChild(page);
  const rect = new Rectangle();
  (page as unknown as ContainerApi).appendChild(rect);
  for (let i = 0; i < count; ++i) {
    const layer = new BorderPaintLayer();
    layer.setProperty("_bw", i + 1);
    (rect.getPaintLayers() as PaintLayers).appendChild(layer);
  }
  return { scene, rect };
}

function documentOf(scene: Scene): Document {
  const editor = {
    beginTransaction() {},
    commitTransaction(name: unknown, data: unknown) {
      commits.push({ name, data });
    },
    hideSelection() {},
    resetHideSelection() {},
  };
  return {
    getScene: () => scene,
    getEditor: () => editor,
    updateActiveStylesList() {},
    hasCDR: () => false,
  } as unknown as Document;
}

function initPanel(): { properties: BorderProperties; panel: FakeElement; toolbar: FakeElement } {
  const panel = dom.document.createElement("div");
  const toolbar = dom.document.createElement("div");
  toolbar.classList.add("toolbar");
  const properties = new BorderProperties();
  properties.init(panel as unknown as HTMLElement, toolbar as unknown as HTMLElement);
  return { properties, panel, toolbar };
}

describe("newBorderAlignment", () => {
  it("puts borders outside texts, inside shapes and centred on open arcs", () => {
    expect(newBorderAlignment(new Text())).toBe(BorderAlignment.Outside);
    expect(newBorderAlignment(new Rectangle())).toBe(BorderAlignment.Inside);
    const arc = new Ellipse();
    arc.setProperty("etp", Ellipse.Type.Arc);
    expect(newBorderAlignment(arc)).toBe(BorderAlignment.Center);
    expect(newBorderAlignment(new Ellipse())).toBe(BorderAlignment.Inside);
  });

  it("aligns open paths inside, since paths are shapes (old quirk)", () => {
    const path = new Path();
    path.setProperty("closed", false);
    expect(newBorderAlignment(path)).toBe(BorderAlignment.Inside);
  });
});

describe("BorderProperties", () => {
  it("keeps the inherited toString", () => {
    expect(new BorderProperties().toString()).toBe("[Object GProperties]");
  });

  it("builds the toolbar and the advanced stroke settings", () => {
    const { properties, toolbar, panel } = initPanel();
    expect([...panel.classList]).toEqual(["border-properties-panel"]);
    expect([...toolbar.classList]).toEqual(["toolbar", "list-toolbar", "border-toolbar"]);
    expect(
      toolbar.children.map((c) => c.tagName + ":" + (c.getAttribute("data-action") ?? "")),
    ).toEqual(["LABEL:", "BUTTON:stroke-settings", "BUTTON:remove", "BUTTON:add"]);
    const advanced = fake(properties._advancedStrokePanel);
    expect(advanced.style.getPropertyValue("width")).toBe("280px");
    const wrapper = fake(
      (Overlay.of(properties._advancedStrokePanel as HTMLElement) as Overlay).getElement(),
    );
    expect([...wrapper.classList]).toEqual(["g-overlay", "border-settings"]);
    expect(advanced.children.map((c) => c.tagName + "." + c.className)).toEqual([
      "DIV.g-property-row no-label justified",
      "DIV.g-property-row no-label justified",
      "HR.",
      "DIV.g-property-row no-label",
      "HR.",
      "P.",
      "DIV.g-property-row no-label",
      "DIV.g-property-row no-label",
      "DIV.g-property-row no-label",
      "DIV.g-property-row no-label",
      "DIV.g-property-row no-label",
      "DIV.g-property-row no-label",
    ]);
    expect(byProperty(advanced, "_bds")).toHaveLength(4);
    // Dash inputs are form controls, so their columns are labels with captions.
    const dashRow = advanced.children[3] as FakeElement;
    expect(dashRow.children.map((c) => c.className)).toEqual(["columns", "labels"]);
    expect((dashRow.children[0] as FakeElement).children.map((c) => c.tagName)).toEqual([
      "LABEL",
      "LABEL",
      "LABEL",
      "LABEL",
    ]);
    expect(byProperty(advanced, "_blj-miter").map((b) => b.className)).toEqual([
      "g-icon g-flat g-group-element",
    ]);
  });

  it("shows one row per border, newest layer first, and selects the last inserted", () => {
    const { properties, panel, toolbar } = initPanel();
    const { scene, rect } = rectWithBorders(2);
    const layers = (rect.getPaintLayers() as PaintLayers).getBorderLayers();
    expect(properties.update(documentOf(scene), [rect])).toBe(true);
    const blocks = panel.children.filter((c) => c.classList.contains("border-block"));
    expect(blocks).toHaveLength(2);
    expect([...(blocks[0] as FakeElement).classList].slice(0, 4)).toEqual([
      "border-block",
      "g-cursor-hand-open",
      "g-property-row",
      "no-label",
    ]);
    expect((blocks[0] as FakeElement).getAttribute("data-drag-mode")).toBe("1");
    expect(properties._getSelectedPaintLayer()).toBe(layers[1]);
    expect((blocks[0] as FakeElement).classList.contains("g-selected")).toBe(true);
    expect((blocks[1] as FakeElement).classList.contains("g-selected")).toBe(false);
    expect(toolbar.classList.contains("empty-list")).toBe(false);
    // The width boxes show the layer's width (two per row: normal and touch;
    // with no active document the unit is shown).
    expect(byProperty(blocks[1] as FakeElement, "_bw").map((i) => i.value)).toEqual(["1px", "1px"]);
  });

  it("marks the toolbar empty without borders", () => {
    const { properties, toolbar } = initPanel();
    const { scene, rect } = rectWithBorders(0);
    expect(properties.update(documentOf(scene), [rect])).toBe(true);
    expect(toolbar.classList.contains("empty-list")).toBe(true);
    const settings = toolbar.children[1] as FakeElement;
    expect(settings.style.display).toBe("none");
  });

  it("takes elements by their fill property set, as the old panel did", () => {
    const { properties } = initPanel();
    const { scene } = rectWithBorders(0);
    const bordersOnly = {
      hasMixin: () => true,
      getStylePropertySets: () => ["BL"],
    };
    expect(properties.update(documentOf(scene), [bordersOnly as never])).toBe(false);
    expect(properties.update(null, [])).toBe(false);
  });

  it("changes the border at the same index of every inspected element", () => {
    const { properties } = initPanel();
    const a = rectWithBorders(2);
    const b = { rect: new Rectangle() };
    (a.scene.getFirstChild() as unknown as ContainerApi).appendChild(b.rect);
    for (let i = 0; i < 2; ++i) {
      const border = new BorderPaintLayer();
      border.setProperty("_bw", i + 1);
      (b.rect.getPaintLayers() as PaintLayers).appendChild(border);
    }
    properties.update(documentOf(a.scene), [a.rect, b.rect]);
    const layer = (a.rect.getPaintLayers() as PaintLayers).getBorderLayers()[1] as BorderPaintLayer;
    properties._assign(layer, ["_bw"], [7]);
    expect(
      (b.rect.getPaintLayers() as PaintLayers).getBorderLayers().map((l) => l.getProperty("_bw")),
    ).toEqual([1, 7]);
    expect(
      (a.rect.getPaintLayers() as PaintLayers).getBorderLayers().map((l) => l.getProperty("_bw")),
    ).toEqual([1, 7]);
    expect(commits).toHaveLength(1);
    expect(commits[0]?.data).toBeNull();
    // Chooser changes carry the border index for undo.
    properties._assign(layer, ["_op"], [0.5], false, { chooserOn: true, activeStopIdx: 2 });
    expect(commits[1]?.data).toEqual({ borderLayerIndex: 1, chooserOn: true, activeStopIdx: 2 });
    // Temporary changes skip the transaction.
    properties._assign(layer, ["_bw"], [9], true);
    expect(commits).toHaveLength(2);
  });

  it("throws on undo with the chooser open, as the old undefined $element did", () => {
    const { properties } = initPanel();
    const { scene, rect } = rectWithBorders(1);
    properties.update(documentOf(scene), [rect]);
    const layer = (rect.getPaintLayers() as PaintLayers).getBorderLayers()[0] as BorderPaintLayer;
    expect(() =>
      properties._updatePaintLayer(layer, {
        evtType: ModifiedEvent.Type.Undo,
        chooserOn: true,
        borderLayerIndex: 0,
      }),
    ).toThrow(ReferenceError);
    expect(() =>
      properties._updatePaintLayer(layer, { evtType: ModifiedEvent.Type.Raw, chooserOn: true }),
    ).not.toThrow();
  });
});

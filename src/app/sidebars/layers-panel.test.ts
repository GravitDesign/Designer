import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RGBColor } from "../../engine/color/rgb-color.ts";
import { Platform } from "../../engine/core/platform.ts";
import { Block } from "../../engine/scene/block.ts";
import { Group } from "../../engine/scene/group.ts";
import { Layer } from "../../engine/scene/layer.ts";
import { Node } from "../../engine/scene/node.ts";
import type { Page } from "../../engine/scene/page.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Ellipse } from "../../engine/scene/ellipse.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Symbol } from "../../engine/scene/symbol.ts";
import { EditorWorkspace } from "../../editor/editor-workspace.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import { Editor } from "../../editor/editor.ts";
import { ContextMenuContext } from "../menus/context-menu.ts";
import { setDesigner } from "../shell/globals.ts";
import { SettingChangedEvent } from "../shell/setting-changed-event.ts";
import { getIconByLayerType, getLayerOrItemStatus } from "./layer-item.ts";
import { LayerPanel } from "./layers-panel.ts";
import {
  classHeights,
  fireEvent,
  installTreeDom,
  type TestElement,
} from "./testing/tree-dom.testing.ts";

// The layer colour is the colour cluster's pattern chooser; these tests
// fire its patternchange event themselves.
vi.mock("../inspector/color-deps.ts", () => ({
  patternChooser: (element: unknown) => element,
  chooserOf: () => null,
  eventArgs: (event: { detail?: unknown }) => (Array.isArray(event.detail) ? event.detail : []),
}));

let dom: ReturnType<typeof installTreeDom>;
let settings: Record<string, unknown>;
let designerRemoved: unknown[];
let triggered: unknown[];
let editor: Editor | null;

beforeEach(() => {
  vi.useFakeTimers();
  dom = installTreeDom();
  classHeights["layer-row"] = 34;
  triggered = [];
  editor = null;
  settings = {};
  designerRemoved = [];
  setDesigner({
    isTouchEnabled: () => false,
    stats() {},
    getActiveDocument: () => (editor ? { getEditor: () => editor } : null),
    getSetting: (key: string, value?: unknown) => (key in settings ? settings[key] : value),
    setSetting() {},
    addEventListener() {},
    removeEventListener: (type: unknown) => designerRemoved.push(type),
    getContextMenu: () => ({ trigger: (options: unknown) => triggered.push(options) }),
  } as never);
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  setDesigner(null);
  dom.uninstall();
  delete classHeights["layer-row"];
  Platform.modifiers.optionKey = false;
});

function named<T extends Node>(node: T, name: string): T {
  (node as unknown as { setProperty(n: string, v: unknown): void }).setProperty("name", name);
  return node;
}

function setup() {
  const scene = new Scene(new EditorWorkspace());
  editor = new Editor(scene);
  const page = scene.getActivePage() as Page;
  const a = named(new Rectangle(), "A");
  const group = named(new Group(), "G");
  const inner = named(new Ellipse(), "inner");
  page.appendChild(a);
  page.appendChild(group);
  group.appendChild(inner);
  const element = dom.document.createElement("div");
  element.box = { x: 0, y: 0, width: 249, height: 600 };
  dom.document.body.appendChild(element);
  const clicked: (Node | null)[] = [];
  const panel = new LayerPanel(element as unknown as HTMLElement, {
    clickCallback: (node) => clicked.push(node),
  });
  panel.scene(scene);
  panel.vtree.requestInvalidation(true);
  return { scene, page, a, group, inner, element, panel, clicked };
}

function rows(element: TestElement): TestElement[] {
  return element.children.filter((child) => child.id === "rowId" && child.style.display !== "none");
}

function titles(element: TestElement): string[] {
  return rows(element).map(
    (row) => row.querySelector<TestElement>(".layer-title")?.textContent ?? "",
  );
}

describe("GLayerPanel", () => {
  it("lists the active page's children front first, with the old row structure", () => {
    const { element } = setup();
    expect(titles(element)).toEqual(["G", "A"]);
    const [groupRow, rectRow] = rows(element) as [TestElement, TestElement];
    expect(rectRow.className).toBe("layer-row");
    expect(rectRow.getAttribute("draggable")).toBe("false");
    expect(rectRow.children.map((child) => child.className)).toEqual([
      "layer-title-group",
      "layer-action layer-lock gravit-icon-unlock",
      "layer-action layer-visibility gravit-icon-display",
    ]);
    const group = rectRow.children[0] as TestElement;
    expect(group.getAttribute("draggable")).toBe("true");
    expect(group.getAttribute("data-drag-mode")).toBe("1");
    expect(group.children.map((child) => child.className)).toEqual([
      "layer-icon gravit-icon-rectangle",
      "layer-title",
    ]);
    expect((group.children[0] as TestElement).style.cssText).toBe("opacity: initial;");
    expect((groupRow.children[0] as TestElement).className).toBe("layer-arrow gravit-icon-right");
    expect((groupRow.children[0] as TestElement).id).toBe("xpndId");
  });

  it("adds a row for an inserted element and removes it again", () => {
    const { page, element, panel } = setup();
    const b = named(new Rectangle(), "B");
    page.appendChild(b);
    panel.vtree.requestInvalidation(true);
    expect(titles(element)).toEqual(["B", "G", "A"]);
    page.removeChild(b);
    panel.vtree.requestInvalidation(true);
    expect(titles(element)).toEqual(["G", "A"]);
  });

  it("skips elements inserted into another page", () => {
    const { scene, element, panel } = setup();
    const other = scene.insertPage();
    other.appendChild(named(new Rectangle(), "elsewhere"));
    panel.vtree.requestInvalidation(true);
    expect(titles(element)).toEqual(["G", "A"]);
  });

  it("rebuilds the rows when another page becomes active", () => {
    const { scene, element, panel } = setup();
    const other = scene.insertPage();
    other.appendChild(named(new Rectangle(), "second page"));
    scene.setActivePage(other);
    panel.vtree.requestInvalidation(true);
    expect(titles(element)).toEqual(["second page"]);
  });

  it("hides a node, and with Alt the siblings that differ", () => {
    const { a, group, panel } = setup();
    panel.toggleHideStatusOfLayerOrItem(a);
    expect(a.getProperty("vis")).toBe(false);
    Platform.modifiers.optionKey = true;
    panel.toggleHideStatusOfLayerOrItem(group);
    expect(group.getProperty("vis")).toBe(false);
    // A was hidden already: Alt leaves nodes that have the new value.
    expect(a.getProperty("vis")).toBe(false);
  });

  it("locks fully and unlocks, but not below a fully locked parent", () => {
    const { a, group, inner, panel } = setup();
    a.setFlag(Node.Flag.Selected as number);
    panel.toggleLockStatusOfLayerOrItem(a);
    expect(a.getProperty("lkt")).toBe(Block.LockType.Full);
    expect(a.hasFlag(Node.Flag.Selected as number)).toBe(false);
    panel.toggleLockStatusOfLayerOrItem(a);
    expect(a.getProperty("lkt")).toBe(null);
    group.setProperty("lkt", Block.LockType.Full);
    panel.toggleLockStatusOfLayerOrItem(inner);
    expect(inner.getProperty("lkt")).toBe(null);
  });

  it("opens the row menu with the layer panel context and selects an unselected row first", () => {
    const { a, element, clicked } = setup();
    const row = rows(element)[1] as TestElement;
    fireEvent(row, "contextmenu", { pageX: 30, pageY: 40, clientX: 30, clientY: 40 });
    expect(clicked).toEqual([a]);
    expect(triggered).toEqual([
      {
        pageX: 30,
        pageY: 40,
        clientX: 30,
        clientY: 40,
        data: { context: ContextMenuContext.LayerPanel },
      },
    ]);
  });

  it("gives the actions the title of a row to rename", () => {
    const { element, panel } = setup();
    const row = rows(element)[1] as TestElement;
    const title = panel.getTitleOfLayer(row);
    expect(title.element).toBe(row.children[0]);
    title.openAutoEdit();
    const input = dom.document.body.querySelector<TestElement>(".g-auto-edit");
    expect(input?.value).toBe("A");
  });

  it("shows a layer name as text, not as markup (BF-119)", () => {
    const { a, element, panel } = setup();
    a.setProperty("name", "a <b>x</b>");
    panel.vtree.requestInvalidation(true);
    const title = rows(element)[1]?.querySelector<TestElement>(".layer-title") as TestElement;
    // Stored with < and > escaped by the engine, and shown as stored.
    expect(title.textContent).toBe("a &lt;b&gt;x&lt;/b&gt;");
    expect(title.children).toEqual([]);
  });

  it("maps tree nodes back to their elements", () => {
    const { a, panel } = setup();
    const treeNode = panel.getTreeNode(a);
    expect(treeNode && panel.getItem(treeNode)).toBe(a);
  });
});

describe("layer item helpers", () => {
  it("picks the folder icon of a layer by its expanded state, and symbol icons by role", () => {
    expect(getIconByLayerType(new Layer(), true).icon).toBe("gravit-icon-folderopen");
    expect(getIconByLayerType(new Layer(), false).icon).toBe("gravit-icon-folderclose");
    expect(getIconByLayerType(new Group(), false).icon).toBe("gravit-icon-group");
    expect(getIconByLayerType(new Ellipse(), false).icon).toBe("gravit-icon-ellipse");
  });

  it("reports hidden, locked and outlined parents", () => {
    const scene = new Scene(new Workspace());
    const page = scene.getActivePage() as Page;
    const layer = new Layer();
    const rect = new Rectangle();
    page.appendChild(layer);
    layer.appendChild(rect);
    layer.setProperty("vis", false);
    layer.setProperty("lkt", Block.LockType.Partial);
    layer.setProperty("otl", true);
    const status = getLayerOrItemStatus(rect);
    expect(status.parentHidden).toBe(true);
    expect(status.isHidden).toBe(true);
    expect(status.parentLockType).toBe(Block.LockType.Partial);
    expect(status.parentOutlined).toBe(true);
    rect.setFlag(Node.Flag.Selected as number);
    expect(getLayerOrItemStatus(layer).hasSelection).toBe(true);
  });
});

describe("GLayerPanel risky branches", () => {
  function setupLayers() {
    const scene = new Scene(new EditorWorkspace());
    editor = new Editor(scene);
    const page = scene.getActivePage() as Page;
    const outer = named(new Layer(), "Outer");
    const inner = named(new Layer(), "Inner");
    const other = named(new Layer(), "Other");
    const rect = named(new Rectangle(), "R");
    page.appendChild(outer);
    outer.appendChild(inner);
    outer.appendChild(other);
    inner.appendChild(rect);
    const element = dom.document.createElement("div");
    element.box = { x: 0, y: 0, width: 249, height: 600 };
    dom.document.body.appendChild(element);
    const panel = new LayerPanel(element as unknown as HTMLElement, {});
    panel.scene(scene);
    panel.vtree.requestInvalidation(true);
    return { scene, page, outer, inner, other, rect, element, panel };
  }

  function rowOf(element: TestElement, title: string): TestElement {
    const row = rows(element).find(
      (candidate) => candidate.querySelector<TestElement>(".layer-title")?.textContent === title,
    );
    if (!row) throw new Error("no row " + title);
    return row;
  }

  function expandAll(panel: LayerPanel, ...nodes: Node[]): void {
    for (const node of nodes) {
      const treeNode = panel.getTreeNode(node);
      if (treeNode) treeNode.expanded = true;
    }
    panel.vtree._updateRowCount();
    panel.vtree.requestInvalidation(true);
  }

  it("doesn't toggle the outline of a layer under a hidden parent", () => {
    const { outer, inner, element, panel } = setupLayers();
    expandAll(panel, outer);
    outer.setProperty("vis", false);
    panel.vtree.requestInvalidation(true);
    fireEvent(rowOf(element, "Inner").querySelector(".layer-outline"), "click");
    expect(inner.getProperty("otl")).toBe(false);
    outer.setProperty("vis", true);
    panel.vtree.requestInvalidation(true);
    fireEvent(rowOf(element, "Inner").querySelector(".layer-outline"), "click");
    expect(inner.getProperty("otl")).toBe(true);
  });

  it("recolours the child layers that had the old colour, and skips temporary changes", () => {
    const { outer, inner, other, element } = setupLayers();
    const red = new RGBColor([255, 0, 0]);
    const blue = new RGBColor([0, 0, 255]);
    const green = new RGBColor([0, 255, 0]);
    outer.setProperty("cls", red);
    inner.setProperty("cls", red);
    other.setProperty("cls", green);
    const color = rowOf(element, "Outer").querySelector(".layer-color");
    fireEvent(color, "patternchange", { detail: [blue, 1, true] });
    expect(outer.getProperty("cls")).toBe(red);
    fireEvent(color, "patternchange", { detail: [blue, 1, false] });
    expect(outer.getProperty("cls")).toBe(blue);
    expect(inner.getProperty("cls")).toBe(blue);
    expect(other.getProperty("cls")).toBe(green);
  });

  it("with onlyUpdateStyle updates the row classes on the next tick instead of rendering", () => {
    const { a, element, panel } = setup();
    const before = rows(element)[1] as TestElement;
    const invalidate = vi.spyOn(panel.vtree, "requestInvalidation");
    panel.onlyUpdateStyle(true);
    a.setFlag(Node.Flag.Selected as number);
    expect(before.classList.contains("g-selected")).toBe(false);
    vi.advanceTimersByTime(0);
    expect(before.classList.contains("g-selected")).toBe(true);
    expect(invalidate).not.toHaveBeenCalled();
    panel.onlyUpdateStyle(false);
    a.removeFlag(Node.Flag.Selected as number);
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it("expands and focuses a selected node's parents with auto_expand_layers", () => {
    settings.auto_expand_layers = true;
    const { group, inner, element, panel } = setup();
    expect(titles(element)).toEqual(["G", "A"]);
    inner.setFlag(Node.Flag.Selected as number);
    vi.advanceTimersByTime(25);
    expect(titles(element)).toEqual(["G", "inner", "A"]);
    expect(panel.currentFocus).toBe(panel.getTreeNode(inner));
    expect(panel.getTreeNode(group)?.expanded).toBe(true);
  });

  it("doesn't expand without auto_expand_layers", () => {
    const { inner, element } = setup();
    inner.setFlag(Node.Flag.Selected as number);
    vi.advanceTimersByTime(25);
    expect(titles(element)).toEqual(["G", "A"]);
  });

  it("marks a collapsed group with a selected or highlighted child", () => {
    const { inner, element, panel } = setup();
    inner.setFlag(Node.Flag.Selected as number);
    inner.setFlag(Node.Flag.Highlighted as number);
    panel.vtree.requestInvalidation(true);
    const groupRow = rows(element)[0] as TestElement;
    expect(groupRow.classList.contains("g-has-selection")).toBe(true);
    expect(groupRow.classList.contains("g-highlighted-row")).toBe(true);
    panel.setBlockHighlight(true);
    inner.removeFlag(Node.Flag.Highlighted as number);
    panel.vtree.requestInvalidation(true);
    // With highlighting blocked the row keeps no highlight class at all.
    expect((rows(element)[0] as TestElement).classList.contains("g-highlighted-row")).toBe(false);
  });

  it("ignores a blank rename", () => {
    const { a, element, panel } = setup();
    const title = panel.getTitleOfLayer(rows(element)[1]);
    title.openAutoEdit();
    const input = dom.document.body.querySelector<TestElement>(".g-auto-edit") as TestElement;
    input.value = "   ";
    fireEvent(input, "blur");
    expect(a.getProperty("name")).toBe("A");
    title.openAutoEdit();
    const again = dom.document.body.querySelector<TestElement>(".g-auto-edit") as TestElement;
    again.value = "B";
    fireEvent(again, "blur");
    expect(a.getProperty("name")).toBe("B");
  });

  it("locks under a partially locked parent but doesn't unlock there", () => {
    const { group, inner, panel } = setup();
    group.setProperty("lkt", Block.LockType.Partial);
    panel.toggleLockStatusOfLayerOrItem(inner);
    expect(inner.getProperty("lkt")).toBe(Block.LockType.Full);
    panel.toggleLockStatusOfLayerOrItem(inner);
    expect(inner.getProperty("lkt")).toBe(Block.LockType.Full);
  });

  it("removes all its scene listeners when the scene is set to null", () => {
    const { scene, page, element, panel } = setup();
    const removed: unknown[] = [];
    const remove = scene.removeEventListener.bind(scene);
    vi.spyOn(scene, "removeEventListener").mockImplementation(((
      type: unknown,
      ...rest: unknown[]
    ) => {
      removed.push(type);
      return (remove as (...args: unknown[]) => unknown)(type, ...rest);
    }) as never);
    const fontManager = scene.getWorkspace()?.getFontManager();
    const fontRemoved = fontManager ? vi.spyOn(fontManager, "removeEventListener") : null;
    panel.scene(null);
    expect(designerRemoved).toEqual([SettingChangedEvent]);
    if (fontRemoved) expect(fontRemoved).toHaveBeenCalledTimes(1);
    expect(removed).toEqual([
      Node.AfterInsertEvent,
      Node.BeforeRemoveEvent,
      Node.AfterPropertiesChangeEvent,
      Node.AfterFlagChangeEvent,
      Symbol.AfterSiblingUpdate,
    ]);
    page.appendChild(named(new Rectangle(), "late"));
    vi.advanceTimersByTime(25);
    expect(titles(element)).toEqual([]);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Platform } from "../../engine/core/platform.ts";
import { Block } from "../../engine/scene/block.ts";
import { Group } from "../../engine/scene/group.ts";
import { Layer } from "../../engine/scene/layer.ts";
import { Node } from "../../engine/scene/node.ts";
import type { Page } from "../../engine/scene/page.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Ellipse } from "../../engine/scene/ellipse.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { EditorWorkspace } from "../../editor/editor-workspace.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import { Editor } from "../../editor/editor.ts";
import { ContextMenuContext } from "../menus/context-menu.ts";
import { setDesigner } from "../shell/globals.ts";
import { getIconByLayerType, getLayerOrItemStatus } from "./layer-item.ts";
import { LayerPanel } from "./layers-panel.ts";
import {
  classHeights,
  fireEvent,
  installTreeDom,
  type TestElement,
} from "./testing/tree-dom.testing.ts";

let dom: ReturnType<typeof installTreeDom>;
let triggered: unknown[];
let editor: Editor | null;

beforeEach(() => {
  vi.useFakeTimers();
  dom = installTreeDom();
  classHeights["layer-row"] = 34;
  triggered = [];
  editor = null;
  setDesigner({
    isTouchEnabled: () => false,
    stats() {},
    getActiveDocument: () => (editor ? { getEditor: () => editor } : null),
    getSetting: (_key: string, value?: unknown) => value,
    setSetting() {},
    addEventListener() {},
    removeEventListener() {},
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

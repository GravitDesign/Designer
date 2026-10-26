import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Platform } from "../../engine/core/platform.ts";
import type { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import { Block } from "../../engine/scene/block.ts";
import { CompoundShape } from "../../engine/scene/compound-shape.ts";
import { Layer } from "../../engine/scene/layer.ts";
import { Node } from "../../engine/scene/node.ts";
import { Page } from "../../engine/scene/page.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { EditorWorkspace } from "../../editor/editor-workspace.ts";
import { Editor } from "../../editor/editor.ts";
import { SystemDialog } from "../dialogs/system-dialog.ts";
import { DocumentEvent } from "../document/document-event.ts";
import { DocumentStatus } from "../document/document-status.ts";
import { ContextMenuContext } from "../menus/context-menu.ts";
import { setContainer, setDesigner } from "../shell/globals.ts";
import { SettingChangedEvent } from "../shell/setting-changed-event.ts";
import { OutlineSidebar } from "./outline-sidebar.ts";
import {
  classHeights,
  fireEvent,
  installTreeDom,
  type TestElement,
} from "./testing/tree-dom.testing.ts";

// The layer colour is the colour cluster's pattern chooser; these tests
// don't look at it.
vi.mock("../inspector/color-deps.ts", () => ({
  patternChooser: (element: unknown) => element,
  chooserOf: () => null,
  eventArgs: () => [],
}));

// The export rows are the inspector's export panel; these tests only check
// that the sidebar builds and updates it (its own tests cover the rows).
const exportCalls = vi.hoisted(() => [] as unknown[][]);
vi.mock("../inspector/export-properties.ts", () => ({
  ExportProperties: class {
    init(panel: { className: string }, toolbar: { className: string }) {
      exportCalls.push(["init", panel.className, toolbar.className]);
    }
    update(document: unknown, elements: unknown) {
      exportCalls.push(["update", document, elements]);
    }
  },
}));

let dom: ReturnType<typeof installTreeDom>;
let stored: Record<string, unknown>;
let triggered: unknown[];
let executed: string[];
let editor: Editor;
let scene: Scene;
let viewConfiguration: { multiPageView: boolean; pageLabelsVisible: boolean };
let zoomedAt: unknown[];
let touch: boolean;

const listeners = () => ({ addEventListener() {}, removeEventListener() {} });

beforeEach(() => {
  exportCalls.length = 0;
  vi.useFakeTimers();
  dom = installTreeDom();
  classHeights["layer-row"] = 34;
  classHeights["page-row"] = 34;
  stored = {};
  triggered = [];
  executed = [];
  zoomedAt = [];
  touch = false;
  scene = new Scene(new EditorWorkspace());
  editor = new Editor(scene);
  viewConfiguration = { multiPageView: false, pageLabelsVisible: false };
  const view = {
    getViewConfiguration: () => viewConfiguration,
    invalidate() {},
    zoomAtCenter: (point: unknown) => zoomedAt.push(point),
    getHtmlElement: () => dom.document.createElement("div"),
  };
  const window = { getView: () => view, centerAndZoom() {}, scrollIntoView() {} };
  const document = {
    getScene: () => scene,
    getEditor: () => editor,
    getStatus: () => DocumentStatus.Ready,
    getActiveWindow: () => window,
    hasCDR: () => false,
    ...listeners(),
  };
  setDesigner({
    isTouchEnabled: () => touch,
    setItemDraggingState() {},
    stats() {},
    getActiveDocument: () => document,
    getSetting: (_key: string, value?: unknown) => value,
    setSetting() {},
    ...listeners(),
    getToolManager: () => listeners(),
    getWindows: () => ({ ...listeners(), getActiveWindow: () => window }),
    getContextMenu: () => ({ trigger: (options: unknown) => triggered.push(options) }),
    executeAction: (id: string) => executed.push(id),
  } as never);
  setContainer({
    setProperty: (key: string, value: unknown) => (stored[key] = value),
    getProperty: (key: string) => Promise.resolve(stored[key]),
  } as never);
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  setDesigner(null);
  setContainer(null);
  dom.uninstall();
  delete classHeights["layer-row"];
  delete classHeights["page-row"];
  Platform.modifiers.optionKey = false;
  Platform.modifiers.metaKey = false;
  Platform.modifiers.shiftKey = false;
});

function makeSidebar(): { sidebar: OutlineSidebar; element: TestElement } {
  const element = dom.document.createElement("div");
  element.box = { x: 0, y: 0, width: 250, height: 900 };
  dom.document.body.appendChild(element);
  const sidebar = new OutlineSidebar();
  sidebar.init(element as unknown as HTMLElement);
  return { sidebar, element };
}

function activate(sidebar: OutlineSidebar): void {
  const document = {
    getScene: () => scene,
    getEditor: () => editor,
    getStatus: () => DocumentStatus.Ready,
    getActiveWindow: () => ({
      getView: () => ({
        getViewConfiguration: () => viewConfiguration,
        invalidate() {},
        zoomAtCenter: (point: unknown) => zoomedAt.push(point),
        getHtmlElement: () => dom.document.createElement("div"),
      }),
      centerAndZoom() {},
      scrollIntoView() {},
    }),
    hasCDR: () => false,
    ...listeners(),
  };
  sidebar._documentEvent(new DocumentEvent(DocumentEvent.Type.Activated, document));
}

function layerTitles(element: TestElement): string[] {
  return element
    .querySelectorAll(".layer-row")
    .filter((row) => row.style.display !== "none")
    .map((row) => row.querySelector<TestElement>(".layer-title")?.textContent ?? "");
}

describe("GOutlineSidebar", () => {
  it("builds the old toolbars and containers in order", () => {
    const { element } = makeSidebar();
    expect(element.children.map((child) => child.className || child.tagName)).toEqual([
      "toolbar page-toolbar accordion",
      "pages-container",
      "DIV",
      "toolbar layer-toolbar",
      "layers-container",
      "HR",
      "toolbar toolbar-export accordion",
      "properties-panel export-panel",
    ]);
    const pageToolbar = element.children[0] as TestElement;
    expect(pageToolbar.children.map((child) => child.className || child.tagName)).toEqual([
      "LABEL",
      "g-accordion",
      "g-accordion-ghost",
      "g-switch",
      "setting-menu-options",
      "BUTTON",
      "BUTTON",
    ]);
    const modeSwitch = pageToolbar.children[3] as TestElement;
    expect(modeSwitch.style.cssText).toBe("margin-right: 5px;");
    expect(modeSwitch.querySelector<TestElement>("input")?.id).toBe("toogle-page-mode-checkbox");
    const pages = element.querySelector<TestElement>(".pages");
    expect(pages?.className).toBe("pages g-page-panel g-virtual-list g-virtual-tree");
    const layers = element.querySelector<TestElement>(".layers");
    expect(layers?.className).toBe("layers g-layer-panel g-virtual-list g-virtual-tree");
    expect((element.children[2] as TestElement).id).toBe("page-layer-divider");
  });

  it("unfolds the pages list when a page is added with the section folded (BUG-158)", () => {
    const { sidebar, element } = makeSidebar();
    activate(sidebar);
    const pageToolbar = element.querySelector<TestElement>(".page-toolbar") as TestElement;
    const pages = element.querySelector<TestElement>(".pages-container") as TestElement;
    fireEvent(pageToolbar.querySelector(".g-accordion"), "click");
    expect(pageToolbar.classList.contains("collapsed")).toBe(true);
    expect(pages.style.display).toBe("none");
    const createPage = pageToolbar
      .querySelectorAll("button")
      .find((button) => button.querySelector(".gravit-icon-addpage")) as TestElement;
    fireEvent(createPage, "click");
    expect(scene.queryCount("page")).toBe(2);
    expect(pageToolbar.classList.contains("expanded")).toBe(true);
    expect(pages.style.display).toBe("");
    // The arrow and the fold button still work as before.
    fireEvent(pageToolbar.querySelector(".g-accordion"), "click");
    expect(pages.style.display).toBe("none");
  });

  it("inserts a layer named after the layer count above the selection and moves the selection in", () => {
    const { sidebar, element } = makeSidebar();
    activate(sidebar);
    const page = scene.getActivePage() as Page;
    const rect = new Rectangle();
    page.appendChild(rect);
    editor.updateSelection(false, [rect]);
    sidebar.insertLayer();
    const layer = page.getFirstChild() as Layer;
    expect(layer).toBeInstanceOf(Layer);
    expect(layer.getProperty("name")).toBe("Layer 0");
    expect(rect.getParent()).toBe(layer);
    expect(scene.getActiveLayer()).toBe(layer);
    expect(editor.getSelection()).toEqual([rect]);
    sidebar.getLayerPanel().vtree.requestInvalidation(true);
    expect(layerTitles(element)[0]).toBe("Layer 0");
  });

  it("toggles the multi-page view on the view configuration and stores the mode", async () => {
    const { sidebar } = makeSidebar();
    scene.getActivePage()?.setProperties(["w", "h"], [300, 200]);
    activate(sidebar);
    await vi.runAllTimersAsync();
    sidebar.toggleMultiPageMode();
    expect(viewConfiguration).toEqual({ multiPageView: true, pageLabelsVisible: true });
    expect(scene.getProperty("mve")).toBe(true);
    expect(stored[OutlineSidebar.MULTIPAGE_MODE_ENABLED_OPTION_NAME]).toBe(true);
    sidebar.toggleMultiPageMode();
    expect(viewConfiguration).toEqual({ multiPageView: false, pageLabelsVisible: false });
    // Undo flips it back.
    editor.undoState();
    expect(scene.getProperty("mve")).toBe(true);
  });

  it("refuses the multi-page view with an infinite page and says why", async () => {
    const alert = vi.spyOn(SystemDialog, "alert").mockImplementation(() => null as never);
    const { sidebar, element } = makeSidebar();
    // A page without a size has an infinite canvas.
    scene.getActivePage()?.setProperties(["w", "h"], [0, 0]);
    activate(sidebar);
    await vi.runAllTimersAsync();
    sidebar.toggleMultiPageMode();
    expect(alert).toHaveBeenCalledTimes(1);
    expect(viewConfiguration.multiPageView).toBe(false);
    expect(element.querySelector<TestElement>("#toogle-page-mode-checkbox")?.checked).toBe(false);
  });

  it("makes a clicked page active", () => {
    const { sidebar } = makeSidebar();
    activate(sidebar);
    const second = scene.insertPage();
    sidebar.changeActivePage(second);
    expect(scene.getActivePage()).toBe(second);
  });

  it("opens the page menu from the settings button with the page panel context", () => {
    const { element } = makeSidebar();
    fireEvent(element.querySelector(".setting-menu-options"), "click", { pageX: 5, pageY: 6 });
    expect(triggered).toEqual([
      {
        pageX: 5,
        pageY: 6,
        clientX: 0,
        clientY: 0,
        data: { context: ContextMenuContext.PagePanel },
      },
    ]);
  });

  it("selects rows: click, Cmd toggles, Shift selects the range", () => {
    const { sidebar } = makeSidebar();
    activate(sidebar);
    const page = scene.getActivePage() as Page;
    const [a, b, c] = [new Rectangle(), new Rectangle(), new Rectangle()];
    page.appendChild(a);
    page.appendChild(b);
    page.appendChild(c);
    sidebar._clickLayerTreeNodeCallback(a);
    expect(editor.getSelection()).toEqual([a]);
    Platform.modifiers.metaKey = true;
    sidebar._clickLayerTreeNodeCallback(c);
    expect(editor.getSelection()).toEqual([a, c]);
    Platform.modifiers.metaKey = false;
    Platform.modifiers.shiftKey = true;
    sidebar._clickLayerTreeNodeCallback(a);
    // From the last selected (c) to a: b joins (the editor keeps the
    // nodes that were selected already in front).
    expect(editor.getSelection()).toEqual([a, c, b]);
  });

  it("zooms to the selection on Alt+click and to everything on Alt+click on empty space", () => {
    const { sidebar, element } = makeSidebar();
    activate(sidebar);
    const rect = new Rectangle();
    (scene.getActivePage() as Page).appendChild(rect);
    Platform.modifiers.optionKey = true;
    sidebar._clickLayerTreeNodeCallback(rect);
    fireEvent(element.querySelector(".layers"), "click");
    expect(executed).toEqual(["view.zoom.fit-selection", "view.zoom.fit.all"]);
    expect(editor.hasSelection()).toBeFalsy();
  });

  it("copies instead of moving with Alt", () => {
    const { sidebar } = makeSidebar();
    activate(sidebar);
    const page = scene.getActivePage() as Page;
    const layer = new Layer();
    const rect = new Rectangle();
    page.appendChild(layer);
    page.appendChild(rect);
    Platform.modifiers.optionKey = true;
    sidebar._moveLayers(layer, null, [rect]);
    expect(rect.getParent()).toBe(page);
    expect(layer.getFirstChild()).toBeInstanceOf(Rectangle);
    expect(layer.getFirstChild()).not.toBe(rect);
    Platform.modifiers.optionKey = false;
    sidebar._moveLayers(layer, null, [rect]);
    expect(rect.getParent()).toBe(layer);
    expect(rect.hasFlag(Node.Flag.Selected as number)).toBe(true);
  });
});

describe("GOutlineSidebar risky branches", () => {
  it("builds and updates the export rows through the export panel", () => {
    const { sidebar } = makeSidebar();
    expect(exportCalls).toEqual([
      ["init", "properties-panel export-panel", "toolbar toolbar-export"],
    ]);
    exportCalls.length = 0;
    activate(sidebar);
    expect(exportCalls.length).toBeGreaterThan(0);
    expect(exportCalls.every((call) => call[0] === "update" && call[2] === null)).toBe(true);
    expect((exportCalls[0] as unknown[])[1]).not.toBeNull();
  });

  it("doesn't delete a page locked against deletion", () => {
    const { sidebar } = makeSidebar();
    activate(sidebar);
    scene.insertPage();
    const page = scene.getActivePage() as Page;
    page.setProperty("plkt", Block.ProgramLck.NoDelete);
    sidebar._deletePage();
    expect(page.getParent()).toBe(scene);
  });

  it("asks before deleting a master page, after navigating and refreshing the selection", () => {
    let answer: ((ok: boolean) => void) | null = null;
    vi.spyOn(SystemDialog, "confirm").mockImplementation(((
      _message: string,
      done: (ok: boolean) => void,
    ) => {
      answer = done;
    }) as never);
    const { sidebar } = makeSidebar();
    activate(sidebar);
    const first = scene.getActivePage() as Page;
    const master = scene.insertPage();
    scene.setActivePage(master);
    vi.spyOn(master, "getSlavePages").mockReturnValue([first]);
    const order: string[] = [];
    vi.spyOn(sidebar, "_navigateDrawingCenter").mockImplementation(
      () => void order.push("navigate"),
    );
    vi.spyOn(sidebar, "_refreshSelection").mockImplementation(() => void order.push("refresh"));
    sidebar._deletePage();
    expect(order).toEqual(["navigate", "refresh"]);
    expect(master.getParent()).toBe(scene);
    (answer as unknown as (ok: boolean) => void)(false);
    expect(master.getParent()).toBe(scene);
    sidebar._deletePage();
    (answer as unknown as (ok: boolean) => void)(true);
    expect(master.getParent()).toBeNull();
  });

  it("moves pages last node first and relinks even/odd masters", () => {
    const { sidebar } = makeSidebar();
    activate(sidebar);
    const p0 = scene.getActivePage() as Page;
    const p1 = scene.insertPage();
    const p2 = scene.insertPage();
    vi.spyOn(scene, "isEvenOddMaster").mockReturnValue(true);
    const calls: string[] = [];
    const end = scene.endBlockReferenceChanges.bind(scene);
    vi.spyOn(scene, "endBlockReferenceChanges").mockImplementation(() => {
      calls.push("end");
      end();
    });
    vi.spyOn(scene, "reassignMasterPages").mockImplementation(() => void calls.push("reassign"));
    sidebar._movePageTreeNodeCallback(scene, p0, [p2, p1]);
    const pages: Node[] = [];
    for (let child = scene.getFirstChild(); child; child = child.getNext())
      if (child instanceof Page) pages.push(child);
    expect(pages).toEqual([p1, p2, p0]);
    // Relinked once more after the reference changes end.
    expect(calls.slice(-2)).toEqual(["end", "reassign"]);
  });

  it("moves Alt-dropped copies into a shape to the shape's paint box when they lie outside it", () => {
    const { sidebar } = makeSidebar();
    activate(sidebar);
    const page = scene.getActivePage() as Page;
    const shape = new Rectangle();
    shape.setProperty("trf", new Transform(50, 0, 0, 50, 100, 100));
    const loose = new Rectangle();
    loose.setProperty("trf", new Transform(10, 0, 0, 10, 0, 0));
    page.appendChild(shape);
    page.appendChild(loose);
    sidebar._duplicateLayerTreeNodeCallback(shape, null, [loose]);
    const copy = shape.getFirstChild() as Rectangle;
    expect(copy).toBeInstanceOf(Rectangle);
    expect(copy).not.toBe(loose);
    const shapeBox = shape.getPaintBBox() as Rect;
    const copyBox = copy.getPaintBBox() as Rect;
    expect([copyBox.getX(), copyBox.getY()]).toEqual([shapeBox.getX(), shapeBox.getY()]);
    expect(editor.getSelection()).toEqual([copy]);
  });

  it("gives copies dropped into a compound shape the compound's style", () => {
    const { sidebar } = makeSidebar();
    activate(sidebar);
    const page = scene.getActivePage() as Page;
    const compound = new CompoundShape();
    compound.appendChild(new Rectangle());
    const loose = new Rectangle();
    page.appendChild(compound);
    page.appendChild(loose);
    const assigned: unknown[] = [];
    vi.spyOn(Rectangle.prototype, "assignStyleFrom").mockImplementation(function (
      this: Rectangle,
      source: unknown,
    ) {
      assigned.push([this, source]);
    } as never);
    sidebar._duplicateLayerTreeNodeCallback(compound, null, [loose]);
    const copy = compound.getLastChild();
    expect(copy).not.toBe(loose);
    expect(assigned).toEqual([[copy, compound]]);
  });

  it("deletes the active layer with the selection once it holds no items", () => {
    const { sidebar } = makeSidebar();
    activate(sidebar);
    const page = scene.getActivePage() as Page;
    const layer = new Layer();
    const keep = new Layer();
    page.appendChild(keep);
    page.appendChild(layer);
    const rect = new Rectangle();
    layer.appendChild(rect);
    scene.setActiveLayer(layer);
    editor.updateSelection(false, [rect]);
    sidebar._deleteLayerOrItem();
    expect(rect.getParent()).toBeNull();
    expect(layer.getParent()).toBeNull();
    // With an item left the layer stays.
    const other = new Rectangle();
    const last = new Rectangle();
    keep.appendChild(other);
    keep.appendChild(last);
    scene.setActiveLayer(keep);
    editor.updateSelection(false, [other]);
    sidebar._deleteLayerOrItem();
    expect(keep.getParent()).toBe(page);
  });

  it("forwards a drop on the layers toolbar to the last visited row as a drop at its top", () => {
    const { sidebar, element } = makeSidebar();
    activate(sidebar);
    const target = dom.document.createElement("div");
    const received: { altKey: boolean; layerY: number }[] = [];
    target.addEventListener("drop", (event) => received.push(event as never));
    vi.spyOn(sidebar.getLayerPanel(), "getLastVisitedDroppable").mockReturnValue(target as never);
    const event = fireEvent(element.querySelector(".layer-toolbar"), "drop", {
      altKey: true,
      layerY: 20,
    });
    expect(event.defaultPrevented).toBe(true);
    expect(received.map((e) => [e.altKey, e.layerY])).toEqual([[true, 0]]);
  });

  it("clamps the pages list height while dragging the divider", () => {
    const { element } = makeSidebar();
    const pages = element.querySelector<TestElement>(".pages-container") as TestElement;
    pages.style.height = "100px";
    const divider = element.querySelector<TestElement>("#page-layer-divider");
    fireEvent(divider, "mousedown", { clientY: 200 });
    expect(element.classList.contains("page-container-resizing")).toBe(true);
    fireEvent(dom.document, "mousemove", { clientY: 230 });
    expect(pages.style.height).toBe("130px");
    fireEvent(dom.document, "mousemove", { clientY: 0 });
    expect(pages.style.height).toBe("50px");
    fireEvent(dom.document, "mousemove", { clientY: 2000 });
    expect(pages.style.height).toBe("500px");
    fireEvent(dom.document, "mouseup");
    fireEvent(dom.document, "mousemove", { clientY: 230 });
    expect(pages.style.height).toBe("500px");
    expect(element.classList.contains("page-container-resizing")).toBe(false);
  });

  it("uses 48px rows in touch mode and 34px rows otherwise", () => {
    const { sidebar } = makeSidebar();
    touch = true;
    sidebar._settingChanged(new SettingChangedEvent("touch", false, true));
    expect(sidebar.getLayerPanel().vtree._rowHeight).toBe("48");
    expect(sidebar._pagePanel?.vtree._rowHeight).toBe("48");
    touch = false;
    sidebar._settingChanged(new SettingChangedEvent("other", null, null));
    expect(sidebar.getLayerPanel().vtree._rowHeight).toBe("48");
    sidebar._settingChanged(new SettingChangedEvent("touch", true, false));
    expect(sidebar.getLayerPanel().vtree._rowHeight).toBe("34");
    expect(sidebar._pagePanel?.vtree._rowHeight).toBe("34");
  });

  it("removes every scene and editor listener when the document is deactivated", async () => {
    const { sidebar } = makeSidebar();
    const added: unknown[][] = [];
    const removed: unknown[][] = [];
    for (const target of [scene, editor] as unknown as {
      addEventListener(...args: unknown[]): void;
      removeEventListener(...args: unknown[]): void;
    }[]) {
      const add = target.addEventListener.bind(target);
      const remove = target.removeEventListener.bind(target);
      vi.spyOn(target, "addEventListener").mockImplementation((...args: unknown[]) => {
        added.push([target, ...args]);
        add(...args);
      });
      vi.spyOn(target, "removeEventListener").mockImplementation((...args: unknown[]) => {
        removed.push([target, ...args]);
        remove(...args);
      });
    }
    activate(sidebar);
    await vi.runAllTimersAsync();
    // The sidebar's own four and the two panels' listeners.
    expect(added.length).toBeGreaterThanOrEqual(4);
    sidebar._documentEvent(
      new DocumentEvent(DocumentEvent.Type.Deactivated, sidebar._document as never),
    );
    const key = (entry: unknown[]) => entry.slice(0, 3);
    for (const entry of added) expect(removed.map(key)).toContainEqual(key(entry));
    expect(sidebar._document).toBeNull();
  });
});

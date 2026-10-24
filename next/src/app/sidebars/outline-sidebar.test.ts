import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Platform } from "../../engine/core/platform.ts";
import { Layer } from "../../engine/scene/layer.ts";
import { Node } from "../../engine/scene/node.ts";
import type { Page } from "../../engine/scene/page.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { EditorWorkspace } from "../../editor/editor-workspace.ts";
import { Editor } from "../../editor/editor.ts";
import { SystemDialog } from "../dialogs/system-dialog.ts";
import { DocumentEvent } from "../document/document-event.ts";
import { DocumentStatus } from "../document/document-status.ts";
import { ContextMenuContext } from "../menus/context-menu.ts";
import { setContainer, setDesigner } from "../shell/globals.ts";
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

let dom: ReturnType<typeof installTreeDom>;
let stored: Record<string, unknown>;
let triggered: unknown[];
let executed: string[];
let editor: Editor;
let scene: Scene;
let viewConfiguration: { multiPageView: boolean; pageLabelsVisible: boolean };
let zoomedAt: unknown[];

const listeners = () => ({ addEventListener() {}, removeEventListener() {} });

beforeEach(() => {
  vi.useFakeTimers();
  dom = installTreeDom();
  classHeights["layer-row"] = 34;
  classHeights["page-row"] = 34;
  stored = {};
  triggered = [];
  executed = [];
  zoomedAt = [];
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
    isTouchEnabled: () => false,
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

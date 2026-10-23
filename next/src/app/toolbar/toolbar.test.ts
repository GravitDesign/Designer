import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventTarget } from "../../engine/core/event-target.ts";
import { HandTool } from "../../editor/tools/hand-tool.ts";
import { LassoTool } from "../../editor/tools/lasso-tool.ts";
import { PenTool } from "../../editor/tools/pen-tool.ts";
import { PointerTool } from "../../editor/tools/pointer-tool.ts";
import { RectangleTool } from "../../editor/tools/rectangle-tool.ts";
import { SubSelectTool } from "../../editor/tools/sub-select-tool.ts";
import { ToolChangedEvent, type ToolClass } from "../../editor/tools/tool-manager.ts";
import { ZoomTool } from "../../editor/tools/zoom-tool.ts";
import { SceneWidget } from "../../editor/view/scene-widget.ts";
import { Action } from "../actions/action.ts";
import { ActiveMenuManager } from "../menus/active-menu-manager.ts";
import type { Menu } from "../menus/menu.ts";
import {
  fake,
  fire,
  installFakeDom,
  type FakeDomHandle,
  type FakeElement,
} from "../menus/testing/fake-dom.testing.ts";
import { resetGlobals, setAppRegistry, setDesigner } from "../shell/globals.ts";
import type { ToolTableEntry } from "../shell/registry.ts";
import { SettingChangedEvent } from "../shell/setting-changed-event.ts";
import { WindowEvent } from "../shell/windows.ts";
import { MenuButton } from "../widgets/menu-button.ts";
import { Toolbar } from "./toolbar.ts";

class TestAction extends Action {
  enabled = true;
  runs: unknown[][] = [];
  constructor(
    private readonly _id: string,
    private readonly _title: string,
    private readonly _icon: string | null = null,
  ) {
    super();
  }
  override getId(): string {
    return this._id;
  }
  override getTitle(): string {
    return this._title;
  }
  override getIcon(): string | null {
    return this._icon;
  }
  override isEnabled(): boolean {
    return this.enabled;
  }
  override execute(...args: unknown[]): void {
    this.runs.push(args);
  }
}

/** One fake tool instance per class, as the tool manager keeps them. */
class FakeToolManager extends EventTarget {
  readonly instances = new Map<ToolClass, object>();
  active: object | null = null;
  activatable = true;
  getTool(tool: ToolClass): object {
    let instance = this.instances.get(tool);
    if (!instance) {
      instance = Object.create(tool.prototype) as object;
      this.instances.set(tool, instance);
    }
    return instance;
  }
  getActiveTool(): object | null {
    return this.active;
  }
  isContextActivatable(): boolean {
    return this.activatable;
  }
  activateTool(tool: object): boolean {
    const previous = this.active;
    this.active = tool;
    this.trigger(new ToolChangedEvent(previous as never, tool as never));
    return true;
  }
}

const entry = (
  tool: ToolClass,
  toolString: string,
  group: string,
  icon: string,
  category?: string,
): ToolTableEntry => ({
  tool,
  toolString,
  title: toolString.replace(/^G|Tool$/g, ""),
  group,
  category,
  icon,
  richTooltipConfig: null as never,
});

const TOOLS: ToolTableEntry[] = [
  entry(PointerTool, "GPointerTool", "select", "gravit-icon-cursor-filled"),
  entry(SubSelectTool, "GSubSelectTool", "select", "gravit-icon-cursor"),
  entry(LassoTool, "GLassoTool", "select", "gravit-icon-rope", "special"),
  entry(PenTool, "GPenTool", "path", "gravit-icon-pen"),
  entry(RectangleTool, "GRectangleTool", "shape", "gravit-icon-rectangle"),
  entry(HandTool, "GHandTool", "view", "gravit-icon-move"),
  entry(ZoomTool, "GZoomTool", "view", "gravit-icon-zoom-in"),
];

interface Fixture {
  designer: EventTarget & Record<string, unknown>;
  tools: FakeToolManager;
  windows: EventTarget & { active: unknown };
  actions: Map<string, TestAction>;
  settings: Record<string, unknown>;
  editor: Record<string, unknown> | null;
  executed: [string, unknown, unknown][];
}

function setup(): Fixture {
  const actions = new Map<string, TestAction>();
  for (const [id, title, icon] of [
    ["file.save", "Save", "gravit-icon-save"],
    ["edit.undo", "Undo", "gravit-icon-undo"],
    ["edit.redo", "Redo", "gravit-icon-redo"],
    ["modify.group", "Group", "gravit-icon-group"],
    ["file.export", "Advanced Export...", "gravit-icon-export"],
  ] as const)
    actions.set(id, new TestAction(id, title, icon));
  const tools = new FakeToolManager();
  tools.active = tools.getTool(PointerTool);
  const windows = Object.assign(new EventTarget(), {
    active: null as unknown,
    getActiveWindow(): unknown {
      return this.active;
    },
    getWindows: () => [],
  });
  const settings: Record<string, unknown> = { snap_disabled: false };
  const fixture: Fixture = {
    designer: null as never,
    tools,
    windows,
    actions,
    settings,
    editor: null,
    executed: [],
  };
  const designer = Object.assign(new EventTarget(), {
    getAction: (id: string) => actions.get(id) || null,
    executeAction: (id: string, args?: unknown, source?: unknown) => {
      fixture.executed.push([id, args, source]);
      return true;
    },
    getToolManager: () => tools,
    getWindows: () => windows,
    getSetting: (key: string) => settings[key],
    getActiveDocument: () =>
      fixture.editor ? { getEditor: () => fixture.editor, getScene: () => null } : null,
    getRightSidebars: () => ({ getActiveSidebar: () => null, getSidebar: () => null }),
    isTouchEnabled: () => false,
    canActivateTool: () => true,
    relayout: vi.fn(),
  });
  fixture.designer = designer as never;
  setDesigner(designer as never);
  setAppRegistry({ plugins: [], actions: [], sidebars: [], panels: [], footer: [], tools: TOOLS });
  return fixture;
}

let dom: FakeDomHandle;
let toolbarElement: FakeElement;
beforeEach(() => {
  dom = installFakeDom();
  vi.useFakeTimers();
  toolbarElement = dom.document.createElement("div");
  dom.document.body.append(toolbarElement);
});
afterEach(() => {
  ActiveMenuManager.setActiveMenu(null, true);
  vi.useRealTimers();
  resetGlobals();
  dom.uninstall();
});

function makeToolbar(): Toolbar {
  const toolbar = new Toolbar(toolbarElement as unknown as HTMLElement);
  toolbar.init();
  return toolbar;
}

const classes = (element: unknown): string[] => [...fake(element).classList];
const find = (selector: string): FakeElement => {
  const found = toolbarElement.querySelector(selector);
  if (!found) throw new Error("not found: " + selector);
  return found;
};

describe("Toolbar", () => {
  it("builds the sections in the old order", () => {
    setup();
    makeToolbar();
    expect(toolbarElement.children.map((c) => c.className)).toEqual([
      "section compound-section file-section",
      "section compound-section view-section",
      "section compound-section tool-section",
      "section compound-section transform-section",
      "section compound-section group-section",
      "section compound-section arrange-section",
      "section compound-section action-section",
      "section compound-section export-section",
    ]);
  });

  it("builds an action button with data-action, title, icon and the processing span", () => {
    setup();
    makeToolbar();
    const save = find(".file-section > .toolbar-button");
    expect(save.getAttribute("data-action")).toBe("file.save");
    expect(save.children.map((c) => c.className)).toEqual(["action-button icon", "processing"]);
    const button = save.children[0] as FakeElement;
    expect(button.getAttribute("data-title")).toBe("Save");
    expect(classes(button.children[0])).toEqual(["icon", "gravit-icon-save"]);
  });

  it("runs an action button's action through the designer with a done callback", () => {
    const f = setup();
    makeToolbar();
    fire(find(".file-section > .toolbar-button > .action-button"), "click");
    const [id, args, source] = f.executed[0] as [string, unknown[], string];
    expect(id).toBe("file.save");
    expect(source).toBe("toolbar");
    expect(args[0]).toBe(undefined);
    expect(typeof args[1]).toBe("function");
  });

  it("disables the buttons of disabled actions, the dropdown too, and enables them again", () => {
    const f = setup();
    (f.actions.get("edit.undo") as TestAction).enabled = false;
    const toolbar = makeToolbar();
    const undo = toolbarElement
      .querySelectorAll(".toolbar-button")
      .find((b) => b.getAttribute("data-action") === "edit.undo") as FakeElement;
    expect(undo.className).toBe("toolbar-button dropdown");
    expect(undo.children.map((c) => c.className)).toEqual([
      "action-button icon g-disabled",
      "dropdown-button g-menu-button g-disabled",
      "processing",
    ]);
    (f.actions.get("edit.undo") as TestAction).enabled = true;
    toolbar._updateActions();
    expect(undo.children.map((c) => c.className)).toEqual([
      "action-button icon",
      "dropdown-button g-menu-button",
      "processing",
    ]);
  });

  it("leaves a button for an unregistered action without data-action, title or click", () => {
    const f = setup();
    makeToolbar();
    const flip = find(".transform-section > .toolbar-button");
    expect(flip.getAttribute("data-action")).toBe(null);
    const button = flip.children[0] as FakeElement;
    expect(button.getAttribute("data-title")).toBe(null);
    expect(classes(button)).toEqual(["action-button", "icon"]);
    expect(classes(button.children[0])).toEqual(["icon", "gravit-icon-flip-horizontal"]);
    fire(button, "click");
    expect(f.executed).toEqual([]);
  });

  it("builds the zoom button as before and shows the view's zoom", () => {
    const f = setup();
    let zoom = 1.5;
    const view = Object.assign(new EventTarget(), { getZoom: () => zoom });
    const window = { getView: () => view };
    f.windows.active = window;
    makeToolbar();
    const button = find(".zoom-button");
    expect(button.className).toBe("toolbar-button zoom-button");
    expect(button.children.map((c) => c.className)).toEqual([
      "left-attached attached-button",
      "gravit-zoom-manual-input",
      "action-button menu g-menu-button left-attached right-attached",
      "processing",
      "right-attached attached-button",
    ]);
    expect(button.children[0]?.getAttribute("style")).toBe("width: 15px;");
    const action = button.children[2] as FakeElement;
    expect(action.children.map((c) => c.className)).toEqual([
      "gravit-icon-zoom-in icon",
      "caption",
    ]);
    expect(action.children[1]?.textContent).toBe("150%");
    // The zoom follows the active view's transform.
    f.windows.trigger(new WindowEvent(WindowEvent.Type.Activated, window as never));
    zoom = 2;
    view.trigger(new SceneWidget.TransformEvent());
    expect(action.children[1]?.textContent).toBe("200%");
    fire(button.children[0], "click");
    fire(button.children[4], "click");
    expect(f.executed.map((e) => e[0])).toEqual(["zoom.out", "view.zoom.in"]);
  });

  it("marks the snap button from the snap_disabled setting", () => {
    const f = setup();
    makeToolbar();
    const snap = find(".snap-button > .action-button");
    expect(classes(snap)).toEqual(["action-button", "g-active", "icon"]);
    f.designer.trigger(new SettingChangedEvent("snap_disabled", false, true));
    expect(classes(snap)).toEqual(["action-button", "icon"]);
  });

  it("marks the active tool and shows a group's active tool on its button", () => {
    const f = setup();
    makeToolbar();
    const select = find(".select-toolbar-button > .action-button");
    expect(classes(select)).toEqual(["action-button", "icon", "g-active"]);
    f.tools.activateTool(f.tools.getTool(SubSelectTool));
    expect(classes(select)).toEqual(["action-button", "icon", "g-active"]);
    expect(classes(select.children[0])).toEqual(["icon", "gravit-icon-cursor"]);
    f.tools.activateTool(f.tools.getTool(PenTool));
    expect(classes(select)).toEqual(["action-button", "icon"]);
    expect(classes(find(".path-toolbar-button > .action-button"))).toEqual([
      "action-button",
      "icon",
      "g-active",
    ]);
  });

  it("puts a divider before a tool group menu unless it starts the table, as before", () => {
    setup();
    const toolbar = makeToolbar();
    const kinds = (menu: Menu): string[] =>
      fake(menu.getHtmlElement()).children.map((li) =>
        li.classList.contains("g-menu-item-divider") ? "---" : li.textContent,
      );
    // The pen tool is not the first of the table: a divider comes first.
    expect(kinds(toolbar._createToolItems("path"))).toEqual(["---", "Pen"]);
    expect(kinds(toolbar._createToolItems("select"))).toEqual([
      "Pointer",
      "SubSelect",
      "---",
      "Lasso",
    ]);
  });

  it("lists the redo and undo states in the quick history and steps to the picked one", () => {
    const f = setup();
    const states = {
      undo: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
      redo: [{ id: "c", name: "C" }],
    };
    let current = "b";
    const steps: string[] = [];
    f.editor = {
      getCurrentStateId: () => current,
      hasRedoState: () => states.redo.length > 0,
      getRedoStates: () => states.redo,
      hasUndoState: () => states.undo.length > 0,
      getUndoStates: () => states.undo,
      undoState: () => {
        steps.push("undo");
        current = "a";
      },
      redoState: () => steps.push("redo"),
    };
    const toolbar = makeToolbar();
    const menu = toolbar._createQuickHistoryUndoRedoMenu();
    const items = fake(menu.getHtmlElement()).children;
    expect(
      items.map((li) => (li.classList.contains("g-menu-item-divider") ? "---" : li.textContent)),
    ).toEqual(["Redo", "---", "C", "---", "B", "A"]);
    expect(classes(items[4])).toContain("g-active");
    menu.getItem(5)?.activate();
    expect(steps).toEqual(["undo"]);
  });

  it("enables and disables every toolbar button", () => {
    setup();
    const toolbar = makeToolbar();
    toolbar.setEnabled(false);
    const save = find(".file-section > .toolbar-button > button") as unknown as {
      disabled: boolean;
    };
    expect(classes(save)).toContain("g-disabled");
    expect(save.disabled).toBe(true);
    toolbar.setEnabled(true);
    expect(classes(save)).not.toContain("g-disabled");
  });

  it("names tools by their table title", () => {
    setup();
    expect(Toolbar.getToolName(PenTool)).toBe("Pen");
    expect(Toolbar.getToolName(null)).toBe("");
  });

  it("opens the split button's menu from the dropdown button", () => {
    setup();
    makeToolbar();
    const dropdown = find(".select-toolbar-button > .dropdown-button");
    const button = MenuButton.of(dropdown as unknown as Element) as MenuButton;
    fire(dropdown, "mousedown");
    expect(button.menu.isOpen()).toBe(true);
    expect(classes(dropdown)).toContain("g-active");
  });
});

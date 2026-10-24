// Shared by the toolbar and touch toolbar tests: a fake designer with a
// few actions, a tool manager and the tool table.
import { vi } from "vitest";
import { EventTarget } from "../../engine/core/event-target.ts";
import { HandTool } from "../../editor/tools/hand-tool.ts";
import { LassoTool } from "../../editor/tools/lasso-tool.ts";
import { PenTool } from "../../editor/tools/pen-tool.ts";
import { PointerTool } from "../../editor/tools/pointer-tool.ts";
import { RectangleTool } from "../../editor/tools/rectangle-tool.ts";
import { SubSelectTool } from "../../editor/tools/sub-select-tool.ts";
import { ToolChangedEvent, type ToolClass } from "../../editor/tools/tool-manager.ts";
import { ZoomTool } from "../../editor/tools/zoom-tool.ts";
import { Action } from "../actions/action.ts";
import { setAppRegistry, setDesigner } from "../shell/globals.ts";
import type { ToolTableEntry } from "../shell/registry.ts";

export class TestAction extends Action {
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
export class FakeToolManager extends EventTarget {
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

export interface Fixture {
  designer: EventTarget & Record<string, unknown>;
  tools: FakeToolManager;
  windows: EventTarget & {
    active: unknown;
    list: unknown[];
    activated: unknown[][];
    removed: unknown[];
  };
  actions: Map<string, TestAction>;
  settings: Record<string, unknown>;
  editor: Record<string, unknown> | null;
  executed: [string, unknown, unknown][];
}

export function setup(): Fixture {
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
    list: [] as unknown[],
    getWindows(): unknown[] {
      return this.list;
    },
    activated: [] as unknown[][],
    removed: [] as unknown[],
    activateWindow(...args: unknown[]): void {
      this.activated.push(args);
    },
    removeWindow(window: unknown): void {
      this.removed.push(window);
    },
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

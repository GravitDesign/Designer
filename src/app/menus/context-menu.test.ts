import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Node } from "../../engine/scene/node.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Action } from "../actions/action.ts";
import { Designer } from "../shell/designer.ts";
import { resetGlobals, setDesigner } from "../shell/globals.ts";
import { ActiveMenuManager } from "./active-menu-manager.ts";
import { ContextMenu, ContextMenuContext } from "./context-menu.ts";
import type { Menu } from "./menu.ts";
import type { MenuItem } from "./menu-item.ts";
import {
  fake,
  fire,
  FakeEvent,
  installFakeDom,
  type FakeDomHandle,
  type FakeElement,
} from "./testing/fake-dom.testing.ts";

class TestAction extends Action {
  constructor(private readonly _id: string) {
    super();
  }
  override getId(): string {
    return this._id;
  }
  override getTitle(): string {
    return this._id;
  }
  override execute(): void {}
}

/** An element of the fake scene: a name, a parent and flags. */
class FakeHitElement {
  flags = new Set<number>();
  constructor(
    readonly name: string,
    readonly parent: unknown = null,
  ) {}
  getProperty(): number {
    return 0;
  }
  getParent(): unknown {
    return this.parent;
  }
  getNodeNameTranslated(): string {
    return this.name;
  }
  setFlag(flag: number): void {
    this.flags.add(flag);
  }
  removeFlag(flag: number): void {
    this.flags.delete(flag);
  }
}

interface FakeWorld {
  registered: Set<string>;
  tool: unknown;
  hits: { element: FakeHitElement | Rectangle }[] | null;
  selections: unknown[][];
  hitArgs: unknown[] | null;
  touch: boolean;
}

let dom: FakeDomHandle;
let world: FakeWorld;
let windows: FakeElement;

beforeEach(() => {
  // The active menu manager arms a 250 ms timer on document; fake timers
  // let afterEach run it while the fake DOM still exists.
  vi.useFakeTimers();
  dom = installFakeDom();
  world = {
    registered: new Set(),
    tool: null,
    hits: null,
    selections: [],
    hitArgs: null,
    touch: false,
  };
  const view = {
    _convertClientPositionFromMousePosition: (event: { clientX: number; clientY: number }) => ({
      x: event.clientX,
      y: event.clientY,
    }),
    getWorldTransform: () => "world",
    getViewConfiguration: () => ({ multiPageView: false }),
  };
  const scene = {
    hitTest: (...args: unknown[]) => {
      world.hitArgs = args;
      return world.hits;
    },
  };
  const editor = {
    updateSelection: (_toggle: boolean, nodes: unknown[]) => world.selections.push(nodes),
  };
  const fakeDesigner = {
    getAction: (id: string) => (world.registered.has(id) ? new TestAction(id) : null),
    getWindows: () => ({ getActiveWindow: () => ({ getView: () => view }) }),
    getToolManager: () => ({ getActiveTool: () => world.tool }),
    getActiveDocument: () => ({ getScene: () => scene, getEditor: () => editor }),
    isTouchEnabled: () => world.touch,
  };
  setDesigner(fakeDesigner as unknown as Designer);
  windows = dom.document.createElement("div");
  dom.document.body.append(windows);
});

afterEach(() => {
  ActiveMenuManager.setActiveMenu(null, true);
  Designer.contextMenuTrigger = null;
  resetGlobals();
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  dom.uninstall();
});

const create = (): ContextMenu => new ContextMenu(windows as unknown as HTMLElement);

/** The open menus in body, oldest first. */
const openMenus = (): FakeElement[] => dom.document.body.children.filter((c) => c.tagName === "UL");

/** Captions of a menu's items; dividers as "---". */
const captions = (ul: FakeElement): string[] =>
  ul.children.map((li) =>
    li.classList.contains("g-menu-item-divider") ? "---" : (li.children[1]?.textContent ?? ""),
  );

const rightClick = (target: FakeElement, x: number, y: number): FakeEvent =>
  fire(target, "contextmenu", { pageX: x, pageY: y, clientX: x, clientY: y });

describe("ContextMenu", () => {
  it("builds the canvas menu in the old order, with empty items for missing actions", () => {
    world.registered = new Set(["edit.edit", "modify.group", "edit.select-by-paintlayer.fill"]);
    create();
    rightClick(windows, 600, 300);
    const [menu] = openMenus();
    expect(captions(menu as FakeElement)).toEqual([
      "edit.edit",
      "Paste",
      "---",
      "Arrange",
      "Align",
      "Transform",
      "---",
      "modify.group",
      "",
      "",
      "",
      "---",
      "",
      "",
      "",
      "",
      "---",
      "",
      "",
      "",
      "---",
      "",
      "",
      "---",
      "Select Same",
      "---",
      "Select",
    ]);
    expect(fake(menu).getAttribute("style")).toBe("left: 600px; top: 300px;");
  });

  it("leaves the menu to a tool that catches it and asks it with the layers flag", () => {
    const catches = vi.fn(() => true);
    world.tool = { catchesContextMenu: catches };
    const menu = create();
    rightClick(windows, 10, 10);
    expect(openMenus()).toHaveLength(0);
    menu.trigger({ data: { context: ContextMenuContext.LayerPanel }, pageX: 5, pageY: 6 });
    expect(catches.mock.calls).toEqual([[false], [true]]);
    expect(openMenus()).toHaveLength(0);
  });

  it("opens the panel menus from trigger(options), at the position of the panel's event", () => {
    const menu = create();
    menu.trigger({
      data: { context: ContextMenuContext.PagePanel },
      pageX: 40,
      pageY: 50,
      clientX: 40,
      clientY: 50,
    });
    let [ul] = openMenus();
    expect([...fake(ul).classList]).toContain("g-page-option-menu");
    expect(captions(ul as FakeElement)).toEqual([
      "Duplicate Page",
      "Delete Page",
      "Copy Page",
      "Export Page",
    ]);
    expect(fake(ul).getAttribute("style")).toBe("left: 40px; top: 50px;");
    menu.close();
    expect(openMenus()).toHaveLength(0);
    // The fill row passes { previousEvent, data } with the context on its event.
    menu.trigger({
      previousEvent: {
        pageX: 7,
        pageY: 8,
        clientX: 7,
        clientY: 8,
        data: { context: ContextMenuContext.FillPropertyPanel },
      },
      data: { paintLayer: {} },
    });
    [ul] = openMenus();
    expect([...fake(ul).classList]).toContain("fill-context-menu");
    expect(fake(ul).getAttribute("style")).toBe("left: 7px; top: 8px;");
  });

  it("names the effect's Apply To entry after the effect's layer on open", () => {
    const menu = create();
    const effect = { getProperty: () => "B", setProperty: vi.fn() };
    menu.trigger({
      previousEvent: {
        pageX: 1,
        pageY: 1,
        clientX: 1,
        clientY: 1,
        data: { context: ContextMenuContext.EffectPropertyPanel },
      },
      data: { effect },
    });
    const [ul] = openMenus();
    // As before Copy Effect comes first, the submenu second.
    expect(captions(ul as FakeElement)).toEqual(["Copy Effect", "Apply to Border Only"]);
  });

  it("routes a long press inside #windows to the handler and dispatches it elsewhere", () => {
    create();
    const canvas = dom.document.createElement("canvas");
    windows.append(canvas);
    expect(Designer.contextMenuTrigger).not.toBe(null);
    (Designer.contextMenuTrigger as NonNullable<typeof Designer.contextMenuTrigger>)(
      canvas as unknown as EventTarget,
      30,
      40,
    );
    expect(openMenus()).toHaveLength(1);
    expect(fake(openMenus()[0]).getAttribute("style")).toBe("left: 30px; top: 40px;");
    ActiveMenuManager.setActiveMenu(null);
    const row = dom.document.createElement("div");
    dom.document.body.append(row);
    const seen: FakeEvent[] = [];
    row.addEventListener("contextmenu", (event) => seen.push(event));
    const saved = (globalThis as Record<string, unknown>).MouseEvent;
    (globalThis as Record<string, unknown>).MouseEvent = class extends FakeEvent {
      constructor(type: string, init: { clientX: number; clientY: number; bubbles: boolean }) {
        super(type, { ...init, pageX: init.clientX, pageY: init.clientY });
      }
    };
    try {
      (Designer.contextMenuTrigger as NonNullable<typeof Designer.contextMenuTrigger>)(
        row as unknown as EventTarget,
        5,
        6,
      );
    } finally {
      (globalThis as Record<string, unknown>).MouseEvent = saved;
    }
    expect(seen.map((e) => [e.type, e.clientX, e.clientY])).toEqual([["contextmenu", 5, 6]]);
    expect(openMenus()).toHaveLength(0);
  });

  it("lists the elements under the cursor in Select, children of hit groups as submenus", () => {
    const group = new FakeHitElement("Group");
    const child = new FakeHitElement("Rectangle", group);
    const other = new FakeHitElement("Ellipse");
    world.hits = [{ element: child }, { element: group }, { element: other }];
    create();
    rightClick(windows, 100, 200);
    expect(world.hitArgs?.slice(3)).toEqual([true, -1, 4, true, null, true, false, false]);
    const root = openMenus()[0] as FakeElement;
    const select = root.children[root.children.length - 1] as FakeElement;
    expect(select.classList.contains("g-disabled")).toBe(false);
    fire(select, "mouseover");
    const sub = openMenus()[1] as FakeElement;
    // The child goes under its group (hit index 1); the group shows as a submenu.
    expect(captions(sub)).toEqual(["1. Group", "2. Ellipse"]);
    expect(sub.children[0]?.classList.contains("g-menu-item-menu")).toBe(true);
    fire(sub.children[0], "mouseover");
    expect(captions(openMenus()[2] as FakeElement)).toEqual(["1. Rectangle"]);
    const ellipse = sub.children[1] as FakeElement;
    fire(ellipse, "mouseover");
    expect(other.flags.has(Node.Flag.Highlighted as number)).toBe(true);
    fire(ellipse, "mouseup");
    expect(other.flags.has(Node.Flag.Highlighted as number)).toBe(false);
    expect(world.selections).toEqual([[other]]);
  });

  it("shows a hit's name in Select as typed, not as stored (BUG-167)", () => {
    const rectangle = new Rectangle();
    rectangle.setProperty("name", "a<b> & c");
    // The engine stores "<" and ">" escaped (Block's name filter).
    expect(rectangle.getLabel()).toBe("a&lt;b&gt; & c");
    world.hits = [{ element: rectangle }];
    create();
    rightClick(windows, 100, 200);
    const root = openMenus()[0] as FakeElement;
    fire(root.children[root.children.length - 1], "mouseover");
    expect(captions(openMenus()[1] as FakeElement)).toEqual(["1. a<b> & c"]);
  });

  it("disables Select when nothing is under the cursor", () => {
    create();
    rightClick(windows, 1, 1);
    const root = openMenus()[0] as FakeElement;
    const select = root.children[root.children.length - 1] as FakeElement;
    expect(select.classList.contains("g-disabled")).toBe(true);
  });

  it("keeps the paste-here item and its Update hook on the Paste submenu", () => {
    world.registered = new Set(["edit.paste.here"]);
    const menu = create();
    const root = (menu as unknown as { _menus: { context: Menu } })._menus.context;
    const paste = root.getItem(1) as MenuItem;
    expect(paste.getMenu()?.getItem(0)?.getAction()?.getId()).toBe("edit.paste.here");
  });
});

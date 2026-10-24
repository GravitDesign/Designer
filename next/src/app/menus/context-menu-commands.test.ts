import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { Block } from "../../engine/scene/block.ts";
import { Node } from "../../engine/scene/node.ts";
import { BorderPaintLayer } from "../../engine/style/border-paint-layer.ts";
import { FillPaintLayer } from "../../engine/style/fill-paint-layer.ts";
import { Transform } from "../../engine/math/transform.ts";
import { Editor } from "../../editor/editor.ts";
import { applicationManager } from "../actions/host.ts";
import { Designer } from "../shell/designer.ts";
import { resetGlobals, setContainer, setDesigner } from "../shell/globals.ts";
import { setLateModules } from "../shell/late.ts";
import { ActiveMenuManager } from "./active-menu-manager.ts";
import { ContextMenu, ContextMenuContext } from "./context-menu.ts";
import {
  fire,
  installFakeDom,
  type FakeDomHandle,
  type FakeElement,
} from "./testing/fake-dom.testing.ts";

/** A paint layer: equal layers share a key; removing one records it. */
class FakeLayer {
  constructor(
    readonly key: string,
    readonly owner: FakeStyled,
  ) {}
  getParent() {
    return { removeChild: (layer: FakeLayer) => this.owner.removed.push(layer) };
  }
}

class FakeStyled {
  readonly removed: FakeLayer[] = [];
  fills: FakeLayer[] = [];
  borders: FakeLayer[] = [];
  constructor(fills: string[], borders: string[]) {
    this.fills = fills.map((key) => new FakeLayer(key, this));
    this.borders = borders.map((key) => new FakeLayer(key, this));
  }
  getScene() {
    return world.scene;
  }
  getPaintLayers() {
    return { getFillLayers: () => this.fills, getBorderLayers: () => this.borders };
  }
}

interface World {
  scene: Record<string, unknown>;
  page: Record<string, unknown>;
  log: unknown[];
  transactions: (string | null | undefined)[];
  clipboard: string[];
  executed: unknown[][];
  confirms: unknown[][];
  commercial: boolean;
  storageId: unknown;
  selection: FakeStyled[];
}

let dom: FakeDomHandle;
let world: World;
let windows: FakeElement;

beforeEach(() => {
  vi.useFakeTimers();
  dom = installFakeDom();
  const log: unknown[] = [];
  const page: Record<string, unknown> = {
    plkt: 0,
    slaves: [] as unknown[],
    getProperty(name: string) {
      return name === "plkt" ? this.plkt : undefined;
    },
    getSlavePages() {
      return this.slaves;
    },
    clone(options: unknown) {
      log.push(["clone", options]);
      return {
        getPosition: (...args: unknown[]) => {
          log.push(["getPosition", args]);
          return { getX: () => 30, getY: () => -40 };
        },
        setProperty: (name: string, value: unknown) => log.push(["setProperty", name, value]),
      };
    },
  };
  const scene: Record<string, unknown> = {
    getScene: () => scene,
    getActivePage: () => page,
    insertChild: (node: unknown) => log.push(["insertChild", node]),
    renameClone: (source: unknown, clone: unknown) =>
      log.push(["renameClone", source === page, clone]),
    deleteActivePage: () => log.push(["deleteActivePage"]),
  };
  world = {
    scene,
    page,
    log,
    transactions: [],
    clipboard: [],
    executed: [],
    confirms: [],
    commercial: false,
    storageId: "file-id",
    selection: [],
  };
  vi.spyOn(Editor, "getEditor").mockImplementation(
    (owner: unknown) =>
      (owner === scene
        ? {
            beginTransaction: () => {},
            commitTransaction: (name?: string | null) => world.transactions.push(name),
          }
        : null) as never,
  );
  vi.spyOn(Node, "serialize").mockImplementation(
    (node: unknown) => "S<" + (Array.isArray(node) ? "list" : "page") + ">&",
  );
  const document = {
    getScene: () => scene,
    getEditor: () => ({ getSelection: () => world.selection, updateSelection: () => {} }),
    isCommercialProductFile: () => world.commercial,
    getStorageItem: () => ({ getId: () => world.storageId }),
  };
  setDesigner({
    getAction: () => null,
    getWindows: () => ({
      getActiveWindow: () => ({
        getView: () => ({
          _convertClientPositionFromMousePosition: () => ({ x: 0, y: 0 }),
          getWorldTransform: () => null,
          getViewConfiguration: () => ({ multiPageView: false }),
        }),
      }),
    }),
    getToolManager: () => ({ getActiveTool: () => null }),
    getActiveDocument: () => document,
    isTouchEnabled: () => false,
    executeAction: (...args: unknown[]) => world.executed.push(args),
  } as unknown as Designer);
  setContainer({
    copyToClipboard: (text: string) => {
      world.clipboard.push(text);
      return Promise.resolve();
    },
  } as never);
  setLateModules({
    "dialogs/system-dialog.ts": {
      SystemDialog: {
        alert: () => {},
        confirm: (...args: unknown[]) => world.confirms.push(args),
      },
    },
  });
  windows = dom.document.createElement("div");
  dom.document.body.append(windows);
});

afterEach(() => {
  ActiveMenuManager.setActiveMenu(null, true);
  Designer.contextMenuTrigger = null;
  setLateModules({});
  resetGlobals();
  vi.restoreAllMocks();
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  dom.uninstall();
});

/** Opens a panel's menu and runs its item at `index`. */
function run(context: number, index: number, data: Record<string, unknown> = {}): void {
  const menu = new ContextMenu(windows as unknown as HTMLElement);
  if (context === ContextMenuContext.PagePanel)
    menu.trigger({ data: { context, ...data }, pageX: 1, pageY: 1, clientX: 1, clientY: 1 });
  else
    menu.trigger({
      previousEvent: { pageX: 1, pageY: 1, clientX: 1, clientY: 1, data: { context } },
      data,
    });
  const ul = dom.document.body.children.filter((c) => c.tagName === "UL").pop() as FakeElement;
  fire(ul.children[index], "mouseup");
}

const PAGE = ContextMenuContext.PagePanel;

describe("ContextMenu page commands", () => {
  it("duplicates the active page and offsets the clone by its own position", () => {
    run(PAGE, 0);
    const [clone, insert, rename, position, offset] = world.log as unknown[][];
    expect(clone?.[0]).toBe("clone");
    expect(clone?.[1]).toMatchObject({ copy: true });
    expect(insert?.[0]).toBe("insertChild");
    expect(rename?.slice(0, 2)).toEqual(["renameClone", true]);
    expect(position).toEqual(["getPosition", [true, true, true, true]]);
    expect(offset?.slice(0, 2)).toEqual(["setProperty", "off"]);
    expect(offset?.[2]).toBeInstanceOf(Transform);
    expect((offset?.[2] as Transform).getMatrix()).toEqual([1, 0, 0, 1, 30, -40]);
    expect(world.transactions).toEqual(["Duplicate Page"]);
  });

  it("doesn't delete a page with the NoDelete program lock", () => {
    world.page.plkt = Block.ProgramLck.NoDelete;
    world.page.slaves = [{}];
    run(PAGE, 1);
    expect(world.log).toEqual([]);
    expect(world.confirms).toEqual([]);
    expect(world.transactions).toEqual([]);
  });

  it("deletes a plain page in one transaction", () => {
    run(PAGE, 1);
    expect(world.log).toEqual([["deleteActivePage"]]);
    expect(world.transactions).toEqual(["Delete Page"]);
  });

  it("asks before deleting a master page and names the step after the outline sidebar", () => {
    world.page.slaves = [{}];
    run(PAGE, 1);
    expect(world.log).toEqual([]);
    expect(world.confirms).toHaveLength(1);
    const [message, done, ...rest] = world.confirms[0] as unknown[];
    expect(typeof message).toBe("string");
    expect(rest).toEqual([null, null, true, true]);
    (done as (ok: boolean) => void)(false);
    expect(world.log).toEqual([]);
    (done as (ok: boolean) => void)(true);
    expect(world.log).toEqual([["deleteActivePage"]]);
    expect(world.transactions).toEqual([
      Locale.get(new LocaleKey("GOutlineSidebar", "action.delete-page")),
    ]);
  });

  it("copies the page with the restricted attribute the old code always wrote", () => {
    run(PAGE, 2);
    world.commercial = true;
    run(PAGE, 2);
    world.storageId = undefined;
    run(PAGE, 2);
    world.commercial = false;
    vi.spyOn(applicationManager(), "isCopyPasteEnabled").mockReturnValue(false);
    world.storageId = 7;
    run(PAGE, 2);
    const head = '<gravit mimeType="application/gravit+node" restricted=';
    expect(world.clipboard).toEqual([
      head + '"false">S&lt;page&gt;&amp;</gravit>',
      head + '"file-id">S&lt;page&gt;&amp;</gravit>',
      head + '"undefined">S&lt;page&gt;&amp;</gravit>',
      head + '"7">S&lt;page&gt;&amp;</gravit>',
    ]);
    expect(world.transactions).toEqual(["Copy Page", "Copy Page", "Copy Page", "Copy Page"]);
  });

  it("exports the active page with force", () => {
    run(PAGE, 3);
    expect(world.executed).toEqual([["file.export", [{ element: world.page }], undefined, true]]);
  });
});

describe("ContextMenu fill and border commands", () => {
  beforeEach(() => {
    vi.spyOn(FillPaintLayer, "equals").mockImplementation(
      (a: unknown, b: unknown) => (a as FakeLayer).key === (b as FakeLayer).key,
    );
    vi.spyOn(BorderPaintLayer, "equals").mockImplementation(
      (a: unknown, b: unknown) => (a as FakeLayer).key === (b as FakeLayer).key,
    );
  });

  it("deletes only the first equal fill of each selected node", () => {
    const first = new FakeStyled(["red", "blue", "blue"], []);
    const second = new FakeStyled(["blue"], []);
    const third = new FakeStyled(["green"], []);
    world.selection = [first, second, third];
    run(ContextMenuContext.FillPropertyPanel, 0, { paintLayer: { key: "blue" } });
    expect(first.removed).toEqual([first.fills[1]]);
    expect(second.removed).toEqual([second.fills[0]]);
    expect(third.removed).toEqual([]);
    expect(world.transactions).toEqual(["Delete Fill"]);
  });

  it("deletes only the first equal border of each selected node", () => {
    const first = new FakeStyled([], ["thin", "thin"]);
    world.selection = [first];
    run(ContextMenuContext.BorderPropertyPanel, 1, { paintLayer: { key: "thin" } });
    expect(first.removed).toEqual([first.borders[0]]);
    expect(world.transactions).toEqual(["Delete Border"]);
  });

  it("copies a fill or border without the restricted attribute", () => {
    run(ContextMenuContext.FillPropertyPanel, 1, { paintLayer: { key: "red" } });
    run(ContextMenuContext.BorderPropertyPanel, 2, { paintLayer: { key: "thin" } });
    expect(world.clipboard).toEqual([
      '<gravit mimeType="application/gravit+node">S&lt;list&gt;&amp;</gravit>',
      '<gravit mimeType="application/gravit+node">S&lt;list&gt;&amp;</gravit>',
    ]);
    expect(world.transactions).toEqual([]);
  });
});

import "../window.testing.ts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Node } from "../../../engine/scene/node.ts";
import type { Page } from "../../../engine/scene/page.ts";
import { Symbol } from "../../../engine/scene/symbol.ts";
import "../../../editor/element-editors/group-editor.ts";
import "../../../editor/element-editors/symbol-editor.ts";
import { setLateModules } from "../../shell/late.ts";
import { shortcutToMousetrap } from "../../shell/shortcut-binder.ts";
import { rect, setupDesigner, type Fixture } from "../actions.testing.ts";
import { props, setActionDesigner } from "../host.ts";
import { ChangeActivePageAction } from "./change-active-page-action.ts";
import { ChangeAnchorPointsJointTypeMainAction } from "./change-anchor-points-joint-type-main-action.ts";
import { ChangeAnchorPointsJointTypeSubAction } from "./change-anchor-points-joint-type-sub-action.ts";
import { CreateSymbolAction } from "./create-symbol-action.ts";
import { CycleThroughLayersAction } from "./cycle-through-layers-action.ts";
import { DetachSymbolAction } from "./detach-symbol-action.ts";
import { EnterLayerGroupAction } from "./enter-layer-group-action.ts";
import { LockLayerAction } from "./lock-layer-action.ts";
import type { LayerPanelItem, LayerPanelTreeNode } from "./modify-deps.ts";
import { ResetInstanceAction } from "./reset-instance-action.ts";

let fixture: Fixture;

beforeEach(() => {
  fixture = setupDesigner();
  Object.assign(fixture.designer, { isEnabledProFeatures: () => true });
});

afterEach(() => {
  setLateModules({});
  setActionDesigner(null);
});

/** A system dialog whose prompt answers with `answer`; records message and default. */
function answerPrompts(answer: string | undefined): { prompts: unknown[][] } {
  const seen = { prompts: [] as unknown[][] };
  setLateModules({
    "dialogs/system-dialog.ts": {
      SystemDialog: {
        prompt(message: string, done: (value?: string) => void, value?: string) {
          seen.prompts.push([message, value]);
          done(answer);
        },
      },
    },
  });
  return seen;
}

function insertSelected(nodes: Node[]): void {
  fixture.editor.insertElements(nodes, true);
  fixture.editor.updateSelection(false, nodes);
}

/** A master symbol made of one rectangle, and an instance of it (selected). */
function masterAndInstance(): { master: Symbol; instance: Symbol } {
  const a = rect("A", 0);
  insertSelected([a]);
  const page = fixture.scene.getActivePage() as unknown as Parameters<typeof Symbol.create>[1];
  const master = Symbol.create([a], page, "Master");
  fixture.editor.updateSelection(false, [master]);
  fixture.editor.cloneSelection(false, true);
  const instance = (fixture.editor.getSelection() as Node[])[0] as Symbol;
  return { master, instance };
}

describe("Create Symbol", () => {
  it("asks for a name and turns the selection into a master of that name", () => {
    const action = new CreateSymbolAction();
    const seen = answerPrompts("My Symbol");
    const a = rect("A", 0);
    insertSelected([a]);
    expect(action.isEnabled()).toBe(true);
    expect(action.isPro()).toBe(false);
    action.execute();
    expect(seen.prompts).toEqual([["Enter new symbol name:", "Symbol 1"]]);
    const [symbol] = fixture.editor.getSelection() as Node[];
    expect(symbol).toBeInstanceOf(Symbol);
    expect((symbol as Symbol).isMaster()).toBe(true);
    expect(props(symbol as Node).getProperty("name")).toBe("My Symbol");
    expect(a.getParent()).toBe(symbol);
    expect(fixture.editor.getUndoStateName()).toBe("Create Symbol");
  });

  it("does nothing when the prompt is cancelled", () => {
    const action = new CreateSymbolAction();
    answerPrompts(undefined);
    const a = rect("A", 0);
    insertSelected([a]);
    const undoBefore = fixture.editor.getUndoStates().length;
    action.execute();
    expect(fixture.editor.getSelection()).toEqual([a]);
    expect(fixture.editor.getUndoStates().length).toBe(undoBefore);
  });

  it("proposes the next free default name", () => {
    const action = new CreateSymbolAction();
    const seen = answerPrompts(undefined);
    const a = rect("A", 0);
    insertSelected([a]);
    Symbol.create(
      [a],
      fixture.scene.getActivePage() as unknown as Parameters<typeof Symbol.create>[1],
      "Symbol 1",
    );
    insertSelected([rect("B", 50)]);
    action.execute();
    expect((seen.prompts[0] as unknown[])[1]).toBe("Symbol 2");
  });
});

describe("Detach and Reset Instance", () => {
  it("detaches an instance and names the undo step", () => {
    const { instance } = masterAndInstance();
    const action = new DetachSymbolAction();
    expect(action.isEnabled()).toBe(true);
    action.execute();
    expect(instance.getMasterSymbol()).toBe(null);
    expect(action.isEnabled()).toBe(false);
    expect(fixture.editor.getUndoStateName()).toBe("Detach symbol ");
  });

  it("is disabled for a master", () => {
    const { master } = masterAndInstance();
    fixture.editor.updateSelection(false, [master]);
    expect(new DetachSymbolAction().isEnabled()).toBe(false);
  });

  it("puts a changed instance back in sync with its master", () => {
    const { instance } = masterAndInstance();
    props(instance.getFirstChild() as Node).setProperty("_stop", 0.3);
    const action = new ResetInstanceAction();
    expect(instance.inSync()).toBe(false);
    expect(action.isEnabled()).toBe(true);
    action.execute();
    expect(instance.inSync()).toBe(true);
    expect(props(instance.getFirstChild() as Node).getProperty("_stop")).not.toBe(0.3);
    expect(action.isEnabled()).toBe(false);
  });
});

describe("Change active page", () => {
  it("hands the next page to the outline sidebar, skipping other nodes", () => {
    const changed: unknown[] = [];
    const outline = { changeActivePage: (page: unknown) => changed.push(page) };
    Object.assign(fixture.designer, {
      getLeftSidebars: () => ({
        getActiveSidebar: () => "outline",
        getSidebar: (id: string) => (id === "outline" ? outline : null),
      }),
    });
    const first = fixture.scene.getActivePage() as unknown as Page;
    const second = fixture.scene.insertPage() as unknown as Page;
    fixture.scene.setActivePage(first as never);
    const next = new ChangeActivePageAction(ChangeActivePageAction.Type.Next);
    const previous = new ChangeActivePageAction(ChangeActivePageAction.Type.Previous);
    expect(next.getId()).toBe("view.change-active-page.next");
    expect(next.getNextPage(fixture.scene)).toBe(second);
    expect(previous.getNextPage(fixture.scene)).toBe(null);
    next.execute();
    previous.execute();
    expect(changed).toEqual([second, null]);
  });

  it("binds Page Down and Page Up as one-key shortcuts (BUG-148)", () => {
    // Designer.registerAdditionalShortcuts binds each entry through shortcutToMousetrap.
    const combos = (type: string) =>
      (new ChangeActivePageAction(type).getAdditionalShortcuts() || []).map((shortcut) =>
        shortcutToMousetrap(shortcut),
      );
    expect(combos(ChangeActivePageAction.Type.Next)).toEqual(["pagedown"]);
    expect(combos(ChangeActivePageAction.Type.Previous)).toEqual(["pageup"]);
  });
});

interface FakeRow extends LayerPanelTreeNode {
  name: string;
  item: LayerPanelItem & { flags: number };
}

/** A layers panel of `names` rows on one level, the first one focused and selected. */
function fakePanel(names: string[], active = "outline") {
  const flagItem = () => {
    const item = {
      flags: 0,
      hasFlag: (f: number) => (item.flags & f) !== 0,
      setFlag: (f: number) => void (item.flags |= f),
      removeFlag: (f: number) => void (item.flags &= ~f),
    };
    return item;
  };
  const parent = {} as LayerPanelTreeNode;
  const rows: FakeRow[] = names.map((name) => ({
    name,
    item: flagItem(),
    parent,
    getNextFocusableNode: () => null,
    getPreviousFocusableNode: () => null,
  }));
  rows.forEach((row, i) => {
    row.next = rows[i + 1] || null;
    row.previous = rows[i - 1] || null;
  });
  parent.firstChild = rows[0] as FakeRow;
  parent.lastChild = rows[rows.length - 1] as FakeRow;
  const state = { focus: rows[0] as FakeRow, locked: [] as LayerPanelItem[], relayouts: 0 };
  state.focus.item.setFlag(Node.Flag.Selected as number);
  const panel = {
    data: () => ({ vtree: { expandAndFocus() {} }, currentFocus: state.focus }),
    getCurrentFocusedNode: () => state.focus,
    setCurrentFocusedNode: (node: LayerPanelTreeNode) => void (state.focus = node as FakeRow),
    getItem: (node: LayerPanelTreeNode) => (node as FakeRow).item,
    relayout: () => void state.relayouts++,
    toggleLockStatusOfLayerOrItem: (item: LayerPanelItem) => void state.locked.push(item),
  };
  const sidebar = { getId: () => "outline", getLayerPanel: () => panel };
  Object.assign(fixture.designer, {
    getLeftSidebars: () => ({
      getActiveSidebar: () => active,
      getSidebar: (id: string) => (id === "outline" ? sidebar : null),
    }),
  });
  return { rows, state };
}

describe("Layer panel shortcuts", () => {
  it("cycles the focus through one level and wraps around", () => {
    const { rows, state } = fakePanel(["L1", "L2", "L3"]);
    const previous = new CycleThroughLayersAction(CycleThroughLayersAction.Type.Previous);
    previous.execute();
    expect(state.focus).toBe(rows[2]);
    expect((rows[2] as FakeRow).item.hasFlag(Node.Flag.Selected as number)).toBe(true);
    expect((rows[0] as FakeRow).item.hasFlag(Node.Flag.Selected as number)).toBe(false);
    new CycleThroughLayersAction(CycleThroughLayersAction.Type.Next).execute();
    expect(state.focus).toBe(rows[0]);
    expect(state.relayouts).toBe(2);
  });

  it("does nothing while another left sidebar is active", () => {
    const { rows, state } = fakePanel(["L1", "L2"], "library");
    new CycleThroughLayersAction(CycleThroughLayersAction.Type.Next).execute();
    new LockLayerAction().execute();
    expect(state.focus).toBe(rows[0]);
    expect(state.locked).toEqual([]);
  });

  it("locks the focused row only when it is selected", () => {
    const { rows, state } = fakePanel(["L1", "L2"]);
    new LockLayerAction().execute();
    expect(state.locked).toEqual([(rows[0] as FakeRow).item]);
    (rows[0] as FakeRow).item.removeFlag(Node.Flag.Selected as number);
    new LockLayerAction().execute();
    expect(state.locked.length).toBe(1);
  });

  it("leaves a group only for a parent that has a row", () => {
    const { rows } = fakePanel(["L1"]);
    const leave = new EnterLayerGroupAction(true);
    expect(leave.getId()).toBe("view.enter-layer-group.reverse");
    leave.execute();
    // The fake rows' parent has no row (the tree root): the focus stays.
    expect((rows[0] as FakeRow).item.hasFlag(Node.Flag.Selected as number)).toBe(true);
  });
});

describe("Change anchor point joint type", () => {
  it("passes the engine type of each menu type to the inspector", () => {
    const types: string[] = [];
    const inspector = { setPathPointsNodeType: (type: string) => types.push(type) };
    Object.assign(fixture.designer, {
      getRightSidebars: () => ({
        getActiveSidebar: () => "inspector",
        getSidebar: (id: string) => (id === "inspector" ? inspector : null),
      }),
    });
    const main = fixture.register(
      new ChangeAnchorPointsJointTypeMainAction(ChangeAnchorPointsJointTypeSubAction),
    );
    const subs = ["straight", "mirrored", "disconnected", "connector", "asymmetric"].map((type) =>
      fixture.register(new ChangeAnchorPointsJointTypeSubAction(type)),
    );
    expect(main.isEnabled()).toBe(true);
    expect((subs[1] as ChangeAnchorPointsJointTypeSubAction).getId()).toBe(
      "modify.change-anchor-points-joint-type.mirrored",
    );
    expect(
      subs.map((sub) => (sub as ChangeAnchorPointsJointTypeSubAction).getShortcutSubKey()),
    ).toEqual(["S", "M", "D", "C", "A"]);
    subs.forEach((sub) => sub.execute());
    expect(types).toEqual(["-", "TM", "TA", "TC", "TS"]);
  });
});

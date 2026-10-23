import { describe, expect, it, vi } from "vitest";
import { ElementChange } from "../scene/element-change.ts";
import { NodeChange, NodeFlag } from "../scene/node-change.ts";
import { Container } from "../scene/node-container.ts";
import { Identity, Multireference, Reference } from "../scene/node-identity.ts";
import { Properties } from "../scene/node-properties.ts";
import { Store } from "../scene/node-store.ts";
import { Node, registerNodeClass, type NodeWorkspace } from "../scene/node.ts";
import { ActionType, TransactionRecorder } from "./transaction-recorder.ts";

class TxLeaf extends Reference(Multireference(Identity(Store(Properties(Node))))) {
  static {
    registerNodeClass(this, "txleaf", "GTxLeaf");
  }
  declare $size: number;
  changes: number[] = [];
  constructor() {
    super();
    this._setDefaultProperties({ size: 1, name: null });
  }
  override validateInsertion(): boolean {
    return true;
  }
  override _handleChange(change: number, args?: unknown): void {
    this.changes.push(change);
    super._handleChange(change, args);
  }
}

class TxRoot extends Container(Identity(Store(Properties(Node)))) {
  static {
    registerNodeClass(this, "txroot", "GTxRoot");
  }
  override validateInsertion(): boolean {
    return true;
  }
  getScene(): TxRoot {
    return this;
  }
}

function setup(): { recorder: TransactionRecorder; root: TxRoot; workspace: NodeWorkspace } {
  const recorder = new TransactionRecorder();
  const workspace: NodeWorkspace = {
    getTransactionRecorder: () => recorder,
    addReference: () => {},
    removeReference: () => {},
    getReference: () => null,
  };
  const root = new TxRoot();
  root._setWorkspace(workspace);
  return { recorder, root, workspace };
}

describe("TransactionRecorder", () => {
  it("keeps the old action type numbers and name", () => {
    expect(TransactionRecorder.ActionType).toEqual({
      PropertyChange: 0,
      FlagSet: 1,
      FlagRemove: 2,
      Insert: 3,
      Remove: 4,
      Special: 5,
      BeginBlock: 6,
      EndBlock: 7,
      BeginSelectionUpdate: 8,
      FinishSelectionUpdate: 9,
    });
    expect(String(new TransactionRecorder())).toBe("[GTransactionRecorder]");
  });

  it("records nothing outside a transaction and returns null without one", () => {
    const { recorder, root } = setup();
    root.appendChild(new TxLeaf());
    expect(recorder.endTransaction()).toBeNull();
  });

  it("records property changes that redo and undo, but not temporary ones", () => {
    const { recorder, root } = setup();
    const leaf = new TxLeaf();
    root.appendChild(leaf);
    recorder.beginTransaction();
    leaf.setProperty("size", 5);
    leaf.setProperty("size", 7, false, false, true);
    const actions = recorder.endTransaction() ?? [];
    expect(actions).toHaveLength(1);
    const [change] = actions;
    expect(change?.isPropertyChangeAction).toBe(true);
    expect(change?.node).toBe(leaf);
    expect(change?.properties).toEqual(["size"]);
    expect(change?.oldValues).toEqual([1]);
    expect(change?.values).toEqual([5]);
    change?.revert();
    expect(leaf.$size).toBe(1);
    change?.action();
    expect(leaf.$size).toBe(5);
  });

  it("flags the node as replaying while an action runs", () => {
    const { recorder, root } = setup();
    const leaf = new TxLeaf();
    root.appendChild(leaf);
    recorder.beginTransaction();
    leaf.setProperty("size", 5);
    const [change] = recorder.endTransaction() ?? [];
    const seen: boolean[] = [];
    const original = leaf._handleChange.bind(leaf);
    leaf._handleChange = (c: number, a?: unknown) => {
      if (c === NodeChange.AfterPropertiesChange) seen.push(leaf.recordedTransaction);
      original(c, a);
    };
    change?.revert();
    expect(seen).toEqual([true]);
    expect(leaf.recordedTransaction).toBe(false);
    // Already inside a replaying parent: the node itself is not flagged.
    root.recordedTransaction = true;
    change?.action();
    expect(seen).toEqual([true, false]);
  });

  it("records inserts and removals with the next sibling", () => {
    const { recorder, root } = setup();
    const a = new TxLeaf();
    const b = new TxLeaf();
    root.appendChild(b);
    recorder.beginTransaction();
    root.insertChild(a, b);
    root.removeChild(b);
    const [insert, remove] = recorder.endTransaction() ?? [];
    remove?.revert();
    expect(root.getChildren()).toEqual([a, b]);
    insert?.revert();
    expect(root.getChildren()).toEqual([b]);
    insert?.action();
    expect(root.getChildren()).toEqual([a, b]);
  });

  it("only records the active flag", () => {
    const { recorder, root } = setup();
    const leaf = new TxLeaf();
    root.appendChild(leaf);
    recorder.beginTransaction();
    leaf.setFlag(NodeFlag.Selected);
    leaf.setFlag(NodeFlag.Active);
    leaf.removeFlag(NodeFlag.Active);
    const actions = recorder.endTransaction() ?? [];
    expect(actions).toHaveLength(2);
    actions[1]?.revert();
    expect(leaf.hasFlag(NodeFlag.Active)).toBe(true);
    actions[0]?.revert();
    expect(leaf.hasFlag(NodeFlag.Active)).toBe(false);
  });

  it("drops the outer actions when a transaction begins inside another", () => {
    const { recorder, root } = setup();
    const leaf = new TxLeaf();
    root.appendChild(leaf);
    recorder.beginTransaction();
    leaf.setProperty("name", "outer-1");
    recorder.beginTransaction();
    leaf.setProperty("name", "inner");
    const inner = recorder.endTransaction() ?? [];
    leaf.setProperty("size", 3);
    expect(inner.map((a) => a.values)).toEqual([["inner"]]);
    expect(inner[0]?.oldValues).toEqual(["outer-1"]);
    // The outer end gets nothing: recording stopped at the inner end.
    expect(recorder.endTransaction()).toBeNull();
  });

  it("records blocks that replay the geometry update brackets", () => {
    const { recorder, root } = setup();
    const leaf = new TxLeaf();
    root.appendChild(leaf);
    recorder.beginTransaction();
    leaf._beginBlockChanges([NodeChange.AfterPropertiesChange], [true, true]);
    leaf._endBlockChanges([NodeChange.AfterPropertiesChange], [true, true]);
    const [begin, end] = recorder.endTransaction() ?? [];
    expect(begin?.withInvalidation).toBe(true);
    expect(begin?.noGeometryInvalidation).toBe(true);
    leaf.changes = [];
    end?.revert();
    expect(leaf.changes[0]).toBe(ElementChange.PrepareGeometryUpdate);
    leaf.changes = [];
    begin?.revert();
    expect(leaf.changes).toContain(ElementChange.FinishGeometryUpdate);
  });

  it("records special changes through the node's own actions", () => {
    const recorder = new TransactionRecorder();
    const action = vi.fn();
    const revert = vi.fn();
    const node = { getTransactionAction: () => action, getTransactionRevertAction: () => revert };
    recorder.beginTransaction();
    recorder.afterSpecialChange({}, 1);
    recorder.afterSpecialChange(node, 1);
    const actions = recorder.endTransaction() ?? [];
    expect(actions).toHaveLength(1);
    expect(actions[0]?.action).toBe(action);
    expect(actions[0]?.revert).toBe(revert);
  });

  it("records transform box changes against the scene's editor", () => {
    const recorder = new TransactionRecorder();
    const setCenter = vi.fn();
    const editor = {
      getTransformBox: () => ({ setCenter }),
      getTBoxMode: () => 1,
      _transformBox: null as unknown,
    };
    const scene = { __editor__: editor };
    recorder.beginTransaction();
    recorder.afterTBoxCenterTransform(scene, 1, 2, 3, 4);
    recorder.afterTBoxChange(scene, "old", "new");
    const [center, box] = recorder.endTransaction() ?? [];
    center?.action();
    center?.revert();
    expect(setCenter.mock.calls).toEqual([
      [3, 4],
      [1, 2],
    ]);
    box?.action();
    expect(editor._transformBox).toBe("new");
    box?.revert();
    expect(editor._transformBox).toBe("old");
  });

  it("adds debug data with sequence ids and marks it bugged outside a scene", () => {
    const { recorder, root } = setup();
    const a = new TxLeaf();
    const b = new TxLeaf();
    root.appendChild(a);
    root.appendChild(b);
    recorder.beginTransaction(true);
    a.setProperty("size", 2);
    root.setProperty("x", 1, true);
    const c = new TxLeaf();
    root.appendChild(c);
    const actions = recorder.endTransaction() ?? [];
    // getSubnodeIds walks the children from the last one.
    expect(actions[0]?.node).toBe(1);
    expect(actions[0]?.action.type).toBe(ActionType.PropertyChange);
    expect(actions[1]?.action.node).toBe(-10);
    expect(actions[2]?.action.node).toBe(c);
    expect(actions[2]?.action.nodeStored).toMatchObject({ "@": "txleaf" });
    expect(actions[2]?.action.parent).toBe(-10);
    expect(recorder.getDebugBugged()).toBe(false);

    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const loose = new TxLeaf();
    loose._setWorkspace(root.getWorkspace());
    recorder.beginTransaction(true);
    loose.setProperty("size", 3);
    expect(recorder.getDebugBugged()).toBe(true);
    expect(error).toHaveBeenCalledWith("Warning: cannot add debug data");
    error.mockRestore();
  });
});

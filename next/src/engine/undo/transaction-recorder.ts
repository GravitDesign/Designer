// Old: chunk.vendor.js module 471 (GTransactionRecorder).
/**
 * Records what happens to the nodes of a workspace between
 * `beginTransaction` and `endTransaction`, as pairs of closures: `action`
 * redoes a change, `revert` undoes it. The editor turns the returned list
 * into an undo state; the recorder itself keeps no undo stack.
 *
 * There is only one list. `beginTransaction` replaces it and
 * `endTransaction` hands it out and stops recording, so a transaction
 * begun inside another one drops what the outer one recorded so far, and
 * changes made after the inner end are not recorded at all (QUESTIONS.md,
 * "Nested transactions drop the outer actions").
 */
import { ElementChange } from "../scene/element-change.ts";
import { Accelerated, type AcceleratedApi } from "../scene/element-accelerated.ts";
import { NodeFlag } from "../scene/node-change.ts";
import type { ContainerNode } from "../scene/node-container.ts";
import type { PropertiesNode } from "../scene/node-properties.ts";
import { Node, type NodeTransactionRecorder } from "../scene/node.ts";

/** The kinds of recorded actions, as debug data names them. */
export const ActionType = {
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
} as const;

/**
 * A recorded closure. With debugging on, the recorder hangs a description
 * of the action on the function itself (the old code did the same).
 */
export interface TransactionFunction {
  (this: TransactionAction): void;
  node?: unknown;
  nodeStored?: unknown;
  parent?: number | null;
  next?: number | null;
  type?: number;
  data?: unknown;
}

/** One recorded change: call `action()` to redo it, `revert()` to undo it. */
export interface TransactionAction {
  action: TransactionFunction;
  revert: TransactionFunction;
  isPropertyChangeAction?: boolean;
  /** The node of a property change (its sequence id once debug data is added). */
  node?: unknown;
  properties?: string[];
  values?: unknown[];
  oldValues?: unknown[];
  custom?: boolean | null | undefined;
  /** The raw block argument entries (see blockFlag). */
  withInvalidation?: unknown;
  noGeometryInvalidation?: unknown;
  changes?: number[];
}

/** A node whose special changes (paths graph facets) can be recorded. */
export interface SpecialChangeNode {
  getTransactionAction?(data: unknown): TransactionFunction;
  getTransactionRevertAction?(data: unknown): TransactionFunction;
  getTransactionActionSerialized?(data: unknown): unknown;
}

/** What the transform box actions need from the editor (GEditor). */
export interface TransformBoxEditor {
  getTransformBox(): { setCenter(x: number, y: number): void } | null;
  getTBoxMode(): number;
  _transformBox: unknown;
}

/** A scene as the transform box actions see it: the editor hangs on `__editor__`. */
export interface TransformBoxScene {
  __editor__?: TransformBoxEditor | null;
}

/** What the selection update actions call on the editor. */
export interface SelectionUpdater {
  _beginSelectionUpdate(): void;
  _finishSelectionUpdate(): void;
}

/** The node as the recorded closures drive it. */
type RecordedNode = Node & Partial<PropertiesNode>;

/**
 * Runs `fn` with the node flagged as replaying a recorded transaction,
 * unless it or an ancestor already is.
 */
function asRecorded(node: Node, fn: () => void): void {
  let flagged = false;
  if (
    node.isRecordedTransaction &&
    "function" == typeof node.isRecordedTransaction &&
    !node.isRecordedTransaction()
  ) {
    node.recordedTransaction = true;
    flagged = true;
  }
  fn();
  if (flagged) node.recordedTransaction = false;
}

function finishGeometryUpdate(node: Node, noGeometryInvalidation: unknown): void {
  asRecorded(node, () => {
    node._notifyChange(ElementChange.FinishGeometryUpdate, noGeometryInvalidation ? -1 : 0);
    if (node.hasMixin(Accelerated)) (node as unknown as AcceleratedApi)._updateQTree();
  });
}

function prepareGeometryUpdate(node: Node): void {
  asRecorded(node, () => {
    node._notifyChange(ElementChange.PrepareGeometryUpdate);
  });
}

/**
 * The block argument: [withInvalidation, noGeometryInvalidation]. Like the
 * old `!!n && n[0]`, this is false without an argument and otherwise the
 * caller's raw entry (undefined, 0, true, ...); only its truthiness is read.
 */
function blockFlag(arg: unknown, index: number): unknown {
  return !!arg && (arg as unknown[])[index];
}

/**
 * The nodes of the scene in getSubnodeIds order, cached for one debug
 * entry (module-wide, like the old variable).
 */
let sequenceNodes: Node[] | null = null;

export class TransactionRecorder implements NodeTransactionRecorder {
  static ActionType = ActionType;

  declare _transactionActions: TransactionAction[] | null;
  declare _debugOn: boolean;
  declare _debugBugged: boolean;

  getDebugBugged(): boolean {
    return this._debugBugged;
  }

  /** Starts a new list of actions (dropping any list still open). */
  beginTransaction(debug?: unknown): void {
    this._transactionActions = [];
    this._debugOn = !!debug;
    this._debugBugged = false;
  }

  /** Stops recording and returns what was recorded (null when nothing was begun). */
  endTransaction(): TransactionAction[] | null {
    const actions = this._transactionActions;
    this._transactionActions = null;
    return actions;
  }

  afterSetProperties(
    node: Node,
    properties: string[],
    oldValues: unknown[],
    newValues: unknown[],
    temporary: boolean | null | undefined,
    custom: boolean | null | undefined,
  ): void {
    if (temporary || !this._transactionActions) return;
    const target = node as RecordedNode;
    this._transactionActions.push({
      isPropertyChangeAction: true,
      node,
      properties: properties.slice(),
      values: newValues,
      oldValues: oldValues.slice(),
      custom,
      action: function () {
        asRecorded(node, () => {
          (target.setProperties as PropertiesNode["setProperties"]).call(
            target,
            this.properties as string[],
            this.values as unknown[],
            this.custom,
          );
        });
      },
      revert: function () {
        asRecorded(node, () => {
          (target.setProperties as PropertiesNode["setProperties"]).call(
            target,
            this.properties as string[],
            this.oldValues as unknown[],
            this.custom,
          );
        });
      },
    });
    this._addDebugData(ActionType.PropertyChange, node);
  }

  afterChildInsert(child: Node, parent: Node, next: Node | null): void {
    if (!this._transactionActions) return;
    const container = parent as ContainerNode;
    this._transactionActions.push({
      action: function () {
        container.insertChild(child, next);
      },
      revert: function () {
        container.removeChild(child);
      },
    });
    this._addDebugData(ActionType.Insert, child, parent, next);
  }

  beforeChildRemove(child: Node, parent: Node, next: Node | null): void {
    if (!this._transactionActions) return;
    const container = parent as ContainerNode;
    this._transactionActions.push({
      action: function () {
        container.removeChild(child);
      },
      revert: function () {
        container.insertChild(child, next);
      },
    });
    this._addDebugData(ActionType.Remove, child, parent, next);
  }

  /** Only the Active flag is recorded. */
  afterFlagSet(node: Node, flag: number): void {
    if (!this._transactionActions || flag !== NodeFlag.Active) return;
    this._transactionActions.push({
      action: function () {
        node.setFlag(NodeFlag.Active);
      },
      revert: function () {
        node.removeFlag(NodeFlag.Active);
      },
    });
    this._addDebugData(ActionType.FlagSet, node);
  }

  afterFlagRemove(node: Node, flag: number): void {
    if (!this._transactionActions || flag !== NodeFlag.Active) return;
    this._transactionActions.push({
      action: function () {
        node.removeFlag(NodeFlag.Active);
      },
      revert: function () {
        node.setFlag(NodeFlag.Active);
      },
    });
    this._addDebugData(ActionType.FlagRemove, node);
  }

  beginBlock(node: Node, changes: readonly number[], arg: unknown): void {
    if (!this._transactionActions) return;
    this._transactionActions.push({
      withInvalidation: blockFlag(arg, 0),
      noGeometryInvalidation: blockFlag(arg, 1),
      changes: changes.slice(),
      action: function () {
        if (this.withInvalidation) prepareGeometryUpdate(node);
        node._beginBlockChanges(this.changes as number[]);
      },
      revert: function () {
        node._endBlockChanges(this.changes as number[]);
        if (this.withInvalidation) finishGeometryUpdate(node, this.noGeometryInvalidation);
      },
    });
    this._addDebugData(ActionType.BeginBlock, node);
  }

  endBlock(node: Node, changes: readonly number[], arg: unknown): void {
    if (!this._transactionActions) return;
    this._transactionActions.push({
      withInvalidation: blockFlag(arg, 0),
      noGeometryInvalidation: blockFlag(arg, 1),
      changes: changes.slice(),
      action: function () {
        node._endBlockChanges(this.changes as number[]);
        if (this.withInvalidation) finishGeometryUpdate(node, this.noGeometryInvalidation);
      },
      revert: function () {
        if (this.withInvalidation) prepareGeometryUpdate(node);
        node._beginBlockChanges(this.changes as number[]);
      },
    });
    this._addDebugData(ActionType.EndBlock, node);
  }

  beginSelectionUpdate(editor: SelectionUpdater): void {
    if (!this._transactionActions) return;
    this._transactionActions.push({
      action: function () {
        editor._beginSelectionUpdate();
      },
      revert: function () {
        editor._finishSelectionUpdate();
      },
    });
  }

  finishSelectionUpdate(editor: SelectionUpdater): void {
    if (!this._transactionActions) return;
    this._transactionActions.push({
      action: function () {
        editor._finishSelectionUpdate();
      },
      revert: function () {
        editor._beginSelectionUpdate();
      },
    });
  }

  /** Records a move of the transform box center from (oldX, oldY) to (x, y). */
  afterTBoxCenterTransform(
    scene: TransformBoxScene,
    oldX: number,
    oldY: number,
    x: number,
    y: number,
  ): void {
    if (!this._transactionActions) return;
    this._transactionActions.push({
      action: function () {
        const editor = scene.__editor__ ? scene.__editor__ : null;
        if (editor) {
          const box = editor.getTransformBox();
          if (box && 0 !== editor.getTBoxMode()) box.setCenter(x, y);
        }
      },
      revert: function () {
        const editor = scene.__editor__ ? scene.__editor__ : null;
        if (editor) {
          const box = editor.getTransformBox();
          if (box && 0 != editor.getTBoxMode()) box.setCenter(oldX, oldY);
        }
      },
    });
  }

  afterTBoxChange(scene: TransformBoxScene, oldBox: unknown, newBox: unknown): void {
    if (!this._transactionActions) return;
    this._transactionActions.push({
      action: function () {
        const editor = scene.__editor__ ? scene.__editor__ : null;
        if (editor && 0 != editor.getTBoxMode()) editor._transformBox = newBox;
      },
      revert: function () {
        const editor = scene.__editor__ ? scene.__editor__ : null;
        if (editor && 0 != editor.getTBoxMode()) editor._transformBox = oldBox;
      },
    });
  }

  /** Records a change only the node itself knows how to redo and undo. */
  afterSpecialChange(node: SpecialChangeNode, data: unknown): void {
    if (
      this._transactionActions &&
      node.getTransactionAction &&
      "function" == typeof node.getTransactionAction &&
      node.getTransactionRevertAction &&
      "function" == typeof node.getTransactionRevertAction
    ) {
      this._transactionActions.push({
        action: node.getTransactionAction(data),
        revert: node.getTransactionRevertAction(data),
      });
      this._addDebugData(ActionType.Special, node as unknown as Node, null, null, data);
    }
  }

  /**
   * The index of a node among its scene's nodes (getSubnodeIds order), -10
   * for the scene itself, -1 when it isn't in a scene. Throws when the node
   * isn't found.
   */
  _getSeqId(node: Node): number {
    let holder = node as Node & { getScene?: unknown };
    // A node without a scene node above it ends at null and throws here,
    // which _addDebugData catches.
    while (!holder.getScene) holder = holder.getParent() as unknown as typeof holder;
    if ("function" != typeof holder.getScene) return -1;
    const scene = (holder.getScene as () => ContainerNode | null).call(holder);
    if (!scene) return -1;
    if (node === (scene as unknown)) return -10;
    if (!sequenceNodes) {
      const ids: Record<string, Node> = {};
      scene.getSubnodeIds(ids);
      sequenceNodes = Object.values(ids);
    }
    const index = sequenceNodes.indexOf(node);
    if (index < 0) throw new Error("Couldn't determine node's sequence ID");
    return index;
  }

  /** With debugging on, describes the last action on its `action` function. */
  _addDebugData(
    type: number,
    node: Node,
    parent?: Node | null,
    next?: Node | null,
    data?: unknown,
  ): void {
    if (!this._debugOn) return;
    if (this._debugBugged) return;
    sequenceNodes = null;
    try {
      const actions = this._transactionActions as TransactionAction[];
      const last = actions[actions.length - 1] as TransactionAction;
      if (type !== ActionType.BeginSelectionUpdate && type !== ActionType.FinishSelectionUpdate) {
        if (type === ActionType.Insert) {
          last.action.node = node;
          last.action.nodeStored = Node.store(node);
        } else last.action.node = this._getSeqId(node);
      }
      last.action.parent = parent ? this._getSeqId(parent) : null;
      // The old code takes the sequence id of the node, not of `next`; kept.
      last.action.next = next ? this._getSeqId(node) : null;
      last.action.type = type;
      if (last.node) last.node = last.action.node;
      if (data) {
        // Called without a check, as before: a node without it marks the debug data bugged.
        const serialize = (node as unknown as SpecialChangeNode).getTransactionActionSerialized as (
          data: unknown,
        ) => unknown;
        last.action.data = serialize.call(node, data);
      }
    } catch {
      this._debugBugged = true;
      console.error("Warning: cannot add debug data");
    }
  }

  toString(): string {
    return "[GTransactionRecorder]";
  }
}

const recorderPrototype = TransactionRecorder.prototype;
recorderPrototype._transactionActions = null;
recorderPrototype._debugOn = false;
recorderPrototype._debugBugged = false;

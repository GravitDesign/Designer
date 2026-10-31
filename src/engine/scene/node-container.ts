// Old: chunk.vendor.js module 2 (GNode.Container).
/**
 * Children as a doubly linked list (each child knows its previous and
 * next sibling, the container its first and last child). Insert and
 * remove validate with the child (`validateInsertion`/`validateRemoval`),
 * notify the Before/After child changes on the container and report to the
 * workspace's transaction recorder for undo.
 */
import { defineMixin, type AnyConstructor } from "../core/object.ts";
import { settleElementIndex } from "./element-index.ts";
import { NodeChange, NodeFlag } from "./node-change.ts";
import { hasMultireference } from "./node-identity.ts";
import type { Node, NodeVisitor } from "./node.ts";

/** What GNode.Container adds to a node. */
export interface ContainerApi {
  _firstChild: Node | null;
  _lastChild: Node | null;
  /**
   * The first child of a renumbering not written out yet (see
   * element-index.ts), and the number it is owed.
   */
  _indexAnchor: Node | null;
  _indexStart: number;
  getChildren(): Node[];
  getFirstChild(): Node | null;
  getLastChild(): Node | null;
  appendChild(child: Node): void;
  /** Inserts before `reference`, or at the end when it is null. */
  insertChild(child: Node, reference: Node | null | undefined): void;
  removeChild(child: Node): void;
  clearChildren(): void;
  getIndexOfChild(child: Node): number;
  getChildByIndex(index: number): Node | null;
  acceptChildren(
    visitor: NodeVisitor,
    reverse?: boolean,
    visitAll?: boolean,
    childrenFirst?: boolean,
  ): unknown;
  /** Collects every descendant with a multi-reference id into `ids`, last child first. */
  getSubnodeIds(ids: Record<string, Node>): void;
  getInternalSelectedNodes(): Node[] | null;
}

export type ContainerNode = Node & ContainerApi;

export const Container = defineMixin(
  "GNode.Container",
  <TBase extends AnyConstructor<Node>>(Base: TBase) => {
    abstract class ContainerMixin extends Base implements ContainerApi {
      declare _firstChild: Node | null;
      declare _lastChild: Node | null;
      declare _indexAnchor: Node | null;
      declare _indexStart: number;

      getChildren(): Node[] {
        const children: Node[] = [];
        for (let child = this.getFirstChild(); null !== child; child = child.getNext()) {
          children.push(child);
        }
        return children;
      }

      getFirstChild(): Node | null {
        return this._firstChild;
      }

      getLastChild(): Node | null {
        return this._lastChild;
      }

      appendChild(child: Node): void {
        this.insertChild(child, null);
      }

      insertChild(child: Node, reference: Node | null | undefined): void {
        if (null != child._parent) throw new Error("Child is already appended somewhere else");
        if (null != reference && reference.getParent() != (this as unknown)) {
          throw new Error("Reference is not a child of this node");
        }
        if (!child.validateInsertion(this as unknown as ContainerNode, reference)) {
          throw new Error("Child insertion validation failed.");
        }
        this._notifyChange(NodeChange.BeforeChildInsert, child);
        if (null !== this._indexAnchor) {
          settleElementIndex(null != reference ? reference._previous : this._lastChild);
        }
        linkChild(this, child, reference);
        child._setParent(this as unknown as ContainerNode);
        const recorder = this._workspace ? this._workspace.getTransactionRecorder() : null;
        if (recorder) recorder.afterChildInsert(child, this, child._next);
        this._notifyChange(NodeChange.AfterChildInsert, child);
      }

      removeChild(child: Node): void {
        if (child._parent != (this as unknown))
          throw new Error("Child is not a child of this node");
        if (!child.validateRemoval()) throw new Error("Child removal validation failed.");
        this._notifyChange(NodeChange.BeforeChildRemove, child);
        const recorder = this._workspace ? this._workspace.getTransactionRecorder() : null;
        if (recorder) recorder.beforeChildRemove(child, this, child._next);
        if (null !== this._indexAnchor) settleElementIndex(child);
        childUnlinked();
        child._setParent(null);
        if (this._firstChild == child) this._firstChild = child._next;
        if (this._lastChild == child) this._lastChild = child._previous;
        if (null != child._previous) child._previous._setNext(child._next);
        if (null != child._next) child._next._setPrevious(child._previous);
        child._setPrevious(null);
        child._setNext(null);
        this._notifyChange(NodeChange.AfterChildRemove, child);
      }

      clearChildren(): void {
        for (let child = this.getFirstChild(); child; child = this.getFirstChild()) {
          this.removeChild(child);
        }
      }

      getIndexOfChild(child: Node): number {
        if (child._parent === (this as unknown)) {
          let index = 0;
          for (let node = this.getFirstChild(); null !== node; node = node.getNext()) {
            if (node === child) return index;
            index++;
          }
        }
        return -1;
      }

      getChildByIndex(index: number): Node | null {
        let i = 0;
        for (let node = this.getFirstChild(); null !== node; node = node.getNext()) {
          if (i === index) return node;
          i++;
        }
        return null;
      }

      acceptChildren(
        visitor: NodeVisitor,
        reverse?: boolean,
        visitAll?: boolean,
        childrenFirst?: boolean,
      ): unknown {
        let result: unknown;
        // With visitAll the result says whether any visit returned true.
        let any: boolean = !visitAll;
        if (reverse) {
          for (let child = this.getLastChild(); null != child; child = child.getPrevious()) {
            result = child.accept(visitor, reverse, visitAll, childrenFirst);
            if (false === result && !visitAll) return false;
            if (true === result && visitAll) any = true;
          }
        } else {
          for (let child = this.getFirstChild(); null != child; child = child.getNext()) {
            result = child.accept(visitor, reverse, visitAll, childrenFirst);
            if (false === result && !visitAll) return false;
            if (true === result && visitAll) any = true;
          }
        }
        return any;
      }

      getSubnodeIds(ids: Record<string, Node>): void {
        for (let child = this.getLastChild(); null !== child; child = child.getPrevious()) {
          if (hasMultireference(child)) {
            // A second node with the same id (a copy) gets a new one.
            if (ids[child.getMultireferenceId()]) child.resetMultireference();
            ids[child.getMultireferenceId()] = child;
          }
          if (hasContainer(child)) child.getSubnodeIds(ids);
        }
      }

      getInternalSelectedNodes(): Node[] | null {
        const selected: Node[] = [];
        this.acceptChildren(
          (node) => {
            if (node.hasFlag(NodeFlag.Selected)) selected.push(node);
            return true;
          },
          false,
          true,
        );
        return selected.length ? selected : null;
      }
    }
    ContainerMixin.prototype._firstChild = null;
    ContainerMixin.prototype._lastChild = null;
    ContainerMixin.prototype._indexAnchor = null;
    ContainerMixin.prototype._indexStart = 0;
    return ContainerMixin;
  },
);

/** Whether the node mixes in GNode.Container. */
export function hasContainer(node: Node): node is ContainerNode {
  return node.hasMixin(Container);
}

/**
 * Counts the changes to any container's list of children: a child linked in
 * (linkChild) or taken out (removeChild). Something that keeps what it
 * learnt about the order of siblings is stale once this differs.
 */
let childrenVersion = 0;

export function getChildrenVersion(): number {
  return childrenVersion;
}

/** Called by every removeChild when it takes a child out of its list. */
export function childUnlinked(): void {
  childrenVersion++;
}

/**
 * Links `child` into the sibling list before `reference` (or at the end).
 * Shared with MapContainer, whose insertChild repeats these steps.
 */
export function linkChild(
  container: { _firstChild: Node | null; _lastChild: Node | null },
  child: Node,
  reference: Node | null | undefined,
): void {
  childrenVersion++;
  if (null != reference) {
    child._setNext(reference);
    child._setPrevious(reference._previous);
    reference._setPrevious(child);
    if (null == child._previous) container._firstChild = child;
    else child._previous._setNext(child);
  } else {
    if (null != container._lastChild) {
      child._setPrevious(container._lastChild);
      container._lastChild._setNext(child);
      container._lastChild = child;
    }
    child._setNext(null);
  }
  if (null == container._firstChild) {
    container._firstChild = child;
    child._setPrevious(null);
    child._setNext(null);
  }
  if (null == child._next) container._lastChild = child;
}

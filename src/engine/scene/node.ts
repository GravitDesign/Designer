// Old: chunk.vendor.js module 2 (GNode).
/**
 * The base of the document tree: every scene, page, layer, shape, style,
 * paint layer and effect is a node.
 *
 * - Nodes register a node name (`registerNodeClass`), which is what `@`
 *   holds in a stored blob and how restore finds the class again.
 * - What a node can do comes from mixins: Properties, Identity, Tag,
 *   Reference, Multireference, Container and Store (files node-*.ts), all
 *   reachable as `Node.Properties` and so on, as in the old code.
 * - Everything that happens to a node goes through `_notifyChange(code,
 *   args)` → `_handleChange`, which subclasses override (calling super)
 *   to react, store and restore their properties and send events.
 *   Changes can be blocked by code (`_beginBlockChanges`) and events by
 *   class (`_beginBlockEvents`).
 * - Events go to the node and then to every ancestor that is an event
 *   target (`_sendEvent`).
 * - `store`/`restore` turn a tree into blobs and back; `serialize` and
 *   `deserialize` wrap them in JSON. The blob format is in
 *   ../serialize/blob.ts.
 *
 * README.md in this folder shows how a node class is declared.
 */
import type { Event } from "../core/event.ts";
import { EventTarget, type EventTargetLike } from "../core/event-target.ts";
import { Locale } from "../core/locale/locale.ts";
import {
  GObject,
  getMixinsVersion,
  getTypeId,
  registerClass,
  type AnyConstructor,
} from "../core/object.ts";
import type {
  NodeBlob,
  ProgressCallback,
  RestoreChangeArgs,
  SerializeOptions,
  StoreChangeArgs,
  StoreOptions,
} from "../serialize/blob.ts";
import { installDeserializeAsync, type DeserializeAsync } from "../serialize/deserialize-async.ts";
import { settleElementIndex } from "./element-index.ts";
import { NodeChange, NodeFlag } from "./node-change.ts";
import { Container, hasContainer, linkChild, type ContainerNode } from "./node-container.ts";
import {
  AfterFlagChangeEvent,
  AfterInsertEvent,
  AfterPropertiesChangeEvent,
  AfterRemoveEvent,
  AfterRestoreEvent,
  AfterSpecialChangeEvent,
  BeforeFlagChangeEvent,
  BeforeInsertEvent,
  BeforePropertiesChangeEvent,
  BeforeRemoveEvent,
  BeforeSpecialChangeEvent,
} from "./node-events.ts";
import {
  hasIdentity,
  hasMultireference,
  hasReference,
  Identity,
  Multireference,
  Reference,
  Tag,
  type IdentityNode,
} from "./node-identity.ts";
import { hasProperties, Properties, type PropertiesChangeArgs } from "./node-properties.ts";
import { bindNodeCodec, Store } from "./node-store.ts";

/**
 * Called for every node by `accept`. Returning false stops the walk
 * (unless `visitAll`); with `visitAll`, accept reports whether any call
 * returned true.
 */
export type NodeVisitor = (node: Node) => unknown;

/** A node class as the registry holds it. */
export type NodeClass = new (constructorArg?: unknown) => Node;

/**
 * The transaction recorder (undo) as nodes report to it. The workspace
 * cluster implements it (GTransactionRecorder).
 */
export interface NodeTransactionRecorder {
  afterSetProperties(
    node: Node,
    properties: string[],
    oldValues: unknown[],
    newValues: unknown[],
    temporary: boolean | null | undefined,
    custom: boolean | null | undefined,
  ): void;
  afterChildInsert(child: Node, parent: Node, next: Node | null): void;
  beforeChildRemove(child: Node, parent: Node, next: Node | null): void;
  afterFlagSet(node: Node, flag: number): void;
  afterFlagRemove(node: Node, flag: number): void;
  beginBlock(node: Node, changes: readonly number[], arg: unknown): void;
  endBlock(node: Node, changes: readonly number[], arg: unknown): void;
}

/**
 * What nodes need from the workspace they are attached to (GWorkspace,
 * engine-scene-document cluster): the recorder and the reference registry.
 */
export interface NodeWorkspace {
  getTransactionRecorder(): NodeTransactionRecorder | null;
  addReference(node: Node): void;
  removeReference(node: Node): void;
  getReference(id: string): Node | null;
}

/** Counters for blocked change codes or event type ids. */
interface BlockCounts {
  counts: Map<number | null, number>;
  /** Kept like the old `_counter`: up per begin entry, down only when an entry reaches 0. */
  counter: number;
}

function beginBlock(counts: BlockCounts, key: number | null): void {
  counts.counts.set(key, (counts.counts.get(key) ?? 0) + 1);
  counts.counter++;
}

/** Returns false when the whole block record should be dropped. */
function endBlock(counts: BlockCounts, key: number | null): boolean {
  const count = counts.counts.get(key);
  if (count !== undefined && count > 0) {
    counts.counts.set(key, count - 1);
    if (count - 1 == 0 && --counts.counter == 0) return false;
  }
  return true;
}

/** The TypeError the old loop raised by reading a block record it had deleted. */
function throwOnDeletedBlockRecord(): never {
  throw new TypeError("Cannot use 'in' operator to search for a change in undefined");
}

/**
 * Whether the instances of a prototype are event targets. `_sendEvent` asks
 * for the node and every ancestor on every event, and the instanceof walks
 * the whole prototype chain each time, so the answer is kept per class
 * until a mixin is recorded somewhere (getMixinsVersion).
 */
let eventTargetPrototypes = new WeakMap<object, boolean>();
let eventTargetPrototypesVersion = getMixinsVersion();

function asEventTarget(node: Node): (Node & EventTargetLike) | null {
  if (eventTargetPrototypesVersion !== getMixinsVersion()) {
    eventTargetPrototypes = new WeakMap();
    eventTargetPrototypesVersion = getMixinsVersion();
  }
  const proto = Object.getPrototypeOf(node) as object;
  let isTarget = eventTargetPrototypes.get(proto);
  if (undefined === isTarget) {
    isTarget = node instanceof EventTarget || node.hasMixin(EventTarget);
    eventTargetPrototypes.set(proto, isTarget);
  }
  return isTarget ? (node as unknown as Node & EventTargetLike) : null;
}

const nodeClassToNameMap = new Map<number | null, string>();
const nameToNodeClassMap = new Map<string, NodeClass>();

/** The class `_restore` is constructing, until a constructor claims it. */
let restoreConstruction: NodeClass | null = null;

/**
 * Whether the node under construction is one `_restore` makes and restores
 * right away. `cls` is the class whose constructor asks, compared with the
 * class `_restore` constructs; true only once per restored node. The
 * constructor can then leave out what its Restore change builds again
 * (Rectangle and Ellipse skip their default points).
 */
export function claimRestoreConstruction(cls: unknown): boolean {
  if (null === restoreConstruction || cls !== restoreConstruction) return false;
  restoreConstruction = null;
  return true;
}

/**
 * Gives a node class its node name (the `@` of its blobs) and its type id
 * by its old G name (see core/README.md; classes the old table doesn't
 * list get a fresh id). The old `GNode.inherit(name, Class, Parent)` did
 * both. Call it from a static block:
 *
 *     class Rectangle extends Shape {
 *       static { registerNodeClass(this, "rectangle", "GRectangle"); }
 *     }
 */
export function registerNodeClass(
  cls: AnyConstructor<Node>,
  nodeName: string,
  oldName: string,
): void {
  registerClass(cls, oldName);
  Node._registerNodeClass(nodeName, cls as unknown as NodeClass);
}

export class Node extends GObject {
  static {
    registerClass(this, "GNode");
  }

  // Property storage: `$name`, custom `@name` and temporary backups `#$name`
  // are own fields (see node-properties.ts). Subclasses declare the ones
  // they use with a type: `declare $trf: Transform | null;`.
  [key: `$${string}`]: unknown;
  [key: `@${string}`]: unknown;
  [key: `#${string}`]: unknown;

  static MIME_TYPE = "application/gravit+node";
  // Typed loosely because subclasses replace them with their own entries
  // (GElement.Flag holds only the element bits). Code uses NodeFlag and
  // NodeChange from node-change.ts.
  static Flag: Readonly<Record<string, number>> = NodeFlag;
  static _Change: Readonly<Record<string, number>> = NodeChange;

  static Properties = Properties;
  static Identity = Identity;
  static Tag = Tag;
  static Reference = Reference;
  static Multireference = Multireference;
  static Container = Container;
  static Store = Store;
  declare static MapContainer: typeof MapContainer;

  static BeforeInsertEvent = BeforeInsertEvent;
  static AfterInsertEvent = AfterInsertEvent;
  static BeforeRemoveEvent = BeforeRemoveEvent;
  static AfterRemoveEvent = AfterRemoveEvent;
  static BeforePropertiesChangeEvent = BeforePropertiesChangeEvent;
  static AfterPropertiesChangeEvent = AfterPropertiesChangeEvent;
  static BeforeFlagChangeEvent = BeforeFlagChangeEvent;
  static AfterFlagChangeEvent = AfterFlagChangeEvent;
  static BeforeSpecialChangeEvent = BeforeSpecialChangeEvent;
  static AfterSpecialChangeEvent = AfterSpecialChangeEvent;
  static AfterRestoreEvent = AfterRestoreEvent;

  /** Node name by type id. */
  static _nodeClassToNameMap = nodeClassToNameMap;
  /** Class by node name. */
  static _nameToNodeClassMap = nameToNodeClassMap;

  declare static deserializeAsync: DeserializeAsync["deserializeAsync"];
  declare static _restoreAsync: DeserializeAsync["_restoreAsync"];

  static _registerNodeClass(name: string, cls: NodeClass): void {
    nodeClassToNameMap.set(getTypeId(cls), name);
    nameToNodeClassMap.set(name, cls);
  }

  /**
   * The node name of a node or node class. Undefined (despite the type,
   * which GObject.getName fixes) when the class has no node name.
   */
  static override getName(node: unknown): string {
    return nodeClassToNameMap.get(getTypeId(node)) as string;
  }

  /** The class registered for a type id, or null. */
  static getClassFromId(typeId: number): NodeClass | null {
    const name = nodeClassToNameMap.get(typeId);
    return (name && nameToNodeClassMap.get(name)) || null;
  }

  /** The node as a blob, or null when it isn't storable (no Store mixin, or an exception). */
  static store(node: Node, options?: StoreOptions | null): NodeBlob | null {
    const opts: StoreOptions = options || {};
    if (!node.hasMixin(Store) || (opts.exceptions && opts.exceptions.indexOf(node) >= 0)) {
      return null;
    }
    const blob: NodeBlob = { "@": nodeClassToNameMap.get(getTypeId(node)) };
    if (hasIdentity(node) && !opts.copy) blob["@id"] = node.getId();
    const args: StoreChangeArgs = { blob, options: opts };
    node._notifyChange(NodeChange.PrepareStore, args);
    if (hasContainer(node)) {
      for (let child = node.getFirstChild(); null !== child; child = child.getNext()) {
        if (!opts.passChildFilter || opts.passChildFilter(child as never)) {
          const childBlob = Node.store(child, opts);
          if (childBlob) {
            if (Object.hasOwn(blob, "$")) (blob.$ as NodeBlob[]).push(childBlob);
            else blob.$ = [childBlob];
          }
        }
      }
    }
    if (hasProperties(node)) {
      const fields = node as unknown as Record<string, unknown>;
      if (opts.copy && opts.copyIgnoreProperties && opts.copyIgnoreProperties.length) {
        const ignore = opts.copyIgnoreProperties.slice();
        if (ignore.indexOf("@id") < 0) ignore.push("@id");
        for (const key of Object.keys(node)) {
          if (
            "@" === key.charAt(0) &&
            key.length > 1 &&
            ignore.indexOf(key) < 0 &&
            Object.hasOwn(node, key)
          ) {
            blob[key] = fields[key];
          }
        }
      } else {
        for (const key of Object.keys(node)) {
          if (
            "@" === key.charAt(0) &&
            key.length > 1 &&
            "@id" !== key &&
            Object.hasOwn(node, key)
          ) {
            blob[key] = fields[key];
          }
        }
      }
    }
    if (hasReference(node) && node._referenceId) blob["#"] = node._referenceId;
    if (hasMultireference(node) && node._multiReferenceId) blob["&"] = node._multiReferenceId;
    node._notifyChange(NodeChange.Store, args);
    return blob;
  }

  /**
   * A new node from a blob, or null when the blob has no `@` or the name
   * is unknown. `onRestored` is called for every restored node, children
   * first; `progress` gets 20..100 while `total` blobs are restored.
   */
  static restore(
    blob: NodeBlob | null | undefined,
    constructorArg?: unknown,
    onRestored?: ((node: Node) => void) | null,
    progress?: ProgressCallback | null,
    total?: number | null,
  ): Node | null {
    let result: Node | null = null;
    Node._restore(
      blob,
      constructorArg,
      onRestored,
      progress,
      total,
      (restoredBlob, node, restored, prog, count, done) => {
        done(Node.restoreInstance(restoredBlob, node, restored, prog, count));
      },
      (node) => {
        result = node;
      },
    );
    return result;
  }

  /**
   * The shared part of restore and its async variant: creates the node
   * for the blob and hands it to `restoreInstance`, which calls back when
   * the node is complete.
   */
  static _restore(
    blob: NodeBlob | null | undefined,
    constructorArg: unknown,
    onRestored: ((node: Node) => void) | null | undefined,
    progress: ProgressCallback | null | undefined,
    total: number | null | undefined,
    restoreInstance: (
      blob: NodeBlob,
      node: Node,
      onRestored: ((node: Node) => void) | null | undefined,
      progress: ProgressCallback | null | undefined,
      total: number | null | undefined,
      done: (node: Node | null) => void,
    ) => void,
    done: (node: Node | null) => void,
  ): null | undefined {
    if (progress && total && total > 0) {
      Node.prototype.restoreCount++;
      progress((80 * Node.prototype.restoreCount) / total + 20);
    }
    if (!blob || !Object.hasOwn(blob, "@")) return null;
    const cls = nameToNodeClassMap.get(blob["@"] as string);
    if (!cls) return null;
    const outerConstruction = restoreConstruction;
    restoreConstruction = cls;
    let node: Node;
    try {
      node = constructorArg ? new cls(constructorArg) : new cls();
    } finally {
      restoreConstruction = outerConstruction;
    }
    restoreInstance(blob, node, onRestored, progress, total, () => {
      if (onRestored) onRestored(node);
      done(node);
    });
    return undefined;
  }

  /** Restores a blob into an existing node (its children are appended). */
  static restoreInstance(
    blob: NodeBlob,
    node: Node,
    onRestored?: ((node: Node) => void) | null,
    progress?: ProgressCallback | null,
    total?: number | null,
  ): Node | null {
    let result: Node | null = null;
    Node._restoreInstance(
      blob,
      node,
      onRestored,
      progress,
      total,
      (parent, children, constructorArg, restored, prog, count, done) => {
        for (let i = 0; i < children.length; ++i) {
          const child = Node.restore(children[i], constructorArg, restored, prog, count);
          if (child) parent.appendChild(child);
        }
        done();
      },
      (restoredNode) => {
        result = restoredNode;
      },
    );
    return result;
  }

  static _restoreInstance(
    blob: NodeBlob,
    node: Node,
    onRestored: ((node: Node) => void) | null | undefined,
    progress: ProgressCallback | null | undefined,
    total: number | null | undefined,
    restoreChildren: (
      parent: ContainerNode,
      children: NodeBlob[],
      constructorArg: null,
      onRestored: ((node: Node) => void) | null | undefined,
      progress: ProgressCallback | null | undefined,
      total: number | null | undefined,
      done: () => void,
    ) => void,
    done: (node: Node) => void,
  ): void {
    const args: RestoreChangeArgs = { blob };
    node._notifyChange(NodeChange.PrepareRestore, args);
    if (hasIdentity(node) && Object.hasOwn(blob, "@id")) node.__id = blob["@id"] as string;
    const finish = () => {
      if (hasProperties(node)) {
        const fields = node as unknown as Record<string, unknown>;
        // Every "@" key, "@id" included, becomes a custom property.
        for (const key in blob) {
          if ("@" === key.charAt(0) && Object.hasOwn(blob, key) && key.length > 1) {
            fields[key] = blob[key];
          }
        }
      }
      if (hasReference(node) && Object.hasOwn(blob, "#")) node._referenceId = blob["#"] as string;
      if (hasMultireference(node) && Object.hasOwn(blob, "&")) {
        node._multiReferenceId = blob["&"] as string;
      }
      node._notifyChange(NodeChange.Restore, args);
      done(node);
    };
    if (Object.hasOwn(blob, "$") && hasContainer(node)) {
      const children = blob.$ as NodeBlob[];
      if (children.length > 0) {
        node._blockUpdateChanges();
        restoreChildren(node, children, null, onRestored, progress, total, () => {
          node._releaseUpdateChanges();
          finish();
        });
      } else finish();
    } else finish();
  }

  /**
   * A node or a list of nodes as JSON; null when nothing was storable.
   * Only the options listed in StoreOptions reach `store` (not
   * `passChildFilter`).
   */
  static serialize(
    nodes: Node | readonly Node[],
    options?: SerializeOptions | null,
  ): string | null {
    const beautify = (options && options.beautify) || false;
    const storeOptions: StoreOptions = {
      save: (options && options.save) || false,
      copy: (options && options.copy) || false,
      copyIgnoreProperties: (options && options.copyIgnoreProperties) || null,
      singleton: (options && options.singleton) || false,
      exceptions: (options && options.exceptions) || false,
      lastModifiedDate: options ? options.lastModifiedDate : null,
    };
    const indent = beautify ? 4 : undefined;
    if (nodes instanceof Array) {
      const blobs: NodeBlob[] = [];
      for (let i = 0; i < nodes.length; ++i) {
        const node = nodes[i] as Node;
        if (!(options && options.exceptions && options.exceptions.indexOf(node) >= 0)) {
          const blob = Node.store(node, storeOptions);
          if (blob) blobs.push(blob);
        }
      }
      if (blobs.length > 0) {
        let json: string;
        try {
          json = JSON.stringify(blobs, null, indent);
        } catch {
          json = "";
        }
        return json;
      }
    } else {
      const node = nodes as Node;
      if (!(options && options.exceptions && options.exceptions.indexOf(node) >= 0)) {
        const blob = Node.store(node, storeOptions);
        if (blob) {
          let json: string;
          try {
            json = JSON.stringify(blob, null, indent);
          } catch {
            json = "";
          }
          return json;
        }
      }
    }
    return null;
  }

  /**
   * Nodes from JSON: one node for an object, a list for an array, null for
   * empty or invalid JSON. `progress` and `onRestored` are only used for
   * a single node.
   */
  static deserialize(
    json: string | null | undefined,
    constructorArg?: unknown,
    progress?: ProgressCallback | null,
    onRestored?: ((node: Node) => void) | null,
  ): Node | Node[] | null {
    let result: Node | Node[] | null = null;
    Node._deserialize(
      json,
      constructorArg,
      progress,
      onRestored,
      (data, ctorArg, restored, prog, total, done) => {
        if (!data) return;
        if (Array.isArray(data)) {
          const nodes: Node[] = [];
          data.forEach((blob) => {
            const node = Node.restore(blob, ctorArg, restored, prog, total);
            if (node) nodes.push(node);
          });
          done(nodes);
        } else done(Node.restore(data, ctorArg, restored, prog, total));
      },
      (nodes) => {
        result = nodes;
      },
    );
    return result;
  }

  /** Parses the JSON and hands it to `restore`, or calls `done(null)`. */
  static _deserialize(
    json: string | null | undefined,
    constructorArg: unknown,
    progress: ProgressCallback | null | undefined,
    onRestored: ((node: Node) => void) | null | undefined,
    restore: (
      data: NodeBlob | NodeBlob[],
      constructorArg: unknown,
      onRestored: ((node: Node) => void) | null | undefined,
      progress: ProgressCallback | null | undefined,
      total: number | undefined,
      done: (nodes: Node | Node[] | null) => void,
    ) => void,
    done: (nodes: Node | Node[] | null) => void,
  ): void {
    let total = 0;
    if (json) {
      let data: unknown = null;
      try {
        data = JSON.parse(json);
      } catch {
        console.warn("deserialize node: invalid JSON");
      }
      if (progress) {
        Node.prototype.restoreCount = 0;
        total = Node.countBlobChildren(data as NodeBlob | null, total);
        progress(20);
      }
      if (data && data instanceof Array) {
        restore(data as NodeBlob[], constructorArg, undefined, undefined, undefined, done);
        return;
      }
      if (data) {
        restore(data as NodeBlob, constructorArg, onRestored, progress, total, done);
        return;
      }
    }
    done(null);
  }

  /** `count` plus the number of blobs in the tree. */
  static countBlobChildren(blob: NodeBlob | null | undefined, count: number): number {
    count++;
    if (!blob) {
      console.warn("Null blob");
      return 0;
    }
    if (Object.hasOwn(blob, "$")) {
      const children = blob.$ as NodeBlob[];
      if (children.length > 0) {
        for (let i = 0; i < children.length; ++i)
          count = Node.countBlobChildren(children[i], count);
      }
    }
    return count;
  }

  /**
   * The nodes in tree order (reverse order with `reverse`). Only nodes in
   * the tree of the first one are kept.
   */
  static order<T extends Node>(
    nodes: readonly T[] | null | undefined,
    reverse?: boolean,
  ): T[] | null {
    const pending = nodes ? nodes.slice() : null;
    if (nodes && nodes.length > 1) {
      let root: Node | null = null;
      for (let node: Node | null = nodes[0] as T; null !== node; node = node.getParent()) {
        root = node;
      }
      if (null !== root) {
        const ordered: T[] = [];
        const rest = pending as T[];
        root.accept((node) => {
          if (!rest.length) return false;
          let index = 0;
          let found = false;
          for (let i = 0; i < rest.length && !found; ++i) {
            if (rest[i] === node) {
              ordered.push(node as T);
              index = i;
              found = true;
            }
          }
          if (found) rest.splice(index, 1);
          return true;
        }, reverse);
        return ordered;
      }
    }
    return pending;
  }

  declare _workspace: NodeWorkspace | null;
  declare _parent: ContainerNode | null;
  declare _previous: Node | null;
  declare _next: Node | null;
  declare _flags: number;
  /** A counter shared by all nodes through the prototype (restore progress). */
  declare restoreCount: number;
  declare _isRestoring: boolean;
  declare recordedTransaction: boolean;
  declare _blockedChanges: BlockCounts | undefined;
  declare _blockedEvents: BlockCounts | undefined;

  getNodeName(): string {
    return Node.getName(this);
  }

  /** The translated node name ("Rectangle" for "rectangle" and so on). */
  getNodeNameTranslated(): string {
    return Locale.getValue(this, "name", this.getNodeName()) as string;
  }

  getWorkspace(): NodeWorkspace | null {
    return this._workspace;
  }

  getParent(): ContainerNode | null {
    return this._parent;
  }

  getPrevious(): Node | null {
    return this._previous;
  }

  getNext(): Node | null {
    return this._next;
  }

  /** Descendants with the node name (all of them for "*" or no name). */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature had a second, unused parameter
  getNodesByName(name?: string | null, unused?: unknown): Node[] {
    const found: Node[] = [];
    this.accept((node) => {
      if (!(name && "*" != name && name !== node.getNodeName()) && node !== this) found.push(node);
    });
    return found;
  }

  /**
   * Calls `visitor` for this node and its descendants, depth first.
   * `reverse` walks children last to first, `childrenFirst` visits a node
   * after its children; see NodeVisitor for the return value.
   */
  accept(
    visitor: NodeVisitor,
    reverse?: boolean,
    visitAll?: boolean,
    childrenFirst?: boolean,
  ): unknown {
    let result: unknown = false;
    if (!childrenFirst) {
      result = visitor.call(null, this);
      if (!visitAll && false === result) return result;
    }
    if (hasContainer(this)) {
      const childResult = this.acceptChildren(visitor, reverse, visitAll, childrenFirst);
      if (!visitAll && false === childResult) return false;
      result = result || childResult;
    }
    if (childrenFirst) {
      const selfResult = visitor.call(null, this);
      if (!visitAll && false === selfResult) return false;
      result = result || selfResult;
    }
    return result;
  }

  /** The nearest ancestor for which `predicate` returns true. */
  findParent(predicate: (node: ContainerNode) => unknown): ContainerNode | null {
    return this._parent
      ? true === predicate.call(null, this._parent)
        ? this._parent
        : this._parent.findParent(predicate)
      : null;
  }

  hasFlag(flag: number): boolean {
    return 0 != (this._flags & flag);
  }

  setFlag(flag: number): void {
    if (this._canModifyFlag(flag, true) && 0 == (this._flags & flag)) {
      this._notifyChange(NodeChange.BeforeFlagChange, { flag, set: true });
      this._flags = this._flags | flag;
      const recorder = this._workspace ? this._workspace.getTransactionRecorder() : null;
      if (recorder) recorder.afterFlagSet(this, flag);
      this._notifyChange(NodeChange.AfterFlagChange, { flag, set: true });
    }
  }

  removeFlag(flag: number): void {
    if (this._canModifyFlag(flag, false) && 0 != (this._flags & flag)) {
      this._notifyChange(NodeChange.BeforeFlagChange, { flag, set: false });
      this._flags = this._flags & ~flag;
      const recorder = this._workspace ? this._workspace.getTransactionRecorder() : null;
      if (recorder) recorder.afterFlagRemove(this, flag);
      this._notifyChange(NodeChange.AfterFlagChange, { flag, set: false });
    }
  }

  /** Copies what makes `other` this node's twin (here: the multi-reference id). */
  assignFrom(other: Node): void {
    if (hasMultireference(this) && hasMultireference(other)) {
      this._multiReferenceId = other._multiReferenceId;
    }
  }

  /** Whether this node may be inserted into `parent` before `reference`. No by default. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- overridden by every insertable class
  validateInsertion(parent: ContainerNode, reference?: Node | null): boolean {
    return false;
  }

  validateRemoval(): boolean {
    return true;
  }

  isLocked(): unknown {
    return !!this._parent && this._parent.isLocked();
  }

  isRestoring(): boolean {
    return !!this._isRestoring || null != this.findParent((node) => node._isRestoring);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- GElement takes an argument
  beginUpdate(arg?: unknown): void {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- GElement takes an argument
  endUpdate(arg?: unknown): void {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- GElement takes an argument
  _blockUpdateChanges(arg?: unknown): void {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- GElement takes an argument
  _releaseUpdateChanges(arg?: unknown): void {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  _canModifyFlag(flag: number, set: boolean): boolean {
    return true;
  }

  /** Blocks the change codes until the matching `_endBlockChanges` (counted). */
  _beginBlockChanges(changes: readonly number[], arg?: unknown): void {
    if (!this._blockedChanges) this._blockedChanges = { counts: new Map(), counter: 0 };
    for (let i = 0; i < changes.length; ++i) beginBlock(this._blockedChanges, changes[i] as number);
    const recorder = this._workspace ? this._workspace.getTransactionRecorder() : null;
    if (recorder) recorder.beginBlock(this, changes, arg);
  }

  _endBlockChanges(changes: readonly number[], arg?: unknown): void {
    if (this._blockedChanges) {
      for (let i = 0; i < changes.length; ++i) {
        if (!endBlock(this._blockedChanges, changes[i] as number)) {
          delete this._blockedChanges;
          // As in the old loop: a further code reads the deleted record and
          // throws (QUESTIONS.md Q-011).
          if (i < changes.length - 1) throwOnDeletedBlockRecord();
          break;
        }
      }
    }
    const recorder = this._workspace ? this._workspace.getTransactionRecorder() : null;
    if (recorder) recorder.endBlock(this, changes, arg);
  }

  /** Blocks events of the given classes until the matching `_endBlockEvents`. */
  _beginBlockEvents(eventClasses: readonly unknown[]): void {
    if (!this._blockedEvents) this._blockedEvents = { counts: new Map(), counter: 0 };
    for (let i = 0; i < eventClasses.length; ++i) {
      beginBlock(this._blockedEvents, getTypeId(eventClasses[i]));
    }
  }

  _endBlockEvents(eventClasses: readonly unknown[]): void {
    if (this._blockedEvents) {
      for (let i = 0; i < eventClasses.length; ++i) {
        if (!endBlock(this._blockedEvents, getTypeId(eventClasses[i]))) {
          delete this._blockedEvents;
          if (i < eventClasses.length - 1) throwOnDeletedBlockRecord();
          break;
        }
      }
    }
  }

  _getCompositeEvents(structure?: boolean, properties?: boolean, flags?: boolean): unknown[] {
    let events: unknown[] = [];
    if (structure) {
      events = events.concat([
        BeforeInsertEvent,
        AfterInsertEvent,
        BeforeRemoveEvent,
        AfterRemoveEvent,
      ]);
    }
    if (properties) events = events.concat([AfterPropertiesChangeEvent]);
    if (flags) events = events.concat([BeforeFlagChangeEvent, AfterFlagChangeEvent]);
    return events;
  }

  _beginBlockCompositeEvents(structure?: boolean, properties?: boolean, flags?: boolean): void {
    this._beginBlockEvents(this._getCompositeEvents(structure, properties, flags));
  }

  _endBlockCompositeEvents(structure?: boolean, properties?: boolean, flags?: boolean): void {
    this._endBlockEvents(this._getCompositeEvents(structure, properties, flags));
  }

  /** Handles a change unless its code is blocked; returns whether it was handled. */
  _notifyChange(change: number, args?: unknown): boolean {
    const blocked = this._blockedChanges && this._blockedChanges.counts.get(change);
    if (blocked) return false;
    this._handleChange(change, args);
    return true;
  }

  _canEventBeSent(eventClass: unknown): boolean {
    // Most nodes never block events: no type id needed then.
    return !this._blockedEvents || !this._blockedEvents.counts.get(getTypeId(eventClass));
  }

  /**
   * Triggers the event on this node and every ancestor that is an event
   * target with listeners for it. Temporary property events only reach
   * ancestors with `temporaryReceiver` set.
   */
  _sendEvent(event: Event & { temporary?: unknown }): void {
    const eventClass = event.constructor;
    const self = asEventTarget(this);
    if (self && self.hasEventListeners(eventClass as never)) self.trigger(event);
    for (let node: Node | null = this.getParent(); node; node = node.getParent()) {
      const target = asEventTarget(node);
      if (!target) continue;
      if (event.temporary && !target.temporaryReceiver) continue;
      if (target.hasEventListeners(eventClass as never)) target.trigger(event);
    }
  }

  _setWorkspace(workspace: NodeWorkspace | null): void {
    if (workspace === this._workspace) return;
    if (this._workspace) {
      this._notifyChange(NodeChange.WorkspaceDetach);
      if (this.hasMixin(Reference)) this._workspace.removeReference(this);
      this._workspace = null;
    }
    this._workspace = workspace;
    if (this._workspace) {
      if (this.hasMixin(Reference)) this._workspace.addReference(this);
      this._notifyChange(NodeChange.WorkspaceAttached);
    }
  }

  _attachToParent(parent: Node): void {
    if (parent._workspace) {
      this.accept((node) => {
        node._setWorkspace(parent._workspace);
      });
    }
  }

  _detachFromParent(parent: Node): void {
    if (parent._workspace) {
      this.accept((node) => {
        node._setWorkspace(null);
      });
    }
  }

  _setParent(parent: ContainerNode | null): void {
    if (this._parent === parent) return;
    if (this._parent) {
      this._notifyChange(NodeChange.ParentDetach);
      this._detachFromParent(this._parent);
    }
    this._parent = parent;
    if (this._parent) {
      this._attachToParent(this._parent);
      this._notifyChange(NodeChange.ParentAttached);
    }
  }

  _setPrevious(previous: Node | null): void {
    this._previous = previous;
  }

  _setNext(next: Node | null): void {
    this._next = next;
  }

  /** Whether this node or an ancestor is being changed by undo/redo. */
  isRecordedTransaction(): boolean {
    return (
      !!this.recordedTransaction || null != this.findParent((node) => node.recordedTransaction)
    );
  }

  /** Reacts to a change; subclasses override it and call super. Sends the node events. */
  _handleChange(change: number, args?: unknown): void {
    if (change === NodeChange.PrepareRestore) this._isRestoring = true;
    else if (change === NodeChange.Restore) {
      this._isRestoring = false;
      if (this._canEventBeSent(AfterRestoreEvent)) this._sendEvent(new AfterRestoreEvent(this));
    } else if (change == NodeChange.BeforeChildInsert) {
      if (this._canEventBeSent(BeforeInsertEvent)) {
        this._sendEvent(new BeforeInsertEvent(args as Node));
      }
    } else if (change == NodeChange.AfterChildInsert) {
      if (this._canEventBeSent(AfterInsertEvent))
        this._sendEvent(new AfterInsertEvent(args as Node));
    } else if (change == NodeChange.BeforeChildRemove) {
      if (this._canEventBeSent(BeforeRemoveEvent)) {
        this._sendEvent(new BeforeRemoveEvent(args as Node));
      }
    } else if (change == NodeChange.AfterChildRemove) {
      if (this._canEventBeSent(AfterRemoveEvent))
        this._sendEvent(new AfterRemoveEvent(args as Node));
    } else if (change == NodeChange.BeforePropertiesChange) {
      const change_ = args as PropertiesChangeArgs;
      if (change_.forceEvent && this._canEventBeSent(BeforePropertiesChangeEvent)) {
        this._sendEvent(
          new BeforePropertiesChangeEvent(
            this,
            change_.properties,
            change_.values,
            change_.custom,
            change_.temporary,
          ),
        );
      } else if (!change_.temporary && this._canEventBeSent(BeforePropertiesChangeEvent)) {
        // Not passed on: the event's temporary is false here anyway.
        this._sendEvent(
          new BeforePropertiesChangeEvent(this, change_.properties, change_.values, change_.custom),
        );
      }
    } else if (change == NodeChange.AfterPropertiesChange) {
      const change_ = args as PropertiesChangeArgs;
      if (this._canEventBeSent(AfterPropertiesChangeEvent)) {
        this._sendEvent(
          new AfterPropertiesChangeEvent(
            this,
            change_.properties,
            change_.values,
            change_.custom,
            change_.temporary,
          ),
        );
      }
    } else if (change == NodeChange.BeforeFlagChange) {
      const flagChange = args as { flag: number; set: boolean };
      if (this._canEventBeSent(BeforeFlagChangeEvent)) {
        this._sendEvent(new BeforeFlagChangeEvent(this, flagChange.flag, flagChange.set));
      }
    } else if (change == NodeChange.AfterFlagChange) {
      const flagChange = args as { flag: number; set: boolean };
      if (this._canEventBeSent(AfterFlagChangeEvent)) {
        this._sendEvent(new AfterFlagChangeEvent(this, flagChange.flag, flagChange.set));
      }
    }
  }
}

const nodePrototype = Node.prototype;
nodePrototype._workspace = null;
nodePrototype._parent = null;
nodePrototype._previous = null;
nodePrototype._next = null;
nodePrototype._flags = 0;
nodePrototype.restoreCount = 0;
nodePrototype._isRestoring = false;
nodePrototype.recordedTransaction = false;

bindNodeCodec({
  serialize: (node, options) => Node.serialize(node, options),
  deserialize: (json, constructorArg) => Node.deserialize(json, constructorArg),
});
installDeserializeAsync(Node);

/**
 * Children keyed by node id as well as in a list (`getById`). Inserts into
 * a locked map container are dropped silently, and neither insert nor
 * remove is recorded for undo.
 */
export class MapContainer extends Container(Store(Node)) {
  static {
    registerNodeClass(this, "MapContainer", "GNode.MapContainer");
  }

  _children: Record<string, Node>;

  constructor() {
    super();
    this._children = Object.create(null) as Record<string, Node>;
  }

  override insertChild(child: Node, reference: Node | null | undefined): void {
    if (null != child._parent) throw new Error("Child is already appended somewhere else");
    if (null != reference && reference.getParent() != this) {
      throw new Error("Reference is not a child of this node");
    }
    if (!child.validateInsertion(this, reference)) {
      throw new Error("Child insertion validation failed.");
    }
    if (this.isLocked()) return;
    this._notifyChange(NodeChange.BeforeChildInsert, child);
    if (null !== this._indexAnchor) {
      settleElementIndex(null != reference ? reference._previous : this._lastChild);
    }
    linkChild(this, child, reference);
    child._setParent(this);
    this._children[(child as IdentityNode).getId()] = child;
    this._notifyChange(NodeChange.AfterChildInsert, child);
  }

  override removeChild(child: Node): void {
    if (child._parent != this) throw new Error("Child is not a child of this node");
    if (!child.validateRemoval()) throw new Error("Child removal validation failed.");
    this._notifyChange(NodeChange.BeforeChildRemove, child);
    if (null !== this._indexAnchor) settleElementIndex(child);
    const id = (child as IdentityNode).getId();
    if (this._children[id]) {
      Reflect.deleteProperty(this._children, id);
      if (!this._children) this._children = Object.create(null) as Record<string, Node>;
    }
    if (this._firstChild == child) this._firstChild = child._next;
    if (this._lastChild == child) this._lastChild = child._previous;
    if (null != child._previous) child._previous._setNext(child._next);
    if (null != child._next) child._next._setPrevious(child._previous);
    child._setParent(null);
    child._setPrevious(null);
    child._setNext(null);
    this._notifyChange(NodeChange.AfterChildRemove, child);
  }

  /** The children as an array (as many as the map holds), or null when empty. */
  getAsArray(): Node[] | null {
    const count = Object.keys(this._children).length;
    if (!count) return null;
    const list = new Array<Node>(count);
    let child = this.getFirstChild();
    for (let i = 0; i < count && child; ++i, child = child.getNext()) list[i] = child;
    return list;
  }

  getById(id: string | null | undefined): Node | null {
    return id && this._children[id] ? (this._children[id] as Node) : null;
  }

  override toString(): string {
    return "[Mixin GNode.MapContainer]";
  }
}
Node.MapContainer = MapContainer;

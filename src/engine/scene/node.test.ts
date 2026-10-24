import { describe, expect, it, vi } from "vitest";
import { EventTarget, EventTargetMixin } from "../core/event-target.ts";
import { getTypeId } from "../core/object.ts";
import { Transform } from "../math/transform.ts";
import type { NodeBlob } from "../serialize/blob.ts";
import { NodeChange, NodeFlag } from "./node-change.ts";
import { Container, type ContainerNode } from "./node-container.ts";
import {
  AfterInsertEvent,
  AfterPropertiesChangeEvent,
  BeforePropertiesChangeEvent,
} from "./node-events.ts";
import { Identity, Multireference, Reference, Tag } from "./node-identity.ts";
import { Properties } from "./node-properties.ts";
import { Store } from "./node-store.ts";
import { MapContainer, Node, registerNodeClass } from "./node.ts";

// Test classes. Defaults follow the old pattern: a table per class, copied
// in the constructor, stored only when different.
const LeafProperties = { size: 1, label: null as string | null, box: { w: 1 } };

class TestLeaf extends Reference(Multireference(Identity(Store(Properties(Node))))) {
  static {
    registerNodeClass(this, "testleaf", "GTestLeaf");
  }
  declare $size: number;
  declare $box: { w: number };
  constructor() {
    super();
    this._setDefaultProperties(LeafProperties);
  }
  override validateInsertion(): boolean {
    return true;
  }
  override _handleChange(change: number, args?: unknown): void {
    if (change === NodeChange.Store) {
      this.storeProperties((args as { blob: NodeBlob }).blob, LeafProperties);
    } else if (change === NodeChange.Restore) {
      this.restoreProperties((args as { blob: NodeBlob }).blob, LeafProperties);
    }
    super._handleChange(change, args);
  }
}

class TestBranch extends EventTargetMixin(Container(Identity(Store(Properties(Node))))) {
  static {
    registerNodeClass(this, "testbranch", "GTestBranch");
  }
  override validateInsertion(): boolean {
    return true;
  }
}

/** Not storable: no Store mixin. */
class TestVolatile extends Properties(Node) {
  static {
    registerNodeClass(this, "testvolatile", "GTestVolatile");
  }
  override validateInsertion(): boolean {
    return true;
  }
}

function leaf(size?: number): TestLeaf {
  const n = new TestLeaf();
  if (size !== undefined) n.setProperty("size", size);
  return n;
}

describe("type ids and registry", () => {
  it("keeps the old type ids of GNode, its mixins and events", () => {
    expect(getTypeId(Node)).toBe(1);
    expect(getTypeId(Node.BeforeInsertEvent)).toBe(2);
    expect(getTypeId(Node.AfterRestoreEvent)).toBe(12);
    expect(getTypeId(MapContainer)).toBe(13);
    expect(getTypeId(Store)).toBe(14);
    expect(getTypeId(Container)).toBe(15);
    expect(getTypeId(Identity)).toBe(18);
    expect(getTypeId(Multireference)).toBe(19);
    expect(getTypeId(Properties)).toBe(76);
    expect(getTypeId(Reference)).toBe(100);
    expect(Node.Tag).toBe(Tag);
  });

  it("maps node names and classes both ways", () => {
    expect(Node.getName(new TestLeaf())).toBe("testleaf");
    expect(Node.getName(TestBranch)).toBe("testbranch");
    expect(Node.getName(new MapContainer())).toBe("MapContainer");
    expect(Node.getClassFromId(getTypeId(TestLeaf) as number)).toBe(TestLeaf);
    expect(Node.getClassFromId(99999)).toBeNull();
    expect(new TestLeaf().getNodeName()).toBe("testleaf");
  });

  it("has the old flag and change numbers", () => {
    expect(Node.Flag).toEqual({
      Selected: 2,
      Highlighted: 4,
      Active: 8,
      Transient: 16,
      Expanded: 32,
    });
    expect(Node._Change["Restore"]).toBe(53);
    expect(Node._Change["WorkspaceDetach"]).toBe(61);
    expect(Node.MIME_TYPE).toBe("application/gravit+node");
  });

  it("answers hasMixin per class", () => {
    const n = new TestLeaf();
    expect(n.hasMixin(Properties)).toBe(true);
    expect(n.hasMixin(Container)).toBe(false);
    expect(new TestBranch().hasMixin(EventTarget)).toBe(true);
    expect(new MapContainer().hasMixin(Container)).toBe(true);
    expect(new MapContainer().toString()).toBe("[Mixin GNode.MapContainer]");
    // The old inheritAndMix never copied a mixin's toString.
    expect(new TestBranch().toString()).toBe("[Object GTestBranch]");
    expect(getTypeId(Tag)).toBeNull();
  });
});

describe("properties", () => {
  it("stores values as own $ fields and custom ones as @ fields", () => {
    const n = leaf();
    expect(n.getProperty("size")).toBe(1);
    expect(n.setProperty("size", 5)).toBe(true);
    expect(n.$size).toBe(5);
    expect(n.setProperty("size", 5)).toBe(false);
    expect(n.setProperty("size", 5, false, true)).toBe(true);
    n.setProperty("note", "x", true);
    expect(n["@note"]).toBe("x");
    expect(n.hasProperty("note", true)).toBe(true);
    expect(n.hasProperty("note")).toBe(false);
    expect(n.getProperty("missing", false, "def")).toBe("def");
    expect(n.getProperties(["size", "nope"], false, [0, 9])).toEqual([5, 9]);
  });

  it("copies plain-object defaults per node and shares engine objects", () => {
    const a = leaf();
    const b = leaf();
    expect(a.$box).toEqual({ w: 1 });
    expect(a.$box).not.toBe(b.$box);
    expect(a.$box).not.toBe(LeafProperties.box);
  });

  it("keeps the permanent value in #$ during a temporary change", () => {
    const n = leaf(2);
    n.setProperty("size", 7, false, false, true);
    expect(n.$size).toBe(7);
    expect(n["#$size"]).toBe(2);
    expect(n.getProperty("size")).toBe(2);
    expect(n.getProperty("size", false, null, true)).toBe(7);
    // A second temporary change keeps the first backup.
    n.setProperty("size", 8, false, false, true);
    expect(n["#$size"]).toBe(2);
    expect(n.resetTemporaryProperty("size")).toBe(true);
    expect(n.$size).toBe(2);
    expect(Object.hasOwn(n, "#$size")).toBe(false);
    expect(n.resetTemporaryProperty("size")).toBe(false);
  });

  it("drops the backup when a permanent value is set", () => {
    const n = leaf(2);
    n.setProperty("size", 7, false, false, true);
    expect(n.setProperty("size", 2)).toBe(false);
    expect(Object.hasOwn(n, "#$size")).toBe(false);
    expect(n.$size).toBe(2);
  });

  it("passes old values to the After change and lets Before handlers add properties", () => {
    const seen: unknown[] = [];
    class Adder extends TestLeaf {
      static {
        registerNodeClass(this, "testadder", "GTestAdder");
      }
      override _handleChange(change: number, args?: unknown): void {
        const a = args as { properties: string[]; values: unknown[] };
        if (change === NodeChange.BeforePropertiesChange && a.properties[0] === "size") {
          a.properties.push("label");
          a.values.push("added");
        }
        if (change === NodeChange.AfterPropertiesChange)
          seen.push([...a.properties], [...a.values]);
        super._handleChange(change, args);
      }
    }
    const n = new Adder();
    n.setProperty("size", 3);
    expect(n.getProperty("label")).toBe("added");
    expect(seen).toEqual([
      ["size", "label"],
      [1, null],
    ]);
  });

  it("throws when names and values differ in length", () => {
    expect(() => leaf().setProperties(["a"], [])).toThrow(
      "Properties length does not match values length",
    );
  });

  it("stores only values that differ from the defaults and restores missing ones", () => {
    const n = leaf();
    const blob: NodeBlob = {};
    n.storeProperties(blob, LeafProperties);
    expect(blob).toEqual({});
    n.setProperty("size", 4);
    n.storeProperties(blob, LeafProperties, (name, value) =>
      name === "size" ? `#${value}` : value,
    );
    expect(blob).toEqual({ size: "#4" });
    const m = leaf(9);
    m.restoreProperties({ label: "L" }, LeafProperties);
    expect(m.getProperties(["size", "label"])).toEqual([1, "L"]);
  });

  it("passes values through for a null or false filter, like a missing one", () => {
    const n = leaf();
    n.setProperty("size", 4);
    for (const filter of [null, false] as const) {
      const blob: NodeBlob = {};
      n.storeProperties(blob, LeafProperties, filter);
      expect(blob).toEqual({ size: 4 });
      const m = leaf(9);
      m.restoreProperties({ label: "L" }, LeafProperties, filter);
      expect(m.getProperties(["size", "label"])).toEqual([1, "L"]);
    }
  });

  it("compares and transfers properties", () => {
    const a = leaf(3);
    const b = leaf(3);
    expect(a.arePropertiesEqual(b, ["size", "label"])).toBe(true);
    b.setProperty("size", 4);
    expect(a.arePropertiesEqual(b, ["size"])).toBe(false);
    a.transferProperties(b, [{ size: 0, label: "d" }]);
    expect(a.getProperties(["size", "label"])).toEqual([4, null]);
  });
});

describe("container", () => {
  it("links children and validates", () => {
    const p = new TestBranch();
    const a = leaf(1);
    const b = leaf(2);
    const c = leaf(3);
    p.appendChild(a);
    p.appendChild(c);
    p.insertChild(b, c);
    expect(p.getChildren()).toEqual([a, b, c]);
    expect(b.getPrevious()).toBe(a);
    expect(b.getNext()).toBe(c);
    expect(p.getIndexOfChild(c)).toBe(2);
    expect(p.getChildByIndex(1)).toBe(b);
    expect(() => p.appendChild(a)).toThrow("Child is already appended somewhere else");
    expect(() => p.insertChild(leaf(), leaf())).toThrow("Reference is not a child of this node");
    expect(() => p.appendChild(new Node())).toThrow("Child insertion validation failed.");
    p.removeChild(b);
    expect(p.getChildren()).toEqual([a, c]);
    expect(b.getParent()).toBeNull();
    expect(() => p.removeChild(b)).toThrow("Child is not a child of this node");
    p.clearChildren();
    expect(p.getFirstChild()).toBeNull();
    expect(p.getLastChild()).toBeNull();
  });

  it("walks the tree with accept", () => {
    const root = new TestBranch();
    const inner = new TestBranch();
    const a = leaf(1);
    const b = leaf(2);
    root.appendChild(inner);
    inner.appendChild(a);
    root.appendChild(b);
    const order = (reverse?: boolean, childrenFirst?: boolean) => {
      const out: number[] = [];
      root.accept(
        (n) => {
          out.push(n instanceof TestLeaf ? (n.$size as number) : 0);
        },
        reverse,
        false,
        childrenFirst,
      );
      return out;
    };
    expect(order()).toEqual([0, 0, 1, 2]);
    expect(order(true)).toEqual([0, 2, 0, 1]);
    expect(order(false, true)).toEqual([1, 0, 2, 0]);
    const visited: Node[] = [];
    expect(root.accept((n) => (visited.push(n), n !== inner))).toBe(false);
    expect(visited).toEqual([root, inner]);
    expect(root.accept((n) => n === b, false, true)).toBe(true);
    expect(root.getNodesByName("testleaf")).toEqual([a, b]);
    expect(root.getNodesByName("*")).toEqual([inner, a, b]);
    expect(a.findParent((n) => n === root)).toBe(root);
    expect(Node.order([b, a, inner])).toEqual([inner, a, b]);
    expect(Node.order([b, a], true)).toEqual([b, a]);
  });

  it("collects multi-reference ids and renews duplicates", () => {
    const root = new TestBranch();
    const a = leaf();
    const b = leaf();
    root.appendChild(a);
    root.appendChild(b);
    b._multiReferenceId = a.getMultireferenceId();
    const ids: Record<string, Node> = {};
    root.getSubnodeIds(ids);
    expect(Object.keys(ids)).toHaveLength(2);
    expect(ids[b.getMultireferenceId()]).toBe(b);
    expect(a.getMultireferenceId()).not.toBe(b.getMultireferenceId());
    // The old test is inverted: true while there is no id.
    expect(leaf().hasMultireference()).toBe(true);
  });

  it("collects selected descendants", () => {
    const root = new TestBranch();
    const a = leaf();
    root.appendChild(a);
    expect(root.getInternalSelectedNodes()).toBeNull();
    a.setFlag(NodeFlag.Selected);
    expect(root.getInternalSelectedNodes()).toEqual([a]);
  });

  it("keys a map container's children by id", () => {
    const map = new MapContainer();
    const a = leaf();
    map.appendChild(a);
    expect(map.getById(a.getId())).toBe(a);
    expect(map.getAsArray()).toEqual([a]);
    map.removeChild(a);
    expect(map.getById(a.getId())).toBeNull();
    expect(map.getAsArray()).toBeNull();
  });
});

describe("events and changes", () => {
  it("sends events to the node and its event-target ancestors", () => {
    const root = new TestBranch();
    const inner = new TestBranch();
    root.appendChild(inner);
    const log: string[] = [];
    root.addEventListener(AfterInsertEvent, (e) => log.push("root:" + Node.getName(e.node)));
    inner.addEventListener(AfterInsertEvent, (e) => log.push("inner:" + Node.getName(e.node)));
    inner.appendChild(leaf());
    expect(log).toEqual(["inner:testleaf", "root:testleaf"]);
  });

  it("sends temporary property events only to temporary receivers above the node", () => {
    const root = new TestBranch();
    const a = leaf();
    root.appendChild(a);
    const before = vi.fn();
    const after = vi.fn();
    root.addEventListener(BeforePropertiesChangeEvent, before);
    root.addEventListener(AfterPropertiesChangeEvent, after);
    a.setProperty("size", 2, false, false, true);
    expect(before).not.toHaveBeenCalled();
    expect(after).not.toHaveBeenCalled();
    root.temporaryReceiver = true;
    a.setProperty("size", 3, false, false, true);
    // The Before event is never sent for temporary changes (no tracked names).
    expect(before).not.toHaveBeenCalled();
    expect(after).toHaveBeenCalledTimes(1);
    a.setProperty("size", 4);
    expect(before).toHaveBeenCalledTimes(1);
    const event = after.mock.calls[1]?.[0] as AfterPropertiesChangeEvent;
    // The permanent set first puts the permanent value back, so the old value is 1.
    expect(event.values).toEqual([1]);
    expect(event.temporary).toBeUndefined();
  });

  it("blocks events by class and changes by code, counted", () => {
    const root = new TestBranch();
    const after = vi.fn();
    root.addEventListener(AfterInsertEvent, after);
    root._beginBlockCompositeEvents(true);
    root._beginBlockCompositeEvents(true);
    root.appendChild(leaf());
    root._endBlockCompositeEvents(true);
    root.appendChild(leaf());
    expect(after).not.toHaveBeenCalled();
    root._endBlockCompositeEvents(true);
    root.appendChild(leaf());
    expect(after).toHaveBeenCalledTimes(1);

    const n = leaf();
    const handled = vi.spyOn(n, "_handleChange");
    n._beginBlockChanges([NodeChange.AfterPropertiesChange]);
    expect(n._notifyChange(NodeChange.AfterPropertiesChange)).toBe(false);
    n._endBlockChanges([NodeChange.AfterPropertiesChange]);
    expect(n._blockedChanges).toBeUndefined();
    expect(n._notifyChange(NodeChange.AfterPropertiesChange, { properties: [], values: [] })).toBe(
      true,
    );
    expect(handled).toHaveBeenCalledTimes(1);
  });

  it("sets and removes flags once", () => {
    const n = new TestBranch();
    const changes: number[] = [];
    vi.spyOn(n, "_handleChange").mockImplementation((c) => {
      changes.push(c);
    });
    n.setFlag(NodeFlag.Active);
    n.setFlag(NodeFlag.Active);
    expect(n.hasFlag(NodeFlag.Active)).toBe(true);
    n.removeFlag(NodeFlag.Active);
    n.removeFlag(NodeFlag.Active);
    expect(changes).toEqual([30, 31, 30, 31]);
  });

  it("reports to the workspace's transaction recorder", () => {
    const calls: string[] = [];
    const recorder = {
      afterSetProperties: (_n: Node, names: string[]) => calls.push("set " + names.join()),
      afterChildInsert: () => calls.push("insert"),
      beforeChildRemove: () => calls.push("remove"),
      afterFlagSet: (_n: Node, f: number) => calls.push("flag " + f),
      afterFlagRemove: (_n: Node, f: number) => calls.push("unflag " + f),
      beginBlock: () => calls.push("begin"),
      endBlock: () => calls.push("end"),
    };
    const references: Node[] = [];
    const workspace = {
      getTransactionRecorder: () => recorder,
      addReference: (n: Node) => references.push(n),
      removeReference: (n: Node) => references.splice(references.indexOf(n), 1),
      getReference: () => null,
    };
    const root = new TestBranch();
    root._setWorkspace(workspace);
    const a = leaf();
    root.appendChild(a);
    expect(a.getWorkspace()).toBe(workspace);
    expect(references).toEqual([a]);
    a.setProperty("size", 2);
    a.setFlag(NodeFlag.Active);
    a.removeFlag(NodeFlag.Active);
    root.removeChild(a);
    expect(a.getWorkspace()).toBeNull();
    expect(references).toEqual([]);
    expect(calls).toEqual(["insert", "set size", "flag 8", "unflag 8", "remove"]);
  });
});

describe("serialize and deserialize", () => {
  it("writes the keys in the old order", () => {
    const root = new TestBranch();
    root.__id = "root01";
    const a = leaf(3);
    a.__id = "leaf01";
    a._referenceId = "ref";
    a._multiReferenceId = "mref";
    a.setProperty("z", 1, true);
    a.setProperty("a", 2, true);
    root.appendChild(a);
    root.setProperty("note", "n", true);
    expect(Node.serialize(root)).toBe(
      '{"@":"testbranch","@id":"root01","$":[{"@":"testleaf","@id":"leaf01","@z":1,"@a":2,' +
        '"#":"ref","&":"mref","size":3}],"@note":"n"}',
    );
  });

  it("leaves ids and ignored custom properties out of copies", () => {
    const a = leaf();
    a.setProperty("keep", 1, true);
    a.setProperty("drop", 2, true);
    expect(JSON.parse(Node.serialize(a, { copy: true }) as string)).toEqual({
      "@": "testleaf",
      "@keep": 1,
      "@drop": 2,
    });
    expect(
      JSON.parse(Node.serialize(a, { copy: true, copyIgnoreProperties: ["@drop"] }) as string),
    ).toEqual({ "@": "testleaf", "@keep": 1 });
  });

  it("skips exceptions and nodes without Store, and indents with beautify", () => {
    const root = new TestBranch();
    const a = leaf();
    const b = leaf();
    root.appendChild(a);
    root.appendChild(b);
    root.appendChild(new TestVolatile());
    const blob = JSON.parse(Node.serialize(root, { exceptions: [b], copy: true }) as string);
    expect(blob.$).toHaveLength(1);
    expect(Node.serialize(new TestVolatile())).toBeNull();
    expect(Node.serialize([a, b], { exceptions: [a], copy: true })).toBe('[{"@":"testleaf"}]');
    expect(Node.serialize(leaf(), { copy: true, beautify: true })).toBe(
      '{\n    "@": "testleaf"\n}',
    );
  });

  it("restores the tree, custom properties (with @id) and ids", () => {
    const json =
      '{"@":"testbranch","@id":"r1","$":[{"@":"testleaf","@id":"l1","#":"ref","&":"m",' +
      '"size":4,"@x":true},{"@":"unknown"},{"nope":1}]}';
    const restored: string[] = [];
    const root = Node.deserialize(json, undefined, null, (n) => restored.push(Node.getName(n)));
    expect(root).toBeInstanceOf(TestBranch);
    const branch = root as TestBranch & ContainerNode;
    expect(branch.getId()).toBe("r1");
    const child = branch.getFirstChild() as TestLeaf;
    expect(branch.getChildren()).toHaveLength(1);
    expect(child.getId()).toBe("l1");
    expect(child._referenceId).toBe("ref");
    expect(child._multiReferenceId).toBe("m");
    expect(child.$size).toBe(4);
    expect(child.getProperty("x", true)).toBe(true);
    // "@id" is copied as a custom property too (old behaviour).
    expect(child.getProperty("id", true)).toBe("l1");
    expect(restored).toEqual(["testleaf", "testbranch"]);
    expect(child.isRestoring()).toBe(false);
  });

  it("reports progress from 20 to 100", () => {
    const progress: number[] = [];
    Node.deserialize('{"@":"testbranch","$":[{"@":"testleaf"}]}', undefined, (p) =>
      progress.push(p),
    );
    expect(progress).toEqual([20, 60, 100]);
  });

  it("returns lists for arrays and null for bad JSON", () => {
    const list = Node.deserialize('[{"@":"testleaf"},{"@":"zzz"},{"@":"testleaf"}]');
    expect(Array.isArray(list) && list.length).toBe(2);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(Node.deserialize("{bad")).toBeNull();
    expect(warn).toHaveBeenCalledWith("deserialize node: invalid JSON");
    warn.mockRestore();
    expect(Node.deserialize("")).toBeNull();
  });

  it("clones through serialize", () => {
    const a = leaf(6);
    a.setProperty("box", { w: 2 });
    const copy = a.clone() as TestLeaf;
    expect(copy).toBeInstanceOf(TestLeaf);
    expect(copy).not.toBe(a);
    expect(copy.getId()).toBe(a.getId());
    expect(copy.$size).toBe(6);
    expect(copy.$box).toEqual({ w: 2 });
  });

  it("counts blobs", () => {
    expect(Node.countBlobChildren({ $: [{}, { $: [{}] }] }, 0)).toBe(4);
  });

  it("keeps Transform defaults as engine objects only when they are GObjects", () => {
    // Transform is not a GObject (as in the old code), so a Transform
    // default would be copied into a plain object.
    class WithTransform extends Properties(Node) {
      static {
        registerNodeClass(this, "testtrf", "GTestTrf");
      }
      constructor() {
        super();
        this._setDefaultProperties({ trf: new Transform(2, 0, 0, 2, 0, 0) });
      }
    }
    const n = new WithTransform();
    expect(n.$trf).not.toBeInstanceOf(Transform);
  });
});

describe("Q-011: ending blocks past the last record", () => {
  it("throws like the old loop when codes follow the record it deleted", () => {
    const n = new Node();
    n._beginBlockChanges([NodeChange.AfterPropertiesChange]);
    expect(() =>
      n._endBlockChanges([NodeChange.AfterPropertiesChange, NodeChange.AfterFlagChange]),
    ).toThrow(TypeError);
  });
});

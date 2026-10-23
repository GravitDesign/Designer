import { describe, expect, it } from "vitest";
import { NodeFlag } from "./node-change.ts";
import { Container } from "./node-container.ts";
import { Identity } from "./node-identity.ts";
import { Properties } from "./node-properties.ts";
import { Node, registerNodeClass } from "./node.ts";
import { Selector } from "./selector.ts";

class Box extends Identity(Properties(Container(Node))) {
  static {
    registerNodeClass(this, "box", "GTestSelectorBox");
  }

  constructor(name?: string) {
    super();
    this._setDefaultProperties({ name: null });
    if (name) this.setProperty("name", name);
  }

  override validateInsertion(): boolean {
    return true;
  }
}

class Leaf extends Properties(Node) {
  static {
    registerNodeClass(this, "leaf", "GTestSelectorLeaf");
  }

  constructor(name?: string) {
    super();
    this._setDefaultProperties({ name: null });
    if (name) this.setProperty("name", name);
  }

  override validateInsertion(): boolean {
    return true;
  }
}

class FakeScene extends Container(Node) {
  static {
    registerNodeClass(this, "scene", "GTestSelectorScene");
  }

  override validateInsertion(): boolean {
    return true;
  }
}

const names = (nodes: readonly Node[]) =>
  nodes.map((n) => (n as unknown as { getProperty(p: string): unknown }).getProperty("name"));

/** root > [a > (a1, a2 > (deep)), b, leaf1, leaf2, leaf3] */
function tree() {
  const root = new Box("root");
  const a = new Box("a");
  const a1 = new Leaf("a1");
  const a2 = new Box("a2");
  const deep = new Leaf("deep");
  const b = new Box("b");
  const l1 = new Leaf("l1");
  const l2 = new Leaf("l2");
  const l3 = new Leaf("l3");
  root.appendChild(a);
  a.appendChild(a1);
  a.appendChild(a2);
  a2.appendChild(deep);
  root.appendChild(b);
  root.appendChild(l1);
  root.appendChild(l2);
  root.appendChild(l3);
  return { root, a, a1, a2, deep, b, l1, l2, l3 };
}

describe("Selector", () => {
  it("finds nodes by name in document order, excluding the context", () => {
    const { root } = tree();
    expect(names(root.queryAll("box"))).toEqual(["a", "a2", "b"]);
    expect(names(root.queryAll("*"))).toEqual(["a", "a1", "a2", "deep", "b", "l1", "l2", "l3"]);
    expect(root.queryCount("leaf")).toBe(5);
    expect(names(root.queryAll("box leaf"))).toEqual(["a1", "deep"]);
    // Candidates are found by exact name; only the later test ignores case.
    expect(root.queryAll("BOX leaf")).toEqual([]);
  });

  it("supports child, sibling and ancestor combinators", () => {
    const { root, deep, a2 } = tree();
    expect(names(root.queryAll("> leaf"))).toEqual(["l1", "l2", "l3"]);
    expect(names(root.queryAll("box > leaf"))).toEqual(["a1", "deep"]);
    expect(names(root.queryAll("box + leaf"))).toEqual(["l1"]);
    expect(names(root.queryAll("leaf ~ leaf"))).toEqual(["l2", "l3"]);
    expect(names(root.queryAll("leaf ++ box"))).toEqual(["a2"]);
    expect(names(root.queryAll("leaf -- box"))).toEqual(["b", "a"]);
    expect(names(deep.queryAll("< box"))).toEqual(["a2", "a", "root"]);
    // The ancestor walk stops below the scene.
    const scene = new FakeScene();
    scene.appendChild(root);
    expect(names(deep.queryAll("< *"))).toEqual(["a2", "a", "root"]);
    expect(a2.matches("box")).toBe(true);
  });

  it("matches flags and properties", () => {
    const { root, a2, l2 } = tree();
    l2.setFlag(NodeFlag.Selected);
    a2.setFlag(NodeFlag.Active);
    expect(names(root.queryAll(":selected"))).toEqual(["l2"]);
    expect(names(root.queryAll("box:active"))).toEqual(["a2"]);
    expect(names(root.queryAll("[name=l3]"))).toEqual(["l3"]);
    expect(names(root.queryAll("leaf[name^=l]"))).toEqual(["l1", "l2", "l3"]);
    expect(names(root.queryAll("leaf[name$=1]"))).toEqual(["a1", "l1"]);
    expect(names(root.queryAll("box[name!=a]"))).toEqual(["a2", "b"]);
    expect(names(root.queryAll("leaf:not([name*=l])"))).toEqual(["a1", "deep"]);
    expect(names(root.queryAll("box:has(leaf)"))).toEqual(["a", "a2"]);
    expect(root.querySingle("box:selected")).toBeNull();
    expect(names([root.querySingle("leaf") as Node])).toEqual(["a1"]);
    expect(l2.filtered(":selected")).toBe(true);
    expect(l2.filtered(":selected, leaf")).toBe(false);
  });

  it("keeps the old nth quirks", () => {
    const { root } = tree();
    // index() counts from 1, so asking for 0 never matches.
    expect(root.queryAll("> :first-child")).toEqual([]);
    expect(names(root.queryAll("> :last-child"))).toEqual(["l3"]);
    // nth-child(3) asks for index 2.
    expect(names(root.queryAll("> :nth-child(3)"))).toEqual(["b"]);
    expect(names(root.queryAll("> :eq(2)"))).toEqual(["b"]);
    expect(names(root.queryAll("> :even"))).toEqual(["a", "l1", "l3"]);
    expect(names(root.queryAll("> :odd"))).toEqual(["b", "l2"]);
    expect(names(root.queryAll("> :nth-child(2n)"))).toEqual(["b", "l2"]);
    expect(Selector.parseNth("3")).toEqual({ a: 2, special: "index" });
    expect(Selector.parseNth("2n+1")).toEqual({ a: 2, b: 0, special: "n" });
  });

  it("repeats nodes found by an earlier group of a list", () => {
    const { root } = tree();
    expect(names(root.queryAll("box, box"))).toEqual(["a", "a2", "b", "a", "a2", "b"]);
    expect(names(root.queryAll("leaf:last-child, box"))).toEqual(["deep", "l3", "a", "a2", "b"]);
  });

  it("caches selectors by trimmed text and matches nothing on a syntax error", () => {
    expect(Selector.get(" box ")).toBe(Selector.get("box"));
    const { root } = tree();
    expect(root.queryAll("box)")).toEqual([]);
    expect(() => Selector.queryAll("box", null as unknown as Node)).toThrow(
      "Missing context or invalid context",
    );
  });

  it("throws for ids, since the scene has no getById", () => {
    const { root } = tree();
    expect(() => root.queryAll("#abc")).toThrow(TypeError);
  });
});

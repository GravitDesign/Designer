import { describe, expect, it } from "vitest";
import { RGBColor } from "../color/rgb-color.ts";
import { Event } from "../core/event.ts";
import { Rect } from "../math/rect.ts";
import { Transform } from "../math/transform.ts";
import { FillPaintLayer } from "../style/fill-paint-layer.ts";
import { Ellipse } from "./ellipse.ts";
import { Group } from "./group.ts";
import type { ContainerNode } from "./node-container.ts";
import { Node, registerNodeClass, type NodeWorkspace } from "./node.ts";
import { PathsGraph } from "./paths-graph/paths-graph.ts";
import { Rectangle } from "./rectangle.ts";
import type { SceneNode } from "./scene-node.ts";
import { Symbol, SymbolSiblingUpdateEvent } from "./symbol.ts";

/**
 * A scene stand-in: a group at the root that is its own scene, with the
 * links the real GScene keeps (reference id -> linked nodes) and a
 * workspace that registers references.
 */
class TestScene extends Group {
  static {
    registerNodeClass(this, "testsymbolscene", "GTestSymbolScene");
  }

  linkMap = new Map<string, Node[]>();

  constructor() {
    super();
    const references = new Map<string, Node>();
    const workspace: NodeWorkspace = {
      getTransactionRecorder: () => null,
      addReference: (n) => references.set((n as Symbol).getReferenceId(), n),
      removeReference: (n) => references.delete((n as Symbol).getReferenceId()),
      getReference: (id) => references.get(id) ?? null,
    };
    this._setWorkspace(workspace);
    this._setScene(this as never);
  }

  link(reference: Node | string, target: SceneNode): void {
    const id = typeof reference === "string" ? reference : (reference as Symbol).getReferenceId();
    const list = this.linkMap.get(id) ?? [];
    list.push(target);
    this.linkMap.set(id, list);
  }

  unlink(reference: string, target: SceneNode): void {
    const list = this.linkMap.get(reference) ?? [];
    const index = list.indexOf(target);
    if (index >= 0) list.splice(index, 1);
  }

  hasLinks(reference: Node): boolean {
    return (this.linkMap.get((reference as Symbol).getReferenceId()) ?? []).length > 0;
  }

  visitLinks(reference: Node, visitor: (linked: SceneNode) => void): void {
    for (const node of (this.linkMap.get((reference as Symbol).getReferenceId()) ?? []).slice()) {
      visitor(node as SceneNode);
    }
  }

  visitReferences(): void {}
  startBlockReferenceChanges(): void {}
  endBlockReferenceChanges(): void {}
  _unsetSceneNode(): void {}
  _invalidateArea(): void {}
  getTransformSettings(): null {
    return null;
  }
  getLabelBBox(): Rect {
    return new Rect(0, 0, 0, 10);
  }

  override validateInsertion(): boolean {
    return true;
  }
}

function rect(x: number, y: number, w: number, h: number): Rectangle {
  const r = new Rectangle();
  r.setProperty("trf", new Transform(w / 2, 0, 0, h / 2, x + w / 2, y + h / 2));
  return r;
}

function fill(node: Rectangle | Ellipse, color: RGBColor): FillPaintLayer {
  const layer = new FillPaintLayer();
  layer.setProperty("_pt", color);
  (node.getPaintLayers() as unknown as ContainerNode).appendChild(layer);
  return layer;
}

function firstFill(node: Node): FillPaintLayer {
  return (
    (node as Rectangle).getPaintLayers() as unknown as ContainerNode
  ).getFirstChild() as FillPaintLayer;
}

function trf(node: Node): number[] | null {
  const t = (node as Rectangle).getProperty("trf") as Transform | null;
  return t ? Transform.serialize(t) : null;
}

function masterWithInstance() {
  const scene = new TestScene();
  const a = rect(0, 0, 50, 50);
  fill(a, new RGBColor([255, 0, 0]));
  scene.appendChild(a);
  const master = Symbol.create([a], scene, "Badge");
  const instance = master.clone() as Symbol;
  scene.appendChild(instance);
  instance.transform(new Transform(1, 0, 0, 1, 200, 0));
  return { scene, a, master, instance };
}

describe("GSymbol", () => {
  it("creates a master from nodes in place of the last one", () => {
    const scene = new TestScene();
    const a = rect(0, 0, 50, 50);
    const b = rect(60, 0, 40, 40);
    const after = rect(0, 0, 1, 1);
    scene.appendChild(a);
    scene.appendChild(b);
    scene.appendChild(after);
    const master = Symbol.create([a, b], scene, "A <b>name</b>");
    expect(Node.getName(master)).toBe("symbol");
    expect(master.isMaster()).toBe(true);
    expect(master.$masterRef).toBe(master.getReferenceId());
    expect(master.$masterMultiRef).toBe(master.getMultireferenceId());
    expect(master.getChildren()).toEqual([a, b]);
    expect(master.getNext()).toBe(after);
    expect(Rect.serialize(master.getProperty("frame") as Rect)).toEqual([0, 0, 100, 50]);
    expect(master.getProperty("name")).not.toContain("<b>");
    expect(master.getMasterSymbol()).toBe(master);
  });

  it("skips paths graphs", () => {
    const graph = new PathsGraph();
    expect(Symbol.containsUnsupportedNodes(graph)).toBe(true);
    expect(Symbol.containsUnsupportedNodes(rect(0, 0, 1, 1))).toBe(false);
    expect(Symbol.containsUnsupportedNodes(null)).toBe(true);
    const scene = new TestScene();
    const r = rect(0, 0, 5, 5);
    scene.appendChild(graph);
    scene.appendChild(r);
    const master = Symbol.create([graph, r], scene, "S");
    expect(master.getChildren()).toEqual([r]);
  });

  it("clones into an instance linked to the master", () => {
    const { scene, master, instance } = masterWithInstance();
    expect(instance.isMaster()).toBe(false);
    expect(instance.getMasterSymbol()).toBe(master);
    expect(instance.getReferenceId()).not.toBe(master.getReferenceId());
    expect(instance.$masterRef).toBe(master.getReferenceId());
    expect(scene.linkMap.get(master.getReferenceId())).toEqual([instance]);
    expect(instance.inSync()).toBe(true);
    expect(Rect.serialize(instance.getFrame())).toEqual([200, 0, 50, 50]);
  });

  it("pushes master geometry changes to the instances, re-based", () => {
    const { a, instance } = masterWithInstance();
    a.setProperty("trf", new Transform(30, 0, 0, 30, 25, 25));
    expect(trf(instance.getFirstChild() as Node)).toEqual([30, 0, 0, 30, 225, 25]);
  });

  it("keeps an overridden child out of the master's later changes", () => {
    const { a, instance } = masterWithInstance();
    const child = instance.getFirstChild() as Rectangle;
    firstFill(child).setProperty("_pt", new RGBColor([0, 255, 0]));
    // The fill layer is the override, kept in dsb by its multireference id.
    expect(Object.keys(instance._disabledSiblingMap)).toEqual([
      firstFill(child).getMultireferenceId(),
    ]);
    expect(instance.inSync()).toBe(false);
    firstFill(a).setProperty("_pt", new RGBColor([9, 9, 9]));
    expect((firstFill(child).getProperty("_pt") as RGBColor).toString()).toBe(
      new RGBColor([0, 255, 0]).toString(),
    );
    const blob = JSON.parse(Node.serialize(instance) as string) as Record<string, unknown>;
    expect(blob["dsb"]).toEqual([firstFill(child).getMultireferenceId()]);
    // Synchronizing restores the master's value.
    instance.synchronize();
    expect(instance.inSync()).toBe(true);
  });

  it("an instance without overrides follows fill changes", () => {
    const { a, instance } = masterWithInstance();
    firstFill(a).setProperty("_pt", new RGBColor([1, 2, 3]));
    expect(
      (firstFill(instance.getFirstChild() as Node).getProperty("_pt") as RGBColor).toString(),
    ).toBe(new RGBColor([1, 2, 3]).toString());
  });

  it("inserts and removes master children in every instance", () => {
    const { master, instance } = masterWithInstance();
    const events: unknown[] = [];
    instance.addEventListener(SymbolSiblingUpdateEvent, (e: SymbolSiblingUpdateEvent) =>
      events.push([e.type, Node.getName(e.targetNode)]),
    );
    const e = new Ellipse();
    e.setProperty("trf", new Transform(10, 0, 0, 10, 10, 70));
    master.appendChild(e);
    expect(instance.getChildren().map((n) => Node.getName(n))).toEqual(["rectangle", "ellipse"]);
    expect(trf(instance.getLastChild() as Node)).toEqual([10, 0, 0, 10, 210, 70]);
    master.removeChild(master.getFirstChild() as Node);
    expect(instance.getChildren().map((n) => Node.getName(n))).toEqual(["ellipse"]);
    expect(events).toEqual([
      ["insert", "ellipse"],
      ["remove", "rectangle"],
    ]);
  });

  it("detaches an instance and converts it to a master", () => {
    const { scene, master, instance } = masterWithInstance();
    expect(master.detach()).toBe(false);
    expect(instance.detach()).toBe(true);
    expect(instance.getMasterSymbol()).toBe(null);
    expect(instance.getProperty("masterRef")).toBe(null);
    expect(scene.linkMap.get(master.getReferenceId())).toEqual([]);
    expect(instance.convertToMaster("Other")).toBe(true);
    expect(instance.isMaster()).toBe(true);
    expect(instance.getProperty("name")).toBe("Other");
  });

  it("swaps an instance for one of another master at the same top left", () => {
    const { scene, instance } = masterWithInstance();
    const e = new Ellipse();
    e.setProperty("trf", new Transform(30, 0, 0, 15, 130, 15));
    scene.appendChild(e);
    const other = Symbol.create([e], scene, "Two");
    const swapped = instance.swapWith(other) as Symbol;
    expect(swapped.getMasterSymbol()).toBe(other);
    expect(instance.getParent()).toBe(null);
    expect(Rect.serialize(swapped.getFrame()).slice(0, 2)).toEqual([200, 0]);
    expect(swapped.getProperty("swpori")).toEqual([
      instance.getMultireferenceId(),
      instance.$masterMultiRef,
    ]);
  });

  it("saves trf, frame and the master ids, never swp or blockEv", () => {
    const { master } = masterWithInstance();
    master.setProperty("swp", ["x", "y"]);
    master.setProperty("blockEv", true);
    const blob = JSON.parse(Node.serialize(master) as string) as Record<string, unknown>;
    expect(blob["frame"]).toEqual([0, 0, 50, 50]);
    expect(blob["masterRef"]).toBe(master.getReferenceId());
    expect(blob["masterMultiRef"]).toBe(master.getMultireferenceId());
    expect("swp" in blob).toBe(false);
    expect("blockEv" in blob).toBe(false);
    expect(blob["dsb"]).toEqual([]);
  });

  it("re-bases transforms between symbols", () => {
    const t = new Transform(2, 0, 0, 2, 10, 10);
    const from = new Transform(1, 0, 0, 1, 5, 0);
    const to = new Transform(1, 0, 0, 1, 0, 7);
    expect(Transform.serialize(Symbol._swapBaseTransforms(t, from, to) as Transform)).toEqual([
      2, 0, 0, 2, 5, 17,
    ]);
    expect(Symbol._swapBaseTransforms(t, new Transform(0, 0, 0, 0, 0, 0), to)).toBe(null);
  });

  it("finds the changed part of a text", () => {
    expect(Symbol._getChangedText("hello world", "hello")).toEqual([5, 6]);
    expect(Symbol._getChangedText("helo", "hello")).toEqual([3, 0]);
    expect(Symbol._getChangedText("abXcd", "abcd")).toEqual([2, 1]);
    expect(
      Symbol._getChangedTextContentProperties(
        [{ text: "ab", fontSize: 10 }],
        [{ text: "ab", fontSize: 12 }],
      ),
    ).toEqual([{ property: "fontSize", value: 12, oldValue: 10, range: [0, 1] }]);
    const target = [{ text: "x", fontSize: 10 }];
    expect(
      Symbol._assignChangedTextContentProperties(
        [{ text: "ab", fontSize: 10 }],
        [{ text: "cd", fontSize: 14 }],
        target,
        (name) => name !== "text",
      ),
    ).toBe(true);
    expect(target).toEqual([{ text: "x", fontSize: 14 }]);
  });

  it("has the old event classes", () => {
    expect(new SymbolSiblingUpdateEvent(new Group(), new Group(), "insert")).toBeInstanceOf(Event);
    expect(Symbol.AfterSiblingUpdate.INSERT).toBe("insert");
    expect(String(new Symbol.AfterThumbnailUpdate(new Symbol(), null))).toBe(
      "[Event GSymbol.AfterThumbnailUpdate]",
    );
  });
});

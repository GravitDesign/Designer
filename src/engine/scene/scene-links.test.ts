// The scene finds linked nodes by their scene id instead of walking the
// whole scene on every link (Scene._sceneNodeById), and looks a node up
// in a reference's links through a set of scene ids. Each scenario runs
// twice, once as the scene does it and once the old way (a walk of the
// scene, a scan of the list), and every step must leave the same links,
// lookup, set-aside links, refs, references and reference events.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Transform } from "../math/transform.ts";
import { installFakeCanvas } from "../paint/testing/fake-canvas.ts";
import type { TransactionAction } from "../undo/transaction-recorder.ts";
import { Group } from "./group.ts";
import type { ContainerNode } from "./node-container.ts";
import { Node } from "./node.ts";
import { Page } from "./page.ts";
import { Rectangle } from "./rectangle.ts";
import { ReferenceEvent } from "./reference-event.ts";
import { SceneNode, sceneNodeById } from "./scene-node.ts";
import { Scene } from "./scene.ts";
import { Symbol } from "./symbol.ts";
import { Workspace } from "./workspace.ts";

let uninstall: () => void;
beforeAll(() => {
  uninstall = installFakeCanvas();
});
afterAll(() => uninstall());

function rect(x: number, y: number, w: number, h: number): Rectangle {
  const r = new Rectangle();
  r.setProperty("trf", new Transform(w / 2, 0, 0, h / 2, x + w / 2, y + h / 2));
  return r;
}

/** The old way: walk the whole scene for the node with the id. */
function walkForNode(scene: Scene): (sceneId: string) => SceneNode | undefined {
  return (sceneId) => {
    let found: SceneNode | undefined;
    scene.acceptChildren((node: Node) => {
      if (node instanceof SceneNode && node.getSceneId() === sceneId) found = node;
      return undefined;
    });
    return found;
  };
}

/** The old way: compare the scene id of every node in the reference's list. */
function scanLookup(scene: Scene): (id: string, node: SceneNode) => boolean {
  return (id, node) => {
    const linked = (scene._linksLookup ?? {})[id];
    if (!linked) return false;
    const sceneId = node.getSceneId();
    return linked.some((entry) => entry instanceof SceneNode && entry.getSceneId() === sceneId);
  };
}

/** Records the scene's link state step by step, with nodes named the same in both runs. */
class Recorder {
  names = new Map<Node, string>();
  events: string[] = [];
  steps: Record<string, unknown>[] = [];
  scene!: Scene;
  workspace!: Workspace;

  constructor(readonly fullRebuild: boolean) {}

  /** Makes `scene` the one recorded; with fullRebuild it walks for linked nodes. */
  use(scene: Scene): Scene {
    this.scene = scene;
    this.workspace = scene.getWorkspace() as Workspace;
    if (this.fullRebuild) {
      scene._sceneNodeById = walkForNode(scene);
      scene._linkLookupHasSceneNode = scanLookup(scene);
    }
    return scene;
  }

  tag<T extends Node>(node: T, name: string): T {
    this.names.set(node, name);
    if (node instanceof SceneNode) {
      node.addEventListener(ReferenceEvent, (event: ReferenceEvent) => {
        if (event.target !== node) return;
        this.events.push(
          `${name} ${event.linked ? "linked to" : "unlinked from"} ${this.label(event.reference)}`,
        );
      });
    }
    return node;
  }

  /** A tagged node by name, else its place in the scene. */
  label(node: Node | null | undefined): string {
    if (!node) return String(node);
    const name = this.names.get(node);
    if (name) return name;
    const path: number[] = [];
    let child: Node = node;
    while (child._parent) {
      path.unshift((child._parent as ContainerNode).getIndexOfChild(child));
      child = child._parent;
    }
    return child === this.scene
      ? `${Node.getName(node)} at ${path.join("/")}`
      : `detached ${Node.getName(node)}`;
  }

  sceneIdLabel(sceneId: string): string {
    const node = sceneNodeById(sceneId);
    return node ? this.label(node) : "unknown";
  }

  referenceLabel(id: string): string {
    return this.label(this.workspace.getReference(id));
  }

  links(map: Record<string, (string | SceneNode)[]> | null): unknown {
    if (!map) return map;
    const out: Record<string, string[]> = {};
    for (const id of Object.keys(map)) {
      out[this.referenceLabel(id)] = (map[id] ?? []).map((entry) =>
        typeof entry === "string" ? this.sceneIdLabel(entry) : this.label(entry),
      );
    }
    return out;
  }

  snap(step: string): void {
    const s = this.scene;
    const refs: Record<string, string[]> = {};
    const references: Record<string, unknown> = {};
    for (const [node, name] of this.names) {
      if (!(node instanceof SceneNode)) continue;
      refs[name] = node.$refs.map((id) => this.referenceLabel(id));
      // visitReferences queues the visit while the links are not sane.
      if (!s._linksAreSane) continue;
      const visited: string[] = [];
      s.visitReferences(node, (reference) => visited.push(this.label(reference)));
      references[name] = { visited, has: s.hasReferences(node), count: s.refCount(node) };
    }
    this.steps.push({
      step,
      links: this.links(s.$_links),
      lookup: this.links(s._linksLookup),
      disabled: this.links(s._temporarilyDisabledLinks),
      sane: s._linksAreSane,
      refs,
      references,
      events: this.events.splice(0),
    });
  }

  /** Runs `change` as one undoable transaction. */
  transaction(change: () => void): TransactionAction[] {
    const recorder = this.workspace.getTransactionRecorder();
    if (!recorder) throw new Error("no recorder");
    recorder.beginTransaction();
    change();
    return recorder.endTransaction() ?? [];
  }

  /** Undoes the actions last to first, recording after each. */
  undo(actions: TransactionAction[], step: string): void {
    for (let i = actions.length - 1; i >= 0; i--) {
      (actions[i] as TransactionAction).revert();
      this.snap(`${step}: undo ${i}`);
    }
  }

  redo(actions: TransactionAction[], step: string): void {
    for (let i = 0; i < actions.length; i++) {
      (actions[i] as TransactionAction).action();
      this.snap(`${step}: redo ${i}`);
    }
  }
}

interface Doc {
  scene: Scene;
  page: Page;
  m1: Symbol;
  m2: Symbol;
}

/** A scene with two masters of two rectangles each. */
function twoMasters(r: Recorder): Doc {
  const scene = r.use(new Scene(new Workspace()));
  const page = r.tag(scene.getActivePage() as Page, "page");
  const masters: Symbol[] = [];
  for (let m = 0; m < 2; m++) {
    const a = r.tag(rect(m * 100, 0, 50, 50), `m${m + 1}a`);
    const b = r.tag(rect(m * 100 + 10, 10, 20, 20), `m${m + 1}b`);
    page.appendChild(a);
    page.appendChild(b);
    masters.push(r.tag(Symbol.create([a, b], page, `M${m + 1}`), `M${m + 1}`));
  }
  r.snap("masters");
  return { scene, page, m1: masters[0] as Symbol, m2: masters[1] as Symbol };
}

function instance(r: Recorder, master: Symbol, name: string, dx: number): Symbol {
  const copy = r.tag(master.clone() as Symbol, name);
  copy.transform(new Transform(1, 0, 0, 1, dx, 200));
  return copy;
}

function run(scenario: (r: Recorder) => void): {
  incremental: Record<string, unknown>[];
  full: Record<string, unknown>[];
} {
  const incremental = new Recorder(false);
  scenario(incremental);
  const full = new Recorder(true);
  scenario(full);
  return { incremental: incremental.steps, full: full.steps };
}

/** Both runs agree, and the walk found the linked nodes at all (not an empty run). */
function expectSameAsFullRebuild(scenario: (r: Recorder) => void): Record<string, unknown>[] {
  const { incremental, full } = run(scenario);
  expect(incremental.length).toBe(full.length);
  for (let i = 0; i < full.length; i++) expect(incremental[i]).toEqual(full[i]);
  return full;
}

function lookupOf(step: Record<string, unknown> | undefined): Record<string, string[]> {
  return (step?.["lookup"] ?? {}) as Record<string, string[]>;
}

describe("Scene links by scene id", () => {
  it("links instances inserted one by one, in a group and on a page filled first", () => {
    const steps = expectSameAsFullRebuild((r) => {
      const { scene, page, m1, m2 } = twoMasters(r);
      page.appendChild(instance(r, m1, "i1", 200));
      r.snap("i1");
      page.appendChild(instance(r, m2, "i2", 300));
      r.snap("i2");
      const group = r.tag(new Group(), "group");
      group.appendChild(instance(r, m1, "i3", 400));
      page.appendChild(group);
      r.snap("group");
      const other = r.tag(new Page(), "page2");
      other.appendChild(instance(r, m2, "i4", 0));
      other.appendChild(instance(r, m1, "i5", 100));
      scene.appendChild(other);
      r.snap("page2");
    });
    expect(lookupOf(steps[steps.length - 1])).toEqual({
      M1: ["i1", "i3", "i5"],
      M2: ["i2", "i4"],
    });
  });

  it("drops removed instances and links set aside while references are blocked", () => {
    const steps = expectSameAsFullRebuild((r) => {
      const { scene, page, m1, m2 } = twoMasters(r);
      const i1 = instance(r, m1, "i1", 200);
      page.appendChild(i1);
      const group = r.tag(new Group(), "group");
      group.appendChild(instance(r, m2, "i2", 300));
      page.appendChild(group);
      // A plain shape linked to a master, as text on a path is linked.
      const shape = r.tag(rect(500, 0, 10, 10), "shape");
      page.appendChild(shape);
      scene.link(m1, shape);
      r.snap("linked");
      page.removeChild(i1);
      r.snap("i1 removed");
      page.removeChild(group);
      r.snap("group removed");
      // Removed while blocked: the shape keeps its link, which the next
      // refresh sets aside because the shape is no longer in the scene.
      scene.startBlockReferenceChanges();
      page.removeChild(shape);
      scene.endBlockReferenceChanges(true);
      r.snap("shape removed while blocked");
      scene._refreshLinks();
      r.snap("refreshed");
      page.appendChild(shape);
      scene._refreshLinks();
      r.snap("shape back");
    });
    expect(lookupOf(steps.find((s) => s["step"] === "refreshed"))).toEqual({});
    expect(lookupOf(steps[steps.length - 1])).toEqual({ M1: ["shape"] });
  });

  it("unlinks the instances of a removed master and links them again on undo", () => {
    const steps = expectSameAsFullRebuild((r) => {
      const { page, m1, m2 } = twoMasters(r);
      page.appendChild(instance(r, m1, "i1", 200));
      page.appendChild(instance(r, m1, "i2", 300));
      // An instance of M2 inside M1: removing M1 takes it out of the scene.
      m1.appendChild(instance(r, m2, "nested", 0));
      r.snap("nested");
      const removal = r.transaction(() => page.removeChild(m1));
      r.snap("M1 removed");
      r.undo(removal, "M1");
      r.redo(removal, "M1");
    });
    // M1 copies the nested instance into i1 and i2, so M2 has three.
    const nested = lookupOf(steps.find((s) => s["step"] === "nested"));
    expect(nested["M1"]).toEqual(["i1", "i2"]);
    expect(nested["M2"]).toContain("nested");
  });

  it("puts a removed instance back on undo, one action at a time, and removes it on redo", () => {
    const steps = expectSameAsFullRebuild((r) => {
      const { page, m1 } = twoMasters(r);
      const i1 = instance(r, m1, "i1", 200);
      const i2 = instance(r, m1, "i2", 300);
      page.appendChild(i1);
      page.appendChild(i2);
      r.snap("inserted");
      const removal = r.transaction(() => page.removeChild(i1));
      r.snap("i1 removed");
      r.undo(removal, "i1");
      r.redo(removal, "i1");
      const insertion = r.transaction(() => page.appendChild(instance(r, m1, "i3", 400)));
      r.snap("i3 inserted");
      r.undo(insertion, "i3");
      r.redo(insertion, "i3");
    });
    // After the undo the links point at i1 again.
    expect(lookupOf(steps.find((s) => s["step"] === "inserted"))).toEqual({ M1: ["i1", "i2"] });
  });

  it("follows a master whose reference id changes when a copy comes into the same workspace", () => {
    const steps = expectSameAsFullRebuild((r) => {
      const { page, m1 } = twoMasters(r);
      page.appendChild(instance(r, m1, "i1", 200));
      // A copy of the master and an instance, as a paste makes them: their
      // reference ids are taken, so the workspace gives them new ones.
      const group = r.tag(new Group(), "pasted");
      group.appendChild(Node.deserialize(Node.serialize(m1)) as Symbol);
      group.appendChild(instance(r, m1, "i2", 300));
      const copy = Node.deserialize(Node.serialize(group)) as Group;
      r.tag(copy, "copy");
      const paste = r.transaction(() => page.appendChild(copy));
      r.snap("pasted");
      r.undo(paste, "paste");
      r.redo(paste, "paste");
    });
    expect(Object.keys(lookupOf(steps[steps.length - 1])).length).toBeGreaterThan(0);
  });

  it("keeps the links of a deserialized scene and links into it afterwards", () => {
    const steps = expectSameAsFullRebuild((r) => {
      const source = new Recorder(false);
      const { scene, page, m1, m2 } = twoMasters(source);
      page.appendChild(instance(source, m1, "i1", 200));
      page.appendChild(instance(source, m2, "i2", 300));
      const shape = rect(500, 0, 10, 10);
      page.appendChild(shape);
      scene.link(m1, shape);
      const restored = Node.deserialize(Node.serialize(scene), new Workspace()) as Scene;
      r.use(restored);
      r.snap("restored");
      const restoredPage = restored.getActivePage() as Page;
      // The restored masters and instances, by their place on the page.
      const children = restoredPage.getChildren();
      const master = children.find((n) => n instanceof Symbol && n.isMaster()) as Symbol;
      const first = children.find((n) => n instanceof Symbol && !n.isMaster()) as Symbol;
      const removal = r.transaction(() => restoredPage.removeChild(first));
      r.snap("instance removed");
      r.undo(removal, "removal");
      restoredPage.appendChild(instance(r, master, "i3", 400));
      r.snap("i3 inserted");
      const restoredShape = children.find((n) => n instanceof Rectangle) as Rectangle;
      restored.startBlockReferenceChanges();
      restoredPage.removeChild(restoredShape);
      restored.endBlockReferenceChanges(true);
      restored._refreshLinks();
      r.snap("shape removed while blocked");
    });
    const restored = lookupOf(steps[0]);
    expect(Object.values(restored).flat().length).toBe(3);
    expect(
      Object.values(lookupOf(steps.find((s) => s["step"] === "i3 inserted"))).flat(),
    ).toContain("i3");
  });
});

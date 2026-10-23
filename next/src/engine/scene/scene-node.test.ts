import { describe, expect, it } from "vitest";
import { Rect } from "../math/rect.ts";
import { NodeFlag } from "./node-change.ts";
import { Container } from "./node-container.ts";
import { Reference } from "./node-identity.ts";
import { Properties } from "./node-properties.ts";
import { Store } from "./node-store.ts";
import { Node, registerNodeClass, type NodeWorkspace } from "./node.ts";
import { ReferenceEvent } from "./reference-event.ts";
import { SceneNode, type SceneHooks } from "./scene-node.ts";

class RefNode extends Reference(Container(Store(Properties(SceneNode)))) {
  static {
    registerNodeClass(this, "refnode", "GTestRefNode");
  }
  override validateInsertion(): boolean {
    return true;
  }
}

class PageNode extends RefNode {
  static {
    registerNodeClass(this, "page", "GTestPage");
  }
}

function fakeScene() {
  const links: string[] = [];
  const references = new Map<string, Node>();
  const workspace: NodeWorkspace = {
    getTransactionRecorder: () => null,
    addReference: (n) => references.set((n as RefNode).getReferenceId(), n),
    removeReference: (n) => references.delete((n as RefNode).getReferenceId()),
    getReference: (id) => references.get(id) ?? null,
  };
  const unset: SceneNode[] = [];
  const scene: SceneHooks = {
    _isRestoring: false,
    _workspace: workspace,
    link: (ref, target) =>
      links.push(
        "link " + (typeof ref === "string" ? ref : Node.getName(ref)) + ">" + Node.getName(target),
      ),
    unlink: (ref, target) => links.push("unlink " + ref + ">" + Node.getName(target)),
    hasLinks: () => false,
    visitLinks: () => {},
    _unsetSceneNode: (n) => unset.push(n),
    _invalidateArea: () => {},
    getTransformSettings: () => null,
    getLabelBBox: () => new Rect(0, 0, 0, 0),
  };
  const root = new RefNode();
  root._setWorkspace(workspace);
  root._setScene(scene);
  return { root, scene, links, unset, references };
}

describe("SceneNode", () => {
  it("hands workspace and scene to inserted subtrees and takes them back", () => {
    const { root, scene, unset } = fakeScene();
    const parent = new RefNode();
    const child = new RefNode();
    parent.appendChild(child);
    root.appendChild(parent);
    expect(child.getScene()).toBe(scene);
    expect(child.getWorkspace()).toBe(root.getWorkspace());
    child.setFlag(NodeFlag.Selected);
    root.removeChild(parent);
    expect(child.getScene()).toBeNull();
    expect(child.getWorkspace()).toBeNull();
    expect(child.hasFlag(NodeFlag.Selected)).toBe(false);
    // Children first.
    expect(unset).toEqual([child, parent]);
  });

  it("finds its page and has a scene id", () => {
    const page = new PageNode();
    const child = new RefNode();
    page.appendChild(child);
    expect(child.getPage()).toBe(page);
    expect(new RefNode().getPage()).toBeNull();
    expect(child.getSceneId()).toHaveLength(32);
    expect(child.getSceneId()).toBe(child.getSceneId());
  });

  it("keeps refs in sync with link events", () => {
    const { root } = fakeScene();
    const target = new RefNode();
    const style = new RefNode();
    root.appendChild(target);
    target.trigger(new ReferenceEvent(style, target, true));
    expect(target.$refs).toEqual([style.getReferenceId()]);
    target.trigger(new ReferenceEvent(style, target, true));
    expect(target.$refs).toEqual([style.getReferenceId()]);
    target.trigger(new ReferenceEvent(style, target, false));
    expect(target.$refs).toEqual([]);
  });

  it("links its references on attach and unlinks them on detach", () => {
    const { root, links } = fakeScene();
    const style = new RefNode();
    root.appendChild(style);
    const user = new RefNode();
    user.setProperty("refs", [style.getReferenceId()]);
    root.appendChild(user);
    root.removeChild(user);
    expect(links).toEqual([
      "link refnode>refnode",
      "unlink " + style.getReferenceId() + ">refnode",
    ]);
  });
});

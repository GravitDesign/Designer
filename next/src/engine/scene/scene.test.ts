import { describe, expect, it } from "vitest";
import { RGBColor } from "../color/rgb-color.ts";
import { Transform } from "../math/transform.ts";
import type { StyleScene } from "../style/stylable-sets.ts";
import type { TextWorkspace } from "../text/text.ts";
import { Ellipse } from "./ellipse.ts";
import { Layer } from "./layer.ts";
import { NodeFlag } from "./node-change.ts";
import { Node } from "./node.ts";
import type { PageSceneHooks } from "./page.ts";
import { Page } from "./page.ts";
import type { PathSceneHooks } from "./path-base.ts";
import { Rectangle } from "./rectangle.ts";
import { Scene } from "./scene.ts";
import { Workspace } from "./workspace.ts";

// The scene must satisfy what the other clusters' nodes ask of it.
const scene0 = null as unknown as Scene;
const workspace0 = null as unknown as Workspace;
export const contracts: [PageSceneHooks, PathSceneHooks, StyleScene, TextWorkspace] = [
  scene0,
  scene0,
  scene0 as unknown as StyleScene,
  workspace0 as TextWorkspace,
];

function rect(x: number, y: number, w: number, h: number): Rectangle {
  const r = new Rectangle();
  r.setProperty("trf", new Transform(w / 2, 0, 0, h / 2, x + w / 2, y + h / 2));
  return r;
}

function newScene(): Scene {
  return new Scene(new Workspace());
}

describe("Scene pages", () => {
  it("starts with one active page named Page 1, or none with noPage", () => {
    const scene = newScene();
    const page = scene.getActivePage() as Page;
    expect(scene.getChildren().length).toBe(1);
    expect(page.getProperty("name")).toBe("Page 1");
    expect(page.hasFlag(NodeFlag.Active)).toBe(true);
    expect(new Scene(new Workspace(), true).getChildren().length).toBe(0);
  });

  it("copies the active page's size into a new page, without its offset", () => {
    const scene = newScene();
    (scene.getActivePage() as Page).setProperties(["w", "h", "ml"], [400, 300, 12]);
    const second = scene.insertPage();
    expect(second.getProperty("name")).toBe("Page 2");
    expect([second.getProperty("w"), second.getProperty("h"), second.getProperty("ml")]).toEqual([
      400, 300, 12,
    ]);
    // The active page doesn't change on insert.
    expect(scene.getActivePage()).not.toBe(second);
  });

  it("puts elements into the active page and reads page properties from it", () => {
    const scene = newScene();
    const r = rect(0, 0, 10, 10);
    scene.appendChild(r);
    expect(r.getParent()).toBe(scene.getActivePage());
    scene.setProperty("w", 640);
    expect((scene.getActivePage() as Page).getProperty("w")).toBe(640);
    expect(scene.getProperty("w")).toBe(640);
  });

  it("deletes the active page in favour of the previous one", () => {
    const scene = newScene();
    const first = scene.getActivePage() as Page;
    const second = scene.insertPage();
    scene.setActivePage(second);
    expect(scene.getProperty("pi")).toBe(1);
    scene.deleteActivePage();
    expect(scene.getActivePage()).toBe(first);
    expect(scene.getChildren()).toEqual([first]);
  });

  it("numbers page clones past the names in use", () => {
    const scene = newScene();
    const original = scene.getActivePage() as Page;
    original.setProperty("name", "Card 1");
    scene.insertPage().setProperty("name", "Card 1.4");
    const clone = new Page();
    scene.renameClone(original, clone);
    expect(clone.getProperty("name")).toBe("Card 1.5");
  });
});

describe("Scene grid", () => {
  it("keeps grid sizes at least MIN_GRID_SIZE", () => {
    const scene = newScene();
    scene.setProperties(["gx", "gy"], [0.2, -3]);
    expect([scene.getProperty("gx"), scene.getProperty("gy")]).toEqual([1, 1]);
  });

  it("fills in the axonometric angles and cell height", () => {
    const scene = newScene();
    scene.setProperty("gm", Scene.GridMode.Axonometric);
    expect(scene.getProperty("ga1")).toBe(Math.PI / 6);
    expect(scene.getProperty("ga2")).toBe(-Math.PI / 6);
    expect(scene.getProperty("gah")).toBe(20 * (Math.tan(Math.PI / 6) + Math.tan(Math.PI / 6)));
    expect(scene.getProperty("lgm")).toBe("axo");
  });
});

describe("Scene links", () => {
  it("links, visits and unlinks nodes of a reference", () => {
    const scene = newScene();
    const master = new Page();
    const other = scene.insertPage();
    scene.appendChild(master);
    scene.link(master, other);
    expect(scene.isLinked(other, master)).toBe(true);
    expect(scene.linkCount(master)).toBe(1);
    const visited: Node[] = [];
    scene.visitLinks(master, (node) => {
      visited.push(node);
    });
    expect(visited).toEqual([other]);
    const references: Node[] = [];
    scene.visitReferences(other, (reference) => {
      references.push(reference);
    });
    expect(references).toEqual([master]);
    scene.unlink(master, other);
    expect(scene.hasLinks(master)).toBe(false);
  });

  it("drops the links of a reference that leaves the scene", () => {
    const scene = newScene();
    const master = scene.insertPage();
    const page = scene.insertPage();
    scene.link(master, page);
    scene.removeChild(master);
    expect(scene.linkCount(master)).toBe(0);
  });

  it("links every page to the single master page", () => {
    const scene = newScene();
    const master = new Page();
    scene.insertPage();
    scene.setProperty("mpg", master);
    scene.reassignMasterPages();
    let linked = 0;
    scene.iteratePages((page) => {
      if (scene.isLinked(page, master)) linked++;
    }, true);
    expect(linked).toBe(2);
    expect(master.getWorkspace()).toBe(scene.getWorkspace());
  });
});

describe("Scene store and restore", () => {
  it("restores pages, the active page index and master links", () => {
    const scene = newScene();
    const master = new Page();
    master.setProperty("name", "Master");
    scene.setProperty("mpg", master);
    const second = scene.insertPage();
    second.appendChild(new Ellipse());
    scene.setActivePage(second);
    const json = Node.serialize(scene, { save: true }) as string;
    const blob = JSON.parse(json) as Record<string, unknown>;
    expect(blob["pi"]).toBe(1);
    expect(typeof blob["lmd"]).toBe("number");

    const restored = Node.deserialize(json, new Workspace()) as Scene;
    expect(restored).toBeInstanceOf(Scene);
    expect(restored.getChildren().map((n) => Node.getName(n))).toEqual(["page", "page"]);
    expect(restored.getActivePage()).toBe(restored.getChildren()[1]);
    const restoredMaster = restored.getProperty("mpg") as Page;
    expect(restoredMaster.getProperty("name")).toBe("Master");
    expect(restored.isLinked(restored.getChildren()[1], restoredMaster)).toBe(true);
  });

  it("stores no lmd outside a save, and the cloud keys not for singletons", () => {
    const scene = newScene();
    scene.setProperties(["cid", "cfs"], ["cloud", true]);
    expect((JSON.parse(Node.serialize(scene) as string) as Record<string, unknown>)["lmd"]).toBe(
      null,
    );
    const singleton = JSON.parse(
      Node.serialize(scene, { save: true, singleton: true } as never) as string,
    ) as Record<string, unknown>;
    expect("cid" in singleton).toBe(false);
  });
});

describe("Scene quirks", () => {
  it("hasGrid reads a property that doesn't exist", () => {
    expect(newScene().hasGrid()).toBeUndefined();
  });

  it("throws when ms changes: pages have no refreshPosition", () => {
    const scene = newScene();
    expect(() => scene.setProperty("ms", 1)).toThrow(TypeError);
  });

  it("sends page properties to the active page even when a layer is active", () => {
    const scene = newScene();
    const layer = new Layer();
    scene.appendChild(layer);
    scene.setProperty("bck", RGBColor.WHITE);
    expect((scene.getActivePage() as Page).getProperty("bck")).toBe(RGBColor.WHITE);
  });
});

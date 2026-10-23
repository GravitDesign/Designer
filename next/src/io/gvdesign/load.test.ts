import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Group } from "../../engine/scene/group.ts";
import { Node } from "../../engine/scene/node.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import { deserializeScene, loadGvdesign } from "./load.ts";

const EDGE = path.resolve(import.meta.dirname, "../../../parity/corpus/edge/files");
const edgeFile = (name: string): Uint8Array =>
  new Uint8Array(fs.readFileSync(path.join(EDGE, `${name}.gvdesign`)));

/** Resolves with "pending" when `promise` has not settled after `ms`. */
function settledWithin<T>(promise: Promise<T>, ms: number): Promise<T | "pending"> {
  return Promise.race([
    promise,
    new Promise<"pending">((resolve) => setTimeout(() => resolve("pending"), ms)),
  ]);
}

function sceneJson(): string {
  const scene = new Scene(new Workspace());
  scene.getActivePage()?.setProperties(["w", "h"], [300, 200]);
  return Node.serialize(scene, { save: true, singleton: true }) as string;
}

/**
 * Wraps Node.deserializeAsync so the test sees what each restore called
 * back with: a pending load is then known to come from load.ts and not
 * from a restore that never finished.
 */
function recordRestores(): unknown[] {
  const results: unknown[] = [];
  const original = Node.deserializeAsync;
  vi.spyOn(Node, "deserializeAsync").mockImplementation(
    (json, constructorArg, progress, onRestored, done) => {
      original(json, constructorArg, progress, onRestored, (result) => {
        results.push(result);
        done(result);
      });
    },
  );
  return results;
}

afterEach(() => {
  vi.restoreAllMocks();
});

function rectangleJson(): string {
  const rectangle = new Rectangle();
  return Node.serialize(rectangle, { save: true, singleton: true }) as string;
}

function groupJson(): string {
  const group = new Group();
  group.appendChild(new Rectangle());
  return Node.serialize(group, { save: true, singleton: true }) as string;
}

describe("loadGvdesign", () => {
  it("restores a gzipped scene into the given workspace", async () => {
    const json = sceneJson();
    const workspace = new Workspace();
    const steps: number[] = [];
    const scene = await loadGvdesign(new Uint8Array(zlib.gzipSync(json)), workspace, (p) =>
      steps.push(p),
    );
    expect(scene).toBeInstanceOf(Scene);
    expect((scene as Scene).getWorkspace()).toBe(workspace);
    expect(scene?.getActivePage()?.getProperty("w")).toBe(300);
    expect(steps.slice(0, 3)).toEqual([5, 10, 15]);
    expect(steps[steps.length - 1]).toBe(100);
  });

  it("opens uncompressed JSON, and ignores the _preview key", async () => {
    const json = '{"_preview":"data:image/jpeg;base64,AA==",' + sceneJson().slice(1);
    const scene = await loadGvdesign(new TextEncoder().encode(json), new Workspace());
    expect(scene).toBeInstanceOf(Scene);
    const again = JSON.parse(Node.serialize(scene as Scene) as string) as Record<string, unknown>;
    expect("_preview" in again).toBe(false);
  });

  it("opens a pre-3.10 file (no root dictionary)", async () => {
    const scene = (await loadGvdesign(edgeFile("legacy-pre310"), new Workspace())) as Scene;
    expect(scene).toBeInstanceOf(Scene);
    let texts = 0;
    scene.acceptChildren((node: Node) => {
      if (node.getNodeName() === "text") texts++;
    });
    expect(texts).toBeGreaterThan(0);
  });

  it("never settles for JSON that is cut off, like the old document left Loading", async () => {
    const result = await settledWithin(
      loadGvdesign(edgeFile("invalid-json"), new Workspace()),
      300,
    );
    expect(result).toBe("pending");
  });

  // The old deserializeData only went on for a truthy result and then
  // called isCloudSynchronization() on it, which only scenes have, so a
  // non-scene never reached LoadFailed: the document stayed Loading.
  it.each([
    ["a JSON array of shapes", () => "[" + rectangleJson() + "]", "array"],
    ["a group root", groupJson, "group"],
  ])("never settles for %s, like the old document left Loading", async (_name, json, kind) => {
    const restores = recordRestores();
    const result = await settledWithin(
      loadGvdesign(new TextEncoder().encode(json()), new Workspace()),
      300,
    );
    expect(result).toBe("pending");
    // The restore did finish: load.ts holds the promise back.
    expect(restores).toHaveLength(1);
    const restored = restores[0];
    if (kind === "array") {
      expect(Array.isArray(restored)).toBe(true);
      expect((restored as unknown[])[0]).toBeInstanceOf(Rectangle);
    } else {
      expect(restored).toBeInstanceOf(Group);
    }
  });

  // A root of an unknown class, or any root without children, never even
  // finishes its restore: the old deserializeAsync only called back once
  // its time-sliced executor ran a list of children (module 894).
  it.each([
    ["a root of an unknown class", () => '{"@":"unknownClass"}'],
    ["a lone childless shape", rectangleJson],
  ])("never settles for %s, whose restore never calls back", async (_name, json) => {
    const restores = recordRestores();
    const result = await settledWithin(
      loadGvdesign(new TextEncoder().encode(json()), new Workspace()),
      300,
    );
    expect(result).toBe("pending");
    expect(restores).toHaveLength(0);
  });

  it("reports 5, 10, 15 and the restore's steps up to 100 for a small file", async () => {
    const steps: number[] = [];
    await loadGvdesign(new TextEncoder().encode(sceneJson()), new Workspace(), (p) =>
      steps.push(p),
    );
    expect(steps.slice(0, 3)).toEqual([5, 10, 15]);
    expect(steps.length).toBeGreaterThan(3);
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i]).toBeGreaterThanOrEqual(steps[i - 1] as number);
    }
    expect(steps.slice(3).every((p) => p >= 20 && p <= 100)).toBe(true);
    expect(steps[steps.length - 1]).toBe(100);
  });
});

describe("deserializeScene", () => {
  it("rejects when deserializeAsync throws, like the old .catch(o)", async () => {
    const failure = new Error("restore broke");
    vi.spyOn(Node, "deserializeAsync").mockImplementation(() => {
      throw failure;
    });
    await expect(deserializeScene(sceneJson(), new Workspace())).rejects.toBe(failure);
  });

  it("rejects with an Error when deserializeAsync throws something else", async () => {
    vi.spyOn(Node, "deserializeAsync").mockImplementation(() => {
      throw "not an error";
    });
    await expect(deserializeScene(sceneJson(), new Workspace())).rejects.toThrow("not an error");
  });
});

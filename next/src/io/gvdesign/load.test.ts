import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { describe, expect, it } from "vitest";
import { Node } from "../../engine/scene/node.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import { loadGvdesign } from "./load.ts";

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
});

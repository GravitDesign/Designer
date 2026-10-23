import zlib from "node:zlib";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Node } from "../../engine/scene/node.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import { Scene } from "../../engine/scene/scene.ts";
import { Workspace } from "../../engine/scene/workspace.ts";
import { GvdesignStoreError, storeGvdesign } from "./store.ts";

/** Enough of FileReader for readAsDataURL (Node has Blob but no FileReader). */
class FakeFileReader {
  result: string | null = null;
  onloadend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readAsDataURL(blob: Blob): void {
    void blob.arrayBuffer().then((buffer) => {
      this.result = `data:${blob.type};base64,${Buffer.from(buffer).toString("base64")}`;
      this.onloadend?.();
    });
  }
}

function sampleScene(): Scene {
  const scene = new Scene(new Workspace());
  const page = scene.getActivePage();
  page?.setProperties(["w", "h"], [200, 100]);
  page?.appendChild(new Rectangle());
  return scene;
}

const gunzip = (bytes: Uint8Array): string => zlib.gunzipSync(bytes).toString("utf8");
const options = { singleton: true, lastModifiedDate: 1234 };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("storeGvdesign", () => {
  it("gzips the save serialization with the preview as the first key", async () => {
    vi.stubGlobal("FileReader", FakeFileReader);
    const scene = sampleScene();
    const preview = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: "image/jpeg" });
    const progress: number[] = [];
    const bytes = await storeGvdesign(scene, {
      ...options,
      progress: (p) => progress.push(p),
      preview: () => Promise.resolve(preview),
    });
    const json = gunzip(bytes);
    const serialized = Node.serialize(scene, { save: true, ...options }) as string;
    expect(json).toBe('{"_preview":"data:image/jpeg;base64,/9j/",' + serialized.slice(1));
    expect(progress).toEqual([10, 50, 75]);
    // Level 9: XFL 2.
    expect(bytes[8]).toBe(2);
  });

  it("saves without a preview when there is none, it fails or FileReader is missing", async () => {
    const scene = sampleScene();
    const serialized = Node.serialize(scene, { save: true, ...options }) as string;
    vi.stubGlobal("FileReader", FakeFileReader);
    const none = await storeGvdesign(scene, { ...options, preview: () => Promise.resolve(null) });
    expect(gunzip(none)).toBe(serialized);
    const failed = await storeGvdesign(scene, {
      ...options,
      preview: () => Promise.reject(new Error("no canvas")),
    });
    expect(gunzip(failed)).toBe(serialized);
    vi.unstubAllGlobals();
    const blob = new Blob(["x"], { type: "image/jpeg" });
    const noReader = await storeGvdesign(scene, {
      ...options,
      preview: () => Promise.resolve(blob),
    });
    expect(gunzip(noReader)).toBe(serialized);
  });

  it("gives the preview 4 s, then saves without it", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("FileReader", FakeFileReader);
    const scene = sampleScene();
    const saved = storeGvdesign(scene, { ...options, preview: () => new Promise(() => {}) });
    await vi.advanceTimersByTimeAsync(20 + 4000 - 1);
    let done = false;
    void saved.then(() => (done = true));
    await vi.advanceTimersByTimeAsync(0);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    const json = gunzip(await saved);
    expect(json.startsWith('{"@":"scene"')).toBe(true);
  });

  it("refuses an empty or short serialization with text.cannot-save", async () => {
    const scene = sampleScene();
    vi.spyOn(Node, "serialize").mockReturnValue("");
    await expect(storeGvdesign(scene, { preview: () => Promise.resolve(null) })).rejects.toEqual(
      new GvdesignStoreError("text.cannot-save", { group: "GDocument", key: "text.cannot-save" }),
    );
    vi.spyOn(Node, "serialize").mockReturnValue("{");
    await expect(
      storeGvdesign(scene, { preview: () => Promise.resolve(null) }),
    ).rejects.toBeInstanceOf(GvdesignStoreError);
    vi.spyOn(Node, "serialize").mockImplementation(() => {
      throw new Error("boom");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      storeGvdesign(scene, { preview: () => Promise.resolve(null) }),
    ).rejects.toMatchObject({ message: "text.cannot-save" });
  });

  it("refuses a gzip result not above 20 bytes plus the descendant count", async () => {
    const scene = sampleScene();
    for (let i = 0; i < 20; i++) scene.getActivePage()?.appendChild(new Rectangle());
    let descendants = 0;
    scene.acceptChildren(() => {
      descendants++;
    });
    // Longer than the descendant count, but it gzips to about 25 bytes.
    vi.spyOn(Node, "serialize").mockReturnValue("{" + " ".repeat(descendants * 4) + "}");
    expect(descendants).toBeGreaterThan(10);
    await expect(storeGvdesign(scene, { preview: () => Promise.resolve(null) })).rejects.toEqual(
      new GvdesignStoreError("GZIP compression fail", null),
    );
  });
});

// BUG-008: EPS/PS files with DCT (JPEG) images import with their images.
//
// Runs the real EPSImport with the PostScript interpreter in a worker
// thread (ps-thread.test-support.ts), so the worker really blocks in
// Atomics.wait while the page side decodes the JPEG asynchronously and
// answers through the SharedArrayBuffer. The browser's JPEG decoding and
// canvas are stood in for by the pixels Chromium decoded from the same
// JPEGs (__fixtures__/photo-*.rgba, written by drawing each JPEG into a
// canvas and reading it back with getImageData).
//
// With the old handshake these imports hang (the page's Atomics.wake
// throws, so the worker sleeps until its timeout) and gray images arrive
// as the first quarter of the RGBA bytes.
import fs from "node:fs";
import path from "node:path";
import type { Worker as ThreadWorker } from "node:worker_threads";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FontManager } from "../../../engine/text/fonts/font-manager.ts";
import type { Group } from "../../../engine/scene/group.ts";
import { EPSImport } from "./eps-import.ts";

const threads: ThreadWorker[] = vi.hoisted(() => []);

vi.mock("../../../workers/ps/index.ts", async () => {
  const { Worker } = await import("node:worker_threads");
  return {
    createPostScriptWorker: () => {
      // A web Worker's surface over a Node worker thread.
      const thread = new Worker(new URL("./ps-thread.test-support.ts", import.meta.url));
      const worker = {
        onmessage: null as ((event: { data: unknown }) => void) | null,
        postMessage: (message: unknown) => thread.postMessage(message),
        terminate: () => void thread.terminate(),
      };
      thread.on("message", (data: unknown) => worker.onmessage?.({ data }));
      threads.push(thread);
      return worker;
    },
  };
});

const FIXTURES = path.join(import.meta.dirname, "__fixtures__");
const PARITY_EPS = path.join(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "..",
  "parity",
  "scenarios",
  "io-import-pdf-eps",
  "fixtures",
  "eps",
);

/** What the browser decodes for each fixture JPEG, by its bytes in base64. */
const decoded = new Map<string, { width: number; height: number; rgba: Uint8ClampedArray }>();
for (const name of ["rgb", "gray", "cmyk"]) {
  const jpeg = fs.readFileSync(path.join(FIXTURES, `photo-${name}.jpg`));
  const rgba = new Uint8ClampedArray(fs.readFileSync(path.join(FIXTURES, `photo-${name}.rgba`)));
  decoded.set(jpeg.toString("base64"), { width: 80, height: 60, rgba });
}

function rgbaOf(name: string): Uint8ClampedArray {
  return (
    decoded.get(fs.readFileSync(path.join(FIXTURES, `photo-${name}.jpg`)).toString("base64")) as {
      rgba: Uint8ClampedArray;
    }
  ).rgba;
}

/** Pixels each fake canvas's toDataURL handed out, by URL. */
const canvasPixels = new Map<string, Uint8ClampedArray>();

/** An HTMLImageElement that decodes asynchronously, like the browser's. */
class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  width = 0;
  height = 0;
  rgba: Uint8ClampedArray | null = null;
  set src(url: string) {
    setTimeout(() => {
      const base64 = decodeURIComponent(url.slice(url.indexOf(",") + 1));
      const image = url.startsWith("data:image/jpeg;base64,") ? decoded.get(base64) : undefined;
      // The browser reports exceptions of event handlers; they don't reach the worker.
      try {
        if (image) {
          this.width = image.width;
          this.height = image.height;
          this.rgba = image.rgba;
          this.onload?.();
        } else this.onerror?.();
      } catch (error) {
        pageErrors.push(error);
      }
    }, 1);
  }
}

class FakeCanvas {
  width = 0;
  height = 0;
  pixels = new Uint8ClampedArray(0);
  getContext() {
    let drawn: FakeImage | null = null;
    return {
      drawImage: (image: FakeImage) => {
        drawn = image;
      },
      getImageData: () => ({ data: new Uint8ClampedArray(drawn?.rgba ?? []) }),
      createImageData: (width: number, height: number) => ({
        width,
        height,
        data: new Uint8ClampedArray(width * height * 4),
      }),
      putImageData: (imageData: { data: Uint8ClampedArray }) => {
        this.pixels = new Uint8ClampedArray(imageData.data);
      },
    };
  }
  toDataURL() {
    const url = `canvas:${canvasPixels.size}`;
    canvasPixels.set(url, this.pixels);
    return url;
  }
}

const pageErrors: unknown[] = [];

beforeEach(() => {
  pageErrors.length = 0;
  canvasPixels.clear();
  vi.stubGlobal("Image", FakeImage);
  vi.stubGlobal("document", { createElement: () => new FakeCanvas() });
});

afterEach(async () => {
  vi.unstubAllGlobals();
  await Promise.all(threads.splice(0).map((t) => t.terminate()));
});

interface ImportResult {
  group: Group;
  errors: string[];
}

function importEps(file: string): Promise<ImportResult> {
  return new Promise((resolve) => {
    const errors: string[] = [];
    EPSImport.import(
      new Uint8Array(fs.readFileSync(file)),
      true,
      new FontManager(),
      (_error, group) => {
        // The error messages follow the draw callback in the same call.
        setTimeout(() => resolve({ group, errors }), 0);
      },
      (message) => errors.push(message),
      () => {},
    );
  });
}

interface NodeLike {
  getFirstChild(): NodeLike | null;
  getNext(): NodeLike | null;
  getProperty(name: string): unknown;
}

function children(group: Group): NodeLike[] {
  const out: NodeLike[] = [];
  for (let n = (group as unknown as NodeLike).getFirstChild(); n; n = n.getNext()) out.push(n);
  return out;
}

/** The image node's pixels and size. */
function imagePixels(node: NodeLike): { iw: unknown; ih: unknown; rgba: Uint8ClampedArray } {
  return {
    iw: node.getProperty("iw"),
    ih: node.getProperty("ih"),
    rgba: canvasPixels.get(node.getProperty("url") as string) as Uint8ClampedArray,
  };
}

function expectSamePixels(actual: Uint8ClampedArray, expected: Uint8ClampedArray): void {
  expect(actual.length).toBe(expected.length);
  let differing = 0;
  for (let i = 0; i < expected.length; i++) if (actual[i] !== expected[i]) differing++;
  expect(differing, "differing RGBA bytes").toBe(0);
}

const TIMEOUT = 20_000;

describe("EPS import of DCT (JPEG) images", () => {
  it(
    "imports an RGB JPEG with the pixels the browser decoded and runs on after it",
    async () => {
      const { group, errors } = await importEps(path.join(FIXTURES, "image-dct-rgb.eps"));
      expect(pageErrors).toEqual([]);
      expect(errors).toEqual([]);
      const nodes = children(group);
      expect(nodes).toHaveLength(2);
      const image = imagePixels(nodes[0] as NodeLike);
      expect([image.iw, image.ih]).toEqual([80, 60]);
      expectSamePixels(image.rgba, rgbaOf("rgb"));
      // The red square after the image.
      const square = (
        nodes[1] as unknown as { getGeometryBBox(): { getWidth(): number } }
      ).getGeometryBBox();
      expect(square.getWidth()).toBe(10);
    },
    TIMEOUT,
  );

  it(
    "imports a gray JPEG as gray pixels, all of them",
    async () => {
      const { group, errors } = await importEps(path.join(FIXTURES, "image-dct-gray.eps"));
      expect(pageErrors).toEqual([]);
      expect(errors).toEqual([]);
      const image = imagePixels(children(group)[0] as NodeLike);
      expect([image.iw, image.ih]).toEqual([80, 60]);
      expectSamePixels(image.rgba, rgbaOf("gray"));
    },
    TIMEOUT,
  );

  it(
    "imports a CMYK JPEG; without a CMYK profile its colors are the RGB the browser decoded",
    async () => {
      const { group, errors } = await importEps(path.join(FIXTURES, "image-dct-cmyk.eps"));
      expect(pageErrors).toEqual([]);
      expect(errors).toEqual([]);
      const image = imagePixels(children(group)[0] as NodeLike);
      expect([image.iw, image.ih]).toEqual([80, 60]);
      expectSamePixels(image.rgba, rgbaOf("cmyk"));
    },
    TIMEOUT,
  );

  it(
    "reports a JPEG the browser can't decode (parity fixture filter-dct-file.ps) at once",
    async () => {
      const started = Date.now();
      const { group, errors } = await importEps(path.join(PARITY_EPS, "filter-dct-file.ps"));
      expect(pageErrors).toEqual([]);
      // Error "02", as the old app reported it for every JPEG.
      expect(errors).toEqual([
        "Parts of the EPS file aren’t supported by Gravit Designer. They are not imported...",
      ]);
      expect(children(group)).toEqual([]);
      expect(Date.now() - started).toBeLessThan(5_000);
    },
    TIMEOUT,
  );
});

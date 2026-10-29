// GPDFExport (old module 1406) beyond the recorded documents: the raster
// size guard of isSupported, slices (their page with the slice's
// background, restored afterwards), progress, the missing callback, the
// error and abort paths, and the proxies of graph anchors.
import { inflateSync } from "node:zlib";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RGBColor } from "../../../engine/color/rgb-color.ts";
import { Platform } from "../../../engine/core/platform.ts";
import { Transform } from "../../../engine/math/transform.ts";
import { Layer } from "../../../engine/scene/layer.ts";
import { Rectangle } from "../../../engine/scene/rectangle.ts";
import { Scene } from "../../../engine/scene/scene.ts";
import { Slice } from "../../../engine/scene/slice.ts";
import { Workspace } from "../../../engine/scene/workspace.ts";
import { AngularGradient } from "../../../engine/style/angular-gradient.ts";
import { FillPaintLayer } from "../../../engine/style/fill-paint-layer.ts";
import { Page } from "../../../engine/scene/page.ts";
import { Anchor } from "../../../engine/scene/anchor.ts";
import "../../../engine/style/stylable.ts";
import { PDFDocument } from "./pdf-document.ts";
import { PDFExport, PDFExportProxy } from "./pdf-export.ts";
import { PDFRasterFallback } from "./raster-fallback.ts";

const limits = {
  absoluteMaxImgLinearDimension: Platform.absoluteMaxImgLinearDimension,
  absoluteMaxImgAreaDots: Platform.absoluteMaxImgAreaDots,
  maxPngDataSize: Platform.maxPngDataSize,
};

function newPage(width: number, height: number): { scene: Scene; page: Page; layer: Layer } {
  const scene = new Scene(new Workspace());
  const page = scene.getActivePage() as Page;
  page.setProperties(["bck", "w", "h"], [RGBColor.WHITE, width, height]);
  const layer = new Layer();
  page.appendChild(layer);
  return { scene, page, layer };
}

function rectangle(x: number, y: number, w: number, h: number, pattern: unknown): Rectangle {
  const shape = new Rectangle();
  shape.setProperty("trf", new Transform(w / 2, 0, 0, h / 2, x + w / 2, y + h / 2));
  const fill = new FillPaintLayer();
  fill.setProperty("_pt", pattern);
  (shape.getPaintLayers() as unknown as { appendChild(node: unknown): void }).appendChild(fill);
  return shape;
}

beforeEach(() => {
  vi.spyOn(Platform, "scheduleFrame").mockImplementation((callback) => {
    setTimeout(() => callback(0), 0);
    return 1;
  });
});

afterEach(() => {
  Object.assign(Platform, limits);
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * How long the asynchronous export paths may take: the export runs on
 * timers, which a loaded machine delays well past a fixed wait.
 */
const SETTLE = { timeout: 10_000, interval: 10 };

/**
 * Pages begun on `document` only: an export of an earlier test can still
 * be running on a loaded machine and start pages through the same spy.
 */
function pagesOf(spy: { mock: { contexts: unknown[] } }, document: unknown): number {
  return spy.mock.contexts.filter((context) => context === document).length;
}

/** A fixed-size white page added to the scene. */
function addPage(scene: Scene, width: number, height: number): Page {
  const page = new Page();
  page.setProperties(["bck", "w", "h"], [RGBColor.WHITE, width, height]);
  scene.appendChild(page);
  return page;
}

/**
 * Aborting rejects the document's promise before anything listens to it
 * (an unhandled rejection in the old app too); mark it handled so the test
 * run doesn't report it. The export's own `.catch` still sees it.
 */
function abortHandled(document: PDFDocument): void {
  document.abort();
  (document as unknown as { _promise: Promise<unknown> })._promise.catch(() => {});
}

describe("PDFExport.isSupported", () => {
  it("fails when a node it would rasterize is larger than a canvas can be", () => {
    Object.assign(Platform, {
      absoluteMaxImgLinearDimension: 1000,
      absoluteMaxImgAreaDots: 500000,
      maxPngDataSize: 4000000,
    });
    const { page, layer } = newPage(300, 200);
    // An angular gradient can't be written as a PDF shading.
    layer.appendChild(rectangle(10, 10, 200, 100, new AngularGradient()));
    expect(PDFExport.isSupported(page, true, "72dpi")).toBe(true);
    expect(PDFExport.isSupported(page, true, "300dpi")).toBe(true);
    // 200 x 100 at 1000 dpi is 2778 px wide.
    expect(PDFExport.isSupported(page, true, "1000dpi")).toBe(false);
    expect(PDFExport.isSupported([page], true, "1000dpi")).toBe(false);
    // 600 dpi: 1667 x 833 px, within the linear limit but over the area.
    expect(PDFExport.isSupported(page, true, "600dpi")).toBe(false);
  });

  it("ignores vector nodes, however large", () => {
    Object.assign(Platform, {
      absoluteMaxImgLinearDimension: 100,
      absoluteMaxImgAreaDots: 1000,
      maxPngDataSize: 1000,
    });
    const { page, layer } = newPage(300, 200);
    layer.appendChild(rectangle(10, 10, 200, 100, new RGBColor([1, 2, 3])));
    expect(PDFExport.isSupported(page, true, "1000dpi")).toBe(true);
  });
});

describe("PDFExport.export", () => {
  it("needs a callback", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(PDFExport.export([], {}, null as never)).toBeUndefined();
    expect(error).toHaveBeenCalledWith("No fnResult callback passed to GPDFExport.export.");
  });

  it("exports a slice as its page area over the slice's background, then restores the page", async () => {
    const { page, layer } = newPage(300, 200);
    layer.appendChild(rectangle(0, 0, 300, 200, new RGBColor([0, 0, 255])));
    const slice = new Slice();
    slice.setProperties(["x", "y", "w", "h", "cls"], [100, 100, 80, 40, new RGBColor([255, 0, 0])]);
    layer.appendChild(slice);
    const background = page.getProperty("bck");
    const progress: number[] = [];
    const bytes = await new Promise<Uint8Array>((resolve, reject) => {
      PDFExport.export(
        slice,
        { dpi: 72, disableWorker: true, progress: (p) => progress.push(p) },
        (error, data) => (error ? reject(error as Error) : resolve(data as unknown as Uint8Array)),
      );
    });
    const text = Buffer.from(bytes).toString("latin1");
    expect(text).toContain("/MediaBox [0 0 80 40]");
    // The page background is the slice's color while the page paints.
    const contents = /4 0 obj\n<<\/Length (\d+)\/Filter \/FlateDecode>>stream\n/.exec(text);
    const start = (contents?.index ?? 0) + (contents?.[0].length ?? 0);
    const drawing = inflateSync(
      Buffer.from(text.slice(start, start + Number(contents?.[1])), "latin1"),
    ).toString("latin1");
    expect(drawing).toContain("1 0 0 \nrg\nf");
    expect(drawing).toContain("0 0 1 \nrg\nf");
    expect(page.getProperty("bck")).toBe(background);
    // One element: 0 % when it starts, 50 % after it.
    expect(progress).toEqual([0, 50]);
  });
});

describe("PDFExport.export error and abort paths", () => {
  it("hands a failed raster job to the callback and finishes the document", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    const failure = new Error("raster failed");
    vi.spyOn(PDFRasterFallback.prototype, "export").mockImplementation(() =>
      Promise.reject(failure),
    );
    const finish = vi.spyOn(PDFDocument.prototype, "finish");
    const { page, layer } = newPage(100, 100);
    // An angular gradient is rasterized.
    layer.appendChild(rectangle(10, 10, 50, 50, new AngularGradient()));
    const calls: unknown[][] = [];
    PDFExport.export(page, { dpi: 72, disableWorker: true }, (...args) => calls.push(args));
    await vi.waitFor(() => expect(calls).toHaveLength(1), SETTLE);
    expect(calls).toEqual([[failure]]);
    expect(finish).toHaveBeenCalled();
  });

  it("stops between pages after an abort and calls back without bytes", async () => {
    const { scene, page } = newPage(100, 100);
    const second = addPage(scene, 50, 50);
    const third = addPage(scene, 50, 50);
    const newPages = vi.spyOn(PDFDocument.prototype, "newPage");
    const calls: unknown[][] = [];
    const progress: number[] = [];
    // The second progress call comes after the first page is done.
    const document = PDFExport.export(
      [page, second, third],
      {
        dpi: 72,
        disableWorker: true,
        progress: (percent) => {
          progress.push(percent);
          if (progress.length === 2) abortHandled(document as PDFDocument);
        },
      },
      (...args) => calls.push(args),
    );
    await vi.waitFor(() => expect(calls).toHaveLength(1), SETTLE);
    // The rejected document promise reaches the callback as an undefined
    // error, which the exporter takes as "aborted" (old GExporter).
    expect(calls).toEqual([[undefined]]);
    expect(pagesOf(newPages, document)).toBe(1);
    expect(progress).toEqual([0, 25]);
  });

  it("calls back once without bytes after an abort while nodes are rasterized (BUG-088)", async () => {
    const running: { document?: PDFDocument } = {};
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => unhandled.push(reason);
    process.on("unhandledRejection", onUnhandled);
    // A plain abort, as the dialog's Cancel does: nothing marks the
    // rejection handled from outside.
    const raster = vi.spyOn(PDFRasterFallback.prototype, "export").mockImplementation(() => {
      (running.document as PDFDocument).abort();
      return Promise.resolve(undefined);
    });
    const { scene, page, layer } = newPage(100, 100);
    layer.appendChild(rectangle(10, 10, 50, 50, new AngularGradient()));
    layer.appendChild(rectangle(40, 40, 50, 50, new AngularGradient()));
    const second = addPage(scene, 50, 50);
    const newPages = vi.spyOn(PDFDocument.prototype, "newPage");
    const callback = vi.fn();
    running.document = PDFExport.export([page, second], { dpi: 72, disableWorker: true }, callback);
    try {
      await vi.waitFor(() => expect(callback).toHaveBeenCalled(), SETTLE);
      await wait(50);
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
    // Once, with an undefined error and no bytes: "aborted".
    expect(callback.mock.calls).toEqual([[undefined]]);
    expect(unhandled).toEqual([]);
    // The raster loop stopped after the first node; no second page.
    expect(raster).toHaveBeenCalledTimes(1);
    expect(pagesOf(newPages, running.document)).toBe(1);
  });

  it("never calls back when a node's paint throws (kept hang)", () => {
    vi.useFakeTimers();
    vi.spyOn(Platform, "scheduleFrame").mockImplementation((callback) => {
      setTimeout(() => callback(0), 0);
      return 1;
    });
    const { page, layer } = newPage(100, 100);
    layer.appendChild(rectangle(10, 10, 50, 50, new RGBColor([1, 2, 3])));
    vi.spyOn(Rectangle.prototype, "paint").mockImplementation(() => {
      throw new Error("paint failed");
    });
    const callback = vi.fn();
    PDFExport.export(page, { dpi: 72, disableWorker: true }, callback);
    // The error leaves the export's timer instead of reaching the callback.
    const thrown: unknown[] = [];
    for (let i = 0; i < 20; i++) {
      try {
        vi.advanceTimersByTime(5);
      } catch (error) {
        thrown.push(error);
      }
    }
    expect(thrown.map(String)).toEqual(["Error: paint failed"]);
    expect(callback).not.toHaveBeenCalled();
  });
});

describe("PDFExportProxy", () => {
  it("copies the node's own enumerable properties, as the old extend did", () => {
    const rectangle = new Rectangle() as unknown as Record<string, unknown>;
    rectangle.$custom = { shared: true };
    Object.defineProperty(rectangle, "hidden", { value: 1, enumerable: false });
    const inherited: string[] = [];
    for (const key in rectangle) if (!Object.hasOwn(rectangle, key)) inherited.push(key);
    expect(inherited.length).toBeGreaterThan(0);
    const processor = { isVectorable: () => true };
    const proxy = new PDFExportProxy(null as never, null as never, {}, processor as never).proxy(
      rectangle,
    );
    expect(Object.getPrototypeOf(proxy)).toBe(Object.getPrototypeOf(rectangle));
    for (const key of Object.keys(rectangle)) {
      expect(Object.hasOwn(proxy, key)).toBe(true);
      // The proxy sets these itself; its paint hooks are functions.
      if (["_paintSharp", "_needToRaster"].includes(key) || "function" == typeof proxy[key]) {
        continue;
      }
      expect(proxy[key]).toBe(rectangle[key]);
    }
    // Prototype defaults stay on the prototype, non-enumerable properties
    // aren't copied, and writes on the proxy don't reach the node.
    for (const key of inherited) expect(Object.hasOwn(proxy, key)).toBe(false);
    expect(Object.hasOwn(proxy, "hidden")).toBe(false);
    proxy.$custom = null;
    expect(rectangle.$custom).toEqual({ shared: true });
  });

  it("throws on an anchor without edge lists, like the old proxy", () => {
    const proxy = new PDFExportProxy(null as never, null as never, {}, null as never).proxy(
      new Anchor(),
    );
    expect(() => proxy.getOutEdges()).toThrow(TypeError);
    expect(() => proxy.getInEdges()).toThrow(TypeError);
  });

  it("proxies every edge of an anchor", () => {
    const anchor = new Anchor();
    const edge = { name: "edge" };
    anchor._outEdges = [edge];
    anchor._inEdges = [];
    const proxy = new PDFExportProxy(null as never, null as never, {}, null as never).proxy(anchor);
    const out = proxy.getOutEdges() as { name: string }[];
    expect(out).toHaveLength(1);
    expect(out[0]).not.toBe(edge);
    expect(out[0]?.name).toBe("edge");
    expect(proxy.getInEdges()).toEqual([]);
  });
});

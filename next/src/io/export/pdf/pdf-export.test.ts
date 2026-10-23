// GPDFExport (old module 1406) beyond the recorded documents: the raster
// size guard of isSupported, slices (their page with the slice's
// background, restored afterwards), progress and the missing callback.
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
import type { Page } from "../../../engine/scene/page.ts";
import "../../../engine/style/stylable.ts";
import { PDFExport } from "./pdf-export.ts";

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
});

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

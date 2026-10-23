import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Rect } from "../math/rect.ts";
import { Bitmap } from "./bitmap.ts";
import { PaintCanvas } from "./paint-canvas.ts";
import {
  FakeCanvas,
  FakeImage,
  installFakeCanvas,
  type FakeContext2D,
} from "./testing/fake-canvas.ts";

let uninstall: () => void;
beforeAll(() => {
  uninstall = installFakeCanvas();
});
afterAll(() => uninstall());

/** An 8 x 6 canvas with an opaque 4 x 3 block at 2, 1. */
function source(): FakeCanvas {
  const canvas = new FakeCanvas();
  canvas.width = 8;
  canvas.height = 6;
  const context = canvas.getContext("2d") as FakeContext2D;
  context.fillStyle = "#c80000";
  context.fillRect(2, 1, 4, 3);
  return canvas;
}

const pixel = (bitmap: Bitmap, x: number, y: number) => Array.from(bitmap.getPixelValue(x, y));

describe("Bitmap", () => {
  it("wraps canvases, contexts and paint canvases without copying", () => {
    const canvas = source();
    expect(new Bitmap(canvas as unknown as HTMLCanvasElement).getHTMLElement()).toBe(canvas);
    const context = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
    expect(new Bitmap(context).getHTMLElement()).toBe(canvas);
    const paint = new PaintCanvas(false, true);
    expect(paint.getBitmap().getHTMLElement()).toBe(paint._canvasContext.canvas);
    const recorded = new PaintCanvas(true);
    expect(recorded.getBitmap().getHTMLElement()).toBe(recorded._canvasContext.canvas);
    const sized = new Bitmap(12, 7);
    expect([sized.getWidth(), sized.getHeight()]).toEqual([12, 7]);
  });

  it("can't be made from an image (the old one-argument drawImage)", () => {
    const image = new FakeImage();
    image.naturalWidth = 4;
    image.naturalHeight = 4;
    // The fake accepts one argument, so check for the call that fails in a browser.
    const bitmap = new Bitmap(image as unknown as HTMLImageElement);
    const log = (
      (bitmap.getHTMLElement() as unknown as FakeCanvas).getContext("2d") as FakeContext2D
    ).log;
    expect(log.filter((entry) => entry.startsWith("drawImage"))).toEqual([
      "drawImage([object Object])",
    ]);
    expect([bitmap.getWidth(), bitmap.getHeight()]).toEqual([4, 4]);
  });

  it("clamps pixel reads to 0..size", () => {
    const bitmap = new Bitmap(source() as unknown as HTMLCanvasElement);
    expect(pixel(bitmap, 2, 1)).toEqual([200, 0, 0, 255]);
    expect(pixel(bitmap, -5, -5)).toEqual([0, 0, 0, 0]);
    expect(pixel(bitmap, 100, 100)).toEqual([0, 0, 0, 0]);
  });

  it("clones an area, or nothing for an empty one", () => {
    const bitmap = new Bitmap(source() as unknown as HTMLCanvasElement);
    const part = bitmap.clone(new Rect(1, 1, 4, 3)) as Bitmap;
    expect([part.getWidth(), part.getHeight()]).toEqual([4, 3]);
    expect(pixel(part, 0, 0)).toEqual([0, 0, 0, 0]);
    expect(pixel(part, 1, 0)).toEqual([200, 0, 0, 255]);
    expect(bitmap.clone(new Rect(0, 0, 0, 3))).toBeNull();
  });

  it("resizes around the anchor side", () => {
    const centered = new Bitmap(source() as unknown as HTMLCanvasElement);
    centered.resize(12, 4, Rect.Side.CENTER);
    expect([centered.getWidth(), centered.getHeight()]).toEqual([12, 4]);
    // Moved right by 2 and up by 1.
    expect(pixel(centered, 4, 0)).toEqual([200, 0, 0, 255]);
    expect(pixel(centered, 3, 0)).toEqual([0, 0, 0, 0]);
    const right = new Bitmap(source() as unknown as HTMLCanvasElement);
    right.resize(12, 4, Rect.Side.BOTTOM_RIGHT);
    // Moved right by 4 and up by 2.
    expect(pixel(right, 6, 1)).toEqual([200, 0, 0, 255]);
    expect(pixel(right, 5, 1)).toEqual([0, 0, 0, 0]);
    expect(pixel(right, 6, 2)).toEqual([0, 0, 0, 0]);
  });

  it("trims to the opaque pixels and remembers the offset", () => {
    const bitmap = new Bitmap(source() as unknown as HTMLCanvasElement);
    bitmap.trim();
    expect([bitmap.getWidth(), bitmap.getHeight()]).toEqual([4, 3]);
    expect([bitmap.getOffset().getX(), bitmap.getOffset().getY()]).toEqual([2, 1]);
    expect(pixel(bitmap, 0, 0)).toEqual([200, 0, 0, 255]);
  });

  it("modifies the pixels of an area and writes them back", () => {
    const bitmap = new Bitmap(source() as unknown as HTMLCanvasElement);
    const seen: unknown[] = [];
    bitmap.modifyPixels(
      (data, width, height, argument) => {
        seen.push(width, height, argument);
        for (let i = 0; i < data.length; i += 4) data[i + 1] = 255;
      },
      "x",
      new Rect(0, 0, 4, 6),
    );
    expect(seen).toEqual([4, 6, "x"]);
    expect(pixel(bitmap, 3, 0)).toEqual([0, 255, 0, 0]);
    expect(pixel(bitmap, 4, 0)).toEqual([0, 0, 0, 0]);
    expect(bitmap.modifyPixels(() => {}, null, new Rect(0, 0, 0, 1))).toBeNull();
  });

  it("encodes with the DPI patched in only when it isn't 72", async () => {
    const canvas = source();
    canvas.blobBytes = new Uint8Array([
      255, 216, 255, 224, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ]);
    const globals = globalThis as unknown as Record<string, unknown>;
    // FileReader doesn't exist in Node.
    globals.FileReader = class {
      onload: ((event: { target: { result: ArrayBuffer } }) => void) | null = null;
      readAsArrayBuffer(blob: Blob) {
        void blob.arrayBuffer().then((result) => this.onload?.({ target: { result } }));
      }
    };
    try {
      const bitmap = new Bitmap(canvas as unknown as HTMLCanvasElement);
      const read = (type: string, dpi?: number) =>
        new Promise<number[]>((resolve) => {
          bitmap.toImageBuffer(
            type,
            (buffer) => resolve(Array.from(new Uint8Array(buffer))),
            0.9,
            dpi,
          );
        });
      expect((await read("jpg"))[13]).toBe(0);
      const patched = await read("jpg", 144);
      expect(patched.slice(13, 18)).toEqual([1, 0, 144, 0, 144]);
      bitmap.setDPI(96);
      expect((await read("image/jpeg")).slice(13, 18)).toEqual([1, 0, 96, 0, 96]);
    } finally {
      delete globals.FileReader;
    }
  });

  it("says what it is", () => {
    expect(new Bitmap(1, 1).toString()).toBe("[Object GBitmap]");
    expect(Bitmap.ImageType).toEqual({ PNG: "image/png", JPEG: "image/jpeg" });
  });
});

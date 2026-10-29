// A bitmap layer is finished when its image loads, and its image data is
// read from the zip the import closes when it calls back. So the import
// waits for the images that are loading before it calls back
// (SketchFile.bitmapLoading, _whenBitmapsSettled).
import { afterEach, describe, expect, it, vi } from "vitest";
import { Image } from "../../../engine/scene/image.ts";
import type { ImageStatusEvent } from "../../../engine/scene/image.ts";
import { SketchBitmap } from "./sketch-bitmap.ts";
import type { SketchLayerData } from "./sketch-data.ts";
import { SketchFile } from "./sketch-file.ts";

afterEach(() => {
  vi.useRealTimers();
});

const pending = (): Promise<Blob> => new Promise<Blob>(() => {});

function makeBitmap(file: SketchFile, reference: () => Promise<Blob> = pending): SketchBitmap {
  const data = { _class: "bitmap", image: { _ref: "images/a.png" } } as unknown as SketchLayerData;
  const bitmap = new SketchBitmap(data, file, null);
  // The image data comes from the test, not from a zip.
  bitmap._getReference = reference;
  return bitmap;
}

function status(bitmap: SketchBitmap, value: number): void {
  bitmap._imageStatusEvent({ image: bitmap._node, status: value } as unknown as ImageStatusEvent);
}

function loading(file: SketchFile): boolean {
  return file._loadingBitmaps.size > 0;
}

describe("SketchBitmap", () => {
  it("counts as loading from parse until its image fails, loads or waits for a scene", () => {
    const file = new SketchFile(new Blob([]));
    const first = makeBitmap(file);
    const second = makeBitmap(file);
    expect(loading(file)).toBe(false);
    first.parse();
    second.parse();
    expect(loading(file)).toBe(true);
    status(first, Image.ImageStatus.Error);
    expect(loading(file)).toBe(true);
    // Outside a scene the image waits (Delayed) and can't load yet.
    status(second, Image.ImageStatus.Delayed);
    expect(loading(file)).toBe(false);
    // Attached to the import's scene, it loads.
    status(second, Image.ImageStatus.Resolving);
    expect(loading(file)).toBe(true);
    status(second, Image.ImageStatus.Loading);
    expect(loading(file)).toBe(true);
  });

  // A missing zip entry or a failed read settles the bitmap through
  // _settled (parse wires it; the importer's own promise still rejects
  // unhandled there, as before, which a test run would count as an error).
  it("counts a clone made before the image data arrived until the data fails", () => {
    const file = new SketchFile(new Blob([]));
    const bitmap = makeBitmap(file);
    bitmap.parse();
    const copy = bitmap.clone();
    expect(file._loadingBitmaps.has(copy._node)).toBe(true);
    bitmap._settled();
    expect(loading(file)).toBe(false);
  });

  it("doesn't count a clone made after the image data arrived", () => {
    const file = new SketchFile(new Blob([]));
    const bitmap = makeBitmap(file);
    bitmap.parse();
    bitmap._node.setProperty("url", "data:image/png;base64,");
    status(bitmap, Image.ImageStatus.Delayed);
    const copy = bitmap.clone();
    expect(file._loadingBitmaps.has(copy._node)).toBe(false);
  });
});

describe("SketchFile._whenBitmapsSettled", () => {
  it("calls back right away when no image is loading", () => {
    const file = new SketchFile(new Blob([]));
    const callback = vi.fn();
    file._whenBitmapsSettled(callback);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("calls back once the last loading image settles", () => {
    const file = new SketchFile(new Blob([]));
    const a = {};
    const b = {};
    file.bitmapLoading(a);
    file.bitmapLoading(b);
    const callback = vi.fn();
    file._whenBitmapsSettled(callback);
    file.bitmapSettled(a);
    expect(callback).not.toHaveBeenCalled();
    file.bitmapSettled(b);
    expect(callback).toHaveBeenCalledTimes(1);
    // Later images don't call back again.
    file.bitmapLoading(a);
    file.bitmapSettled(a);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("calls back after BITMAP_WAIT when an image never settles", () => {
    vi.useFakeTimers();
    const file = new SketchFile(new Blob([]));
    file.bitmapLoading({});
    const callback = vi.fn();
    file._whenBitmapsSettled(callback);
    vi.advanceTimersByTime(SketchFile.BITMAP_WAIT - 1);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });
});

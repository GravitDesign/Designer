import { afterEach, describe, expect, it, vi } from "vitest";
import { FakeFileReader } from "./dom.testing.ts";
import { ExtensionStorage, ExtensionStorageItem } from "./extension-storage.ts";
import { StorageImageData } from "./image-data.ts";
import { Progress } from "./progress.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ExtensionStorage", () => {
  it("keeps the written bytes in memory and reports its extension", () => {
    const item = new ExtensionStorageItem("PDF");
    expect(item.getStorage()).toBeInstanceOf(ExtensionStorage);
    expect(item.getExtension()).toBe("PDF");
    const done = vi.fn();
    item.write(new Uint8Array([1, 2, 3]), done);
    expect(done).toHaveBeenCalledOnce();
    const seen: (number[] | null)[] = [];
    item.read((d) => seen.push(d ? [...d] : null));
    item.release();
    item.read((d) => seen.push(d ? [...d] : null));
    expect(seen).toEqual([[1, 2, 3], null]);
  });
});

describe("StorageImageData", () => {
  it("round-trips a blob through its data URL", async () => {
    vi.stubGlobal("FileReader", FakeFileReader);
    const data = await StorageImageData.fromBlob(
      new Blob([new Uint8Array([255, 0, 7])], { type: "image/jpeg" }),
    );
    expect(data.getMimeType()).toBe("image/jpeg");
    expect(data.getImageAsDataURL()).toBe("data:image/jpeg;base64,/wAH");
    expect(data.getImageAsBase64()).toBe("/wAH");
    expect([...data.getImageAsBinary()]).toEqual([255, 0, 7]);
    const blob = data.getImageAsBlob();
    expect(blob.type).toBe("image/jpeg");
    expect([...new Uint8Array(await blob.arrayBuffer())]).toEqual([255, 0, 7]);
  });
});

describe("Progress", () => {
  it("interpolates between start and end", () => {
    expect(Progress.calculateProgress(10, 50, 0.25)).toBe(20);
    expect(Progress.calculateProgress(50, 10, 0.5)).toBe(30);
  });
});

import { afterEach, describe, expect, it } from "vitest";
import { baseConfig } from "../file-formats.ts";
import type { Storage } from "../storage/storage.ts";
import { Container, Runtime, type RuntimeName } from "./container.ts";
import { setDesigner } from "./globals.ts";

class TestContainer extends Container {
  getRuntime(): RuntimeName {
    return Runtime.Browser;
  }

  getStorage(): Storage {
    return null as unknown as Storage;
  }

  estimate(): number {
    return this._estimatingMemoryUsage();
  }
}

/** A designer whose documents have these sizes; null is a document without an item. */
function useDocuments(sizes: (number | null)[]): void {
  setDesigner({
    getDocuments: () =>
      sizes.map((size) => ({
        getStorageItem: () => (null === size ? null : { documentRealFileSize: size }),
      })),
  } as never);
}

afterEach(() => {
  setDesigner(null);
});

describe("Container._estimatingMemoryUsage (module 85)", () => {
  it("adds up the sizes of every open document (BUG-144)", () => {
    useDocuments([100, 200]);
    expect(new TestContainer().estimate()).toBe(
      300 * baseConfig.FILE_SIZE_TO_RAM_COEFFCIENT + baseConfig.MIN_JS_HEAP_SIZE,
    );
  });

  it("counts a document without an item as 0, also after a saved one (BUG-144)", () => {
    useDocuments([100, null, 50]);
    expect(new TestContainer().estimate()).toBe(
      150 * baseConfig.FILE_SIZE_TO_RAM_COEFFCIENT + baseConfig.MIN_JS_HEAP_SIZE,
    );
  });
});

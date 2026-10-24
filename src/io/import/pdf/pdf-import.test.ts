import { afterEach, describe, expect, it, vi } from "vitest";
import type { FontManager } from "../../../engine/text/fonts/font-manager.ts";

const terminate = vi.fn();
let loading: Promise<unknown> = Promise.resolve(null);

vi.mock("./pdfjs.ts", () => ({
  getPdfJs: () => ({}),
  getDocument: () => ({
    task: {
      then: (onFulfilled: (document: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
        loading.then(onFulfilled, onRejected),
    },
    terminate,
  }),
}));

const { PDFImport } = await import("./pdf-import.ts");

const fontManager = {
  addEventListener: () => {},
  removeEventListener: () => {},
} as unknown as FontManager;

/** The import's callback arguments, or "pending" after 200 ms. */
function importPdf(): Promise<unknown[] | "pending"> {
  return Promise.race([
    new Promise<unknown[]>((resolve) => {
      PDFImport.import(new Uint8Array(4), {}, fontManager, (...args) => resolve(args));
    }),
    new Promise<"pending">((resolve) => setTimeout(() => resolve("pending"), 200)),
  ]);
}

afterEach(() => {
  terminate.mockClear();
});

describe("PDFImport.import for a PDF pdf.js can't open (BUG-102)", () => {
  it("calls back with the error and ends the worker when the document is rejected", async () => {
    const error = new Error("Invalid PDF structure.");
    loading = Promise.reject(error);
    const result = await importPdf();
    expect(result).toEqual([error]);
    expect(terminate).toHaveBeenCalledTimes(1);
  });

  it("calls back with the error when a page can't be loaded", async () => {
    const error = new Error("Invalid page request.");
    loading = Promise.resolve({
      numPages: 1,
      getPage: () => Promise.reject(error),
    });
    const result = await importPdf();
    expect(result).toEqual([error]);
    expect(terminate).toHaveBeenCalledTimes(1);
  });
});

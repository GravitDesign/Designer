import pako from "pako";
import { describe, expect, it, vi } from "vitest";
import { FontManager } from "../../../engine/text/fonts/font-manager.ts";
import { SVGImport } from "./svg-import.ts";

describe("SVGImport.import of a Blob (BUG-084)", () => {
  /** FileReader as far as the importer uses it, on top of Blob's own readers. */
  class FakeFileReader {
    result: unknown = null;
    onload: (() => void) | null = null;
    readAsArrayBuffer(blob: Blob) {
      void blob.arrayBuffer().then((buffer) => {
        this.result = buffer;
        this.onload?.();
      });
    }
    readAsText(blob: Blob) {
      void blob.text().then((value) => {
        this.result = value;
        this.onload?.();
      });
    }
  }

  async function sources(blob: Blob): Promise<unknown[]> {
    vi.stubGlobal("FileReader", FakeFileReader);
    const spy = vi.spyOn(SVGImport, "import");
    try {
      // Node has no DOMParser, so the text ends in an error; what counts
      // is the text the importer got to parse.
      await new Promise<void>((resolve) =>
        SVGImport.import(blob, {}, new FontManager(), () => resolve()),
      );
      return spy.mock.calls.map((call) => call[0]);
    } finally {
      vi.unstubAllGlobals();
    }
  }

  const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>';

  it("unpacks a gzipped Blob (.svgz) before parsing it", async () => {
    const calls = await sources(new Blob([pako.gzip(svg) as BlobPart]));
    expect(calls[calls.length - 1]).toBe(svg);
  });

  it("still reads a plain Blob as text", async () => {
    const calls = await sources(new Blob([svg], { type: "image/svg+xml" }));
    expect(calls[calls.length - 1]).toBe(svg);
  });
});

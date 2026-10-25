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

  it("reads a plain Blob in one FileReader round, like the old import", async () => {
    // A second round lets a picture dropped together with the SVG finish
    // first, which turns the order of the dropped files around.
    const reads = vi.fn();
    class CountingReader extends FakeFileReader {
      override readAsArrayBuffer(blob: Blob) {
        reads();
        super.readAsArrayBuffer(blob);
      }
      override readAsText(blob: Blob) {
        reads();
        super.readAsText(blob);
      }
    }
    vi.stubGlobal("FileReader", CountingReader);
    try {
      await new Promise<void>((resolve) =>
        SVGImport.import(new Blob([svg]), {}, new FontManager(), () => resolve()),
      );
    } finally {
      vi.unstubAllGlobals();
    }
    expect(reads).toHaveBeenCalledTimes(1);
  });

  it("reads a UTF-16 Blob with a byte order mark", async () => {
    const utf16 = new Uint8Array(2 + svg.length * 2);
    utf16.set([0xff, 0xfe]);
    for (let i = 0; i < svg.length; i++) utf16[2 + 2 * i] = svg.charCodeAt(i);
    const calls = await sources(new Blob([utf16]));
    expect(calls[calls.length - 1]).toBe(svg);
  });
});

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { describe, expect, it } from "vitest";
import { GVDESIGN_FILE_TYPE, gzipJson, injectPreview, unzipData } from "./format.ts";

const CORPUS = path.resolve(import.meta.dirname, "../../../parity/corpus");
const corpusFile = (name: string): Uint8Array =>
  new Uint8Array(fs.readFileSync(path.join(CORPUS, "files", `${name}.gvdesign`)));
const edgeFile = (name: string): Uint8Array =>
  new Uint8Array(fs.readFileSync(path.join(CORPUS, "edge", "files", `${name}.gvdesign`)));

describe("gvdesign container", () => {
  it("gzips exactly like the old app's save (pako 1.0.11, level 9)", () => {
    // The corpus files were written by the old app's File > Download File.
    for (const name of ["shapes-rectangles", "text-runs", "images"]) {
      const bytes = corpusFile(name);
      const json = unzipData(bytes) as string;
      expect(json.startsWith('{"_preview":"data:image/jpeg;base64,')).toBe(true);
      expect(Buffer.from(gzipJson(json)).equals(Buffer.from(bytes))).toBe(true);
    }
  });

  it("writes a plain gzip header: no name, mtime 0, XFL 2 (best), OS 3", () => {
    const bytes = gzipJson('{"@":"scene"}');
    expect([...bytes.subarray(0, 10)]).toEqual([0x1f, 0x8b, 8, 0, 0, 0, 0, 0, 2, 3]);
    expect(zlib.gunzipSync(bytes).toString("utf8")).toBe('{"@":"scene"}');
  });

  it("reads uncompressed JSON as UTF-8", () => {
    const bytes = edgeFile("uncompressed");
    expect(bytes[0]).toBe("{".charCodeAt(0));
    expect(unzipData(bytes)).toBe(Buffer.from(bytes).toString("utf8"));
    expect(unzipData(new TextEncoder().encode('{"name":"Grüße"}'))).toBe('{"name":"Grüße"}');
  });

  it("decodes UTF-8 inside gzip", () => {
    const text = '{"name":"Grüße ✓ 🎨"}';
    expect(unzipData(new Uint8Array(zlib.gzipSync(text)))).toBe(text);
  });

  it("puts the preview first and leaves other JSON alone", () => {
    expect(injectPreview('{"@":"scene"}', "data:image/jpeg;base64,AA==")).toBe(
      '{"_preview":"data:image/jpeg;base64,AA==","@":"scene"}',
    );
    expect(injectPreview('{"@":"scene"}', null)).toBe('{"@":"scene"}');
    expect(injectPreview("[1]", "data:x")).toBe("[1]");
    expect(injectPreview('{"a":1}', 'data:"q"')).toBe('{"_preview":"data:\\"q\\"","a":1}');
  });

  it("keeps the old file-type entry", () => {
    expect(GVDESIGN_FILE_TYPE.ext).toBe("gvdesign");
    expect(GVDESIGN_FILE_TYPE.mime).toBe("application/gravit+design");
  });
});

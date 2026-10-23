import { crc32 } from "node:zlib";
import { describe, expect, it } from "vitest";
import { PngChunk, PngChunks } from "./png-chunks.ts";
import { JpegDpi } from "./png-dpi.ts";

/** A minimal PNG: signature, IHDR, IDAT, IEND (contents don't matter here). */
function png(): ArrayBuffer {
  const chunk = (type: string, data: number[]) =>
    Array.from(new PngChunk(data.length, type, new Uint8Array(data)).getBuffer());
  const bytes = [137, 80, 78, 71, 13, 10, 26, 10]
    .concat(chunk("IHDR", [0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0]))
    .concat(chunk("IDAT", [1, 2, 3]))
    .concat(chunk("IEND", []));
  return new Uint8Array(bytes).buffer;
}

describe("PngChunk", () => {
  it("writes length, type, data and the CRC of type and data", () => {
    const buffer = new PngChunk(3, "IDAT", new Uint8Array([1, 2, 3])).getBuffer();
    expect(Array.from(buffer.slice(0, 11))).toEqual([0, 0, 0, 3, 73, 68, 65, 84, 1, 2, 3]);
    const crc = new DataView(buffer.buffer).getUint32(11);
    expect(crc).toBe(crc32(new Uint8Array([73, 68, 65, 84, 1, 2, 3])));
  });
});

describe("PngChunks.setDPI", () => {
  it("inserts a pHYs chunk in pixels per metre in front of IDAT", async () => {
    const chunks = new PngChunks(png());
    const idat = chunks.findChunk("IDAT", 8);
    expect(idat).toBe(8 + 25);
    chunks.setDPI(144);
    const bytes = new Uint8Array(await chunks.getBlob().arrayBuffer());
    const view = new DataView(bytes.buffer);
    expect(String.fromCharCode(...bytes.slice(idat + 4, idat + 8))).toBe("pHYs");
    expect(view.getUint32(idat)).toBe(9);
    expect(view.getUint32(idat + 8)).toBe(Math.floor(144 / 0.0254));
    expect(view.getUint32(idat + 12)).toBe(Math.floor(144 / 0.0254));
    expect(bytes[idat + 16]).toBe(1);
    expect(view.getUint32(idat + 17)).toBe(crc32(bytes.slice(idat + 4, idat + 17)));
    expect(String.fromCharCode(...bytes.slice(idat + 25, idat + 29))).toBe("IDAT");
  });

  it("runs past the end (RangeError) when there is no IDAT", () => {
    const bytes = new Uint8Array(png()).slice(0, 33);
    expect(() => new PngChunks(bytes.buffer).setDPI(300)).toThrow(RangeError);
  });
});

describe("JpegDpi.setDPI", () => {
  it("writes inch units and the density into a JFIF header", async () => {
    const bytes = new Uint8Array(20);
    bytes.set([255, 216, 255, 224]);
    const jpeg = new JpegDpi(bytes.buffer);
    jpeg.setDPI(300);
    const out = new DataView(await jpeg.getBlob().arrayBuffer());
    expect([out.getUint8(13), out.getUint16(14), out.getUint16(16)]).toEqual([1, 300, 300]);
  });

  it("leaves other files alone", () => {
    const bytes = new Uint8Array(20);
    bytes.set([255, 216, 255, 225]);
    new JpegDpi(bytes.buffer).setDPI(300);
    expect(Array.from(bytes.slice(13, 18))).toEqual([0, 0, 0, 0, 0]);
  });
});

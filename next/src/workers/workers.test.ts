import { inflate } from "pako";
import { describe, expect, it } from "vitest";
import type { MessageWorker, PromiseFactory } from "../io/export/jpeg-encoder.ts";
import { ColorSpaces } from "../io/export/pdf/color-spaces.ts";
import { Raster, type RasterColorSpace } from "./raster.ts";
import { ZipEncoder } from "./zip-encoder.ts";
import recorded from "./workers.old-outputs.json" with { type: "json" };

const spaces = ColorSpaces as unknown as Record<string, RasterColorSpace>;

const factory: PromiseFactory = { createPromise: (executor) => new Promise(executor) };

/** A fake PDF export worker that answers "raster" requests like the real one. */
function rasterWorker(log: Record<string, unknown>[]): MessageWorker {
  const listeners: Record<string, ((event: unknown) => void)[]> = { message: [], error: [] };
  return {
    postMessage(message: Record<string, unknown>) {
      log.push(message);
      const range = message.range as { start: number; end: number };
      const colorspace = spaces[message.colorspace as string] as RasterColorSpace;
      const image = new Uint8ClampedArray((range.end - range.start) * colorspace.length);
      const mask = message.hasMask ? null : new Uint8ClampedArray(range.end - range.start);
      const transparent = new Raster().raster(
        message.dataBuffer as ArrayBuffer,
        colorspace,
        image,
        mask,
      );
      const answer = {
        uuid: message.uuid,
        index: message.index,
        command: "raster",
        imageBuffer: image.buffer,
        smaskBuffer: mask ? mask.buffer : null,
        range,
        hasTransparency: transparent,
      };
      // Answer out of order: the last worker first.
      setTimeout(
        () => {
          for (const l of [...(listeners.message ?? [])]) l({ data: answer });
        },
        10 - (message.index as number),
      );
    },
    addEventListener(type: string, l: (event: unknown) => void) {
      listeners[type]?.push(l);
    },
    removeEventListener(type: string, l: (event: unknown) => void) {
      listeners[type] = (listeners[type] ?? []).filter((x) => x !== l);
    },
  } as unknown as MessageWorker;
}

describe("Raster.raster", () => {
  for (const c of recorded.raster) {
    it(`matches the old rasterizer: ${c.colorspace}, mask ${c.mask}, out ${c.outLength}`, () => {
      const out = new Uint8ClampedArray(c.outLength);
      const mask = c.mask ? new Uint8ClampedArray(c.input.length) : null;
      const transparent = new Raster().raster(
        new Uint32Array(c.input).buffer,
        spaces[c.colorspace] as RasterColorSpace,
        out,
        mask,
      );
      expect(transparent).toBe(c.transparent);
      expect(Array.from(out)).toEqual(c.output);
      expect(mask && Array.from(mask)).toEqual(c.maskOut);
    });
  }
});

describe("Raster.concurrencyRaster", () => {
  it("splits into slices of 4 pixels per worker and joins the answers in order", async () => {
    const width = 7;
    const height = 3;
    const pixels = new Uint32Array(width * height);
    for (let i = 0; i < pixels.length; i++) pixels[i] = (0x80000000 | (i * 0x010203)) >>> 0;
    const log: Record<string, unknown>[] = [];
    const workers = [rasterWorker(log), rasterWorker(log)];
    const [image, mask] = await new Raster().concurrencyRaster(
      factory,
      workers,
      pixels.slice().buffer,
      width,
      height,
      ColorSpaces.RGB,
      false,
    );
    // 21 pixels on 2 workers: slices of 8, the last gets the 5 left over too.
    expect(log.map((m) => m.range)).toEqual([
      { start: 0, end: 8 },
      { start: 8, end: 21 },
    ]);
    expect(log.map((m) => m.colorspace)).toEqual(["RGB", "RGB"]);
    const expected = new Uint8ClampedArray(width * height * 3);
    // The remainder pixels are never copied into the last slice: they stay 0.
    new Raster().raster(pixels.slice(0, 16).buffer, ColorSpaces.RGB, expected);
    expect(Array.from(image)).toEqual(Array.from(expected));
    expect(mask).not.toBeNull();
    expect(Array.from((mask as Uint8ClampedArray).slice(0, 16))).toEqual(new Array(16).fill(128));
    expect(Array.from((mask as Uint8ClampedArray).slice(16))).toEqual([0, 0, 0, 0, 0]);
  });

  it("returns no mask when every pixel is opaque", async () => {
    const pixels = new Uint32Array(8).fill(0xff102030);
    const [, mask] = await new Raster().concurrencyRaster(
      factory,
      [rasterWorker([])],
      pixels.buffer,
      4,
      2,
      ColorSpaces.RGBA,
      false,
    );
    expect(mask).toBeNull();
  });
});

describe("ZipEncoder", () => {
  it("deflates like the old encoder (zlib format, pako default level)", () => {
    for (const c of recorded.zip) {
      const text =
        typeof c.input === "string" ? c.input : (c.input.repeat as string).repeat(c.input.n);
      const out = new ZipEncoder().encode(new TextEncoder().encode(text).buffer);
      expect(Buffer.from(out).toString("base64")).toBe(c.output);
      expect(new TextDecoder().decode(inflate(out))).toBe(text);
    }
  });
});

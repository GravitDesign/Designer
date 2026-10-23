import { inflate } from "pako";
import { describe, expect, it } from "vitest";
import { JpegEncoder, type MessageWorker, type PromiseFactory } from "../io/export/jpeg-encoder.ts";
import { ColorSpaces } from "../io/export/pdf/color-spaces.ts";
import { handlePDFWorkerRequest } from "./pdf-export/handler.ts";
import type { PDFWorkerRequest } from "./pdf-export/protocol.ts";
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

/**
 * A PDF export worker that runs the real worker handler in this thread
 * and answers asynchronously. A request the handler throws on comes back
 * as an "error" event, as from a real Worker. It keeps its listeners and
 * what was transferred, so tests can check both.
 */
class HandlerWorker {
  readonly listeners: Record<string, ((event: unknown) => void)[]> = { message: [], error: [] };
  readonly posted: { message: Record<string, unknown>; transfer: unknown[] }[] = [];

  postMessage(message: Record<string, unknown>, transfer: unknown[] = []): void {
    this.posted.push({ message, transfer });
    setTimeout(() => {
      try {
        handlePDFWorkerRequest(message as unknown as PDFWorkerRequest, (answer) => {
          for (const l of [...(this.listeners.message ?? [])]) l({ data: answer });
        });
      } catch (error) {
        for (const l of [...(this.listeners.error ?? [])]) l(error);
      }
    }, 0);
  }

  addEventListener(type: string, l: (event: unknown) => void): void {
    this.listeners[type]?.push(l);
  }

  removeEventListener(type: string, l: (event: unknown) => void): void {
    this.listeners[type] = (this.listeners[type] ?? []).filter((x) => x !== l);
  }

  /** Sends `data` to the message listeners, as an answer from the worker. */
  answer(data: unknown): void {
    for (const l of [...(this.listeners.message ?? [])]) l({ data });
  }

  listenerCount(): number {
    return (this.listeners.message?.length ?? 0) + (this.listeners.error?.length ?? 0);
  }
}

const asWorker = (worker: HandlerWorker): MessageWorker => worker as unknown as MessageWorker;

describe("Raster.concurrencyRaster remainder (kept old bug)", () => {
  // See "Concurrent PDF raster drops the last pixels" in QUESTIONS.md.
  it("leaves the last pixels of an opaque 101x101 image transparent black on 4 workers", async () => {
    const width = 101;
    const height = 101;
    const pixels = new Uint32Array(width * height).fill(0xff336699);
    const workers = [0, 1, 2, 3].map(() => new HandlerWorker());
    const [image, mask] = await new Raster().concurrencyRaster(
      factory,
      workers.map(asWorker),
      pixels.slice().buffer,
      width,
      height,
      ColorSpaces.RGB,
      false,
    );
    // 10201 pixels: slices of 2548, the last range takes the 9 left over.
    expect(workers.map((w) => w.posted[0]?.message.range)).toEqual([
      { start: 0, end: 2548 },
      { start: 2548, end: 5096 },
      { start: 5096, end: 7644 },
      { start: 7644, end: 10201 },
    ]);
    const kept = 10192;
    const rgb = Array.from(image);
    expect(rgb.slice(0, kept * 3)).toEqual(
      Array.from({ length: kept }, () => [0x99, 0x66, 0x33]).flat(),
    );
    expect(rgb.slice(kept * 3)).toEqual(new Array(27).fill(0));
    // Their alpha 0 makes the image count as transparent, so a mask comes back.
    expect(mask).not.toBeNull();
    const alpha = Array.from(mask as Uint8ClampedArray);
    expect(alpha.slice(0, kept).every((a) => a === 255)).toBe(true);
    expect(alpha.slice(kept)).toEqual(new Array(9).fill(0));
  });

  it("returns no mask for the same opaque image when the pixels divide evenly", async () => {
    const pixels = new Uint32Array(100 * 100).fill(0xff336699);
    const [, mask] = await new Raster().concurrencyRaster(
      factory,
      [0, 1, 2, 3].map(() => asWorker(new HandlerWorker())),
      pixels.buffer,
      100,
      100,
      ColorSpaces.RGB,
      false,
    );
    expect(mask).toBeNull();
  });
});

describe("worker error paths", () => {
  it("Raster: a worker's error event rejects and removes its listeners", async () => {
    // 3 pixels on 2 workers: slice size 0, so the first worker gets the
    // empty range {0, 0} with an empty buffer and the handler throws.
    const workers = [new HandlerWorker(), new HandlerWorker()];
    const result = new Raster().concurrencyRaster(
      factory,
      workers.map(asWorker),
      new Uint32Array(3).fill(0xffffffff).buffer,
      3,
      1,
      ColorSpaces.RGB,
      false,
    );
    await expect(result).rejects.toThrow('Empty image "dataBuffer"');
    expect(workers.map((w) => w.posted[0]?.message.range)).toEqual([
      { start: 0, end: 0 },
      { start: 0, end: 3 },
    ]);
    // The failed worker dropped its listeners at once; the other one when
    // its answer came.
    expect(workers.map((w) => w.listenerCount())).toEqual([0, 2]);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(workers.map((w) => w.listenerCount())).toEqual([0, 0]);
  });

  it("JpegEncoder: a worker's error event rejects and removes its listeners", async () => {
    const worker = new HandlerWorker();
    const result = new JpegEncoder().concurrenyEncode(
      factory,
      [asWorker(worker)],
      new ArrayBuffer(0),
      2,
      2,
      JpegEncoder.ColorSpace.RGBA,
      80,
    );
    await expect(result).rejects.toThrow('Empty rgba "buffer"');
    expect(worker.listenerCount()).toBe(0);
  });

  it("ZipEncoder: a worker's error event rejects and removes its listeners", async () => {
    const worker = new HandlerWorker();
    const result = new ZipEncoder().concurrencyEncode(
      factory,
      [asWorker(worker)],
      new ArrayBuffer(0),
    );
    await expect(result).rejects.toThrow('Empty ZIP "buffer"');
    expect(worker.listenerCount()).toBe(0);
  });
});

describe("ZipEncoder.concurrencyEncode", () => {
  it("posts to the first worker with the buffer transferred and takes only its own answer", async () => {
    const first = new HandlerWorker();
    const second = new HandlerWorker();
    const text = "hello hello hello hello";
    const buffer = new TextEncoder().encode(text).buffer;
    const result = new ZipEncoder().concurrencyEncode(
      factory,
      [asWorker(first), asWorker(second)],
      buffer,
    );
    const posted = first.posted[0] as (typeof first.posted)[number];
    expect(posted.message).toMatchObject({ command: "zipencoder", buffer });
    expect(posted.transfer).toEqual([buffer]);
    expect(second.posted).toHaveLength(0);
    // Answers for another request or another command are ignored.
    first.answer({ uuid: "other", command: "zipencoder", buffer: new ArrayBuffer(1) });
    first.answer({ uuid: posted.message.uuid, command: "raster", buffer: new ArrayBuffer(2) });
    expect(first.listenerCount()).toBe(2);
    const out = await result;
    expect(new TextDecoder().decode(inflate(new Uint8Array(out)))).toBe(text);
    expect(Buffer.from(out).toString("base64")).toBe(
      Buffer.from(new ZipEncoder().encode(new TextEncoder().encode(text))).toString("base64"),
    );
    expect(first.listenerCount()).toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import { ByteBuffer } from "./byte-buffer.ts";
import { JpegEncoder, type MessageWorker, type PromiseFactory } from "./jpeg-encoder.ts";
import recorded from "./jpeg-encoder.old-outputs.json" with { type: "json" };

function pixels(base64: string): Uint32Array {
  const bytes = Buffer.from(base64, "base64");
  return new Uint32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
}

function toBase64(bytes: Uint8ClampedArray): string {
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("base64");
}

describe("JpegEncoder.encode", () => {
  for (const c of recorded.jpeg) {
    it(`matches the old encoder: ${c.colorspace} ${c.w}x${c.h} quality ${c.quality}`, () => {
      const colorspace = JpegEncoder.ColorSpace[c.colorspace as "RGBA" | "CMYK"];
      const out = new JpegEncoder().encode(pixels(c.input), c.w, c.h, c.quality, colorspace);
      expect(toBase64(out)).toBe(c.output);
    });
  }

  it("writes JFIF for RGBA and Adobe APP14 for CMYK", () => {
    const buffer = new Uint32Array(64).fill(0xff336699);
    const rgb = new JpegEncoder().encode(buffer, 8, 8, 85, JpegEncoder.ColorSpace.RGBA);
    const cmyk = new JpegEncoder().encode(buffer, 8, 8, 85, JpegEncoder.ColorSpace.CMYK);
    expect(Array.from(rgb.slice(0, 4))).toEqual([0xff, 0xd8, 0xff, 0xe0]);
    expect(String.fromCharCode(...rgb.slice(6, 10))).toBe("JFIF");
    expect(Array.from(cmyk.slice(0, 4))).toEqual([0xff, 0xd8, 0xff, 0xee]);
    expect(String.fromCharCode(...cmyk.slice(6, 11))).toBe("Adobe");
    expect(Array.from(rgb.slice(-2))).toEqual([0xff, 0xd9]);
  });

  it("writes 0 for the second half of each quantization table (old Int32Array(32) quirk)", () => {
    const out = new JpegEncoder().encode(
      new Uint32Array(64),
      8,
      8,
      50,
      JpegEncoder.ColorSpace.RGBA,
    );
    // SOI(2) + APP0(18), then DQT: marker, length, then per table id + 64 values.
    const dqt = 20;
    expect(Array.from(out.slice(dqt, dqt + 4))).toEqual([0xff, 0xdb, 0, 132]);
    const luminance = Array.from(out.slice(dqt + 5, dqt + 5 + 64));
    // Zig-zag position 0 is natural index 0 (16 at quality 50); natural
    // indexes 32..63 are missing and come out as 0.
    expect(luminance[0]).toBe(16);
    const naturalOrder = [
      0, 1, 8, 16, 9, 2, 3, 10, 17, 24, 32, 25, 18, 11, 4, 5, 12, 19, 26, 33, 40, 48, 41, 34, 27,
      20, 13, 6, 7, 14, 21, 28, 35, 42, 49, 56, 57, 50, 43, 36, 29, 22, 15, 23, 30, 37, 44, 51, 58,
      59, 52, 45, 38, 31, 39, 46, 53, 60, 61, 54, 47, 55, 62, 63,
    ];
    naturalOrder.forEach((natural, i) => {
      if (natural >= 32) expect(luminance[i]).toBe(0);
      else expect(luminance[i]).toBeGreaterThan(0);
    });
  });
});

describe("JpegEncoder.concurrenyEncode", () => {
  it("posts a jpegencoder request and resolves with the matching answer", async () => {
    const listeners: Record<string, ((event: unknown) => void)[]> = { message: [], error: [] };
    const posted: Record<string, unknown>[] = [];
    const worker = {
      postMessage(message: Record<string, unknown>) {
        posted.push(message);
        queueMicrotask(() => {
          for (const l of [...(listeners.message ?? [])]) {
            l({ data: { uuid: "other", command: "jpegencoder", buffer: "wrong" } });
            l({ data: { uuid: message.uuid, command: "jpegencoder", buffer: "right" } });
          }
        });
      },
      addEventListener(type: string, l: (event: unknown) => void) {
        listeners[type]?.push(l);
      },
      removeEventListener(type: string, l: (event: unknown) => void) {
        listeners[type] = (listeners[type] ?? []).filter((x) => x !== l);
      },
    } as unknown as MessageWorker;
    const factory: PromiseFactory = { createPromise: (executor) => new Promise(executor) };
    const buffer = new ArrayBuffer(16);
    const result = await new JpegEncoder().concurrenyEncode(
      factory,
      [worker],
      buffer,
      2,
      2,
      JpegEncoder.ColorSpace.CMYK,
      70,
    );
    expect(result).toBe("right");
    expect(posted[0]).toMatchObject({
      command: "jpegencoder",
      width: 2,
      height: 2,
      colorspace: "CMYK",
      quality: 70,
    });
    expect(listeners.message).toHaveLength(0);
  });
});

describe("ByteBuffer", () => {
  it("matches the old buffer: clamping, big-endian words, growth", () => {
    const b = new ByteBuffer(2);
    b.writeByte(1);
    b.writeByte(300);
    b.writeWord(0x1234);
    b.writeArray([5, 6, 7, 8, 9]);
    b.writeByte(-1);
    expect(b.getBytePosition()).toBe(recorded.byteBuffer.position);
    expect(Array.from(b.getBuffer())).toEqual(recorded.byteBuffer.buffer);
    expect(b.getCapacity()).toBe(recorded.byteBuffer.capacity);
  });
});

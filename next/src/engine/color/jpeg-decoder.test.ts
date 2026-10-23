import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { ASSETS_ROOT } from "../../../server/paths.ts";
import { Color } from "./color.ts";
import type { IccHeader } from "./icc-header.ts";
import { IccProfile } from "./icc-profile.ts";
import { JpegDecoder } from "./jpeg-decoder.ts";
import { JpegDecoderFactory } from "./jpeg-decoder-factory.ts";
import oldOutput from "./test-data/old-jpeg-output.json" with { type: "json" };

// test-data/*.jpg are small generated images (baseline, progressive,
// 4:2:0, grayscale, CMYK with Adobe marker and with restart markers).
// old-jpeg-output.json is what the old decoder (chunk.vendor.js module
// 659, run in Node) produced for them.

const here = path.dirname(fileURLToPath(import.meta.url));

interface OldResult {
  colorSpace: string;
  width: number;
  height: number;
  rgba: string;
  firstPixels: number[];
  down: string;
  up: string;
  rgbaWithProfile: string;
  firstPixelsWithProfile: number[];
}
const old = oldOutput as Record<string, OldResult>;

const sha = (data: Uint8Array) => crypto.createHash("sha256").update(data).digest("hex");
const bytes = (name: string) => new Uint8Array(fs.readFileSync(path.join(here, "test-data", name)));

function loadProfile(): IccHeader {
  const file = fs.readFileSync(path.join(ASSETS_ROOT, "data/icc/USWebCoatedSWOP.icc"));
  let profile: IccHeader | null = null;
  new IccProfile().read(
    file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer,
    (p) => (profile = p),
  );
  return profile as unknown as IccHeader;
}

afterEach(() => {
  Color.currentCMYKProfile = null;
});

describe("JpegDecoder", () => {
  const names = Object.keys(old);
  it("has fixtures", () => {
    expect(names).toEqual([
      "cmyk-progressive.jpg",
      "cmyk-restart.jpg",
      "cmyk.jpg",
      "gray.jpg",
      "rgb-420.jpg",
      "rgb-progressive.jpg",
    ]);
  });

  it.each(names)("decodes %s like the old decoder", (name) => {
    const expected = old[name] as OldResult;
    const decoder = new JpegDecoder(bytes(name));
    expect(decoder.getColorSpace()).toBe(expected.colorSpace);
    expect([decoder._decoder.width, decoder._decoder.height]).toEqual([
      expected.width,
      expected.height,
    ]);
    const rgba = decoder.getData();
    expect(Array.from(rgba.slice(0, 16))).toEqual(expected.firstPixels);
    expect(sha(rgba)).toBe(expected.rgba);
    expect(decoder.getData()).toBe(rgba);
    expect(sha(decoder._decoder.getData(10, 7))).toBe(expected.down);
    expect(sha(decoder._decoder.getData(30, 20))).toBe(expected.up);
  });

  it.each(names)("converts %s through the ICC profile like the old decoder", (name) => {
    const expected = old[name] as OldResult;
    Color.currentCMYKProfile = loadProfile();
    const rgba = new JpegDecoder(bytes(name)).getData();
    expect(Array.from(rgba.slice(0, 16))).toEqual(expected.firstPixelsWithProfile);
    expect(sha(rgba)).toBe(expected.rgbaWithProfile);
    if (expected.colorSpace === "cmyk") expect(expected.rgbaWithProfile).not.toBe(expected.rgba);
  });

  it("throws the old messages for bad data", () => {
    expect(() => new JpegDecoder(new Uint8Array([0, 1, 2, 3]))).toThrow("SOI not found");
    expect(() => new JpegDecoder(new Uint8Array([0xff, 0xd8, 0xff, 0x01, 0, 0]))).toThrow(
      "unknown JPEG marker ff01",
    );
  });
});

describe("JpegDecoderFactory", () => {
  it("decodes bytes and base64 data URLs", () => {
    const data = bytes("cmyk.jpg");
    const url = "data:image/jpeg;base64," + Buffer.from(data).toString("base64");
    const fromUrl = JpegDecoderFactory.getDecoder(url) as JpegDecoder;
    expect(sha(fromUrl.getData())).toBe((old["cmyk.jpg"] as OldResult).rgba);
    expect(JpegDecoderFactory.getDecoder(data)).toBeInstanceOf(JpegDecoder);
    // URL-safe base64 decodes the same.
    const urlSafe = url.replace(/\+/g, "-").replace(/\//g, "_");
    expect(sha((JpegDecoderFactory.getDecoder(urlSafe) as JpegDecoder).getData())).toBe(
      (old["cmyk.jpg"] as OldResult).rgba,
    );
  });

  it("returns null for what it can't take", () => {
    expect(JpegDecoderFactory.getDecoder("data:image/jpeg;base64,abc")).toBeNull();
    expect(JpegDecoderFactory.getDecoder("http://example.com/a.jpg")).toBeNull();
    expect(JpegDecoderFactory.getDecoder(42)).toBeNull();
  });

  it("returns pixels only for CMYK JPEGs", () => {
    expect(JpegDecoderFactory.decodeCMYK(new JpegDecoder(bytes("rgb-420.jpg")))).toBeNull();
    const cmyk = JpegDecoderFactory.decodeCMYK(
      "data:image/jpeg;base64," + Buffer.from(bytes("cmyk.jpg")).toString("base64"),
    );
    expect(sha(cmyk as Uint8Array)).toBe((old["cmyk.jpg"] as OldResult).rgba);
    expect(JpegDecoderFactory.decodeCMYK(null)).toBeNull();
  });
});

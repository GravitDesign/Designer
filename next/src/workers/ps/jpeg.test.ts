// The worker half of the JPEG handshake (BUG-008): size request, then the
// full RGBA pixels, turned into the JPEG's own components.
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PSCore } from "./core.ts";
import type { PSHost, PSHostMessage } from "./host.ts";
import { PSInterpreter } from "./interpreter.ts";
import {
  JPEG_FLAG_BYTES,
  JPEG_SIZE_REQUEST_BYTES,
  JpegRequest,
  jpegComponentCount,
  rgbaToComponents,
} from "./jpeg.ts";

const EPS_FIXTURES = path.join(
  import.meta.dirname,
  "..",
  "..",
  "io",
  "import",
  "eps",
  "__fixtures__",
);
const latin1 = (file: string) => fs.readFileSync(path.join(EPS_FIXTURES, file)).toString("latin1");
const bytes = (...values: number[]) => String.fromCharCode(...values);

interface DecodedImage {
  width: number;
  height: number;
  rgba: number[];
}

/** What the page answers to a request, or null to never answer. */
type Answer = (message: PSHostMessage) => DecodedImage | null;

/** Starts an interpreter whose page answers "jpeg" calls synchronously. */
function start(answer: Answer, program = "", maxWaitTime = 3e5) {
  const messages: PSHostMessage[] = [];
  const host: PSHost = {
    postMessage(message) {
      messages.push(message);
      const buffer = message.result as SharedArrayBuffer | null | undefined;
      if (message.func !== "jpeg" || !buffer) return;
      const image = answer(message);
      if (!image) return;
      if (message.data[1] === JpegRequest.Size)
        new Int32Array(buffer, JPEG_FLAG_BYTES, 2).set([image.width, image.height]);
      else new Uint8Array(buffer, JPEG_FLAG_BYTES).set(image.rgba);
      Atomics.store(new Int32Array(buffer, 0, 1), 0, 1);
    },
    close() {},
    setTimeout: () => 0,
    shouldYield: () => false,
  };
  const interpreter = new PSInterpreter(host);
  interpreter.init(new TextEncoder().encode(program), { maxWaitTime, outlineFonts: true });
  return { interpreter, core: interpreter.core as PSCore, messages };
}

/** The calls as [func, data, buffer size]. */
const summary = (messages: PSHostMessage[]) =>
  messages.map((m) => [
    m.func,
    m.data,
    m.result ? (m.result as SharedArrayBuffer).byteLength : null,
  ]);

// A 1 x 2 image: its pixel request (8 bytes after the flag) is as long as
// the size area, which the old page side couldn't tell apart.
const TINY: DecodedImage = { width: 1, height: 2, rgba: [10, 20, 30, 255, 40, 50, 60, 255] };
const URL = "data:image/jpeg;base64,AAAA";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("JPEG handshake, worker side", () => {
  it("asks for the size, then for width x height RGBA pixels", () => {
    const { core, messages } = start(() => TINY);
    const image = core.waitForResponse("jpeg", [URL]);
    expect(summary(messages)).toEqual([
      ["jpeg", [URL, "size"], JPEG_SIZE_REQUEST_BYTES],
      ["jpeg", [URL, "pixels"], 4 + 1 * 2 * 4],
    ]);
    expect(image?.width).toBe(1);
    expect(image?.height).toBe(2);
    expect(Array.from(image?.rgba ?? [])).toEqual(TINY.rgba);
  });

  it("reports error 02 without SharedArrayBuffer and asks nothing", () => {
    vi.stubGlobal("SharedArrayBuffer", undefined);
    const { core, messages } = start(() => TINY);
    expect(core.waitForResponse("jpeg", [URL])).toBeNull();
    expect(summary(messages)).toEqual([["error", ["02"], null]]);
  });

  it("reports error 02 when the page can't decode the image (size 0 x 0)", () => {
    const { core, messages } = start(() => ({ width: 0, height: 0, rgba: [] }));
    expect(core.waitForResponse("jpeg", [URL])).toBeNull();
    expect(summary(messages)).toEqual([
      ["jpeg", [URL, "size"], JPEG_SIZE_REQUEST_BYTES],
      ["error", ["02"], null],
    ]);
  });

  it("reports error 02 when the page doesn't answer in time", () => {
    const { core, messages } = start(() => null, "", 20);
    expect(core.waitForResponse("jpeg", [URL])).toBeNull();
    expect(messages.map((m) => m.func)).toEqual(["jpeg", "error"]);
  });

  it("reads the component count from the JPEG's frame header", () => {
    expect(jpegComponentCount(latin1("photo-rgb.jpg"))).toBe(3);
    expect(jpegComponentCount(latin1("photo-gray.jpg"))).toBe(1);
    expect(jpegComponentCount(latin1("photo-cmyk.jpg"))).toBe(4);
    expect(jpegComponentCount(bytes(0xff, 0xd8, 0xff, 0xe0) + "\npop dump\n")).toBe(3);
  });

  it("turns RGBA into gray, RGB or CMYK samples", () => {
    expect(Array.from(rgbaToComponents(TINY.rgba, 1))).toEqual([10, 40]);
    expect(Array.from(rgbaToComponents(TINY.rgba, 3))).toEqual([10, 20, 30, 40, 50, 60]);
    expect(Array.from(rgbaToComponents(TINY.rgba, 4))).toEqual([
      245, 235, 225, 0, 215, 205, 195, 0,
    ]);
  });
});

describe("DCTDecode", () => {
  /**
   * Reads `count` bytes from `jpeg` (in ASCII85) through DCTDecode and
   * returns the widths of the rectangles it draws, one per byte read.
   */
  function read(jpeg: string, count: number): unknown[] {
    const program =
      "%!PS\n/dump { { 0 0 3 -1 roll 1 rectfill } forall } def\n" +
      `currentfile /ASCII85Decode filter /DCTDecode filter ${count} string readstring\n` +
      `${ascii85(jpeg)}~>\npop dump\n`;
    const { interpreter, messages } = start(() => TINY, program, 1000);
    interpreter.run();
    return messages.filter((m) => m.func === "rectfill").map((m) => m.data[2]);
  }

  /** SOI and a baseline frame header (1 x 2 pixels) with `components` components. */
  const frame = (components: number) =>
    bytes(0xff, 0xd8, 0xff, 0xc0, 0, 8 + 3 * components, 8, 0, 2, 0, 1, components) +
    bytes(...Array.from({ length: components }, (_, i) => [i + 1, 0x11, 0]).flat()) +
    bytes(0xff, 0xd9);

  it("delivers a gray JPEG's samples, one byte per pixel", () => {
    expect(read(frame(1), 2)).toEqual([10, 40]);
  });

  it("delivers an RGB JPEG's samples without the alpha bytes", () => {
    expect(read(frame(3), 6)).toEqual([10, 20, 30, 40, 50, 60]);
  });
});

/** ASCII85 (without the `~>` end mark). */
function ascii85(text: string): string {
  const data = Buffer.from(text, "latin1");
  let out = "";
  for (let i = 0; i < data.length; i += 4) {
    const count = Math.min(4, data.length - i);
    let value = 0;
    for (let k = 0; k < 4; k++) value = value * 256 + (data[i + k] ?? 0);
    const digits: string[] = [];
    for (let k = 0; k < 5; k++) {
      digits.unshift(String.fromCharCode(33 + (value % 85)));
      value = Math.floor(value / 85);
    }
    out += digits.slice(0, count + 1).join("");
  }
  return out;
}

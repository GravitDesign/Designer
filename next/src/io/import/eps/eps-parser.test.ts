import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CMYKColor } from "../../../engine/color/cmyk-color.ts";
import { RGBColor } from "../../../engine/color/rgb-color.ts";
import { FontManager } from "../../../engine/text/fonts/font-manager.ts";
import { Group } from "../../../engine/scene/group.ts";
import { EPSParser } from "./eps-parser.ts";

function parser(errors: string[] = []) {
  const calls: unknown[][] = [];
  const p = new EPSParser(
    new Uint8Array(0),
    (...args) => calls.push(args),
    new FontManager(),
    (m) => errors.push(m),
  );
  return { p, calls, errors };
}

const segment = (type: string, x: number, y: number) => ({ type, coord: { x, y } });

describe("EPSParser", () => {
  it("turns worker colors into Gravit colors", () => {
    const { p } = parser();
    const rgb = p.getGColor({ type: "rgb", value: [255, 0, 0] }) as RGBColor;
    expect(rgb).toBeInstanceOf(RGBColor);
    expect(rgb.getValue()).toEqual([255, 0, 0]);
    const cmyk = p.getGColor({ type: "cmyk", value: [255, 0, 0, 51] }) as CMYKColor;
    expect(cmyk).toBeInstanceOf(CMYKColor);
    expect(cmyk.getValue()).toEqual([1, 0, 0, 0.2]);
    expect(p.getGColor(null)).toBeInstanceOf(RGBColor);
    // A gradient needs a node to size it.
    expect(p.getGColor({ type: "linear", value: [0, 0, 1, 1], stops: [] })).toBeNull();
  });

  it("builds paths from the worker's segments and appends them", () => {
    const { p } = parser();
    const path = [
      [
        segment("moveto", 0, 0),
        segment("lineto", 10, 0),
        segment("lineto", 10, 10),
        segment("closepath", 0, 0),
      ],
    ];
    expect(p.fill(path as never, { type: "rgb", value: [0, 0, 255] }, [], false)).toBe(true);
    const node = p.ggroup.getFirstChild() as unknown as {
      getGeometryBBox(): { getWidth(): number; getHeight(): number };
    };
    expect(node).not.toBeNull();
    expect(node.getGeometryBBox().getWidth()).toBe(10);
    expect(node.getGeometryBBox().getHeight()).toBe(10);
  });

  it("takes a fill without path and clip as the page background", () => {
    const { p } = parser();
    expect(p.fill([], { type: "rgb", value: [1, 2, 3] }, [], false)).toBe(true);
    expect(p.ggroup.getFirstChild()).toBeNull();
    expect((p.background as RGBColor).getValue()).toEqual([1, 2, 3]);
  });

  it("hands over the group once and reports each error code once", () => {
    const { p, calls, errors } = parser();
    p.error("02");
    p.error("02");
    p.error("01");
    expect(errors).toEqual([]);
    p.doneCall();
    p.doneCall();
    expect(calls).toHaveLength(1);
    expect((calls[0] as unknown[])[0]).toBe(0);
    expect((calls[0] as unknown[])[1]).toBeInstanceOf(Group);
    expect(errors).toHaveLength(2);
    expect(p.ready()).toBe(true);
  });

  it("throws for text without a font name, as the old page side did", () => {
    const { p } = parser();
    expect(() =>
      p.show("x", null, 10, { type: "rgb", value: [0, 0, 0] }, { x: 0, y: 0 }, 0, 0, 0, 0, 0),
    ).toThrow(TypeError);
  });
});

describe("EPSParser.jpeg (page side of the JPEG handshake, BUG-008)", () => {
  // Images the fake browser decodes, by data URL.
  const images = new Map<string, { width: number; height: number; rgba: number[] }>();
  const big = Array.from({ length: 80 * 60 * 4 }, (_, i) => (i * 7) & 255);
  images.set("data:tiny", { width: 1, height: 2, rgba: [10, 20, 30, 255, 40, 50, 60, 255] });
  images.set("data:big", { width: 80, height: 60, rgba: big });

  class FakeImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    width = 0;
    height = 0;
    rgba: number[] = [];
    set src(url: string) {
      setTimeout(() => {
        const image = images.get(url);
        if (!image) return this.onerror?.();
        Object.assign(this, image);
        this.onload?.();
      }, 0);
    }
  }
  const canvas = () => {
    let drawn: FakeImage | null = null;
    return {
      width: 0,
      height: 0,
      getContext: () => ({
        drawImage: (image: FakeImage) => (drawn = image),
        getImageData: () => ({ data: new Uint8ClampedArray(drawn?.rgba ?? []) }),
      }),
    };
  };

  beforeEach(() => {
    vi.stubGlobal("Image", FakeImage);
    vi.stubGlobal("document", { createElement: canvas });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  /** Sends a request the way EPSImport hands it over and waits for the answer. */
  async function request(url: string, kind: "size" | "pixels", payloadBytes: number) {
    const buffer = new SharedArrayBuffer(4 + payloadBytes);
    const flags = new Int32Array(buffer, 0, 1);
    const view = new Uint8Array(buffer, 4, payloadBytes);
    const notify = vi.spyOn(Atomics, "notify");
    const { p } = parser();
    p.jpeg(url, kind, flags, view);
    for (let i = 0; i < 50 && Atomics.load(flags, 0) === 0; i++)
      await new Promise((r) => setTimeout(r, 1));
    return {
      buffer,
      flags,
      view,
      notified: notify.mock.calls.some((c) => (c[0] as unknown) === flags),
    };
  }

  it("answers a size request with width and height and notifies the worker", async () => {
    const { buffer, flags, notified } = await request("data:big", "size", 8);
    expect(Array.from(new Int32Array(buffer, 4, 2))).toEqual([80, 60]);
    expect(flags[0]).toBe(1);
    expect(notified).toBe(true);
  });

  it("sends a 1 x 2 image's pixels, not its size, though both take 8 bytes", async () => {
    const { view, flags, notified } = await request("data:tiny", "pixels", 8);
    expect(Array.from(view)).toEqual([10, 20, 30, 255, 40, 50, 60, 255]);
    expect(flags[0]).toBe(1);
    expect(notified).toBe(true);
  });

  it("copies all width x height x 4 RGBA bytes", async () => {
    const { view } = await request("data:big", "pixels", 80 * 60 * 4);
    expect(Array.from(view)).toEqual(big);
  });

  it("answers 0 x 0 for an image the browser can't decode, and still notifies", async () => {
    const { buffer, flags, notified } = await request("data:broken", "size", 8);
    expect(Array.from(new Int32Array(buffer, 4, 2))).toEqual([0, 0]);
    expect(flags[0]).toBe(1);
    expect(notified).toBe(true);
  });
});

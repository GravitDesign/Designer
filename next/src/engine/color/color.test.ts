import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ASSETS_ROOT } from "../../../server/paths.ts";
import { Color } from "./color.ts";
import { IccHeader as IccProfileHeader, type IccHeader } from "./icc-header.ts";
import { IccProfile } from "./icc-profile.ts";
import oldValues from "./test-data/old-color-values.json" with { type: "json" };

// test-data/old-color-values.json holds what the old engine's GColor and
// GRGBColor (chunk.vendor.js modules 68 and 17, run in Node) returned for
// the same inputs.

type Pairs = [number[], number[]][];

function profileBytes(): ArrayBuffer {
  const file = fs.readFileSync(path.join(ASSETS_ROOT, "data/icc/USWebCoatedSWOP.icc"));
  return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
}

function loadProfile(): IccHeader {
  let profile: IccHeader | null = null;
  new IccProfile().read(profileBytes(), (p) => (profile = p));
  if (!profile) throw new Error("profile did not load");
  return profile;
}

afterEach(() => {
  Color.currentCMYKProfile = null;
  Color.IccProfiles = {};
  vi.unstubAllGlobals();
});

describe("Color conversions without a profile", () => {
  it.each([
    ["rgbToCMYK", oldValues.rgbToCMYK as Pairs, (v: number[]) => Color.rgbToCMYK(v, true)],
    ["cmykToRGB", oldValues.cmykToRGB as Pairs, (v: number[]) => Color.cmykToRGB(v, true)],
    ["rgbToHSV", oldValues.rgbToHSV as Pairs, (v: number[]) => Color.rgbToHSV(v)],
    ["hsvToRGB", oldValues.hsvToRGB as Pairs, (v: number[]) => Color.hsvToRGB(v)],
  ])("%s matches the old engine", (_name, pairs, fn) => {
    expect(pairs.length).toBeGreaterThan(30);
    expect(pairs.map(([input]) => fn(input))).toEqual(pairs.map(([, output]) => output));
  });

  it("uses the naive formulas while no profile is loaded", () => {
    expect(Color.cmykToRGB([0, 1, 0, 0])).toEqual([255, 0, 255]);
    expect(Color.rgbToCMYK([255, 0, 0])).toEqual([0, 1, 1, 0]);
    expect(Color.cmykToRGB([0.2, 0.4, 0.6])).toEqual([204, 153, 102]);
  });

  it("writes hex and CSS colors", () => {
    for (const [rgb, hex, css] of oldValues.hex as [number[], string, string][]) {
      expect(Color.rgbToHtmlHex(rgb)).toBe(hex);
      expect(Color.rgbToCSS(rgb, 0.3)).toBe(css);
      expect(Color.rgbToCSS(rgb, 1)).toBe(hex);
      expect(Color.rgbToCSS(rgb)).toBe(hex);
    }
  });
});

describe("Color conversions with the ICC profile", () => {
  it("converts RGB to CMYK through the profile like the old engine", () => {
    Color.currentCMYKProfile = loadProfile();
    const pairs = oldValues.rgbToCMYKProfile as Pairs;
    expect(pairs.map(([input]) => Color.rgbToCMYK(input))).toEqual(pairs.map(([, out]) => out));
  });

  it("converts CMYK to RGB through the profile like the old engine", () => {
    Color.currentCMYKProfile = loadProfile();
    const pairs = oldValues.cmykToRGBProfile as Pairs;
    expect(pairs.map(([input]) => Color.cmykToRGB(input))).toEqual(pairs.map(([, out]) => out));
  });

  it("ignores the profile when asked to", () => {
    Color.currentCMYKProfile = loadProfile();
    expect(Color.cmykToRGB([0, 1, 0, 0], true)).toEqual([255, 0, 255]);
    expect(Color.cmykToRGB([0, 1, 0, 0])).toEqual([235, 40, 143]);
  });
});

describe("Color conversions with a synthetic profile", () => {
  // A 2-point grid with distinct CLUT entries; the expected values are
  // what the old engine returned for the same profile. AToB1 keeps the
  // lightness very low (the "yr" quirk in cmykToRGB); BToA1 maps the a
  // channel past the last grid cell (the cell search quirk in rgbToCMYK,
  // which then falls back to the naive formula).
  function synthetic(): IccHeader {
    const aToB = new Uint16Array(16 * 3);
    for (let i = 0; i < aToB.length; i++) aToB[i] = (i * 2731) % 65536;
    for (let i = 0; i < 16; i++) aToB[3 * i] = 100 + 37 * i;
    const bToA = new Uint8Array(8 * 4);
    for (let i = 0; i < bToA.length; i++) bToA[i] = (i * 53) % 256;
    return Object.assign(new IccProfileHeader(), {
      AtoB1CLUTNumPts: 2,
      AtoB1CLUT: aToB,
      AtoB1normalizationRange: 65535,
      BtoA1CLUTNumPts: 2,
      BtoA1CLUT: bToA,
      BtoA1normalizationRange: 255,
      BtoA1InputChange: new Uint16Array([0, 255, 300, 300, 0, 255]),
    });
  }

  it("matches the old engine", () => {
    Color.currentCMYKProfile = synthetic();
    expect(
      [
        [0, 0, 0, 0],
        [0.3, 0.6, 0.1, 0.9],
        [1, 1, 1, 1],
        [0.5, 0.25, 0.75, 0],
      ].map((v) => Color.cmykToRGB(v)),
    ).toEqual([
      [0, 54, 160],
      [0, 3, 0],
      [0, 0, 0],
      [0, 25, 42],
    ]);
    expect(
      [
        [0, 0, 0],
        [200, 30, 90],
        [255, 255, 255],
        [12, 250, 128],
      ].map((v) => Color.rgbToCMYK(v)),
    ).toEqual([
      [0, 0, 0, 1],
      [0, 0.85, 0.5499999999999999, 0.21568627450980393],
      [0, 0, 0, 0],
      [0.952, 0, 0.488, 0.019607843137254943],
    ]);
  });
});

describe("Color._mapChannel", () => {
  it("passes values through without a table", () => {
    expect(Color._mapChannel(42.5, 0, 3, 255, null, 255)).toBe(42.5);
    expect(Color._mapChannel(42.5, 0, 1, 255, new Uint8Array([7]), 255)).toBe(42.5);
  });

  it("interpolates the channel's own curve and rescales between ranges", () => {
    // Two channels of three entries each; channel 1 is 0 → 100 → 200.
    const table = new Uint16Array([0, 0, 0, 0, 100, 200]);
    expect(Color._mapChannel(64, 1, 2, 255, table, 255)).toBe(50);
    // On a segment border the earlier segment is used: still exact.
    expect(Color._mapChannel(128, 1, 2, 255, table, 255)).toBe(100);
    expect(Color._mapChannel(0, 1, 2, 255, table, 255)).toBe(0);
    // A 0-1000 value against a 0-255 table is scaled in and out.
    expect(Color._mapChannel(500, 1, 2, 1000, table, 255)).toBeCloseTo(390.625, 9);
  });
});

describe("Color.setCMYKProfile", () => {
  it("loads the profile asynchronously and caches it", async () => {
    const fetchMock = vi.fn(async () => new Response(profileBytes(), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const loaded = new Promise<void>((resolve) => {
      Color.setCMYKProfile("USWebCoatedSWOPv2", undefined, resolve);
    });
    // Nothing changes until the request finishes.
    expect(Color.currentCMYKProfile).toBeNull();
    expect(Color.cmykToRGB([0, 1, 0, 0])).toEqual([255, 0, 255]);
    await loaded;
    expect(fetchMock).toHaveBeenCalledWith("assets/data/icc/USWebCoatedSWOP.icc");
    expect(Color.currentCMYKProfile).not.toBeNull();
    expect(Color.cmykToRGB([0, 1, 0, 0])).toEqual([235, 40, 143]);

    // A second call uses the cached profile synchronously.
    Color.currentCMYKProfile = null;
    const done = vi.fn();
    Color.setCMYKProfile("USWebCoatedSWOPv2", "elsewhere/", done);
    expect(done).toHaveBeenCalledOnce();
    expect(Color.currentCMYKProfile).toBe(Color.IccProfiles.USWebCoatedSWOPv2);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("keeps the naive conversion when the request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("missing", { status: 404 })),
    );
    await new Promise<void>((resolve) => Color.setCMYKProfile("USWebCoatedSWOPv2", "x/", resolve));
    expect(Color.currentCMYKProfile).toBeNull();
  });

  it("ignores unknown profile names", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const done = vi.fn();
    Color.setCMYKProfile("NoSuchProfile", undefined, done);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(done).not.toHaveBeenCalled();
  });
});

describe("Color instances", () => {
  it("copies array values and saves them as JSON", () => {
    const source = [1, 2, 3];
    const color = new Color(source);
    source[0] = 9;
    expect(color.getValue()).toEqual([1, 2, 3]);
    expect(color.serialize()).toBe("[1,2,3]");
    expect(new Color("nope").getValue()).toBeNull();
    expect(new Color().serialize()).toBe("");
    color.deserialize("[4,5]");
    expect(color.getValue()).toEqual([4, 5]);
    color.deserialize("");
    expect(color.getValue()).toEqual([4, 5]);
    expect(String(color)).toBe("[Object GColor]");
  });

  it("has no screen value of its own", () => {
    expect(() => new Color([1]).toScreen()).toThrow("Not Supported.");
    expect(() => new Color([1]).toHumanString()).toThrow("Not Supported.");
  });
});

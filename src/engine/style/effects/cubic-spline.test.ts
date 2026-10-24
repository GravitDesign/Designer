import { describe, expect, it } from "vitest";
import { ColorCurves, MonotoneCubicSpline, type GradingCurves } from "./cubic-spline.ts";

const CURVES: GradingCurves = {
  rgb: [
    [0, 0],
    [128, 200],
    [255, 255],
  ],
  r: [
    [0, 10],
    [255, 240],
  ],
  g: [
    [30, 0],
    [64, 30],
    [190, 220],
    [255, 255],
  ],
  b: [[0, 0]],
};

const every32 = (table: number[]) => table.filter((_, i) => i % 32 == 0 || i == 256);

describe("color curves", () => {
  // Recorded from the old module (chunk.vendor.js module 1009).
  it("make the old lookup tables", () => {
    const tables = ColorCurves.getCurves(CURVES);
    expect(every32(tables.a)).toEqual([1, 53, 109, 160, 200, 224, 237, 245, 255]);
    expect(every32(tables.r)).toEqual([10, 39, 68, 97, 125, 154, 183, 212, 241]);
    // Left of the first point the spline is NaN, which becomes 0 and then
    // the smallest value above 0 minus 1.
    expect(tables.g.slice(0, 40)).toEqual([
      ...new Array<number>(31).fill(0),
      1,
      2,
      3,
      3,
      4,
      5,
      6,
      7,
      7,
    ]);
    expect(tables.g.slice(250)).toEqual([252, 253, 253, 254, 254, 255, 256]);
    // One point: all NaN, so all zero, so all Infinity.
    expect(tables.b).toHaveLength(257);
    expect(tables.b.every((value) => value === Infinity)).toBe(true);
  });

  it("map r, g and b through their curve and then the master curve, not alpha", () => {
    const pixels = new Uint8ClampedArray([0, 100, 200, 255, 30, 64, 128, 0, 255, 255, 255, 10]);
    ColorCurves.apply(pixels, 0, 0, CURVES);
    expect(Array.from(pixels)).toEqual([16, 139, 255, 255, 62, 50, 255, 0, 249, 255, 255, 10]);
  });

  it("assign the curves by position and throw for a missing one", () => {
    expect(() => ColorCurves.getCurves({ a: [[0, 0]], r: null })).toThrow(TypeError);
    expect(() => ColorCurves.getCurves({ a: [[0, 0]] })).toThrow(TypeError);
  });

  it("don't patch Array.prototype or leak a global", () => {
    ColorCurves.getCurves(CURVES);
    expect("getLowestAbove" in Array.prototype).toBe(false);
    expect("cubicSpline" in globalThis).toBe(false);
  });
});

describe("MonotoneCubicSpline", () => {
  it("passes through the points and stays monotone", () => {
    const spline = new MonotoneCubicSpline([0, 10, 20], [0, 50, 60]);
    expect(spline.interpolate(0)).toBe(0);
    expect(spline.interpolate(10)).toBe(50);
    let previous = -1;
    for (let x = 0; x < 20; x += 0.5) {
      const y = spline.interpolate(x);
      expect(y).toBeGreaterThanOrEqual(previous);
      previous = y;
    }
  });

  it("flattens the tangents next to a flat segment", () => {
    const spline = new MonotoneCubicSpline([0, 10, 20, 30], [0, 40, 40, 80]);
    expect(spline.m.slice(1, 3)).toEqual([0, 0]);
    expect(spline.interpolate(15)).toBe(40);
  });

  it("is NaN left of the first point", () => {
    expect(new MonotoneCubicSpline([10, 20], [0, 1]).interpolate(5)).toBeNaN();
  });
});

import { describe, expect, it } from "vitest";
import { quantize, samplePixels, type RGB } from "./color-thief.ts";

describe("samplePixels", () => {
  it("takes every quality-th pixel that is opaque enough and not near white", () => {
    // prettier-ignore
    const data = [
      10, 20, 30, 255,   // taken
      1, 2, 3, 255,      // skipped by quality 2
      251, 251, 251, 255, // white: dropped
      0, 0, 0, 0,
      40, 50, 60, 124,   // too transparent
      0, 0, 0, 0,
      70, 80, 90, 125,   // taken
    ];
    expect(samplePixels(data, 7, 2)).toEqual([
      [10, 20, 30],
      [70, 80, 90],
    ]);
  });
});

describe("quantize", () => {
  it("rejects empty input and bad colour counts", () => {
    expect(quantize([], 5)).toBe(false);
    expect(quantize([[1, 2, 3]], 1)).toBe(false);
    expect(quantize([[1, 2, 3]], 257)).toBe(false);
  });

  it("gives the old app's palette for two clusters, including the empty third box", () => {
    const pixels: RGB[] = [];
    for (let i = 0; i < 30; i++) pixels.push([200, 16, 16]);
    for (let i = 0; i < 10; i++) pixels.push([16, 16, 200]);
    const cmap = quantize(pixels, 2);
    // Recorded by running the old module 1267 on the same samples. 5-bit
    // bins: 200 >> 3 = 25 -> (25 + 0.5) * 8 = 204; 16 >> 3 = 2 -> 20. The
    // third, empty box comes from the else-if bounding box and averages to
    // its centre.
    expect((cmap as Exclude<typeof cmap, false | undefined>).palette()).toEqual([
      [20, 20, 204],
      [204, 20, 20],
      [156, 20, 116],
    ]);
  });

  it("keeps the else-if bounding box: a first sample only lowers the minimum", () => {
    // One sample: rmin = rmax would be 25, but the old code leaves rmax at 0,
    // so the box is empty and the colour is the box centre, not the sample.
    const cmap = quantize([[200, 200, 200]], 2);
    const palette = (cmap as Exclude<typeof cmap, false | undefined>).palette();
    expect(palette).toEqual([[104, 104, 104]]);
  });
});

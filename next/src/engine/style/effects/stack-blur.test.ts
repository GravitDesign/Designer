import { describe, expect, it } from "vitest";
import { StackBlur } from "./stack-blur.ts";

/** A deterministic RGBA test image with every fourth pixel transparent. */
function image(width: number, height: number): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < pixels.length; i++) pixels[i] = (i * 37 + (i >> 2) * 11) % 256;
  for (let i = 3; i < pixels.length; i += 16) pixels[i] = 0;
  return pixels;
}

describe("StackBlur", () => {
  // Recorded from the old module (chunk.vendor.js module 931).
  it("blurs exactly like the old fork", () => {
    const pixels = image(5, 4);
    StackBlur.apply(pixels, 5, 4, 2);
    expect(Array.from(pixels)).toEqual([
      65, 181, 255, 55, 118, 152, 202, 67, 178, 165, 219, 79, 255, 255, 255, 61, 255, 255, 255, 35,
      88, 137, 184, 93, 155, 155, 188, 87, 205, 179, 220, 87, 255, 220, 255, 66, 255, 255, 255, 43,
      120, 133, 170, 123, 192, 163, 197, 105, 216, 191, 229, 99, 227, 193, 221, 82, 225, 230, 234,
      60, 151, 134, 174, 145, 224, 158, 204, 124, 211, 176, 214, 123, 185, 168, 180, 105, 152, 177,
      137, 82,
    ]);
  });

  it("truncates the radius and clamps at the image edges", () => {
    const pixels = image(3, 3);
    StackBlur.apply(pixels, 3, 3, 7.9);
    expect(Array.from(pixels)).toEqual([
      219, 187, 255, 56, 221, 160, 236, 67, 229, 149, 219, 77, 255, 185, 246, 55, 255, 170, 235, 63,
      255, 157, 230, 70, 255, 192, 236, 53, 255, 177, 238, 59, 255, 170, 243, 63,
    ]);
  });

  it("reads past the end of one-row images, as the old fork did", () => {
    const pixels = new Uint8ClampedArray([10, 20, 30, 255, 10, 20, 30, 255]);
    StackBlur.apply(pixels, 2, 1, 1);
    expect(Array.from(pixels)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("leaves the pixels alone for radii below 1, above 254 or NaN", () => {
    for (const radius of [0, 0.9, 255, NaN, undefined]) {
      const pixels = image(4, 4);
      StackBlur.apply(pixels, 4, 4, radius);
      expect(pixels).toEqual(image(4, 4));
    }
    const pixels = image(4, 4);
    StackBlur.apply(pixels, 4, 4, 254);
    expect(pixels).not.toEqual(image(4, 4));
  });

  it("premultiplies alpha, so transparent pixels don't darken the color", () => {
    // An opaque red pixel among transparent black ones.
    const pixels = new Uint8ClampedArray(3 * 3 * 4);
    pixels.set([255, 0, 0, 255], 4 * 4);
    StackBlur.apply(pixels, 3, 3, 1);
    for (let i = 0; i < pixels.length; i += 4) {
      expect(pixels[i + 3]).toBeGreaterThan(0);
      expect([pixels[i], pixels[i + 1], pixels[i + 2]]).toEqual([255, 0, 0]);
    }
  });
});

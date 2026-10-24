// Old: chunk.vendor.js module 931 (StackBlur fork).
//
// Mario Klingemann's StackBlur, as the old engine modified it: the pixels
// are premultiplied by alpha before blurring and divided again afterwards,
// so transparent pixels don't bleed black into the edges. The rounding of
// the clamped array writes, the `>>>` shifts and the order of the running
// sums are the old ones; the blurred pixels must match byte for byte.
import type { BitmapFilter } from "../../paint/bitmap.ts";

// prettier-ignore
const MUL_TABLE = [
  512, 512, 456, 512, 328, 456, 335, 512, 405, 328, 271, 456, 388, 335, 292, 512,
  454, 405, 364, 328, 298, 271, 496, 456, 420, 388, 360, 335, 312, 292, 273, 512,
  482, 454, 428, 405, 383, 364, 345, 328, 312, 298, 284, 271, 259, 496, 475, 456,
  437, 420, 404, 388, 374, 360, 347, 335, 323, 312, 302, 292, 282, 273, 265, 512,
  497, 482, 468, 454, 441, 428, 417, 405, 394, 383, 373, 364, 354, 345, 337, 328,
  320, 312, 305, 298, 291, 284, 278, 271, 265, 259, 507, 496, 485, 475, 465, 456,
  446, 437, 428, 420, 412, 404, 396, 388, 381, 374, 367, 360, 354, 347, 341, 335,
  329, 323, 318, 312, 307, 302, 297, 292, 287, 282, 278, 273, 269, 265, 261, 512,
  505, 497, 489, 482, 475, 468, 461, 454, 447, 441, 435, 428, 422, 417, 411, 405,
  399, 394, 389, 383, 378, 373, 368, 364, 359, 354, 350, 345, 341, 337, 332, 328,
  324, 320, 316, 312, 309, 305, 301, 298, 294, 291, 287, 284, 281, 278, 274, 271,
  268, 265, 262, 259, 257, 507, 501, 496, 491, 485, 480, 475, 470, 465, 460, 456,
  451, 446, 442, 437, 433, 428, 424, 420, 416, 412, 408, 404, 400, 396, 392, 388,
  385, 381, 377, 374, 370, 367, 363, 360, 357, 354, 350, 347, 344, 341, 338, 335,
  332, 329, 326, 323, 320, 318, 315, 312, 310, 307, 304, 302, 299, 297, 294, 292,
  289, 287, 285, 282, 280, 278, 275, 273, 271, 269, 267, 265, 263, 261, 259,
];

// prettier-ignore
const SHG_TABLE = [
  9, 11, 12, 13, 13, 14, 14, 15, 15, 15, 15, 16, 16, 16, 16, 17, 17, 17, 17, 17,
  17, 17, 18, 18, 18, 18, 18, 18, 18, 18, 18, 19, 19, 19, 19, 19, 19, 19, 19, 19,
  19, 19, 19, 19, 19, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20,
  20, 20, 20, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21,
  21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22,
  22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22,
  22, 22, 22, 22, 22, 22, 22, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
  23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
  23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
  23, 23, 23, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
  24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
  24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
  24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
];

/** One slot of the circular stack of pixels the running sums walk over. */
class StackSlot {
  r = 0;
  g = 0;
  b = 0;
  a = 0;
  next: StackSlot = this;
}

/**
 * Blurs RGBA `pixels` (width x height) in place with `radius` (truncated
 * to an integer). Radii below 1, above 254 or NaN leave the pixels alone.
 */
function apply(pixels: Uint8ClampedArray, width: number, height: number, radius?: unknown): void {
  let blurRadius = (radius as number) || 0;
  if (isNaN(blurRadius) || blurRadius < 1 || blurRadius > 254) return;
  blurRadius |= 0;

  const div = blurRadius + blurRadius + 1;
  const widthMinus1 = width - 1;
  const heightMinus1 = height - 1;
  const radiusPlus1 = blurRadius + 1;
  const sumFactor = (radiusPlus1 * (radiusPlus1 + 1)) / 2;

  const stackStart = new StackSlot();
  let stack = stackStart;
  let stackEnd = stackStart;
  for (let i = 1; i < div; i++) {
    stack = stack.next = new StackSlot();
    if (i == radiusPlus1) stackEnd = stack;
  }
  stack.next = stackStart;

  const mulSum = MUL_TABLE[blurRadius] as number;
  const shgSum = SHG_TABLE[blurRadius] as number;
  const length = pixels.length;

  let alpha: number;
  for (let i = 0; i < length; i += 4) {
    if ((alpha = pixels[i + 3] as number) > 0) {
      alpha /= 255;
      (pixels[i] as number) *= alpha;
      (pixels[i + 1] as number) *= alpha;
      (pixels[i + 2] as number) *= alpha;
    }
  }

  let stackIn: StackSlot;
  let stackOut: StackSlot;
  let rSum: number, gSum: number, bSum: number, aSum: number;
  let rInSum: number, gInSum: number, bInSum: number, aInSum: number;
  let rOutSum: number, gOutSum: number, bOutSum: number, aOutSum: number;
  let pr: number, pg: number, pb: number, pa: number;
  let weight: number;
  let p: number;
  let yi = 0;
  let yw = 0;

  // Horizontal pass.
  for (let y = 0; y < height; y++) {
    rInSum = gInSum = bInSum = aInSum = rSum = gSum = bSum = aSum = 0;
    rOutSum = radiusPlus1 * (pr = pixels[yi] as number);
    gOutSum = radiusPlus1 * (pg = pixels[yi + 1] as number);
    bOutSum = radiusPlus1 * (pb = pixels[yi + 2] as number);
    aOutSum = radiusPlus1 * (pa = pixels[yi + 3] as number);
    rSum += sumFactor * pr;
    gSum += sumFactor * pg;
    bSum += sumFactor * pb;
    aSum += sumFactor * pa;
    stack = stackStart;
    for (let i = 0; i < radiusPlus1; i++) {
      stack.r = pr;
      stack.g = pg;
      stack.b = pb;
      stack.a = pa;
      stack = stack.next;
    }
    for (let i = 1; i < radiusPlus1; i++) {
      p = yi + ((widthMinus1 < i ? widthMinus1 : i) << 2);
      rSum += (stack.r = pr = pixels[p] as number) * (weight = radiusPlus1 - i);
      gSum += (stack.g = pg = pixels[p + 1] as number) * weight;
      bSum += (stack.b = pb = pixels[p + 2] as number) * weight;
      aSum += (stack.a = pa = pixels[p + 3] as number) * weight;
      rInSum += pr;
      gInSum += pg;
      bInSum += pb;
      aInSum += pa;
      stack = stack.next;
    }
    stackIn = stackStart;
    stackOut = stackEnd;
    for (let x = 0; x < width; x++) {
      pixels[yi] = (rSum * mulSum) >>> shgSum;
      pixels[yi + 1] = (gSum * mulSum) >>> shgSum;
      pixels[yi + 2] = (bSum * mulSum) >>> shgSum;
      pixels[yi + 3] = (aSum * mulSum) >>> shgSum;
      rSum -= rOutSum;
      gSum -= gOutSum;
      bSum -= bOutSum;
      aSum -= aOutSum;
      rOutSum -= stackIn.r;
      gOutSum -= stackIn.g;
      bOutSum -= stackIn.b;
      aOutSum -= stackIn.a;
      p = x + radiusPlus1;
      p = (yw + (p < widthMinus1 ? p : widthMinus1)) << 2;
      rSum += rInSum += stackIn.r = pixels[p] as number;
      gSum += gInSum += stackIn.g = pixels[p + 1] as number;
      bSum += bInSum += stackIn.b = pixels[p + 2] as number;
      aSum += aInSum += stackIn.a = pixels[p + 3] as number;
      stackIn = stackIn.next;
      rOutSum += pr = stackOut.r;
      gOutSum += pg = stackOut.g;
      bOutSum += pb = stackOut.b;
      aOutSum += pa = stackOut.a;
      rInSum -= pr;
      gInSum -= pg;
      bInSum -= pb;
      aInSum -= pa;
      stackOut = stackOut.next;
      yi += 4;
    }
    yw += width;
  }

  // Vertical pass.
  for (let x = 0; x < width; x++) {
    gInSum = bInSum = aInSum = rInSum = gSum = bSum = aSum = rSum = 0;
    yi = x << 2;
    rOutSum = radiusPlus1 * (pr = pixels[yi] as number);
    gOutSum = radiusPlus1 * (pg = pixels[yi + 1] as number);
    bOutSum = radiusPlus1 * (pb = pixels[yi + 2] as number);
    aOutSum = radiusPlus1 * (pa = pixels[yi + 3] as number);
    rSum += sumFactor * pr;
    gSum += sumFactor * pg;
    bSum += sumFactor * pb;
    aSum += sumFactor * pa;
    stack = stackStart;
    for (let i = 0; i < radiusPlus1; i++) {
      stack.r = pr;
      stack.g = pg;
      stack.b = pb;
      stack.a = pa;
      stack = stack.next;
    }
    let yp = width;
    for (let i = 1; i <= blurRadius; i++) {
      yi = (yp + x) << 2;
      rSum += (stack.r = pr = pixels[yi] as number) * (weight = radiusPlus1 - i);
      gSum += (stack.g = pg = pixels[yi + 1] as number) * weight;
      bSum += (stack.b = pb = pixels[yi + 2] as number) * weight;
      aSum += (stack.a = pa = pixels[yi + 3] as number) * weight;
      rInSum += pr;
      gInSum += pg;
      bInSum += pb;
      aInSum += pa;
      stack = stack.next;
      if (i < heightMinus1) yp += width;
    }
    yi = x;
    stackIn = stackStart;
    stackOut = stackEnd;
    for (let y = 0; y < height; y++) {
      p = yi << 2;
      pixels[p + 3] = (aSum * mulSum) >>> shgSum;
      pixels[p] = (rSum * mulSum) >>> shgSum;
      pixels[p + 1] = (gSum * mulSum) >>> shgSum;
      pixels[p + 2] = (bSum * mulSum) >>> shgSum;
      rSum -= rOutSum;
      gSum -= gOutSum;
      bSum -= bOutSum;
      aSum -= aOutSum;
      rOutSum -= stackIn.r;
      gOutSum -= stackIn.g;
      bOutSum -= stackIn.b;
      aOutSum -= stackIn.a;
      p = y + radiusPlus1;
      p = (x + (p < heightMinus1 ? p : heightMinus1) * width) << 2;
      rSum += rInSum += stackIn.r = pixels[p] as number;
      gSum += gInSum += stackIn.g = pixels[p + 1] as number;
      bSum += bInSum += stackIn.b = pixels[p + 2] as number;
      aSum += aInSum += stackIn.a = pixels[p + 3] as number;
      stackIn = stackIn.next;
      rOutSum += pr = stackOut.r;
      gOutSum += pg = stackOut.g;
      bOutSum += pb = stackOut.b;
      aOutSum += pa = stackOut.a;
      rInSum -= pr;
      gInSum -= pg;
      bInSum -= pb;
      aInSum -= pa;
      stackOut = stackOut.next;
      yi += width;
    }
  }

  for (let i = 0; i < length; i += 4) {
    if ((alpha = pixels[i + 3] as number) > 0) {
      alpha = 255 / alpha;
      (pixels[i] as number) *= alpha;
      (pixels[i + 1] as number) *= alpha;
      (pixels[i + 2] as number) *= alpha;
    }
  }
}

/** The blur as a bitmap filter: `bitmap.applyFilter(StackBlur, radius)`. */
export const StackBlur: BitmapFilter & { apply: typeof apply } = { apply };

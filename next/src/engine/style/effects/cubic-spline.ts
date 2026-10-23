// Old: chunk.vendor.js module 1009 (the color grading curves filter).
//
// Turns the curves of a color grading effect (points [input, output] per
// channel, as read from a Photoshop .acv file) into 257-entry lookup
// tables with a monotone cubic spline, then maps the pixels through them.
//
// The old module assigned the spline to an undeclared global
// (`cubicSpline`) and patched `Array.prototype.getLowestAbove` (an
// enumerable property, so every later for-in over any array saw it). The
// port keeps both local and computes the same values.
import type { BitmapFilter } from "../../paint/bitmap.ts";

/** A curve point: [input, output], both 0..255. */
export type CurvePoint = readonly [number, number];

/** The curves of a color grading effect, in for-in order: master, red, green, blue. */
export type GradingCurves = Record<string, readonly CurvePoint[] | null | undefined>;

/** The lookup tables getCurves makes: `a` is the master curve applied to r, g and b. */
export interface CurveTables {
  a: number[];
  r: number[];
  g: number[];
  b: number[];
}

/**
 * The indices a CoffeeScript `for a in [0...end]` loop visits: up to
 * end - 1, or down to end + 1 when end is negative (so [0] for end -1).
 * The old spline was compiled CoffeeScript and the short-curve results
 * depend on this.
 */
function coffeeRange(end: number): number[] {
  const indices: number[] = [];
  for (let i = 0; 0 <= end ? i < end : i > end; 0 <= end ? (i += 1) : (i -= 1)) indices.push(i);
  return indices;
}

/**
 * A monotone cubic Hermite spline (Fritsch-Carlson) through the points
 * (xs[i], ys[i]); xs must ascend.
 */
export class MonotoneCubicSpline {
  x: number[];
  y: number[];
  m: number[];

  constructor(xs: readonly number[], ys: readonly number[]) {
    const count = xs.length;
    const deltas: number[] = [];
    const tangents: number[] = [];
    const alphas: number[] = [];
    const betas: number[] = [];
    const distances: number[] = [];
    const taus: number[] = [];
    for (const i of coffeeRange(count - 1)) {
      deltas[i] =
        ((ys[i + 1] as number) - (ys[i] as number)) / ((xs[i + 1] as number) - (xs[i] as number));
      if (i > 0) tangents[i] = ((deltas[i - 1] as number) + (deltas[i] as number)) / 2;
    }
    tangents[0] = deltas[0] as number;
    tangents[count - 1] = deltas[count - 2] as number;
    const flat: number[] = [];
    for (const i of coffeeRange(count - 1)) {
      if (0 === deltas[i]) flat.push(i);
    }
    for (const i of flat) tangents[i] = tangents[i + 1] = 0;
    for (const i of coffeeRange(count - 1)) {
      alphas[i] = (tangents[i] as number) / (deltas[i] as number);
      betas[i] = (tangents[i + 1] as number) / (deltas[i] as number);
      distances[i] = Math.pow(alphas[i] as number, 2) + Math.pow(betas[i] as number, 2);
      taus[i] = 3 / Math.sqrt(distances[i] as number);
    }
    const steep: number[] = [];
    for (const i of coffeeRange(count - 1)) {
      if ((distances[i] as number) > 9) steep.push(i);
    }
    for (const i of steep) {
      tangents[i] = (taus[i] as number) * (alphas[i] as number) * (deltas[i] as number);
      tangents[i + 1] = (taus[i] as number) * (betas[i] as number) * (deltas[i] as number);
    }
    this.x = xs.slice(0, count);
    this.y = ys.slice(0, count);
    this.m = tangents;
  }

  /** The spline at `value`; NaN left of the first point and for fewer than two points. */
  interpolate(value: number): number {
    const last = this.x.length - 2;
    let i = last;
    // Searches down from the last segment for the one starting at or
    // before `value` (up, for two points or fewer).
    while ((last <= 0 ? i <= 0 : i >= 0) && !((this.x[i] as number) <= value)) {
      if (last <= 0) i += 1;
      else i -= 1;
    }
    const width = (this.x[i + 1] as number) - (this.x[i] as number);
    const t = (value - (this.x[i] as number)) / width;
    const t2 = Math.pow(t, 2);
    const t3 = Math.pow(t, 3);
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;
    return (
      (2 * t3 - 3 * t2 + 1) * (this.y[i] as number) +
      h10 * width * (this.m[i] as number) +
      h01 * (this.y[i + 1] as number) +
      h11 * width * (this.m[i + 1] as number)
    );
  }
}

/** The smallest value above `limit`; Infinity when there is none (Math.min of nothing). */
function lowestAbove(values: number[], limit: number): number {
  return (
    Math.min.apply(
      0,
      values.filter((value) => value > limit),
    ) || 0
  );
}

/** The 257-entry table for one curve; NaN entries become 0. */
function getCurve(points: readonly CurvePoint[]): number[] {
  const table: number[] = [];
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < points.length; i++) {
    const point = points[i] as CurvePoint;
    xs.push(point[0]);
    ys.push(point[1]);
  }
  const spline = new MonotoneCubicSpline(xs, ys);
  for (let i = 0; i <= 256; i++) table[i] = Math.round(spline.interpolate(i)) || 0;
  return table;
}

/**
 * The tables of all curves, assigned by position: the first curve is the
 * master (`a`), then r, g and b. Zeros become one less than the smallest
 * value above zero (Infinity when there is none).
 */
function getCurves(curves: GradingCurves): CurveTables {
  const tables: number[][] = [];
  for (const key in curves) tables.push(getCurve(curves[key] as readonly CurvePoint[]));
  if (Array.isArray(curves)) {
    // The old patch made getLowestAbove (a one-argument function) show up
    // in for-in over arrays; its "points" have no [0] and threw here.
    getCurve([undefined] as unknown as CurvePoint[]);
  }
  const result = { a: tables[0], r: tables[1], g: tables[2], b: tables[3] } as CurveTables;
  for (const key in result) {
    const table = result[key as keyof CurveTables];
    const replacement = lowestAbove(table, 0) - 1;
    for (let i = 0; i <= table.length; i++) {
      if (0 == table[i]) table[i] = replacement;
    }
  }
  return result;
}

/** Maps the r, g and b of RGBA `pixels` through their curve, then through the master curve. */
function apply(pixels: Uint8ClampedArray, _width: number, _height: number, curves?: unknown): void {
  const tables = getCurves(curves as GradingCurves);
  const length = pixels.length;
  for (let i = 0; i < length; i += 4) {
    pixels[i] = tables.r[pixels[i] as number] as number;
    pixels[i + 1] = tables.g[pixels[i + 1] as number] as number;
    pixels[i + 2] = tables.b[pixels[i + 2] as number] as number;
  }
  for (let i = 0; i < length; i += 4) {
    pixels[i] = tables.a[pixels[i] as number] as number;
    pixels[i + 1] = tables.a[pixels[i + 1] as number] as number;
    pixels[i + 2] = tables.a[pixels[i + 2] as number] as number;
  }
}

/** The curves filter: `bitmap.applyFilter(ColorCurves, curves)`. */
export const ColorCurves: BitmapFilter & {
  apply: typeof apply;
  getCurve: typeof getCurve;
  getCurves: typeof getCurves;
} = { apply, getCurve, getCurves };

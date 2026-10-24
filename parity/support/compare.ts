import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

export interface JsonDifference {
  path: string;
  expected: unknown;
  actual: unknown;
}

function describe(value: unknown): string {
  if (Array.isArray(value)) return `array(${value.length})`;
  if (value === null) return "null";
  return typeof value;
}

/**
 * Lists every place where two JSON values differ. Numbers must be identical
 * (Object.is, so 0 and -0 differ and NaN equals NaN); key order counts,
 * because the old serializer's key order is part of the file format.
 */
export function diffJson(
  expected: unknown,
  actual: unknown,
  path = "$",
  out: JsonDifference[] = [],
  limit = 50,
): JsonDifference[] {
  if (out.length >= limit) return out;
  if (typeof expected !== typeof actual || Array.isArray(expected) !== Array.isArray(actual)) {
    out.push({ path, expected: describe(expected), actual: describe(actual) });
    return out;
  }
  if (Array.isArray(expected) && Array.isArray(actual)) {
    if (expected.length !== actual.length) {
      out.push({ path: `${path}.length`, expected: expected.length, actual: actual.length });
    }
    const n = Math.min(expected.length, actual.length);
    for (let i = 0; i < n; i++) diffJson(expected[i], actual[i], `${path}[${i}]`, out, limit);
    return out;
  }
  if (typeof expected === "object" && expected !== null && actual !== null) {
    const e = expected as Record<string, unknown>;
    const a = actual as Record<string, unknown>;
    const ek = Object.keys(e);
    const ak = Object.keys(a);
    for (const k of ek) {
      if (!(k in a)) out.push({ path: `${path}.${k}`, expected: e[k], actual: "<missing>" });
    }
    for (const k of ak) {
      if (!(k in e)) out.push({ path: `${path}.${k}`, expected: "<missing>", actual: a[k] });
    }
    const shared = ek.filter((k) => k in a);
    const sharedActual = ak.filter((k) => k in e);
    if (shared.join("\u0000") !== sharedActual.join("\u0000")) {
      out.push({ path: `${path}{key order}`, expected: shared, actual: sharedActual });
    }
    for (const k of shared) diffJson(e[k], a[k], `${path}.${k}`, out, limit);
    return out;
  }
  if (!Object.is(expected, actual)) out.push({ path, expected, actual });
  return out;
}

export function formatJsonDiff(diffs: readonly JsonDifference[]): string {
  return diffs
    .map(
      (d) => `${d.path}: expected ${JSON.stringify(d.expected)}, got ${JSON.stringify(d.actual)}`,
    )
    .join("\n");
}

export interface PixelComparison {
  width: number;
  height: number;
  differentPixels: number;
  sizeMatches: boolean;
  /** PNG with differing pixels in red, only when something differs. */
  diffPng?: Buffer;
}

/**
 * Compares two PNGs pixel by pixel with zero tolerance: any channel
 * difference counts (pixelmatch threshold 0, antialiasing detection off).
 */
export function comparePng(expected: Buffer, actual: Buffer): PixelComparison {
  const e = PNG.sync.read(expected);
  const a = PNG.sync.read(actual);
  if (e.width !== a.width || e.height !== a.height) {
    return {
      width: a.width,
      height: a.height,
      differentPixels: Math.max(e.width * e.height, a.width * a.height),
      sizeMatches: false,
    };
  }
  const diff = new PNG({ width: e.width, height: e.height });
  const differentPixels = pixelmatch(e.data, a.data, diff.data, e.width, e.height, {
    threshold: 0,
    includeAA: true,
  });
  // pixelmatch with threshold 0 still ignores differences below its YIQ
  // delta rounding, so count raw byte differences as well.
  let raw = 0;
  for (let i = 0; i < e.data.length; i += 4) {
    if (
      e.data[i] !== a.data[i] ||
      e.data[i + 1] !== a.data[i + 1] ||
      e.data[i + 2] !== a.data[i + 2] ||
      e.data[i + 3] !== a.data[i + 3]
    ) {
      raw++;
    }
  }
  const count = Math.max(raw, differentPixels);
  return {
    width: e.width,
    height: e.height,
    differentPixels: count,
    sizeMatches: true,
    diffPng: count > 0 ? PNG.sync.write(diff) : undefined,
  };
}

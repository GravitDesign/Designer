// Seeded random and targeted inputs for every function of the
// intersection module, with the outputs (and thrown errors) of the old
// module 647 recorded once in intersection.recorded.json. The old module
// ran in Node with the new Point, GMath and big.js; the recording script
// lives outside the repo. Numbers are compared as strings, so -0, NaN
// and the last bit of every double count.
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { Point } from "../../math/point.ts";
import { Big } from "./big.ts";
import { Intersection, Polynomial, type IntersectionSegment } from "./intersection.ts";

type Encoded = number | string | boolean | null | Encoded[] | SegmentSpec;

interface SegmentSpec {
  k: "L" | "C";
  a?: Encoded;
  b?: Encoded;
  p0?: Encoded;
  c1?: Encoded;
  c2?: Encoded;
  p1?: Encoded;
  pieces?: number;
  pick?: number;
}

interface RecordedCase {
  fn: string;
  args: Encoded[];
  out: { ok?: unknown; err?: string; msg?: string; logs?: string[] };
}

const fixture = JSON.parse(
  readFileSync(new URL("./intersection.recorded.json", import.meta.url), "utf8"),
) as { cases: RecordedCase[] };

type Ids = Map<object, number>;

/** Decodes an argument: ["P", x, y] points, ["U"] undefined, ["S", spec] segments, big.js pairs. */
function decode(value: Encoded, ids: Ids): unknown {
  if (value === "-0") return -0;
  if (!Array.isArray(value)) return value;
  const tag = value[0];
  switch (tag) {
    case "P":
      return new Point(
        decode(value[1] as Encoded, ids) as number,
        decode(value[2] as Encoded, ids) as number,
      );
    case "U":
      return undefined;
    case "S":
      return buildSegment(value[1] as SegmentSpec, ids);
    case "BA":
      return [new Big(value[1] as number), new Big(value[2] as number)];
    case "BX":
      return [new Big(value[1] as number), value[2]];
    default:
      return value.map((item) => decode(item, ids));
  }
}

/**
 * A line segment, or one piece of a curve flattened into `pieces` poly
 * segments (the shape poly-segments.ts builds), numbered in creation order.
 */
function buildSegment(spec: SegmentSpec, ids: Ids): IntersectionSegment {
  const point = (value: Encoded | undefined): Point => decode(value as Encoded, ids) as Point;
  const node = (
    at: Point,
    m: number,
    rest: Partial<IntersectionSegment> = {},
  ): IntersectionSegment => {
    const created: IntersectionSegment = {
      point: at,
      next: null,
      m,
      currCurve: null,
      nextCurve: null,
      cp1: null,
      cp2: null,
      ...rest,
    };
    ids.set(created, ids.size);
    return created;
  };
  if (spec.k === "L") {
    const start = node(point(spec.a), 0);
    start.next = node(point(spec.b), 0);
    return start;
  }
  const p0 = point(spec.p0);
  const p1 = point(spec.p1);
  const pieces = spec.pieces as number;
  const curve = node(p0, 0, { cp1: point(spec.c1), cp2: spec.c2 ? point(spec.c2) : null });
  curve.currCurve = curve;
  const end = node(p1, 0);
  curve.nextCurve = end;
  const segments = [curve];
  let previous = curve;
  for (let i = 1; i < pieces; i++) {
    const piece = node(p0.lerp(p1, i / pieces), i / pieces, { currCurve: curve, nextCurve: end });
    previous.next = piece;
    previous = piece;
    segments.push(piece);
  }
  previous.next = end;
  return segments[spec.pick as number] as IntersectionSegment;
}

/** The recorded form: numbers as strings, Points as pairs, poly segments by number. */
function normalize(value: unknown, ids: Ids, seen = new Set<object>()): unknown {
  if (value === undefined) return "undef";
  if (typeof value === "number") return Object.is(value, -0) ? "-0" : String(value);
  if (typeof value === "function") return "function";
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Big) return "Big:" + value.toString();
  if (value instanceof Point) return [normalize(value.getX(), ids), normalize(value.getY(), ids)];
  if (seen.has(value)) return "cycle";
  seen.add(value);
  if (Array.isArray(value) || ArrayBuffer.isView(value)) {
    return Array.from(value as ArrayLike<unknown>, (item) => normalize(item, ids, seen));
  }
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === "polySeg0" || key === "polySeg1") out[key] = ids.get(item as object) ?? "?";
    else if (key !== "jt") out[key] = normalize(item, ids, seen);
  }
  return out;
}

type AnyFunction = (...args: unknown[]) => unknown;

function call(name: string, rawArgs: Encoded[]): [unknown, Ids] {
  const ids: Ids = new Map();
  const args = rawArgs.map((arg) => decode(arg, ids));
  const [kind, method] = name.split(".") as [string, string | undefined];
  if (kind === "hitTestBezier3OnCurve") {
    const [a, b, c, d, tolerance] = args as [Point, Point, Point, Point, number | undefined];
    const onCurve = a.lerp(b, 0.3).lerp(c.lerp(d, 0.3), 0.3);
    return [Intersection.hitTestBezier3(a, b, c, d, onCurve, tolerance), ids];
  }
  if (kind === "Polynomial") {
    const [coefficients, x] = args as [number[], number];
    const poly = new Polynomial(coefficients.slice());
    switch (method) {
      case "getRootsInInterval":
        return [[poly.getRootsInInterval(0, 1), poly.coefs], ids];
      case "getRootsInIntervalBisection":
        return [poly.getRootsInIntervalBisection(0, 1), ids];
      case "getDerivative":
        return [poly.getDerivative().coefs, ids];
      case "eval":
        return [poly.eval(x), ids];
      case "scale":
        return [[poly.scale(), poly.coefs], ids];
      case "removeMultipleRoots": {
        const roots = coefficients.slice();
        Intersection.removeMultipleRoots(roots);
        return [roots, ids];
      }
      default:
        return [[(poly[method as keyof Polynomial] as AnyFunction).call(poly), poly.coefs], ids];
    }
  }
  if (kind === "PolynomialBig") {
    const poly = new Polynomial((args[0] as number[]).map((c) => new Big(c)));
    if (method === "scale") {
      poly.scale(true);
      return [poly.coefs, ids];
    }
    return [[(poly[method as keyof Polynomial] as AnyFunction).call(poly, true), poly.coefs], ids];
  }
  const fn = Intersection[kind as keyof typeof Intersection] as unknown as AnyFunction;
  return [fn(...args), ids];
}

function run(testCase: RecordedCase): RecordedCase["out"] {
  const logs: string[] = [];
  const spy = vi.spyOn(console, "log").mockImplementation((...parts: unknown[]) => {
    logs.push(parts.join(" "));
  });
  try {
    const [value, ids] = call(testCase.fn, testCase.args);
    return { ok: normalize(value, ids), ...(logs.length ? { logs } : {}) };
  } catch (error) {
    const e = error as Error;
    return { err: e.constructor.name, msg: String(e.message), ...(logs.length ? { logs } : {}) };
  } finally {
    spy.mockRestore();
  }
}

const byFunction = new Map<string, RecordedCase[]>();
for (const testCase of fixture.cases) {
  const list = byFunction.get(testCase.fn) ?? [];
  list.push(testCase);
  byFunction.set(testCase.fn, list);
}

describe("intersection against recorded old outputs", () => {
  for (const [name, cases] of byFunction) {
    it(`${name} (${cases.length} cases)`, () => {
      for (const [index, testCase] of cases.entries()) {
        expect(run(testCase), `${name} case ${index}: ${JSON.stringify(testCase.args)}`).toEqual(
          testCase.out,
        );
      }
    });
  }
});

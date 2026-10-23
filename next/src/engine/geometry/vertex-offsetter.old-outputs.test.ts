// Compares the offsetter with outputs of the old GVertexOffsetter
// (chunk.vendor.js module 651), recorded once in Node into
// test-data/old-offsetter-outputs.json. The cases are hand-picked sources
// (rounded rectangles and other line/arc mixes, open compound paths, paths
// that end on their start, degenerate curves, inputs that throw) at offsets
// 0/1/18/60 with every side combination, plus seeded random sources, some
// of them kept because they reach a branch no other case reaches. Every
// output number is compared with Object.is, thrown errors by type and
// message.
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { Point } from "../math/point.ts";
import { Vertex } from "./vertex.ts";
import { VertexContainer } from "./vertex-container.ts";
import { VertexOffsetter } from "./vertex-offsetter.ts";

/** In arguments and helper results, -0, NaN and Infinity are strings, undefined is "undefined". */
type Stored = number | string | boolean | null;

interface OffsetCase {
  name: string;
  source: number[];
  args: Stored[];
  /** The output vertices as "command,x,y,..." (String() of each number, -0 as "-0"). */
  out?: string;
  throws?: string;
}

type HelperArg =
  number | { p: [number, number] } | { s: [number, number, number, number, number, number] };

interface HelperCase {
  name: string;
  method: "_getSegmToArcSqrDist" | "_getArcToArcSqrDist" | "_getPlSegmSqrDist";
  args: HelperArg[];
  out?: Stored;
  throws?: string;
}

const fixture = JSON.parse(
  fs.readFileSync(new URL("./test-data/old-offsetter-outputs.json", import.meta.url), "utf8"),
) as { cases: OffsetCase[]; helpers: HelperCase[] };

const decode = (value: Stored): unknown => {
  if (value === "undefined") return undefined;
  if (value === "-0") return -0;
  if (value === "NaN" || value === "Infinity" || value === "-Infinity") return Number(value);
  return value;
};

const errorText = (error: unknown): string =>
  error instanceof Error ? `${error.constructor.name}: ${error.message}` : String(error);

type RunResult = { out: number[] } | { throws: string };

const runOffsetter = (source: number[], args: Stored[]): RunResult => {
  const container = new VertexContainer();
  for (let i = 0; i < source.length; i += 3)
    container.addVertex(source[i] as number, source[i + 1] as number, source[i + 2] as number);
  try {
    const [offset, inset, outset, tolerance, cap] = args.map(decode);
    const offsetter = new VertexOffsetter(
      container,
      offset as number,
      inset as boolean,
      outset as boolean,
      tolerance as number,
      cap as string,
    );
    offsetter.rewindVertices(0);
    const vertex = new Vertex();
    const out: number[] = [];
    while (offsetter.readVertex(vertex)) out.push(vertex.command, vertex.x, vertex.y);
    return { out };
  } catch (error) {
    return { throws: errorText(error) };
  }
};

/** Describes how a result differs from the recorded one, or returns null. */
const difference = (recorded: OffsetCase, result: RunResult): string | null => {
  if (recorded.throws !== undefined)
    return "throws" in result && result.throws === recorded.throws
      ? null
      : `expected throw "${recorded.throws}", got ${JSON.stringify(result)}`.slice(0, 300);
  if ("throws" in result) return `unexpected throw "${result.throws}"`;
  const expected = recorded.out ? recorded.out.split(",").map(Number) : [];
  if (expected.length !== result.out.length)
    return `length ${result.out.length}, expected ${expected.length}`;
  for (let i = 0; i < expected.length; i++)
    if (!Object.is(expected[i], result.out[i]))
      return `value ${i}: ${result.out[i]}, expected ${String(expected[i])}`;
  return null;
};

// One test per source (named) or per random generator mode.
const groups = new Map<string, OffsetCase[]>();
for (const recorded of fixture.cases) {
  const words = recorded.name.split(" ");
  const group = words[0] == "random" ? `random ${words[1]}` : (words[0] as string);
  if (!groups.has(group)) groups.set(group, []);
  groups.get(group)?.push(recorded);
}

describe("VertexOffsetter against recorded old outputs", () => {
  it("has the recorded cases", () => {
    expect(fixture.cases.length).toBeGreaterThan(1000);
    expect([...groups.keys()]).toEqual(
      expect.arrayContaining(["roundedRect", "twoOpenSubpaths", "endsOnStart", "random mixed"]),
    );
  });

  for (const [group, cases] of groups) {
    it(`matches the old output for ${group} (${cases.length} cases)`, () => {
      const mismatches: string[] = [];
      for (const recorded of cases) {
        const diff = difference(recorded, runOffsetter(recorded.source, recorded.args));
        if (diff) mismatches.push(`${recorded.name}: ${diff}`);
      }
      expect(mismatches).toEqual([]);
    });
  }

  it("matches the old distance helpers", () => {
    const self = Object.create(VertexOffsetter.prototype) as VertexOffsetter;
    const makeArg = (arg: HelperArg): unknown => {
      if (typeof arg == "number") return arg;
      if ("p" in arg) return new Point(arg.p[0], arg.p[1]);
      const [x, y, bulge, cx, cy, radius] = arg.s;
      return new VertexOffsetter.PolySegment(new Point(x, y), bulge, new Point(cx, cy), radius);
    };
    const mismatches: string[] = [];
    for (const helper of fixture.helpers) {
      let result: unknown;
      try {
        const method = self[helper.method] as (...args: unknown[]) => number;
        result = method.apply(self, helper.args.map(makeArg));
      } catch (error) {
        result = { throws: errorText(error) };
      }
      const expected =
        helper.throws !== undefined ? { throws: helper.throws } : decode(helper.out as Stored);
      const same =
        typeof expected == "number"
          ? Object.is(result, expected)
          : JSON.stringify(result) === JSON.stringify(expected);
      if (!same) mismatches.push(`${helper.name}: ${String(result)}, expected ${String(expected)}`);
    }
    expect(mismatches).toEqual([]);
  });
});

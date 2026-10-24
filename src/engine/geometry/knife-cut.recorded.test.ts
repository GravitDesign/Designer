// performCut and checkSideOfUncut on seeded random inputs (open and
// closed paths, lines, Curve and Curve2, 0-4 intersections, null paths,
// fit undefined/true/false, alternateParts on and off) plus hand-made
// cuts, against the outputs of the old module 1079 recorded once in
// knife-cut.recorded.json (results, UNCHANGED and null returns, thrown
// errors and console output). The recording script lives outside the repo.
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { Vertex } from "./vertex.ts";
import { VertexContainer } from "./vertex-container.ts";
import { KnifeCut, type KnifeCutAnchor, type KnifeCutPath } from "./knife-cut.ts";

type Pair = [number, number];

interface RecordedCut {
  input: {
    cutter: number[];
    paths: (number[] | null)[];
    cut: (Pair | null)[];
    cutterA: (Pair | null)[];
    closed: boolean;
    fit?: boolean;
    alt: boolean;
  };
  out: { result?: unknown; side?: number; err?: string; msg?: string; logs: string[] };
  hand?: boolean;
}

const fixture = JSON.parse(
  readFileSync(new URL("./knife-cut.recorded.json", import.meta.url), "utf8"),
) as { cases: RecordedCut[] };

function path(data: number[]): KnifeCutPath {
  const c = VertexContainer.deserialize(data);
  return {
    rewindVertices: (index?: number) => c.rewindVertices(index),
    readVertex: (vertex: Vertex) => c.readVertex(vertex),
    hasVertexForRead: () => c.hasVertexForRead(),
    _vertices: { getCount: () => c.getCount() },
  };
}

const anchor = (pair: Pair | null): KnifeCutAnchor | null =>
  pair && { getProperty: (name) => (name === "x" ? pair[0] : pair[1]) };

function run({ input }: RecordedCut): RecordedCut["out"] {
  const logs: string[] = [];
  const spy = vi.spyOn(console, "log").mockImplementation((...parts: unknown[]) => {
    logs.push(parts.join(" "));
  });
  try {
    const knife = new KnifeCut(path(input.cutter));
    const result = knife.performCut(
      input.paths.map((p) => (p ? path(p) : null)),
      input.cut.map(anchor),
      input.cutterA.map(anchor),
      input.closed,
      null,
      input.fit,
      input.alt,
    );
    const side = knife.checkSideOfUncut(
      VertexContainer.deserialize(input.cutter),
      VertexContainer.deserialize(input.paths[0] ?? input.cutter),
    );
    return {
      result: Array.isArray(result)
        ? result.map((list) => list.map((c) => (c ? VertexContainer.serialize(c) : c)))
        : result,
      side,
      logs,
    };
  } catch (error) {
    const e = error as Error;
    return { err: e.constructor.name, msg: e.message, logs };
  } finally {
    spy.mockRestore();
  }
}

describe("KnifeCut against recorded old outputs", () => {
  const hand = fixture.cases.filter((c) => c.hand);
  const random = fixture.cases.filter((c) => !c.hand);

  it(`matches ${hand.length} hand-made cuts`, () => {
    for (const [index, c] of hand.entries()) {
      expect(run(c), `hand case ${index}: ${JSON.stringify(c.input)}`).toEqual(c.out);
    }
  });

  it(`matches ${random.length} seeded random cuts`, () => {
    for (const [index, c] of random.entries()) {
      expect(run(c), `random case ${index}: ${JSON.stringify(c.input)}`).toEqual(c.out);
    }
  });
});

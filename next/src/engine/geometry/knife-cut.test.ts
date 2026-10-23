import { describe, expect, it } from "vitest";
import type { Vertex } from "./vertex.ts";
import { VertexContainer } from "./vertex-container.ts";
import { KnifeCut, type KnifeCutAnchor, type KnifeCutPath } from "./knife-cut.ts";

/** A path as the knife sees a GPath: a vertex source with a vertex list. */
function path(data: number[]): KnifeCutPath {
  const c = VertexContainer.deserialize(data);
  return {
    rewindVertices: (index?: number) => c.rewindVertices(index),
    readVertex: (vertex: Vertex) => c.readVertex(vertex),
    hasVertexForRead: () => c.hasVertexForRead(),
    _vertices: { getCount: () => c.getCount() },
  };
}

const anchor = (x: number, y: number): KnifeCutAnchor => ({
  getProperty: (name) => (name === "x" ? x : y),
});

const serialize = (result: ReturnType<KnifeCut["performCut"]>): unknown =>
  Array.isArray(result)
    ? result.map((side) => side.map((c) => VertexContainer.serialize(c)))
    : result;

// A vertical cutter through x = 50, with the intersection vertices that
// GPath.addIntersectionPoints would have inserted.
const cutterThroughSquare = [1, 50, -20, 2, 50, 0, 2, 50, 100, 2, 50, 120];
// The closed square (0,0)-(100,100) with vertices at the two cuts and
// the closing line back to the start.
const square = [1, 0, 0, 2, 50, 0, 2, 100, 0, 2, 100, 100, 2, 50, 100, 2, 0, 100, 2, 0, 0, 5, 0, 0];

describe("KnifeCut", () => {
  it("cuts a closed square into two closed halves, one per side", () => {
    const cut = new KnifeCut(path(cutterThroughSquare));
    const at = [anchor(50, 0), anchor(50, 100)];
    expect(serialize(cut.performCut([path(square)], at, at, true))).toEqual([
      [[1, 50, 100, 2, 0, 100, 2, 0, 0, 2, 50, 0, 2, 50, 100, 5, 0, 0]],
      [[1, 50, 100, 2, 100, 100, 2, 100, 0, 2, 50, 0, 2, 50, 100, 5, 0, 0]],
      [],
    ]);
  });

  it("cuts an open line into its two sides without closing them", () => {
    const cut = new KnifeCut(path([1, 50, -20, 2, 50, 50, 2, 50, 120]));
    const at = [anchor(50, 50)];
    expect(
      serialize(cut.performCut([path([1, 0, 50, 2, 50, 50, 2, 100, 50])], at, at, false)),
    ).toEqual([[[1, 0, 50, 2, 50, 50]], [[1, 50, 50, 2, 100, 50]], []]);
  });

  it("returns UNCHANGED without intersections and null for a missing anchor", () => {
    const cut = new KnifeCut(path(cutterThroughSquare));
    const line = path([1, 0, 50, 2, 100, 50]);
    expect(cut.performCut([line], [], [anchor(50, 50)], false)).toBe(KnifeCut.UNCHANGED);
    expect(cut.performCut([line], [anchor(50, 50)], [], false)).toBe(KnifeCut.UNCHANGED);
    expect(cut.performCut([line], [anchor(50, 50)], [null], false)).toBeNull();
    // An intersection the paths don't have: nothing breaks apart.
    expect(cut.performCut([line], [anchor(7, 7)], [anchor(7, 7)], false)).toBeNull();
  });

  it("tells which side of the cutter an uncut path lies on", () => {
    const cut = new KnifeCut(path(cutterThroughSquare));
    const cutter = VertexContainer.deserialize(cutterThroughSquare);
    expect(cut.checkSideOfUncut(cutter, VertexContainer.deserialize([1, 80, 10, 2, 90, 10]))).toBe(
      1,
    );
    expect(cut.checkSideOfUncut(cutter, VertexContainer.deserialize([1, 10, 10, 2, 20, 10]))).toBe(
      0,
    );
    expect(cut.checkSideOfUncut(cutter, VertexContainer.deserialize([1, 50, 10, 2, 50, 30]))).toBe(
      2,
    );
    expect(cut.checkSideOfUncut(new VertexContainer(), cutter)).toBe(2);
  });

  it("drops a Move to where the previous vertex ended", () => {
    const c = VertexContainer.deserialize([1, 0, 0, 2, 10, 0, 1, 10, 0, 2, 10, 10, 1, 5, 5]);
    new KnifeCut(path(cutterThroughSquare))._correctMoveTo(c);
    expect(VertexContainer.serialize(c)).toEqual([1, 0, 0, 2, 10, 0, 2, 10, 10, 1, 5, 5]);
  });
});

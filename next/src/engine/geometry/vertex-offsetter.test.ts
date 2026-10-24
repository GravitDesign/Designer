import { describe, expect, it } from "vitest";
import { getTypeId } from "../core/object.ts";
import { Point } from "../math/point.ts";
import { Vertex } from "./vertex.ts";
import { VertexContainer } from "./vertex-container.ts";
import { VertexOffsetter } from "./vertex-offsetter.ts";

const square = (x: number, y: number, w: number): number[] => [
  1,
  x,
  y,
  2,
  x + w,
  y,
  2,
  x + w,
  y + w,
  2,
  x,
  y + w,
  5,
  0,
  0,
];

const offset = (
  data: number[],
  ...args: [offset: number, inset: boolean, outset: boolean, tolerance?: number, cap?: string]
): number[] =>
  VertexContainer.serialize(new VertexOffsetter(VertexContainer.deserialize(data), ...args));

describe("VertexOffsetter", () => {
  it("insets and outsets a square, keeping sharp line joins", () => {
    expect(offset(square(0, 0, 100), 10, true, false)).toEqual([
      1, 10, 10, 2, 90, 10, 2, 90, 90, 2, 10, 90, 2, 10, 10,
    ]);
    expect(offset(square(0, 0, 100), 10, false, true)).toEqual([
      1, -10, -10, 2, 110, -10, 2, 110, 110, 2, -10, 110, 2, -10, -10,
    ]);
    // The sign of the offset is ignored.
    expect(offset(square(0, 0, 100), -10, true, false)).toEqual(
      offset(square(0, 0, 100), 10, true, false),
    );
  });

  it("goes on to the next sub-path when one collapses under the inset", () => {
    const compound = [...square(0, 0, 4), ...square(10, 0, 100)];
    expect(offset(compound, 5, true, false)).toEqual([
      1, 15, 5, 2, 105, 5, 2, 105, 95, 2, 15, 95, 2, 15, 5,
    ]);
  });

  it("outlines an open line with butt and square caps", () => {
    const line = [1, 0, 0, 2, 100, 0];
    expect(offset(line, 10, true, true, 0, "butt")).toEqual([
      1, 0, 10, 2, 0, -10, 2, 100, -10, 2, 100, 10, 2, 0, 10,
    ]);
    expect(offset(line, 10, true, true, 0, "square")).toEqual([
      1, 0, 10, 2, -10, 10, 2, -10, -10, 2, 0, -10, 2, 100, -10, 2, 110, -10, 2, 110, 10, 2, 100,
      10, 2, 0, 10,
    ]);
  });

  it("gives an open line round caps made of cubic curves", () => {
    const out = offset([1, 0, 0, 2, 100, 0], 10, true, true, 0, "round");
    const commands = out.filter((_, i) => i % 3 == 0);
    expect(commands[0]).toBe(Vertex.Command.Move);
    expect(commands).toContain(Vertex.Command.Curve2);
    // The caps reach 10 beyond the ends.
    const xs = out.filter((_, i) => i % 3 == 1);
    expect(Math.min(...xs)).toBe(-10);
    expect(Math.max(...xs)).toBe(110);
  });

  it("bends the end cap inward when no cap is given (old quirk)", () => {
    const out = offset([1, 0, 0, 2, 100, 0], 10, true, true);
    const xs = out.filter((_, i) => i % 3 == 1);
    expect(Math.min(...xs)).toBe(-10);
    // The end cap's arc gets the reversed bulge and bulges back to x = 90.
    expect(Math.max(...xs)).toBe(100);
    expect(xs).toContain(90);
  });

  it("rounds the output to the tolerance's decimal places", () => {
    const line = [1, 0, 0, 2, 100, 0];
    expect(new VertexOffsetter(VertexContainer.deserialize(line), 1, true, true)._tolRange).toBe(
      100,
    );
    expect(
      new VertexOffsetter(VertexContainer.deserialize(line), 1, true, true, 0.003)._tolRange,
    ).toBe(1000);
    expect(new VertexOffsetter(VertexContainer.deserialize(line), 1, true, true, 3)._tolRange).toBe(
      1,
    );
    const out = offset([1, 0, 0, 2, 100, 0], 10 / 3, true, true, 3, "butt");
    expect(out).toEqual([1, 0, 3, 2, 0, -3, 2, 100, -3, 2, 100, 3, 2, 0, 3]);
  });

  it("only rewinds to 0", () => {
    const source = VertexContainer.deserialize(square(0, 0, 10));
    const offsetter = new VertexOffsetter(source, 1, true, false);
    expect(offsetter.rewindVertices(1)).toBe(false);
    expect(offsetter.rewindVertices(0)).toBe(true);
    expect(offsetter.hasVertexForRead()).toBe(true);
    expect(offsetter.toString()).toBe("[Object GVertexOffsetter]");
  });

  it("throws for offset 0 on an open path with both sides (old crash)", () => {
    // QUESTIONS.md "Offsetter: offset 0 on an open path with both sides throws".
    const zigzag = [1, 0, 0, 2, 50, 40, 2, 100, 0, 2, 150, 60];
    for (const cap of [undefined, "butt", "round", "square"])
      expect(() => offset(zigzag, 0, true, true, 0, cap)).toThrow(
        new TypeError("Cannot read properties of null (reading 'point')"),
      );
    // One side, or a tiny offset, works.
    expect(offset(zigzag, 0, true, false, 0, "butt").length).toBeGreaterThan(0);
    expect(offset(zigzag, 1e-5, true, true, 0, "butt").length).toBeGreaterThan(0);
  });

  it("throws the old ReferenceError for an unknown vertex command", () => {
    expect(() => offset([1, 0, 0, 2, 100, 0, 99, 50, 50], 10, true, true)).toThrow(
      new ReferenceError("vertex is not defined"),
    );
  });

  it("treats an open path that ends on its start as closed", () => {
    const read = (data: number[]): VertexOffsetter => {
      const offsetter = new VertexOffsetter(VertexContainer.deserialize(data), 10, true, true);
      offsetter.rewindVertices(0);
      offsetter.readVertex(new Vertex());
      return offsetter;
    };
    expect(read([1, 0, 0, 2, 100, 0, 2, 50, 80, 2, 0, 0])._polyline.closed).toBe(true);
    expect(read([1, 0, 0, 2, 100, 0, 2, 50, 80, 2, 0, 1])._polyline.closed).toBeFalsy();
  });

  it("offsets each open sub-path of a compound path on its own", () => {
    const out = offset([1, 0, 0, 2, 100, 0, 1, 0, 50, 2, 100, 50], 10, true, true, 0, "butt");
    expect(out).toEqual([
      1, 0, 10, 2, 0, -10, 2, 100, -10, 2, 100, 10, 2, 0, 10, 1, 0, 60, 2, 0, 40, 2, 100, 40, 2,
      100, 60, 2, 0, 60,
    ]);
  });

  it("clips inset-only parts of an open path that touch the source near its ends (BUG-012)", () => {
    // Found by random search. The trimmed inset crosses itself and splits
    // into parts; a part that comes near the source at one of its ends is
    // clipped like on the outset side. The old code dropped every such
    // part, which left this inset empty.
    const source = [1, 42, 94, 2, 25, 13, 4, 1, 29, 4, 28, 42, 4, 22, 80];
    const offsetter = new VertexOffsetter(VertexContainer.deserialize(source), 30, true, false);
    const split = offsetter._splitForClipping.bind(offsetter);
    const partCounts: number[] = [];
    offsetter._splitForClipping = (polyline, hits) => {
      const parts = split(polyline, hits);
      partCounts.push(parts.length);
      return parts;
    };
    const inset = VertexContainer.serialize(offsetter);
    expect(partCounts).toEqual([3]);
    expect(inset.filter((value, i) => i % 3 == 0 && value == Vertex.Command.Move)).toHaveLength(2);
    expect(inset.every(Number.isFinite)).toBe(true);
    // The outset of the same path, which clips instead, keeps two parts.
    const outset = offset(source, 30, false, true);
    expect(outset.filter((value, i) => i % 3 == 0 && value == Vertex.Command.Move)).toHaveLength(2);
  });

  it("cuts an arc with no earlier line cut without putting NaN into the output (old quirk)", () => {
    // Found by random search: _excludeCircleInside starts the rest of a cut
    // arc at (cutX, cutY) while both are still undefined (QUESTIONS.md
    // "Offsetter: the rest of a cut arc starts at an unset cut point").
    // The segment is dropped later; the exact output is pinned against the
    // old code in vertex-offsetter.old-outputs.test.ts.
    const source = [1, 1, 10, 3, 35, 43, 3, 70, 65, 4, 80, 92, 4, 16, 94, 4, 85, 64];
    const out = offset(source, 43, true, true, 0);
    expect(out).toHaveLength(165);
    expect(out.every(Number.isFinite)).toBe(true);
  });

  it("uses dx for y in the tangent point of the segment-to-arc distance (old quirk)", () => {
    // QUESTIONS.md "Offsetter: the tangent point of a line uses dx for y".
    const offsetter = Object.create(VertexOffsetter.prototype) as VertexOffsetter;
    const quarter = Math.tan(Math.PI / 8);
    const distance = (p1: Point, p2: Point): number =>
      offsetter._getSegmToArcSqrDist(
        new Point(10, 0),
        quarter,
        new Point(0, 0),
        10,
        new Point(0, 10),
        p1,
        p2,
        400,
      );
    // The horizontal line touches the arc at its end (0, 10), but the
    // touch point is computed as (0, 30), so the end-point distance wins.
    expect(distance(new Point(-20, 10), new Point(20, 10))).toBe(200);
    // A vertical tangent has dx = 0 and lands on p1, inside the segment.
    expect(distance(new Point(10, -20), new Point(10, 20))).toBe(0);
  });

  it("keeps the old type ids", () => {
    expect(getTypeId(VertexOffsetter)).toBe(110);
    expect(getTypeId(VertexOffsetter.PolyOffsetSegment)).toBe(111);
  });
});

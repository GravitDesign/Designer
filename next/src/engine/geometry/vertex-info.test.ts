import { describe, expect, it } from "vitest";
import { Point } from "../math/point.ts";
import { Rect } from "../math/rect.ts";
import { VertexContainer } from "./vertex-container.ts";
import { VertexInfo, type VertexHitResult } from "./vertex-info.ts";

function vc(flat: number[]): VertexContainer {
  const c = new VertexContainer();
  for (let i = 0; i < flat.length; i += 3) {
    c.addVertex(flat[i] as number, flat[i + 1] as number, flat[i + 2] as number);
  }
  return c;
}

const square = (x: number, y: number, s: number) =>
  vc([1, x, y, 2, x + s, y, 2, x + s, y + s, 2, x, y + s, 5, 0, 0]);

function hit(): VertexHitResult {
  return { segment: null, x: null, y: null, slope: null, outline: null };
}

describe("VertexInfo.hitTest", () => {
  it("hits the outline within half the tolerance and reports where", () => {
    const r = hit();
    expect(VertexInfo.hitTest(50, -0.9, square(0, 0, 100), 2, false, r)).toBe(true);
    expect(r).toEqual({ segment: 1, x: 50, y: 0, slope: 0.5, outline: true });
    expect(VertexInfo.hitTest(50, -1.1, square(0, 0, 100), 2, false, hit())).toBe(false);
    // The closing segment counts as segment 4.
    const c = hit();
    expect(VertexInfo.hitTest(0, 25, square(0, 0, 100), 2, false, c)).toBe(true);
    expect(c.segment).toBe(4);
    expect(c.slope).toBe(0.75);
  });

  it("hits the fill only with `inside`, and marks it as no outline hit", () => {
    const r = hit();
    expect(VertexInfo.hitTest(50, 50, square(0, 0, 100), 0, false, r)).toBe(false);
    expect(VertexInfo.hitTest(50, 50, square(0, 0, 100), 0, true, r)).toBe(true);
    expect(r.outline).toBe(false);
    expect(VertexInfo.hitTest(150, 50, square(0, 0, 100), 0, true, hit())).toBe(false);
  });

  it("applies the old fill rule flags: null both signs, false +2, true -2", () => {
    const cw = square(0, 0, 100);
    const ccw = vc([1, 0, 0, 2, 0, 100, 2, 100, 100, 2, 100, 0, 5, 0, 0]);
    const results = [cw, ccw].map((s) => [
      VertexInfo.hitTest(50, 50, s, 0, true, null),
      VertexInfo.hitTest(50, 50, s, 0, true, null, false),
      VertexInfo.hitTest(50, 50, s, 0, true, null, true),
    ]);
    expect(results[0]).not.toEqual(results[1]);
    expect(results.map((r) => r[0])).toEqual([true, true]);
    expect(results.flatMap((r) => r.slice(1)).filter(Boolean)).toHaveLength(2);
  });

  it("leaves the hole of a donut out of the fill", () => {
    const donut = vc([
      1, 0, 0, 2, 100, 0, 2, 100, 100, 2, 0, 100, 5, 0, 0, 1, 25, 25, 2, 25, 75, 2, 75, 75, 2, 75,
      25, 5, 0, 0,
    ]);
    expect(VertexInfo.hitTest(10, 10, donut, 0, true, null)).toBe(true);
    expect(VertexInfo.hitTest(50, 50, donut, 0, true, null)).toBe(false);
  });

  it("works for a point at the origin (shifted winding test)", () => {
    expect(VertexInfo.hitTest(0, 0, square(-10, -10, 20), 0, true, null)).toBe(true);
    expect(VertexInfo.hitTest(0, 0, square(5, 5, 20), 0, true, null)).toBe(false);
  });

  it("hits quadratic and cubic outlines at the curve, not the chord", () => {
    // Quadratic (0,0) -> (100,0), control (50,100): the apex is at y = 50.
    const quad = vc([1, 0, 0, 3, 100, 0, 3, 50, 100]);
    const r = hit();
    expect(VertexInfo.hitTest(50, 50, quad, 2, false, r)).toBe(true);
    expect(r.slope).toBeCloseTo(0.5, 10);
    expect(r.y).toBeCloseTo(50, 10);
    expect(VertexInfo.hitTest(50, 10, quad, 2, false, null)).toBe(false);
    // Cubic (0,0) -> (100,0), controls (0,100) and (100,100): apex at y = 75.
    const cubic = vc([1, 0, 0, 4, 100, 0, 4, 0, 100, 4, 100, 100]);
    const c = hit();
    expect(VertexInfo.hitTest(50, 75, cubic, 2, false, c)).toBe(true);
    expect(c.segment).toBe(1);
    expect(c.x).toBeCloseTo(50, 6);
    expect(c.slope).toBeCloseTo(0.5, 6);
    expect(VertexInfo.hitTest(50, 50, cubic, 2, false, null)).toBe(false);
    expect(VertexInfo.hitTest(50, 50, vc([...cubicFlat(), 5, 0, 0]), 0, true, null)).toBe(true);
  });

  it("throws on an unknown command", () => {
    expect(() => VertexInfo.hitTest(1, 1, vc([1, 0, 0, 9, 1, 1]), 1)).toThrow(
      "Unknown vertex command: 9",
    );
  });
});

function cubicFlat(): number[] {
  return [1, 0, 0, 4, 100, 0, 4, 0, 100, 4, 100, 100];
}

describe("VertexInfo.calculateBounds", () => {
  it("counts control points unless exact", () => {
    const quad = vc([1, 0, 0, 3, 100, 0, 3, 50, 100]);
    expect(VertexInfo.calculateBounds(quad)).toEqual(new Rect(0, 0, 100, 100));
    expect(VertexInfo.calculateBounds(quad, true)).toEqual(new Rect(0, 0, 100, 50));
    const cubic = vc(cubicFlat());
    expect(VertexInfo.calculateBounds(cubic)).toEqual(new Rect(0, 0, 100, 100));
    expect(VertexInfo.calculateBounds(cubic, true)).toEqual(new Rect(0, 0, 100, 75));
  });

  it("is null without vertices and zero-sized for one point", () => {
    expect(VertexInfo.calculateBounds(vc([]))).toBeNull();
    expect(VertexInfo.calculateBounds(vc([1, 3, 4]))).toEqual(new Rect(3, 4, 0, 0));
  });
});

describe("VertexInfo.getPathLength", () => {
  it("adds lines and the closing segment, from the current position", () => {
    const s = square(0, 0, 10);
    s.rewindVertices(0);
    expect(VertexInfo.getPathLength(s)).toBe(40);
    // Not rewound: the source is already at its end.
    expect(VertexInfo.getPathLength(s)).toBe(0);
  });

  it("measures quadratics", () => {
    const s = vc([1, 0, 0, 3, 10, 0, 3, 5, 0]);
    s.rewindVertices(0);
    expect(VertexInfo.getPathLength(s)).toBeCloseTo(10, 6);
  });

  it("throws the old ReferenceError on a complete cubic", () => {
    const s = vc(cubicFlat());
    s.rewindVertices(0);
    expect(() => VertexInfo.getPathLength(s)).toThrow(ReferenceError);
    const truncated = vc([1, 0, 0, 4, 10, 0, 4, 1, 1]);
    truncated.rewindVertices(0);
    expect(VertexInfo.getPathLength(truncated)).toBe(0);
  });
});

describe("VertexInfo.getSegmentPoint", () => {
  it("interpolates on the asked segment, the last one past the end", () => {
    const s = square(0, 0, 10);
    expect(VertexInfo.getSegmentPoint(s, 2, 0.5)).toEqual(new Point(10, 5));
    expect(VertexInfo.getSegmentPoint(s, 4, 0.5)).toEqual(new Point(0, 5));
    expect(VertexInfo.getSegmentPoint(s, 9, 0.5)).toEqual(new Point(0, 5));
    expect(VertexInfo.getSegmentPoint(vc([1, 0, 0, 3, 100, 0, 3, 50, 100]), 1, 0.5)).toEqual(
      new Point(50, 50),
    );
    expect(VertexInfo.getSegmentPoint(vc(cubicFlat()), 1, 0.5)).toEqual(new Point(50, 75));
    expect(VertexInfo.getSegmentPoint(vc([]), 1, 0.5)).toBeNull();
  });
});

describe("VertexInfo.collinear", () => {
  it("compares lines", () => {
    expect(VertexInfo.collinear([0, 10], [0, 0], [0, 20], [0, 0])).toBe(true);
    expect(VertexInfo.collinear([0, 10], [0, 0], [11, 20], [0, 0])).toBe(false);
    expect(VertexInfo.collinear([0, 10], [0, 1], [0, 20], [0, 0])).toBe(false);
    expect(VertexInfo.collinear([0, 10.5], [0, 0], [0, 10], [0, 0])).toBe(false);
    expect(VertexInfo.collinear([0, 10.5], [0, 0], [0, 10], [0, 0], 1)).toBe(true);
  });

  it("compares a line with a flat curve, in either order", () => {
    expect(VertexInfo.collinear([0, 3, 6, 20], [0, 0, 0, 0], [0, 10], [0, 0])).toBe(true);
    expect(VertexInfo.collinear([0, 10], [0, 0], [0, 3, 6, 20], [0, 1, 0, 0])).toBe(false);
  });

  it("compares two curves through sample points", () => {
    const xs = [0, 3, 6, 9];
    const ys = [0, 5, -5, 0];
    expect(VertexInfo.collinear(xs, ys, xs, ys)).toBe(true);
    expect(VertexInfo.collinear(xs, ys, xs, [0, 5.1, -5, 0])).toBe(false);
  });

  it("keeps only the start point of a curve with a degenerate control (old quirk)", () => {
    // [0,0],[0,0],[9,9],[9,9] reduces to one point, so it is never collinear.
    expect(VertexInfo.collinear([0, 0, 9, 9], [0, 0, 9, 9], [0, 9], [0, 9])).toBe(false);
  });

  it("has the old toString", () => {
    expect(VertexInfo.toString()).toBe("[Object GVertexInfo]");
  });
});

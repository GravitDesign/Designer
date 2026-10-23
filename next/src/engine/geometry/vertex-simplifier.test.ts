import { describe, expect, it } from "vitest";
import { OLD, build, ellipse, verts } from "./boolean/test-helpers.ts";
import { VertexSimplifier } from "./vertex-simplifier.ts";

const simplify = (flat: number[], tolerance: number, lines: boolean, subdivide: boolean) =>
  verts(new VertexSimplifier(build(flat)).simplify(tolerance, lines, subdivide));

describe("VertexSimplifier", () => {
  it("refits curves sampled by flattening, at inflections, and with lines", () => {
    const modes: [boolean, boolean][] = [
      [false, true],
      [false, false],
      [true, true],
    ];
    expect(
      modes.map(([lines, subdivide]) => simplify(ellipse(50, 50, 50, 30), 0.4, lines, subdivide)),
    ).toEqual(OLD.simplify);
  });

  it("smooths an almost straight polyline into curves with includeLines", () => {
    const zigzag = [1, 0, 0, 2, 10, 0.01, 2, 20, 0, 2, 30, -0.01, 2, 40, 0];
    expect(simplify(zigzag, 2, true, true)).toEqual(OLD.simplifyLines);
  });

  it("allows at least 200 segments when refitting lines", () => {
    expect(simplify(OLD.walk as number[], 0.05, true, true)).toEqual(OLD.walkSimplified);
  });

  it("refits a quadratic and keeps the lines", () => {
    const quad = [1, 0, 0, 3, 100, 0, 3, 50, 80, 2, 100, 100];
    expect(simplify(quad, 0.5, false, false)).toEqual(OLD.simplifyQuad);
  });

  it("gives an empty container without a source", () => {
    expect(verts(new VertexSimplifier(null).simplify(1, false, true))).toEqual(OLD.simplifyNull);
    expect(String(new VertexSimplifier(null))).toBe("[Object GVertexSimplifier]");
  });
});

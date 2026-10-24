import { describe, expect, it } from "vitest";
import recorded from "./__fixtures__/svg-values.recorded.json" with { type: "json" };
import { arcToBezier, type ArcParameters } from "./helpers.ts";

describe("arcToBezier", () => {
  // Recorded with the old module in Node: Node's Math.tan and atan differ
  // from Chromium's in the last bits for some of these inputs.
  it("matches the old importer's arc segments exactly for unrotated arcs", () => {
    const inputs = recorded.inputs.ARCS as ArcParameters[];
    inputs.forEach((input, i) => {
      if (input.xAxisRotation) return;
      expect(arcToBezier(input)).toEqual(recorded.outputs.arcs[i]);
    });
  });

  // BUG-070: the old helper took the rotation as degrees, so it gave the
  // right arc only for a rotation in degrees. The same rotation in
  // radians now gives that arc.
  it("takes the rotation in radians (BUG-070)", () => {
    const inputs = recorded.inputs.ARCS as ArcParameters[];
    let checked = 0;
    inputs.forEach((input, i) => {
      const degrees = input.xAxisRotation;
      if (!degrees || Math.abs(degrees) < 7) return;
      const segments = arcToBezier({ ...input, xAxisRotation: (degrees * Math.PI) / 180 });
      const expected = recorded.outputs.arcs[i] as Record<string, number>[];
      expect(segments).toHaveLength(expected.length);
      segments.forEach((segment, j) => {
        for (const key of ["x1", "y1", "x2", "y2", "x", "y"] as const) {
          expect(segment[key]).toBeCloseTo(expected[j]?.[key] ?? NaN, 9);
        }
      });
      checked++;
    });
    expect(checked).toBe(3);
  });

  it("draws a quarter-turned ellipse upright (BUG-070)", () => {
    // rx 20 along the rotated x axis, which now points down: the half
    // ellipse from (0, 0) to (0, 40) bulges 10 to the side.
    const segments = arcToBezier({
      px: 0,
      py: 0,
      cx: 0,
      cy: 40,
      rx: 20,
      ry: 10,
      xAxisRotation: Math.PI / 2,
      sweepFlag: 1,
    });
    expect(segments).toHaveLength(2);
    expect(Math.abs(segments[0]?.x ?? NaN)).toBeCloseTo(10, 9);
    expect(segments[0]?.y).toBeCloseTo(20, 9);
    expect(segments[1]?.x).toBeCloseTo(0, 9);
    expect(segments[1]?.y).toBeCloseTo(40, 9);
  });

  it("splits a half turn into two quarter-turn segments ending at the end point", () => {
    const segments = arcToBezier({ px: 0, py: 0, cx: 10, cy: 0, rx: 5, ry: 5 });
    expect(segments).toHaveLength(2);
    const last = segments[segments.length - 1];
    expect(last?.x).toBeCloseTo(10, 12);
    expect(last?.y).toBeCloseTo(0, 12);
  });

  it("gives nothing for a zero radius or an arc that ends where it starts", () => {
    expect(arcToBezier({ px: 0, py: 0, cx: 10, cy: 10, rx: 0, ry: 5 })).toEqual([]);
    expect(arcToBezier({ px: 3, py: 3, cx: 3, cy: 3, rx: 5, ry: 5 })).toEqual([]);
  });
});

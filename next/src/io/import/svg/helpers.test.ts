import { describe, expect, it } from "vitest";
import recorded from "./__fixtures__/svg-values.recorded.json" with { type: "json" };
import { arcToBezier, type ArcParameters } from "./helpers.ts";

describe("arcToBezier", () => {
  // Recorded with the old module in Node: Node's Math.tan and atan differ
  // from Chromium's in the last bits for some of these inputs.
  it("matches the old importer's arc segments exactly", () => {
    const inputs = recorded.inputs.ARCS as ArcParameters[];
    inputs.forEach((input, i) => {
      expect(arcToBezier(input)).toEqual(recorded.outputs.arcs[i]);
    });
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

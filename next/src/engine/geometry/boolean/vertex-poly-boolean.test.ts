import { describe, expect, it } from "vitest";
import { VertexPolyBoolean } from "./vertex-poly-boolean.ts";
import { OLD, build, ellipse, rect, verts } from "./test-helpers.ts";

type Args = ConstructorParameters<typeof VertexPolyBoolean>;

function ops(a: number[], b: number[], args: Args): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const list: [string, number][] = [
    ["OR", VertexPolyBoolean.OR],
    ["XOR", VertexPolyBoolean.XOR],
    ["AND", VertexPolyBoolean.AND],
    ["SUB", VertexPolyBoolean.SUB],
    ["NONE", 0],
  ];
  for (const [name, op] of list) {
    const boolean = new VertexPolyBoolean(...args);
    const ok = boolean.initializeSources(build(a), build(b));
    out[name] = ok
      ? {
          res: (boolean.clipOp(op) ?? []).map((s) => verts(s)),
          didNotClip: boolean.didNotClip,
          holes: boolean.hassHoles,
        }
      : { ok };
  }
  return out;
}

const quad = [1, 0, 0, 3, 100, 0, 3, 50, -60, 2, 100, 100, 2, 0, 100, 5, 0, 0];

describe("VertexPolyBoolean", () => {
  it("clips overlapping rectangles (merge tool settings)", () => {
    expect(ops(rect(0, 0, 100, 100), rect(50, 50, 100, 100), [1, -1])).toEqual(OLD.rects);
  });

  it("keeps or drops nested sub-paths by containment", () => {
    expect(ops(rect(0, 0, 100, 100), rect(25, 25, 50, 50), [1, -2, false, false])).toEqual(
      OLD.nested,
    );
  });

  it("reports didNotClip for disjoint shapes", () => {
    expect(ops(rect(0, 0, 10, 10), rect(50, 50, 10, 10), [1, -1])).toEqual(OLD.disjoint);
  });

  it("splits cubics at the intersections with useIntersector", () => {
    expect(ops(ellipse(50, 50, 50, 50), ellipse(100, 50, 50, 50), [1, -1, true])).toEqual(
      OLD.circles,
    );
  });

  it("splits quadratics", () => {
    expect(ops(quad, rect(20, -40, 60, 200), [1, -1])).toEqual(OLD.quads);
  });

  it("applies a fixed policy to common segments", () => {
    expect(ops(rect(0, 0, 50, 50), rect(50, 0, 50, 50), [1, 1, false, false])).toEqual(
      OLD.sharedEdge,
    );
  });

  it("ignores the point in polygon argument and turns policy 0 into AUTO", () => {
    // Old quirks: the constructor always used odd-even, and `policy || AUTO`
    // makes OUTSIDE (0) unusable.
    expect([
      new VertexPolyBoolean(0, -2).pip_check_policy,
      new VertexPolyBoolean(0, -2).common_segments_policy,
      new VertexPolyBoolean(1).common_segments_policy,
      new VertexPolyBoolean(1, 0).common_segments_policy,
    ]).toEqual(OLD.policy);
  });

  it("returns null when clipping before initializeSources", () => {
    expect(JSON.stringify(new VertexPolyBoolean(1, -1).clip(false, false))).toBe(OLD.uninit);
  });
});

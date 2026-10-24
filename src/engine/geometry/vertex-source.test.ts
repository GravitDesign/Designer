import { describe, expect, it } from "vitest";
import { hasMixin } from "../core/object.ts";
import { Vertex } from "./vertex.ts";
import { VertexContainer } from "./vertex-container.ts";
import { VertexSource } from "./vertex-source.ts";

function container(flat: number[]): VertexContainer {
  return VertexContainer.deserialize(flat);
}

describe("Vertex", () => {
  it("starts with null command and position, like the old prototype", () => {
    const v = new Vertex();
    expect([v.command, v.x, v.y]).toEqual([null, null, null]);
    expect(Object.keys(v)).toEqual([]);
    expect(Vertex.Command).toEqual({ Move: 1, Line: 2, Curve: 3, Curve2: 4, Close: 5 });
  });
});

describe("VertexSource", () => {
  it("reads nothing on its own", () => {
    const s = new VertexSource();
    expect([s.rewindVertices(0), s.readVertex(new Vertex()), s.hasVertexForRead()]).toEqual([
      false,
      false,
      false,
    ]);
    expect(s.toString()).toBe("[Object GVertexSource]");
  });

  it("tells clockwise (y down) from counter-clockwise by the first sub-path", () => {
    const cw = container([1, 0, 0, 2, 10, 0, 2, 10, 10, 2, 0, 10, 5, 0, 0]);
    const ccw = container([1, 0, 0, 2, 0, 10, 2, 10, 10, 2, 10, 0, 5, 0, 0]);
    expect(cw.isClockWise()).toBe(true);
    expect(ccw.isClockWise()).toBe(false);
    // Only the first sub-path counts.
    const both = container([
      1, 0, 0, 2, 0, 10, 2, 10, 10, 5, 0, 0, 1, 0, 0, 2, 10, 0, 2, 10, 10, 5, 0, 0,
    ]);
    expect(both.isClockWise()).toBe(false);
    // Fewer than three points: no turn, which counts as clockwise.
    expect(container([1, 0, 0, 2, 5, 5]).isClockWise()).toBe(true);
  });

  it("counts curve control points as polygon points", () => {
    // The end points alone are a line; the control point decides.
    const up = container([1, 0, 0, 3, 10, 0, 3, 5, -5, 5, 0, 0]);
    const down = container([1, 0, 0, 3, 10, 0, 3, 5, 5, 5, 0, 0]);
    expect(up.isClockWise()).not.toBe(down.isClockWise());
  });

  it("throws when a source starts with Close", () => {
    expect(() => container([5, 0, 0]).isClockWise()).toThrow(TypeError);
  });

  it("writes SVG path data with optional rounding", () => {
    const c = container([
      1, 0, 0, 2, 10.04, 0, 3, 5, 5, 3, 7, 8, 4, 1, 1, 4, 2, 2, 4, 3, 3, 5, 0, 0,
    ]);
    expect(c.toSVGPath()).toBe(" M 0 0 L 10.04 0 Q 7 8 5 5 C 2 2 3 3 1 1 Z ");
    expect(c.toSVGPath((v) => Math.round(v))).toBe(" M 0 0 L 10 0 Q 7 8 5 5 C 2 2 3 3 1 1 Z ");
  });

  it("stops at a curve without its control points and skips NaN vertices", () => {
    expect(container([1, 0, 0, 3, 5, 5]).toSVGPath()).toBe(" M 0 0");
    expect(container([1, 0, 0, 2, NaN, 1, 2, 3, 3]).toSVGPath()).toBe(" M 0 0 L 3 3");
  });

  it("is mixed into containers without making them instances", () => {
    const c = new VertexContainer();
    expect(hasMixin(c, VertexSource)).toBe(true);
    expect(c instanceof VertexSource).toBe(false);
    expect("hasMixin" in c).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { PolyLineExtended } from "./poly-line-extended.ts";
import { OLD, build, ellipse, rect, verts } from "./test-helpers.ts";

describe("PolyLineExtended", () => {
  it("reads a source into a ring and writes it back", () => {
    const ring = PolyLineExtended.fromVertexSource(build(ellipse(0, 0, 10, 5)));
    expect(verts(ring.getPoints())).toEqual(OLD.ringPoints);
    let count = 0;
    let node: PolyLineExtended = ring;
    do {
      count++;
      node = node.next as PolyLineExtended;
    } while (node !== ring);
    expect(count).toBe(4);
  });

  it("tests points against curves", () => {
    const ring = PolyLineExtended.fromVertexSource(build(ellipse(0, 0, 10, 5)));
    expect([
      ring.isInsideBezier({ x: 0, y: 0 }),
      ring.isInsideBezier({ x: 9.9, y: 0 }),
      ring.isInsideBezier({ x: 0, y: 5.1 }),
      ring.isInsideBezier({ x: 0, y: 4.9 }, 1),
      ring.area(),
    ]).toEqual(OLD.ringInside);
  });

  it("stops reading at the first Close", () => {
    const ring = PolyLineExtended.fromVertexSource(
      build([...rect(0, 0, 10, 10), ...rect(50, 50, 10, 10)]),
    );
    expect(verts(ring.getPoints())).toEqual([
      1, 0, 0, 2, 10, 0, 2, 10, 10, 2, 0, 10, 2, 0, 0, 5, 0, 0,
    ]);
  });

  it("throws for a Close without segments, as the old code did", () => {
    expect(() => PolyLineExtended.fromVertexSource(build([1, 0, 0, 5, 0, 0]))).toThrow(TypeError);
  });

  it("appends before the ring's start and fills an empty node first", () => {
    const ring = new PolyLineExtended();
    expect(ring.appendPoint(1, 2)).toBe(ring);
    const second = ring.appendPoint(3, 4, 5, 6);
    expect([second.x, second.y, second.cx1, second.cy1, second.cx2]).toEqual([
      3,
      4,
      5,
      6,
      undefined,
    ]);
    expect(ring.prev).toBe(second);
    expect(second.next).toBe(ring);
  });
});

import { describe, expect, it } from "vitest";
import { Point } from "./point.ts";
import { Rect } from "./rect.ts";

const R = (x: number, y: number, w: number, h: number) => new Rect(x, y, w, h);

describe("Rect", () => {
  it("normalises negative sizes for containment and edges count only when asked", () => {
    const r = R(10, 10, -10, -10);
    expect(r.containsPointXY(5, 5)).toBe(true);
    expect(r.containsPointXY(0, 0)).toBe(true);
    expect(R(5, 5, 0, 10).containsPointXY(5, 6)).toBe(false);
    expect(R(5, 5, 0, 10).containsPointXY(5, 6, true)).toBe(true);
    expect(r.containsPoint(new Point(11, 5))).toBe(false);
  });

  it("does not count touching rectangles as intersecting unless edges are included", () => {
    const a = R(0, 0, 10, 10);
    expect(a.intersectsRect(R(10, 0, 5, 10))).toBe(false);
    expect(a.intersectsRect(R(10, 0, 5, 10), true)).toBe(true);
    expect(a.intersectsRect(R(9, 9, 5, 5))).toBe(true);
    expect(a.containsRect(R(2, 2, 4, 4))).toBe(true);
    expect(R(2, 2, 4, 4).containsRect(a)).toBe(false);
  });

  it("unites, returning the other rect itself when one is empty and ignoreEmpty is set", () => {
    const a = R(0, 0, 10, 10);
    const empty = R(3, 3, 0, 5);
    expect(a.united(R(-5, 20, 1, 1))).toEqual(R(-5, 0, 15, 21));
    expect(a.united(empty, true)).toBe(a);
    expect(empty.united(a, true)).toBe(a);
    expect(a.united(empty)).toEqual(R(0, 0, 10, 10));
  });

  it("intersects and subtracts", () => {
    const a = R(0, 0, 10, 10);
    expect(a.intersected(R(5, 5, 10, 10))).toEqual(R(5, 5, 5, 5));
    expect(a.intersected(R(20, 20, 1, 1))).toEqual(R(0, 0, 0, 0));
    // A hole in the middle: four bands with `multiple`, a copy without.
    const hole = a.subtracted(R(3, 3, 4, 4), true);
    expect(hole).toEqual([R(0, 0, 10, 3), R(0, 3, 3, 4), R(7, 3, 3, 4), R(0, 7, 10, 3)]);
    expect(a.subtracted(R(3, 3, 4, 4))).toEqual(a);
    // The other covers the left part.
    expect(a.subtracted(R(-5, -5, 10, 20))).toEqual(R(5, 0, 5, 10));
    // A strip through the middle would leave two parts: a copy, even with `multiple`.
    expect(a.subtracted(R(3, -2, 4, 20), true)).toEqual(a);
    expect(a.subtracted(R(-5, -5, 10, 8), true)).toEqual([R(0, 3, 5, 7), R(5, 0, 5, 10)]);
  });

  it("aligns to pixels and grids and rounds", () => {
    expect(R(0.5, 1.2, 2, 2).toAlignedRect()).toEqual(R(0, 1, 3, 3));
    expect(R(3, 5, 4, 1).toAlignedWithGrid(4)).toEqual(R(0, 4, 8, 4));
    expect(R(1 / 3, 0, 1, 1).toRoundedPrecision(3)).toEqual(R(0.333, 0, 1, 1));
    expect(R(1 / 3, 0, 1, 1).toRoundedPrecision(0)).toEqual(R(0.33333333, 0, 1, 1));
  });

  it("gives sides, the closest side and throws on unknown sides", () => {
    const r = R(0, 0, 9, 9);
    expect(r.getSide(Rect.Side.BOTTOM_CENTER)).toEqual(new Point(4.5, 9));
    expect(r.getClosestSideName(new Point(8, 1))).toBe("tr");
    expect(r.getClosestSideName(new Point(4, 4))).toBe("cc");
    expect(() => r.getSide("xx")).toThrow("Illegal Argument: xx");
  });

  it("computes snapping offsets", () => {
    const a = R(0, 0, 10, 10);
    // y: the other's edges lie on both sides of this one's, so no offset.
    expect(a.getXYOffset(R(12, 0, 5, 5), true, true)).toEqual({ x: 2, y: null });
    expect(a.getXYOffset(R(0, 13, 5, 5), false, true)).toEqual({ x: null, y: 3 });
    expect(a.getXYOffset(R(5, 0, 10, 5), true, false, true)).toEqual({
      x: null,
      y: null,
      leftDist: 5,
      rightDist: 5,
    });
  });

  it("serializes, deserializes and compares", () => {
    expect(Rect.serialize(R(1, 2, 3, 4))).toEqual([1, 2, 3, 4]);
    expect(Rect.deserialize([1, 2, 3])).toEqual(new Rect());
    expect(Rect.deserialize([1, 2, 3, 4, 5])).toEqual(R(1, 2, 3, 4));
    expect(Rect.equals(R(1, 2, 3, 4), R(1, 2, 3, 4 + 1e-15))).toBe(true);
    expect(Rect.equals(null, null)).toBe(true);
    expect(Rect.equals(null, new Rect())).toBe(false);
    expect(Rect.fromPoints(new Point(3, 1), new Point(-1, 7))).toEqual(R(-1, 1, 4, 6));
    expect(R(1, 2, 3, 4).toString()).toBe("[Object GRect(x=1, y=2, width=3, height=4)]");
  });
});

import { describe, expect, it } from "vitest";
import { Point } from "./point.ts";

describe("Point", () => {
  it("does arithmetic without changing the point", () => {
    const a = new Point(1.5, -2);
    const b = new Point(4, 0.25);
    expect(a.add(b)).toEqual(new Point(5.5, -1.75));
    expect(a.subtract(b)).toEqual(new Point(-2.5, -2.25));
    expect(a.multiply(b)).toEqual(new Point(6, -0.5));
    expect(a.scale(-2)).toEqual(new Point(-3, 4));
    expect(a.cross(b)).toBe(1.5 * 0.25 - -2 * 4);
    expect(a.dot(b)).toBe(6 - 0.5);
    expect(a.translated(1, 1)).toEqual(new Point(2.5, -1));
    expect(a.lerp(b, 0.5)).toEqual(new Point(2.75, -0.875));
    expect([a.getX(), a.getY()]).toEqual([1.5, -2]);
  });

  it("rotates around a center, or the origin without one", () => {
    const p = new Point(2, 0).rotatedAt(Math.PI, new Point(1, 0));
    expect(p.getX()).toBeCloseTo(0, 15);
    expect(p.getY()).toBeCloseTo(0, 15);
    expect(new Point(2, 0).rotatedAt(0.3, null)).toEqual(new Point(2, 0).rotated(0.3));
  });

  it("compares with an epsilon, and two nulls are not equal", () => {
    const a = new Point(1, 2);
    expect(Point.equals(a, a)).toBe(true);
    expect(Point.equals(a, new Point(1 + 1e-15, 2))).toBe(true);
    expect(Point.equals(a, new Point(1 + 1e-13, 2))).toBe(false);
    expect(Point.equals(a, new Point(1.05, 2.05), 0.1)).toBe(true);
    expect(Point.equals(null, null)).toBe(false);
    expect(Point.equals(a, null)).toBe(false);
  });

  it("takes component-wise min and max, null without points", () => {
    const pts = [new Point(3, -1), new Point(-2, 5), new Point(0, 0)];
    expect(Point.min(...pts)).toEqual(new Point(-2, -1));
    expect(Point.max(...pts)).toEqual(new Point(3, 5));
    const none = Point.min();
    expect([none.getX(), none.getY()]).toEqual([null, null]);
  });

  it("is finite only for finite numbers", () => {
    expect(new Point(1, 2).isFinite()).toBe(true);
    expect(new Point(NaN, 1).isFinite()).toBe(false);
    expect(new Point(1, Infinity).isFinite()).toBe(false);
    expect(new Point("1" as unknown as number, 1).isFinite()).toBe(false);
    expect(new Point().isFinite()).toBe(false);
  });

  it("prints the old format, missing parenthesis included", () => {
    expect(new Point(1, -0.5).toString()).toBe("[Object GPoint(x=1, y=-0.5]");
  });
});

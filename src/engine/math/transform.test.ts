import { describe, expect, it } from "vitest";
import { Point } from "./point.ts";
import { Rect } from "./rect.ts";
import { Transform } from "./transform.ts";

const T = (...m: number[]) => new Transform(m[0], m[1], m[2], m[3], m[4], m[5]);

describe("Transform", () => {
  it("applies this transform first, then the argument", () => {
    const scale = T(2, 0, 0, 3, 0, 0);
    const move = T(1, 0, 0, 1, 10, 20);
    expect(scale.multiplied(move).mapPoint(new Point(1, 1))).toEqual(new Point(12, 23));
    expect(move.multiplied(scale).mapPoint(new Point(1, 1))).toEqual(new Point(22, 63));
    expect(scale.preMultiplied(move).getMatrix()).toEqual(move.multiplied(scale).getMatrix());
  });

  it("inverts, and returns null for singular matrices", () => {
    const t = T(2, 0, 0, 4, 10, -20);
    expect(t.inverted()?.getMatrix()).toEqual([0.5, -0, -0, 0.25, -5, 5]);
    expect(T(1, 2, 2, 4, 0, 0).inverted()).toBeNull();
    expect(T(0, 0, 0, 0, 1, 2).makeInvertible().getMatrix()).toEqual([1e-14, 0, 0, 1e-14, 1, 2]);
  });

  it("falls back to identity values for missing or non-number arguments", () => {
    expect(new Transform(2, undefined, "x" as unknown as number, 3).getMatrix()).toEqual([
      2, 0, 0, 3, 0, 0,
    ]);
  });

  it("returns the same objects for the identity", () => {
    const p = new Point(1, 2);
    const r = new Rect(1, 2, 3, 4);
    expect(new Transform().mapPoint(p)).toBe(p);
    expect(new Transform().mapRect(r)).toBe(r);
    expect(T(1, 0, 0, 1, 1e-15, 0).isIdentity()).toBe(true);
  });

  it("maps plain objects in place and rects to their bounding box", () => {
    const v = { x: 1, y: 2 };
    T(0, 1, -1, 0, 5, 5).map(v);
    expect(v).toEqual({ x: 3, y: 6 });
    expect(T(0, 1, -1, 0, 0, 0).mapRect(new Rect(0, 0, 2, 1))).toEqual(new Rect(-1, 0, 1, 2));
    expect(T(1, 0, 0, 1, 0, 0).mapQuadrilateral(null)).toEqual([]);
  });

  it("serializes the identity as an empty list", () => {
    expect(Transform.serialize(new Transform())).toEqual([]);
    expect(Transform.serialize(T(1, 2, 3, 4, 5, 6))).toEqual([1, 2, 3, 4, 5, 6]);
    expect(Transform.deserialize([1, 2, 3, 4, 5]).isIdentity()).toBe(true);
    expect(Transform.equals(null, undefined)).toBe(true);
    expect(Transform.equals(T(1, 2, 3, 4, 5, 6), T(1, 2, 3, 4, 5, 6.001), 0.01)).toBe(true);
  });

  it("decomposes; a singular matrix gives NaN parts instead of null (old quirk)", () => {
    const parts = T(2, 0, 0, 3, 10, -20).decomposed();
    expect(parts?.scale.getMatrix()).toEqual([2, 0, 0, 3, 0, 0]);
    expect(parts?.translate.getMatrix()).toEqual([1, 0, 0, 1, 10, -20]);
    const singular = T(0, 0, 0, 0, 0, 0).decomposed();
    expect(singular).not.toBeNull();
    expect(singular?.scale.getMatrix()[0]).toBe(0);
    expect(singular?.rotate.getMatrix()[0]).toBeNaN();
  });

  it("splits off rotation when there is no skew, and refuses skew", () => {
    const parts = T(2, 0, 0, 3, 10, -20).noSkewDecomposed();
    expect(parts?.rotation.getMatrix()).toEqual([0, -1, 1, 0, 0, 0]);
    expect(parts?.rotationBack.getMatrix()).toEqual([0, 1, -1, 0, 0, 0]);
    expect(parts?.scalation.getMatrix()).toEqual([3, 0, 0, 2, 0, 0]);
    expect(parts?.translation.getMatrix()).toEqual([1, 0, 0, 1, 10, -20]);
    expect(T(0, 2, 3, 0, 0, 0).noSkewDecomposed()).toBeNull();
    expect(T(1, 0, 1, 1, 0, 0).noSkewDecomposed()).toBeNull();
    expect(T(1, 2, 2, 4, 0, 0).noSkewDecomposed()).toBeNull();
  });

  it("resizes from the opposite side or the center", () => {
    const rect = new Rect(0, 0, 100, 50);
    const right = Transform.getResizeTransform(rect, Rect.Side.RIGHT_CENTER, 10, 0);
    expect(right.getMatrix()).toEqual([1.1, 0, 0, 1, 0, 0]);
    const center = Transform.getResizeTransform(rect, Rect.Side.RIGHT_CENTER, 10, 0, false, true);
    expect(center.getMatrix()).toEqual([1.2000000000000002, 0, 0, 1, -10.000000000000007, 0]);
    const ratio = Transform.getResizeTransform(rect, Rect.Side.BOTTOM_RIGHT, 100, 0, true);
    expect(ratio.getMatrix()).toEqual([2, 0, 0, 2, 0, 0]);
  });

  it("prints the old format", () => {
    expect(T(1, 2, 3, 4, 5, 6).toString()).toBe(
      "[Object GTransform(sx=1, shy=2, shx=3, sy=4, tx=5, ty=6)]",
    );
  });
});

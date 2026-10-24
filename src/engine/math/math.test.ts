import { describe, expect, it } from "vitest";
import { GMath } from "./math.ts";
import { Point } from "./point.ts";

describe("GMath", () => {
  it("rounds half up, half down and to digits", () => {
    expect(GMath.round(2.5)).toBe(3);
    expect(GMath.round(2.5, true)).toBe(2);
    expect(GMath.round(-2.5)).toBe(-2);
    expect(GMath.round(1.005, false, 2)).toBe(1);
    expect(GMath.round(123.456, false, -2)).toBe(123.46);
  });

  it("keeps the sign in mod and div and normalizes angles", () => {
    expect(GMath.mod(-7, 3)).toBe(-1);
    expect(GMath.div(-7, 2)).toBe(-3);
    expect(GMath.normalizeAngleDegrees(-720.5)).toBe(359.5);
    expect(GMath.normalizeAngleDegrees(361)).toBe(1);
    expect(GMath.normalizeAngleRadians(-Math.PI)).toBe(Math.PI);
  });

  it("shifts in 32 bits but increments as a double in nextPowerOf2", () => {
    expect([0, 1, 3, 1024, 1025, 2 ** 31 - 1, -5].map(GMath.nextPowerOf2)).toEqual([
      0, 1, 4, 1024, 2048, 2147483648, 0,
    ]);
  });

  it("computes the fast inverse square root in Float32", () => {
    expect(GMath.Q_rsqrt(1)).toBe(0.9983071495847821);
    expect(GMath.Q_rsqrt(0.125)).toBe(2.8277201547933335);
    expect(GMath.normalizePoint(new Point(3, 4))).toEqual(
      new Point(0.5990692955592084, 0.7987590607456112),
    );
    expect(GMath.normalizePoint(new Point(0, 0))).toEqual(new Point(0, 0));
  });

  it("compares with undefined when isEqualEps gets one argument", () => {
    expect(GMath.isEqualEps(0)).toBe(false);
    expect(GMath.isEqualEps(1, 1 + 1e-15)).toBe(true);
    expect(GMath.isEqualEps(1, 1.5, 0.6)).toBe(true);
  });

  it("intersects segments, lines and circles", () => {
    expect(GMath.getIntersectionPoint(0, 0, 10, 10, 0, 10, 10, 0)).toEqual(new Point(5, 5));
    expect(GMath.getIntersectionPoint(0, 0, 10, 0, 11, -5, 11, 5)).toBeNull();
    const params: number[] = [];
    expect(GMath.getIntersectionPoint(0, 0, 10, 0, 11, -5, 11, 5, params)).toEqual(
      new Point(11, 0),
    );
    expect(params).toEqual([1.1, 0.5]);
    const out: number[] = [];
    GMath.circleLineIntersection(0, 0, 1, 0, 0, 0, 5, out);
    expect(out).toEqual([-5, 5]);
    const hits: Point[] = [];
    GMath.circleCircleIntersection(0, 0, 5, 10, 0, 5, hits);
    expect(hits).toEqual([new Point(5, 0)]);
  });

  it("measures distances to segments with the closest parameter", () => {
    const t: number[] = [];
    expect(GMath.sqrSegmentDist(0, 0, 10, 0, 5, 5, t)).toBe(25);
    expect(t).toEqual([0.5]);
    expect(GMath.sqrSegmentDist(0, 0, 10, 0, 15, 5, t, 4)).toBe(50);
    expect(t).toEqual([1]);
    expect(GMath.ptSqrDist(1, null as unknown as number, 3, 4)).toBe(0);
    expect(GMath.segmentSide(0, 0, 10, 0, 5, 5)).toBe(1);
    expect(GMath.segmentSide(0, 0, 10, 0, 5, -5)).toBe(-1);
    expect(GMath.segmentSide(0, 0, 10, 0, 20, 0)).toBe(0);
  });

  it("splits cubic beziers with de Casteljau", () => {
    const left = new Float64Array(4);
    const right = new Float64Array(4);
    GMath.getCtrlPtsCasteljau(0, 0, 100, 100, 0.5, null, left, right);
    expect(Array.from(left)).toEqual([0, 0, 25, 50]);
    expect(Array.from(right)).toEqual([50, 75, 100, 100]);
    const only = new Float64Array(4);
    GMath.getCtrlPtsCasteljau(0, 0, 100, 100, 0.5, 2, only);
    expect(Array.from(only)).toEqual([50, 75, 100, 100]);
    expect(GMath.getCubicCurveAtT(0, 100, 0, 100, 0.5)).toBe(50);
    expect(GMath.evalCubic(1, -6, 11, -6, 2)).toBe(0);
  });

  it("goes through Float32 when inverting a polynomial interval", () => {
    const out = new Float64Array(4);
    GMath.inversePolyUnaryInterval([1, -1.5, 0.75, -0.1], 3, out);
    // -0.1 is not representable in Float32; the old code rounds it.
    expect(out[0]).toBe(Math.fround(-0.1));
    expect(out[0]).not.toBe(-0.1);
  });

  it("finds cubic roots in an interval", () => {
    const roots: number[] = [];
    let n = GMath.getCubicRoots([-4, 6, -2.25, 0.1], 0, 1, roots, false, 1e-6);
    expect(roots.slice(0, n)).toEqual([0.5335344614261338, 0.05119506268870521, 0.915270475885147]);
    // A triple root in the middle is found in [0, 1] but not in [-0.5, 1.5].
    n = GMath.getCubicRoots([1, -1.5, 0.75, -0.125], 0, 1, roots, false, 1e-6);
    expect(roots.slice(0, n)).toEqual([0.5]);
    expect(GMath.getCubicRoots([1, -1.5, 0.75, -0.125], -0.5, 1.5, [], false, 1e-9)).toBe(0);
    expect(GMath.getCubicRoots([1, -6, 11, -6], 4, 0, roots, false, 1e-9)).toBe(0);
  });

  it("evaluates the second critical point with the wrong coefficient (old quirk)", () => {
    // Roots 0.25, 0.45 and 0.65: the bad value at the second critical point
    // sends the search into the wrong branch, which reports 0.65 twice.
    const roots: number[] = [];
    const n = GMath.getCubicRoots(
      [1.25, -2.1875, 1.2593750000000001, -0.23765625000000004],
      0,
      1,
      roots,
      false,
      1e-6,
    );
    expect(roots.slice(0, n)).toEqual([
      0.6493841849482321, 0.44999999999992485, 0.6508007709769729,
    ]);
  });

  it("reports a root at the interval end without includeEnds in one branch (old quirk)", () => {
    const roots: number[] = [];
    const n = GMath.getCubicRoots([2, -3, 1, 0], 0, 1, roots, false, 1e-6);
    expect(roots.slice(0, n)).toEqual([0.5, 1]);
  });

  it("finds quadratic roots and Sturm root counts", () => {
    const q: number[] = [];
    GMath.getQuadraticRoots(1, -3, 2, q);
    expect(q).toEqual([2, 1]);
    const poly = [1, 0, -1.25, 0, 0.25, 0]; // roots -1, -0.5, 0, 0.5, 1
    const deriv = new Float64Array(5);
    GMath.getCoeffPolyDeriv(poly, 5, deriv);
    const seq: ArrayLike<number>[] = [];
    GMath.getSturmPRS(poly, 5, deriv, seq as never);
    expect(GMath.countRootsNSturm(poly, 5, deriv, 0.25, 2, seq, [], [])).toBe(2);
    expect(GMath.countRootsNSturm(poly, 5, deriv, -2, 2, seq, [], [])).toBe(5);
  });

  it("only knows combinations up to 5, and C(0,0) is 0", () => {
    expect(GMath.combNK(5, 2)).toBe(10);
    expect(GMath.combNK(0, 0)).toBe(0);
    expect(() => GMath.combNK(6, 1)).toThrow("Combinations calculation not implemented");
  });

  it("clamps, normalizes values and finds rotation segments", () => {
    expect(GMath.clamp(15, -10, 10)).toBe(10);
    expect(GMath.clamp(3, 5, 1)).toBe(1);
    expect(GMath.normalizeValue(20, -10, 10)).toBe(10);
    expect(GMath.normalizeValue(0, -10, 10, 0, 1)).toBe(0.5);
    expect(GMath.getRotationSegment(new Point(0, 0), new Point(1, 0))).toBe(3);
  });
});

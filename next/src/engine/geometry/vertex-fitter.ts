// Old: chunk.vendor.js module 380 (GVertexFitter).
import { GMath } from "../math/math.ts";
import { Point } from "../math/point.ts";
import { VertexInfo, type VertexHitResult } from "./vertex-info.ts";

/** Added to the error before taking the root for the default tolerance. */
const TOLERANCE_EPSILON = 1e-9;

// The cubic Bernstein basis polynomials.
function bernstein0(t: number): number {
  const u = 1 - t;
  return u * u * u;
}

function bernstein1(t: number): number {
  const u = 1 - t;
  return 3 * t * (u * u);
}

function bernstein2(t: number): number {
  return 3 * t * t * (1 - t);
}

function bernstein3(t: number): number {
  return t * t * t;
}

/** A cubic bezier as [start, control1, control2, end]. */
export type CubicBezier = Point[];

/**
 * Fits cubic beziers through a list of points (Schneider's algorithm from
 * Graphics Gems, with the hook detection and tangent estimates of
 * Inkscape's bezier-utils). The freehand tool and the path simplifier
 * use it.
 *
 * `error` is the allowed squared distance (default 1e-6); `tolerance`
 * the distance the error and hooks are measured in units of (default
 * sqrt(error + 1e-9)).
 */
export class VertexFitter {
  error: number;
  tolerance: number;
  /** Unused; kept because the old class had it. */
  polys: unknown[];
  declare force: boolean;

  constructor(error?: number, tolerance?: number) {
    this.error = error || 1e-6;
    this.tolerance = tolerance || Math.sqrt(this.error + TOLERANCE_EPSILON);
    this.polys = [];
  }

  /**
   * Fits `points` with at most `maxSegments` cubics. The tangents at the
   * ends are estimated unless given (a zero point means "estimate").
   * Returns the cubics, or null when they would need more segments.
   */
  fitCurve(
    points: Point[],
    maxSegments: number,
    leftTangent?: Point | null,
    rightTangent?: Point | null,
  ): CubicBezier[] | null {
    const count = points.length;
    const left = leftTangent || new Point(0, 0);
    const right = rightTangent || new Point(0, 0);
    const out: CubicBezier[] = [];
    return this._fitCubic(points, 0, count - 1, left, right, out, maxSegments) >= 0 ? out : null;
  }

  /**
   * Fits points[first..last] and appends the cubics to `out`. Returns the
   * number of cubics used, or -1 when `maxSegments` isn't enough.
   */
  _fitCubic(
    points: Point[],
    first: number,
    last: number,
    leftTangent: Point,
    rightTangent: Point,
    out: CubicBezier[],
    maxSegments: number,
  ): number {
    let bezier: CubicBezier;
    let params: number[] | Float64Array | null;
    let error: number;
    const splitPoint: number[] = [];
    if (maxSegments < 1) return -1;
    const count = last - first + 1;
    if (count < 2) return 0;
    const zero = new Point(0, 0);
    if (count == 2) {
      const third =
        GMath.ptDist(
          (points[last] as Point).getX(),
          (points[last] as Point).getY(),
          (points[first] as Point).getX(),
          (points[first] as Point).getY(),
        ) / 3;
      bezier = new Array<Point>(4);
      bezier[0] = points[first] as Point;
      bezier[3] = points[last] as Point;
      bezier[1] = Point.equals(zero, leftTangent)
        ? bezier[0]
            .scale(2)
            .add(bezier[3])
            .scale(1 / 3)
        : bezier[0].add(leftTangent.scale(third));
      bezier[2] = Point.equals(zero, rightTangent)
        ? bezier[0].add(bezier[3].scale(2)).scale(1 / 3)
        : bezier[3].add(rightTangent.scale(third));
      out.push(bezier);
      return 1;
    }
    params = this._chordLengthParameterize(points, first, last);
    if (!params) return 0;
    bezier = this._generateBezier_err(points, first, last, params, leftTangent, rightTangent);
    error = this._computeMaxError(points, first, last, bezier, params, splitPoint);
    if (Math.abs(error) <= 1) {
      out.push(bezier);
      return 1;
    }
    if (0 <= error && error <= 3) {
      for (let iteration = 0; iteration < 4; iteration++) {
        bezier = this._generateBezier_err(points, first, last, params, leftTangent, rightTangent);
        const reparameterized = this._reparameterize(points, first, last, params, bezier);
        error = this._computeMaxError(points, first, last, bezier, reparameterized, splitPoint);
        if (Math.abs(error) <= 1) {
          out.push(bezier);
          return 1;
        }
        params = reparameterized;
      }
    }
    // A negative error marks a hook: split there instead of at the
    // farthest point, and drop a given end tangent before splitting at an
    // end.
    const isHook = error < 0;
    if (isHook) {
      if (splitPoint[0] == first) {
        if (!Point.equals(zero, leftTangent)) {
          return this._fitCubic(points, first, last, zero, rightTangent, out, maxSegments);
        }
        splitPoint[0] = (splitPoint[0] as number) + 1;
      } else if (splitPoint[0] == last) {
        if (!Point.equals(zero, rightTangent)) {
          return this._fitCubic(points, first, last, leftTangent, zero, out, maxSegments);
        }
        splitPoint[0] = (splitPoint[0] as number) - 1;
      }
    }
    if (1 < maxSegments) {
      const split = splitPoint[0] as number;
      let rightOfSplit: Point;
      let leftOfSplit: Point;
      if (isHook) {
        if (!(first < split && split < last)) return -1;
        rightOfSplit = leftOfSplit = zero;
      } else {
        rightOfSplit = (leftOfSplit = this._computeCenterTangent(points, split)).scale(-1);
      }
      const used = this._fitCubic(
        points,
        first,
        split,
        leftTangent,
        leftOfSplit,
        out,
        maxSegments - 1,
      );
      if (used < 0) return -1;
      const usedRight = this._fitCubic(
        points,
        split,
        last,
        rightOfSplit,
        rightTangent,
        out,
        maxSegments - used,
      );
      return usedRight < 0 ? -1 : used + usedRight;
    }
    return -1;
  }

  /**
   * Least-squares estimate of control point `index` (1 or 2) with the
   * other three fixed; the old "estimate_bi" from bezier-utils.
   */
  _estimate_bi(
    bezier: CubicBezier,
    index: number,
    points: Point[],
    params: ArrayLike<number>,
    first: number,
    last: number,
  ): void {
    if (1 <= index && index <= 2) {
      const other = 3 - index;
      let numerator = new Point(0, 0);
      let denominator = 0;
      const count = last - first + 1;
      for (let i = 0; i < count; ++i) {
        const t = params[i] as number;
        const basis = [bernstein0(t), bernstein1(t), bernstein2(t), bernstein3(t)];
        numerator = numerator.add(
          (bezier[0] as Point)
            .scale(basis[0] as number)
            .add((bezier[other] as Point).scale(basis[other] as number))
            .add((bezier[3] as Point).scale(basis[3] as number))
            .subtract(points[i + first] as Point)
            .scale(basis[index] as number),
        );
        denominator -= (basis[index] as number) * (basis[index] as number);
      }
      bezier[index] =
        0 != denominator
          ? numerator.scale(1 / denominator)
          : (bezier[0] as Point)
              .scale(other)
              .add((bezier[3] as Point).scale(index))
              .scale(1 / 3);
    }
  }

  /** Unit tangent at `first` from the first point farther than sqrt(minSqrDist). */
  _darray_left_tangent(points: Point[], first: number, last: number, minSqrDist: number): Point {
    const count = last - first + 1;
    // The old code used an undeclared (global) counter here.
    for (let i = 1; ;) {
      const delta = (points[first + i] as Point).subtract(points[first] as Point);
      const sqrLength = delta.dot(delta);
      if (minSqrDist < sqrLength) return delta.scale(1 / Math.sqrt(sqrLength));
      ++i;
      if (i == count) {
        return 0 == sqrLength
          ? this._computeLeftTangent(points, first)
          : delta.scale(1 / Math.sqrt(sqrLength));
      }
    }
  }

  /** Unit tangent at `last` from the last point farther than sqrt(minSqrDist). */
  _darray_right_tangent(points: Point[], first: number, last: number, minSqrDist: number): Point {
    for (let i = last - 1; ; i--) {
      const delta = (points[i] as Point).subtract(points[last] as Point);
      const sqrLength = delta.dot(delta);
      if (minSqrDist < sqrLength) return delta.scale(1 / Math.sqrt(sqrLength));
      if (i == first) {
        return 0 == sqrLength
          ? this._computeRightTangent(points, last)
          : delta.scale(1 / Math.sqrt(sqrLength));
      }
    }
  }

  /**
   * A bezier for points[first..last] with estimated end tangents where
   * none are given; an estimated left tangent is refined from the first
   * fit's control point.
   */
  _generateBezier_err(
    points: Point[],
    first: number,
    last: number,
    params: ArrayLike<number>,
    leftTangent: Point,
    rightTangent: Point,
  ): CubicBezier {
    const estimateLeft = 0 == leftTangent.getX() && 0 == leftTangent.getY();
    const estimateRight = 0 == rightTangent.getX() && 0 == rightTangent.getY();
    let left = estimateLeft
      ? this._darray_left_tangent(points, first, last, this.error)
      : leftTangent;
    const right = estimateRight
      ? this._darray_right_tangent(points, first, last, this.error)
      : rightTangent;
    let bezier = this._generateBezier(points, first, last, params, left, right);
    if (estimateLeft) {
      this._estimate_bi(bezier, 1, points, params, first, last);
      if (!Point.equals(bezier[1], bezier[0])) {
        const delta = (bezier[1] as Point).subtract(bezier[0] as Point);
        left = delta.scale(1 / Math.sqrt(delta.dot(delta)));
      }
      bezier = this._generateBezier(points, first, last, params, left, right);
    }
    return bezier;
  }

  /** Least-squares fit of the two control point distances along the tangents. */
  _generateBezier(
    points: Point[],
    first: number,
    last: number,
    params: ArrayLike<number>,
    leftTangent: Point,
    rightTangent: Point,
  ): CubicBezier {
    // The 2x2 normal equations C * alpha = X (the old code kept them in
    // nested arrays and a Float64Array; plain doubles give the same values).
    let c00 = 0;
    let c01 = 0;
    let c10 = 0;
    let c11 = 0;
    let x0 = 0;
    let x1 = 0;
    const bezier = new Array<Point>(4);
    const count = last - first + 1;
    const start = points[first] as Point;
    const end = points[last] as Point;
    for (let i = 0; i < count; i++) {
      const t = params[i] as number;
      const a1 = leftTangent.scale(bernstein1(t));
      const a2 = rightTangent.scale(bernstein2(t));
      c00 += a1.dot(a1);
      c01 += a1.dot(a2);
      c10 = c01;
      c11 += a2.dot(a2);
      const residual = (points[first + i] as Point).subtract(
        start
          .scale(bernstein0(t))
          .add(
            start.scale(bernstein1(t)).add(end.scale(bernstein2(t)).add(end.scale(bernstein3(t)))),
          ),
      );
      x0 += a1.dot(residual);
      x1 += a2.dot(residual);
    }
    const det = c00 * c11 - c10 * c01;
    const det0 = c00 * x1 - c01 * x0;
    const det1 = x0 * c11 - x1 * c01;
    let alphaLeft: number;
    let alphaRight: number;
    if (0 == det) {
      const sum0 = c00 + c01;
      if (0 != sum0) {
        alphaLeft = alphaRight = x0 / sum0;
      } else {
        const sum1 = c10 + c11;
        alphaLeft = alphaRight = 0 != sum1 ? x1 / sum1 : 0;
      }
    } else {
      alphaLeft = det1 / det;
      alphaRight = det0 / det;
    }
    if (alphaLeft < 1e-6 || alphaRight < 1e-6) {
      // Degenerate fit: put the control points at a third of the chord.
      // GMath.ptDist is called with two points here, as in the old code,
      // which gives NaN, so the control points come out NaN.
      const third = (GMath.ptDist as unknown as (a: Point, b: Point) => number)(end, start) / 3;
      bezier[0] = start;
      bezier[3] = end;
      bezier[1] = bezier[0].add(leftTangent.scale(third));
      bezier[2] = bezier[3].add(rightTangent.scale(third));
      return bezier;
    }
    bezier[0] = start;
    bezier[3] = end;
    bezier[1] = bezier[0].add(leftTangent.scale(alphaLeft));
    bezier[2] = bezier[3].add(rightTangent.scale(alphaRight));
    return bezier;
  }

  /** Better parameters: each point's nearest position on the bezier, if within 10. */
  _reparameterize(
    points: Point[],
    first: number,
    last: number,
    params: ArrayLike<number>,
    bezier: CubicBezier,
  ): Float64Array {
    const out = new Float64Array(last - first + 1);
    const [b0, b1, b2, b3] = bezier as [Point, Point, Point, Point];
    for (let i = first; i <= last; i++) {
      const hit: VertexHitResult = { segment: null, x: null, y: null, slope: null, outline: null };
      const point = points[i] as Point;
      const found = VertexInfo._hitTestCurve2(
        b0.getX(),
        b0.getY(),
        b3.getX(),
        b3.getY(),
        b1.getX(),
        b1.getY(),
        b2.getX(),
        b2.getY(),
        point.getX(),
        point.getY(),
        100,
        0,
        hit,
      );
      out[i - first] = found ? (hit.slope as number) : (params[i - first] as number);
    }
    return out;
  }

  /** One Newton step towards the parameter nearest `point`, damped so it never gets worse. */
  _newtonRaphsonRootFind(bezier: CubicBezier, point: Point, t: number): number {
    const value = this._evalBezier(3, bezier, t);
    const [b0, b1, b2, b3] = bezier as [Point, Point, Point, Point];
    const first0 = b1.subtract(b0).scale(3);
    const first1 = b2.subtract(b1).scale(3);
    const first2 = b3.subtract(b2).scale(3);
    const first = [first0, first1, first2];
    const second = [first1.subtract(first0).scale(2), first2.subtract(first1).scale(2)];
    const d1 = this._evalBezier(2, first, t);
    const d2 = this._evalBezier(1, second, t);
    const diff = value.subtract(point);
    const numerator = diff.dot(d1);
    const denominator = d1.dot(d1) + diff.dot(d2);
    let next =
      denominator > 0
        ? t - numerator / denominator
        : numerator > 0
          ? 0.98 * t - 0.01
          : numerator < 0
            ? 0.031 + 0.98 * t
            : t;
    if (isNaN(next)) next = t;
    else if (next < 0) next = 0;
    else if (next > 1) next = 1;
    const sqrDist = diff.dot(diff);
    for (let blend = 0.125; ; blend += 0.125) {
      const delta = this._evalBezier(3, bezier, next).subtract(point);
      if (!(delta.dot(delta) > sqrDist)) break;
      if (blend > 1) {
        next = t;
        break;
      }
      next = (1 - blend) * next + blend * t;
    }
    return next;
  }

  /** De Casteljau evaluation of a bezier of `degree` at `t`. */
  _evalBezier(degree: number, controls: Point[], t: number): Point {
    const work = new Array<Point>(degree + 1);
    for (let i = 0; i <= degree; i++) work[i] = controls[i] as Point;
    for (let i = 1; i <= degree; i++) {
      for (let j = 0; j <= degree - i; j++) {
        work[j] = (work[j] as Point).scale(1 - t).add((work[j + 1] as Point).scale(t));
      }
    }
    return work[0] as Point;
  }

  _computeLeftTangent(points: Point[], index: number): Point {
    const delta = (points[index + 1] as Point).subtract(points[index] as Point);
    return delta.scale(1 / Math.sqrt(delta.dot(delta)));
  }

  _computeRightTangent(points: Point[], index: number): Point {
    const delta = (points[index - 1] as Point).subtract(points[index] as Point);
    return delta.scale(1 / Math.sqrt(delta.dot(delta)));
  }

  /** Unit tangent at points[index] from its neighbours (perpendicular if they coincide). */
  _computeCenterTangent(points: Point[], index: number): Point {
    let tangent: Point;
    const before = points[index - 1] as Point;
    const after = points[index + 1] as Point;
    if (Point.equals(before, after)) {
      const delta = (points[index] as Point).subtract(before);
      tangent = new Point(-delta.getY(), delta.getX());
    } else {
      tangent = before.subtract(after);
    }
    return tangent.scale(1 / Math.sqrt(tangent.dot(tangent)));
  }

  /** Parameters 0..1 by accumulated chord length; null when all points coincide. */
  _chordLengthParameterize(points: Point[], first: number, last: number): number[] | null {
    const params = new Array<number>(last - first + 1);
    params[0] = 0;
    for (let i = first + 1; i <= last; i++) {
      const delta = (points[i] as Point).subtract(points[i - 1] as Point);
      params[i - first] = (params[i - first - 1] as number) + Math.sqrt(delta.dot(delta));
    }
    const total = params[last - first] as number;
    if (!total) return null;
    for (let i = first + 1; i <= last; i++)
      params[i - first] = (params[i - first] as number) / total;
    // The old code logged "non1" here; the last value is forced to 1.
    if (1 != params[last - first]) params[last - first] = 1;
    return params;
  }

  /**
   * How far the bezier's midpoint between two samples sits from the
   * chord midpoint, relative to the chord: large values mark a hook.
   */
  _computeHook(a: Point, b: Point, t: number, bezier: CubicBezier): number {
    const onCurve = this._evalBezier(3, bezier, t);
    let delta = a.add(b).scale(0.5).subtract(onCurve);
    const distance = Math.sqrt(delta.dot(delta));
    if (distance < this.tolerance) return 0;
    delta = a.subtract(b);
    return distance / (Math.sqrt(delta.dot(delta)) + this.tolerance);
  }

  /**
   * The largest distance from a point to the bezier, in tolerances, and
   * where it is (`splitPoint[0]`). Returns the negated hook value instead
   * when a hook is worse, with the split before the hook.
   */
  _computeMaxError(
    points: Point[],
    first: number,
    last: number,
    bezier: CubicBezier,
    params: ArrayLike<number>,
    splitPoint: number[],
  ): number {
    let maxHook = 0;
    let hookIndex: number | undefined;
    splitPoint[0] = (last - first + 1) / 2;
    let maxSqrDist = 0;
    let previous = bezier[0] as Point;
    for (let i = first + 1; i < last; i++) {
      const onCurve = this._evalBezier(3, bezier, params[i - first] as number);
      const delta = onCurve.subtract(points[i] as Point);
      const sqrDist = delta.dot(delta);
      if (sqrDist >= maxSqrDist) {
        maxSqrDist = sqrDist;
        splitPoint[0] = i;
      }
      const hook = this._computeHook(
        previous,
        onCurve,
        0.5 * ((params[i - first - 1] as number) + (params[i - first] as number)),
        bezier,
      );
      if (maxHook < hook) {
        maxHook = hook;
        hookIndex = i;
      }
      previous = onCurve;
    }
    const distError = Math.sqrt(maxSqrDist) / this.tolerance;
    if (maxHook <= distError) return distError;
    splitPoint[0] = (hookIndex as number) - 1;
    return -maxHook;
  }

  toString(): string {
    return "[Object GVertexFitter]";
  }
}
VertexFitter.prototype.force = false;

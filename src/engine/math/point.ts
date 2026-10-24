// Old: chunk.vendor.js module 5 (GPoint).

/** An immutable 2D point. Every operation returns a new point. */
export class Point {
  /**
   * Equal when both are the same object, or when both coordinates differ
   * by less than `eps` (default 1e-14). Two nulls are not equal.
   */
  static equals(a: Point | null | undefined, b: Point | null | undefined, eps?: number): boolean {
    eps = eps || 1e-14;
    if (a && a === b) return true;
    return !!(a && b) && Math.abs(a._x - b._x) < eps && Math.abs(a._y - b._y) < eps;
  }

  /** Component-wise minimum. With no points both coordinates are null. */
  static min(...points: Point[]): Point {
    let x: number | null = null;
    let y: number | null = null;
    for (const p of points) {
      if (x == null || p._x < x) x = p._x;
      if (y == null || p._y < y) y = p._y;
    }
    return new Point(x as number, y as number);
  }

  /** Component-wise maximum. With no points both coordinates are null. */
  static max(...points: Point[]): Point {
    let x: number | null = null;
    let y: number | null = null;
    for (const p of points) {
      if (x == null || p._x > x) x = p._x;
      if (y == null || p._y > y) y = p._y;
    }
    return new Point(x as number, y as number);
  }

  private readonly _x: number;
  private readonly _y: number;

  // The coordinates are stored as given, without defaults: `new Point()`
  // has undefined coordinates and isFinite() is false for it.
  constructor(x: number, y: number);
  constructor();
  constructor(x?: number, y?: number) {
    this._x = x as number;
    this._y = y as number;
  }

  getX(): number {
    return this._x;
  }

  getY(): number {
    return this._y;
  }

  scale(factor: number): Point {
    return new Point(this._x * factor, this._y * factor);
  }

  multiply(other: Point): Point {
    return new Point(this._x * other._x, this._y * other._y);
  }

  subtract(other: Point): Point {
    return new Point(this._x - other._x, this._y - other._y);
  }

  cross(other: Point): number {
    return this._x * other._y - this._y * other._x;
  }

  dot(other: Point): number {
    return this._x * other._x + this._y * other._y;
  }

  add(other: Point): Point {
    return new Point(this._x + other._x, this._y + other._y);
  }

  translated(dx: number, dy: number): Point {
    return new Point(this._x + dx, this._y + dy);
  }

  /** Rotates around the origin by `angle` radians. */
  rotated(angle: number): Point {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new Point(cos * this._x - sin * this._y, sin * this._x + cos * this._y);
  }

  /** Rotates around `center` (or the origin when it is missing). */
  rotatedAt(angle: number, center: Point | null | undefined): Point {
    if (!center) return this.rotated(angle);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new Point(
      cos * (this._x - center._x) - sin * (this._y - center._y) + center._x,
      sin * (this._x - center._x) + cos * (this._y - center._y) + center._y,
    );
  }

  lerp(other: Point, t: number): Point {
    return new Point(this._x + (other._x - this._x) * t, this._y + (other._y - this._y) * t);
  }

  /** True when both coordinates are finite numbers (strings are not). */
  isFinite(): boolean {
    return (
      typeof this._x === "number" &&
      isFinite(this._x) &&
      typeof this._y === "number" &&
      isFinite(this._y)
    );
  }

  // The missing ")" before "]" is in the old output too.
  toString(): string {
    return "[Object GPoint(x=" + this._x + ", y=" + this._y + "]";
  }
}

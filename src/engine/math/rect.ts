// Old: chunk.vendor.js module 6 (GRect).
import { GMath } from "./math.ts";
import { Point } from "./point.ts";

export type RectSide = (typeof Rect.Side)[keyof typeof Rect.Side];

/** What getXYOffset returns; the distances are only set when asked for. */
export interface RectXYOffset {
  x: number | null;
  y: number | null;
  leftDist?: number;
  rightDist?: number;
  topDist?: number;
  bottomDist?: number;
}

/**
 * An immutable axis-aligned rectangle. Width and height may be negative;
 * most operations normalise them to a min/max range first.
 */
export class Rect {
  static readonly Side = {
    TOP_LEFT: "tl",
    TOP_CENTER: "tc",
    TOP_RIGHT: "tr",
    RIGHT_CENTER: "rc",
    BOTTOM_RIGHT: "br",
    BOTTOM_CENTER: "bc",
    BOTTOM_LEFT: "bl",
    LEFT_CENTER: "lc",
    CENTER: "cc",
  } as const;

  static readonly UNIT_RECT = new Rect(0, 0, 1, 1);

  /** The bounding rectangle of the given points. */
  static fromPoints(...points: Point[]): Rect {
    const min = Point.min(...points);
    const max = Point.max(...points);
    return new Rect(min.getX(), min.getY(), max.getX() - min.getX(), max.getY() - min.getY());
  }

  /** Two nulls are equal; otherwise all four values must match within GMath.defaultEps. */
  static equals(a: Rect | null | undefined, b: Rect | null | undefined): boolean {
    return (
      (!a && a === b) ||
      (!!(a && b) &&
        GMath.isEqualEps(a._x, b._x) &&
        GMath.isEqualEps(a._y, b._y) &&
        GMath.isEqualEps(a._width, b._width) &&
        GMath.isEqualEps(a._height, b._height))
    );
  }

  /** File format: [x, y, width, height]. */
  static serialize(rect: Rect): number[] {
    return [rect._x, rect._y, rect._width, rect._height];
  }

  static deserialize(data: ArrayLike<number> | null | undefined): Rect {
    return data && data.length >= 4 ? new Rect(data[0], data[1], data[2], data[3]) : new Rect();
  }

  private _x: number;
  private _y: number;
  private _width: number;
  private _height: number;

  constructor(x?: number, y?: number, width?: number, height?: number) {
    this._x = x || 0;
    this._y = y || 0;
    this._width = width || 0;
    this._height = height || 0;
  }

  getX(): number {
    return this._x;
  }

  getY(): number {
    return this._y;
  }

  getWidth(): number {
    return this._width;
  }

  getHeight(): number {
    return this._height;
  }

  getX2(): number {
    return this._x + this._width;
  }

  getY2(): number {
    return this._y + this._height;
  }

  isEmpty(): boolean {
    return this._width <= 0 || this._height <= 0;
  }

  containsPoint(point: Point, includeEdges?: boolean): boolean {
    return this.containsPointXY(point.getX(), point.getY(), includeEdges);
  }

  /** Without `includeEdges` a rectangle of zero width or height contains nothing. */
  containsPointXY(x: number, y: number, includeEdges?: boolean): boolean {
    let minX = this._x;
    let maxX = this._x;
    if (this._width < 0) minX += this._width;
    else maxX += this._width;
    if (!includeEdges && minX == maxX) return false;
    if (x < minX || x > maxX) return false;
    let minY = this._y;
    let maxY = this._y;
    if (this._height < 0) minY += this._height;
    else maxY += this._height;
    if (!includeEdges && minY == maxY) return false;
    return !(y < minY || y > maxY);
  }

  containsRect(other: Rect, includeEdges?: boolean): boolean {
    let minX = this._x;
    let maxX = this._x;
    if (this._width < 0) minX += this._width;
    else maxX += this._width;
    if (!includeEdges && minX == maxX) return false;
    let otherMinX = other._x;
    let otherMaxX = other._x;
    if (other._width < 0) otherMinX += other._width;
    else otherMaxX += other._width;
    if (!includeEdges && otherMinX == otherMaxX) return false;
    if (otherMinX < minX || otherMaxX > maxX) return false;
    let minY = this._y;
    let maxY = this._y;
    if (this._height < 0) minY += this._height;
    else maxY += this._height;
    if (!includeEdges && minY == maxY) return false;
    let otherMinY = other._y;
    let otherMaxY = other._y;
    if (other._height < 0) otherMinY += other._height;
    else otherMaxY += other._height;
    if (!includeEdges && otherMinY == otherMaxY) return false;
    return !(otherMinY < minY || otherMaxY > maxY);
  }

  intersectsRect(other: Rect, includeEdges?: boolean): boolean {
    return this.intersectsRectXYWH(other._x, other._y, other._width, other._height, includeEdges);
  }

  /** Without `includeEdges` rectangles that only touch don't intersect. */
  intersectsRectXYWH(
    x: number,
    y: number,
    width: number,
    height: number,
    includeEdges?: boolean,
  ): boolean {
    let minX = this._x;
    let maxX = this._x;
    if (this._width < 0) minX += this._width;
    else maxX += this._width;
    if (!includeEdges && minX == maxX) return false;
    let otherMinX = x;
    let otherMaxX = x;
    if (width < 0) otherMinX += width;
    else otherMaxX += width;
    if (!includeEdges && otherMinX == otherMaxX) return false;
    if (
      minX > otherMaxX ||
      otherMinX > maxX ||
      (!includeEdges && (minX == otherMaxX || otherMinX == maxX))
    )
      return false;
    let minY = this._y;
    let maxY = this._y;
    if (this._height < 0) minY += this._height;
    else maxY += this._height;
    if (!includeEdges && minY == maxY) return false;
    let otherMinY = y;
    let otherMaxY = y;
    if (height < 0) otherMinY += height;
    else otherMaxY += height;
    if (!includeEdges && otherMinY == otherMaxY) return false;
    return !(
      minY > otherMaxY ||
      otherMinY > maxY ||
      !(includeEdges || (minY != otherMaxY && otherMinY != maxY))
    );
  }

  expanded(left: number, top: number, right: number, bottom: number): Rect {
    return new Rect(
      this._x - left,
      this._y - top,
      this._width + left + right,
      this._height + top + bottom,
    );
  }

  translated(dx: number, dy: number): Rect {
    return new Rect(this._x + dx, this._y + dy, this._width, this._height);
  }

  scaled(sx: number, sy: number): Rect {
    return new Rect(this._x * sx, this._y * sy, this._width * sx, this._height * sy);
  }

  /** Scales around `origin`, or around (0, 0) when it is missing. */
  scaledAt(sx: number, sy: number, origin: Point | null | undefined): Rect {
    return origin
      ? new Rect(
          (this._x - origin.getX()) * sx + origin.getX(),
          (this._y - origin.getY()) * sy + origin.getY(),
          this._width * sx,
          this._height * sy,
        )
      : this.scaled(sx, sy);
  }

  /**
   * The bounding rectangle of both. With `ignoreEmpty` a rectangle of zero
   * width or height is skipped and the other one is returned as is (the
   * same object, not a copy).
   */
  united(other: Rect, ignoreEmpty?: boolean): Rect {
    let minX = this._x;
    let maxX = this._x;
    if (this._width < 0) minX += this._width;
    else maxX += this._width;
    if (ignoreEmpty && minX == maxX) return other;
    let otherMinX = other._x;
    let otherMaxX = other._x;
    if (other._width < 0) otherMinX += other._width;
    else otherMaxX += other._width;
    if (ignoreEmpty && otherMinX == otherMaxX) return this;
    let minY = this._y;
    let maxY = this._y;
    if (this._height < 0) minY += this._height;
    else maxY += this._height;
    if (ignoreEmpty && minY == maxY) return other;
    let otherMinY = other._y;
    let otherMaxY = other._y;
    if (other._height < 0) otherMinY += other._height;
    else otherMaxY += other._height;
    if (ignoreEmpty && otherMinY == otherMaxY) return this;
    const result = new Rect();
    result._x = Math.min(minX, otherMinX);
    result._y = Math.min(minY, otherMinY);
    result._width = Math.max(maxX, otherMaxX) - result._x;
    result._height = Math.max(maxY, otherMaxY) - result._y;
    return result;
  }

  /**
   * This rectangle minus `other`. With `multiple` the remainder can come
   * back as a list of up to four rectangles; without it, cases that would
   * need more than one rectangle return a copy of this one.
   *
   * Several results mix normalised coordinates with the raw width/height
   * (`this._height` where the band height would be expected); that is the
   * old behaviour and is kept.
   */
  subtracted(other: Rect, multiple?: false): Rect;
  subtracted(other: Rect, multiple: boolean | undefined): Rect | Rect[];
  subtracted(other: Rect, multiple?: boolean): Rect | Rect[] {
    let left = this._x;
    let right = this._x;
    if (this._width < 0) left += this._width;
    else right += this._width;
    if (left == right) return new Rect(0, 0, 0, 0);
    let otherLeft = other._x;
    let otherRight = other._x;
    if (other._width < 0) otherLeft += other._width;
    else otherRight += other._width;
    if (otherLeft == otherRight) return new Rect(this._x, this._y, this._width, this._height);
    if (left >= otherRight || otherLeft >= right)
      return new Rect(this._x, this._y, this._width, this._height);
    let top = this._y;
    let bottom = this._y;
    if (this._height < 0) top += this._height;
    else bottom += this._height;
    if (top == bottom) return new Rect(0, 0, 0, 0);
    let otherTop = other._y;
    let otherBottom = other._y;
    if (other._height < 0) otherTop += other._height;
    else otherBottom += other._height;

    const copy = (): Rect => new Rect(this._x, this._y, this._width, this._height);
    const w = this._width;
    const h = this._height;

    if (
      otherTop == otherBottom ||
      top >= otherBottom ||
      otherTop >= bottom ||
      (top >= otherTop && bottom <= otherBottom && left < otherLeft && right > otherRight) ||
      (left >= otherLeft && right <= otherRight && top < otherTop && bottom > otherBottom)
    )
      return copy();

    if (top >= otherTop) {
      if (bottom <= otherBottom) {
        // The other rectangle covers this one vertically.
        if (left >= otherLeft) {
          return right <= otherRight
            ? new Rect(left, top, 0, 0)
            : new Rect(otherRight, top, right - otherRight, bottom - top);
        }
        if (right <= otherRight) return new Rect(left, top, otherLeft - left, bottom - top);
        return multiple
          ? [new Rect(left, top, otherLeft - left, h), new Rect(left, top, right - otherRight, h)]
          : new Rect(left, top, w, h);
      }
      // The other rectangle covers the top part.
      if (left >= otherLeft) {
        if (right <= otherRight) return new Rect(left, otherBottom, w, bottom - otherBottom);
        return multiple
          ? [
              new Rect(left, otherBottom, otherRight - left, bottom - otherBottom),
              new Rect(otherRight, top, right - otherRight, h),
            ]
          : new Rect(left, top, w, h);
      }
      if (right <= otherRight) {
        return multiple
          ? [
              new Rect(left, top, otherLeft - left, h),
              new Rect(otherLeft, otherBottom, right - otherLeft, bottom - otherBottom),
            ]
          : new Rect(left, top, w, h);
      }
      return multiple
        ? [
            new Rect(left, top, otherLeft - left, h),
            new Rect(otherLeft, otherBottom, otherRight - otherLeft, bottom - otherBottom),
            new Rect(otherRight, top, right - otherRight, h),
          ]
        : new Rect(left, top, w, h);
    }

    if (bottom <= otherBottom) {
      // The other rectangle covers the bottom part.
      if (left >= otherLeft) {
        if (right <= otherRight) return new Rect(left, top, right - left, otherTop - top);
        return multiple
          ? [
              new Rect(left, top, otherRight - left, otherTop - top),
              new Rect(otherRight, top, right - otherRight, h),
            ]
          : new Rect(left, top, w, h);
      }
      if (right <= otherRight) {
        return multiple
          ? [
              new Rect(left, top, otherLeft - left, h),
              new Rect(otherLeft, top, right - otherLeft, otherTop - top),
            ]
          : new Rect(left, top, w, h);
      }
      return multiple
        ? [
            new Rect(left, top, otherLeft - left, h),
            new Rect(otherLeft, top, otherRight - otherLeft, otherTop - top),
            new Rect(otherRight, top, right - otherRight, h),
          ]
        : new Rect(left, top, w, h);
    }

    // The other rectangle lies inside this one vertically.
    if (!multiple) return copy();
    if (left >= otherLeft) {
      if (right <= otherRight) {
        return [
          new Rect(left, top, right - left, otherTop - top),
          new Rect(left, otherBottom, right - left, bottom - otherBottom),
        ];
      }
      return [
        new Rect(left, top, w, otherTop - top),
        new Rect(otherRight, otherTop, right - otherRight, otherBottom - otherTop),
        new Rect(left, otherBottom, w, bottom - otherBottom),
      ];
    }
    if (right <= otherRight) {
      return [
        new Rect(left, top, w, otherTop - top),
        new Rect(left, otherTop, otherLeft - left, otherBottom - otherTop),
        new Rect(left, otherBottom, w, bottom - otherBottom),
      ];
    }
    return [
      new Rect(left, top, w, otherTop - top),
      new Rect(left, otherTop, otherLeft - left, otherBottom - otherTop),
      new Rect(otherRight, otherTop, right - otherRight, otherBottom - otherTop),
      new Rect(left, otherBottom, w, bottom - otherBottom),
    ];
  }

  /** The overlap of both, or an empty rectangle at (0, 0). */
  intersected(other: Rect): Rect {
    let minX = this._x;
    let maxX = this._x;
    if (this._width < 0) minX += this._width;
    else maxX += this._width;
    if (minX == maxX) return new Rect(0, 0, 0, 0);
    let otherMinX = other._x;
    let otherMaxX = other._x;
    if (other._width < 0) otherMinX += other._width;
    else otherMaxX += other._width;
    if (otherMinX == otherMaxX) return new Rect(0, 0, 0, 0);
    if (minX >= otherMaxX || otherMinX >= maxX) return new Rect(0, 0, 0, 0);
    let minY = this._y;
    let maxY = this._y;
    if (this._height < 0) minY += this._height;
    else maxY += this._height;
    if (minY == maxY) return new Rect(0, 0, 0, 0);
    let otherMinY = other._y;
    let otherMaxY = other._y;
    if (other._height < 0) otherMinY += other._height;
    else otherMaxY += other._height;
    if (otherMinY == otherMaxY) return new Rect(0, 0, 0, 0);
    if (minY >= otherMaxY || otherMinY >= maxY) return new Rect(0, 0, 0, 0);
    const result = new Rect();
    result._x = Math.max(minX, otherMinX);
    result._y = Math.max(minY, otherMinY);
    result._width = Math.min(maxX, otherMaxX) - result._x;
    result._height = Math.min(maxY, otherMaxY) - result._y;
    return result;
  }

  /** Grows the rectangle outwards to whole numbers. */
  toAlignedRect(): Rect {
    const x = Math.floor(this._x);
    const x2 = Math.ceil(this._x + this._width);
    const y = Math.floor(this._y);
    return new Rect(x, y, x2 - x, Math.ceil(this._y + this._height) - y);
  }

  /** Grows the rectangle outwards to multiples of `grid`. */
  toAlignedWithGrid(grid: number): Rect {
    const x = grid * Math.floor(this._x / grid);
    const y = grid * Math.floor(this._y / grid);
    return new Rect(
      x,
      y,
      grid * Math.ceil((this._x + this._width) / grid) - x,
      grid * Math.ceil((this._y + this._height) / grid) - y,
    );
  }

  /** Rounds all values to `digits` decimals (default and for 0: 8). */
  toRoundedPrecision(digits?: number): Rect {
    digits = digits || 8;
    return new Rect(
      Number(this._x.toFixed(digits)),
      Number(this._y.toFixed(digits)),
      Number(this._width.toFixed(digits)),
      Number(this._height.toFixed(digits)),
    );
  }

  getSide(side: RectSide | string): Point {
    switch (side) {
      case Rect.Side.TOP_LEFT:
        return new Point(this._x, this._y);
      case Rect.Side.TOP_CENTER:
        return new Point(this._x + this._width / 2, this._y);
      case Rect.Side.TOP_RIGHT:
        return new Point(this._x + this._width, this._y);
      case Rect.Side.RIGHT_CENTER:
        return new Point(this._x + this._width, this._y + this._height / 2);
      case Rect.Side.BOTTOM_RIGHT:
        return new Point(this._x + this._width, this._y + this._height);
      case Rect.Side.BOTTOM_CENTER:
        return new Point(this._x + this._width / 2, this._y + this._height);
      case Rect.Side.BOTTOM_LEFT:
        return new Point(this._x, this._y + this._height);
      case Rect.Side.LEFT_CENTER:
        return new Point(this._x, this._y + this._height / 2);
      case Rect.Side.CENTER:
        return new Point(this._x + this._width / 2, this._y + this._height / 2);
      default:
        throw new Error("Illegal Argument: " + side);
    }
  }

  /** The side of a 3x3 grid over the rectangle that `point` falls into. */
  getClosestSideName(point: Point): RectSide {
    const grid: RectSide[] = [
      Rect.Side.TOP_LEFT,
      Rect.Side.TOP_CENTER,
      Rect.Side.TOP_RIGHT,
      Rect.Side.LEFT_CENTER,
      Rect.Side.CENTER,
      Rect.Side.RIGHT_CENTER,
      Rect.Side.BOTTOM_LEFT,
      Rect.Side.BOTTOM_CENTER,
      Rect.Side.BOTTOM_RIGHT,
    ];
    let column = 1;
    let row = 1;
    if (point.getX() <= this._x + this._width / 3) column = 0;
    else if (point.getX() >= this._x + (2 * this._width) / 3) column = 2;
    if (point.getY() <= this._y + this._height / 3) row = 0;
    else if (point.getY() >= this._y + (2 * this._height) / 3) row = 2;
    return grid[3 * row + column] as RectSide;
  }

  /**
   * The smallest offset that moves an edge of this rectangle onto an edge
   * of `other`, per axis (null when the edges lie on both sides). With
   * `withDistances`, an axis whose offset is null or 0 also gets the
   * distances between the near and far edges.
   */
  getXYOffset(
    other: Rect,
    horizontal?: boolean,
    vertical?: boolean,
    withDistances?: boolean,
  ): RectXYOffset {
    const result: RectXYOffset = { x: null, y: null };
    if (horizontal) {
      let min: number | null = null;
      let max: number | null = null;
      const own = [this._x, this._x + this._width] as const;
      const theirs = [other._x, other._x + other._width] as const;
      for (const a of own) {
        for (const b of theirs) {
          const offset = b - a;
          if (min === null || offset < min) min = offset;
          if (max === null || offset > max) max = offset;
        }
      }
      // min and max are set by the loops above.
      const lo = min as number;
      const hi = max as number;
      if (lo >= 0 && hi >= 0) result.x = Math.min(lo, hi);
      else if (lo <= 0 && hi <= 0) result.x = Math.max(lo, hi);
      if (withDistances && !result.x) {
        result.leftDist = theirs[0] - own[0];
        result.rightDist = theirs[1] - own[1];
      }
    }
    if (vertical) {
      let min: number | null = null;
      let max: number | null = null;
      const own = [this._y, this._y + this._height] as const;
      const theirs = [other._y, other._y + other._height] as const;
      for (const a of own) {
        for (const b of theirs) {
          const offset = b - a;
          if (min === null || offset < min) min = offset;
          if (max === null || offset > max) max = offset;
        }
      }
      const lo = min as number;
      const hi = max as number;
      if (lo >= 0 && hi >= 0) result.y = Math.min(lo, hi);
      else if (lo <= 0 && hi <= 0) result.y = Math.max(lo, hi);
      if (withDistances && !result.y) {
        result.topDist = theirs[0] - own[0];
        result.bottomDist = theirs[1] - own[1];
      }
    }
    return result;
  }

  toString(): string {
    return (
      "[Object GRect(x=" +
      this._x +
      ", y=" +
      this._y +
      ", width=" +
      this._width +
      ", height=" +
      this._height +
      ")]"
    );
  }
}

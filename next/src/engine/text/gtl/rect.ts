// Old: chunk.vendor.js module 230 (the GTL rectangle, carota's rect.js).
import { Rect } from "../../math/rect.ts";

/** The fields of a layout rectangle: left, top, width, height, right, bottom. */
export interface TLRectLike {
  l: number;
  t: number;
  w: number;
  h: number;
  r: number;
  b: number;
}

/** What a rectangle needs to paint itself. */
interface RectPainter {
  strokeRect(x: number, y: number, width: number, height: number): void;
  fillRect(x: number, y: number, width: number, height: number): void;
}

/** A layout rectangle with public l/t/w/h fields and r/b fixed at construction. */
export class TLRect implements TLRectLike {
  l: number;
  t: number;
  w: number;
  h: number;
  r: number;
  b: number;

  constructor(left: number, top: number, width: number, height: number) {
    this.l = left;
    this.t = top;
    this.w = width;
    this.h = height;
    this.r = left + width;
    this.b = top + height;
  }

  /**
   * The rectangle around both. Negative sizes extend to the left or top.
   * With `ignoreEmpty`, a side that has no extent returns the other
   * rectangle. The union is a math Rect (engine Rect) carrying the l/t/w/h/r/b
   * fields, not a TLRect: the old code built it with the wrong class, and
   * callers only read the fields.
   */
  united(other: TLRectLike, ignoreEmpty?: boolean): TLRectLike {
    let left = this.l;
    let right = this.l;
    if (this.w < 0) left += this.w;
    else right += this.w;
    if (ignoreEmpty && left == right) return other;
    let otherLeft = other.l;
    let otherRight = other.l;
    if (other.w < 0) otherLeft += other.w;
    else otherRight += other.w;
    if (ignoreEmpty && otherLeft == otherRight) return this;
    let top = this.t;
    let bottom = this.t;
    if (this.h < 0) top += this.h;
    else bottom += this.h;
    if (ignoreEmpty && top == bottom) return other;
    let otherTop = other.t;
    let otherBottom = other.t;
    if (other.h < 0) otherTop += other.h;
    else otherBottom += other.h;
    if (ignoreEmpty && otherTop == otherBottom) return this;
    const result = new Rect() as Rect & TLRectLike;
    result.l = Math.min(left, otherLeft);
    result.t = Math.min(top, otherTop);
    result.w = Math.max(right, otherRight) - result.l;
    result.h = Math.max(bottom, otherBottom) - result.t;
    result.r = result.l + result.w;
    result.b = result.t + result.h;
    return result;
  }

  contains(x: number, y: number): boolean {
    return x >= this.l && x < this.l + this.w && y >= this.t && y < this.t + this.h;
  }

  stroke(context: RectPainter): void {
    context.strokeRect(this.l, this.t, this.w, this.h);
  }

  fill(context: RectPainter): void {
    context.fillRect(this.l, this.t, this.w, this.h);
  }

  isEmpty(): boolean {
    return this.w <= 0 || this.h <= 0 || isNaN(this.w) || isNaN(this.h);
  }

  equals(other: TLRectLike): boolean {
    return this.l === other.l && this.t === other.t && this.w === other.w && this.h === other.h;
  }

  center(): { x: number; y: number } {
    return { x: this.l + this.w / 2, y: this.t + this.h / 2 };
  }
}

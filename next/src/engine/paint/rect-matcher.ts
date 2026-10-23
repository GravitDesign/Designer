// Old: chunk.vendor.js module 935.
import { Rect } from "../math/rect.ts";

/** [from, to) along one axis. */
type Interval = [number, number];

interface Location {
  idx: number;
  /** True when the value lies before `idx` (or after the end), not inside it. */
  outside: boolean;
}

function copyIntervals(list: Interval[]): Interval[] {
  return list.map((interval) => [interval[0], interval[1]]);
}

/**
 * A union of axis-aligned rectangles kept as horizontal strips, each with
 * its sorted x intervals. The tile cache uses one per zoom level to know
 * which parts of the scene it holds.
 */
export class RectMatcher {
  _yStrips: Interval[] = [];
  _intervals: Interval[][] = [];

  reset(): void {
    this._yStrips = [];
    this._intervals = [];
  }

  /** Removes `rect` from the union. */
  subtract(rect: Rect): void {
    if (!this._yStrips.length) return;
    const x1 = rect.getX();
    const x2 = rect.getX() + rect.getWidth();
    const y1 = rect.getY();
    const y2 = rect.getY() + rect.getHeight();
    const start = this._locate(this._yStrips, y1);
    if (start.idx === this._yStrips.length) return;
    const end = this._locate(this._yStrips, y2);
    let strip: Interval = new Array(2) as Interval;
    let first = start.idx;
    let last = end.idx;
    let splitEnd: number | undefined;
    strip[0] = y1;
    if (!start.outside) {
      // Split the strip the rectangle starts in.
      splitEnd = (this._yStrips[first] as Interval)[1];
      (this._yStrips[first] as Interval)[1] = y1;
      strip[0] = y1;
      strip[1] = Math.min(splitEnd, y2);
      first += 1;
      if (!end.outside) last += 1;
      this._yStrips.splice(first, 0, strip);
      this._intervals.splice(first, 0, copyIntervals(this._intervals[first - 1] as Interval[]));
    }
    strip = new Array(2) as Interval;
    if (!end.outside) {
      // Split the strip the rectangle ends in.
      const stripStart = (this._yStrips[last] as Interval)[0];
      (this._yStrips[last] as Interval)[0] = y2;
      if (void 0 !== splitEnd) {
        (this._yStrips[last] as Interval)[1] = Math.max(
          splitEnd,
          (this._yStrips[last] as Interval)[1],
        );
      }
      strip[0] = Math.max(stripStart, y1);
      strip[1] = y2;
      this._yStrips.splice(last, 0, strip);
      this._intervals.splice(last, 0, copyIntervals(this._intervals[last] as Interval[]));
    }
    if (first !== last || !start.outside || !end.outside) {
      last = Math.min(last, this._yStrips.length - 1);
      const consolidateFrom = Math.max(0, first - 2);
      const consolidateTo = Math.min(last + 1, this._yStrips.length - 1);
      for (let i = first; i <= last; i++) {
        const intervals = this._intervals[i] as Interval[];
        const from = this._locate(intervals, x1);
        const to = this._locate(intervals, x2);
        let replacement: Interval | undefined = void 0;
        let removeFrom: number;
        let cutEnd: number | undefined = void 0;
        if (from.outside) {
          removeFrom = from.idx;
        } else {
          cutEnd = (intervals[from.idx] as Interval)[1];
          (intervals[from.idx] as Interval)[1] = x1;
          removeFrom = from.idx + 1;
        }
        if (!to.outside) {
          if (void 0 !== cutEnd && from.idx == to.idx) replacement = [x2, cutEnd];
          else (intervals[to.idx] as Interval)[0] = x2;
        }
        const removeTo = to.idx;
        if (replacement) intervals.splice(removeFrom, removeTo - removeFrom, replacement);
        else intervals.splice(removeFrom, removeTo - removeFrom);
      }
      this._consolidate(consolidateFrom, consolidateTo);
    }
    // Otherwise the old code called _consolidate(undefined, undefined), which
    // does nothing.
  }

  _locateSmall(list: Interval[], value: number): Location {
    for (let i = 0; i < list.length; i++) {
      const from = (list[i] as Interval)[0];
      const to = (list[i] as Interval)[1];
      if (value < from) return { idx: i, outside: true };
      if (value >= from && value < to) return { idx: i, outside: false };
    }
    return { idx: list.length, outside: true };
  }

  /** Where `value` falls among sorted intervals (binary search from 10 entries on). */
  _locate(list: Interval[], value: number): Location {
    if (list.length < 10) return this._locateSmall(list, value);
    let low = 0;
    let high = list.length - 1;
    let mid = Math.floor(high / 2);
    while (low <= high) {
      const from = (list[mid] as Interval)[0];
      const to = (list[mid] as Interval)[1];
      if (value < from) high = mid - 1;
      else {
        if (value >= from && value < to) return { idx: mid, outside: false };
        low = mid + 1;
      }
      mid = Math.floor((low + high) / 2);
    }
    return low > list.length - 1
      ? { idx: list.length, outside: true }
      : { idx: low, outside: true };
  }

  /** Adds `rect` to the union; `noConsolidate` skips merging equal strips. */
  merge(rect: Rect, noConsolidate?: boolean): void {
    if (!this._yStrips.length) {
      this._yStrips.push([rect.getY(), rect.getY() + rect.getHeight()]);
      this._intervals.push([[rect.getX(), rect.getX() + rect.getWidth()]]);
      return;
    }
    const x1 = rect.getX();
    const x2 = rect.getX() + rect.getWidth();
    let y1 = rect.getY();
    let y2 = rect.getY() + rect.getHeight();
    const start = this._locate(this._yStrips, y1);
    if (start.idx === this._yStrips.length) {
      this._yStrips.push([y1, y2]);
      this._intervals.push([[x1, x2]]);
      return;
    }
    let splitEnd: number | undefined;
    const end = this._locate(this._yStrips, y2);
    let strip: Interval = new Array(2) as Interval;
    let first = start.idx;
    let last = end.idx;
    strip[0] = y1;
    if (start.outside) {
      strip[0] = y1;
      strip[1] = Math.min((this._yStrips[first] as Interval)[0], y2);
      this._yStrips.splice(first, 0, strip);
      this._intervals.splice(first, 0, [[x1, x2]]);
      first += 1;
      last += 1;
    } else {
      splitEnd = (this._yStrips[first] as Interval)[1];
      (this._yStrips[first] as Interval)[1] = y1;
      strip[0] = y1;
      strip[1] = Math.min(splitEnd, y2);
      first += 1;
      last += 1;
      this._yStrips.splice(first, 0, strip);
      this._intervals.splice(first, 0, copyIntervals(this._intervals[first - 1] as Interval[]));
    }
    strip = new Array(2) as Interval;
    if (end.outside) {
      strip[0] = last > 0 ? Math.max((this._yStrips[last - 1] as Interval)[1], y1) : y1;
      strip[1] = y2;
      this._yStrips.splice(last, 0, strip);
      this._intervals.splice(last, 0, [[x1, x2]]);
    } else {
      const stripStart = (this._yStrips[last] as Interval)[0];
      (this._yStrips[last] as Interval)[0] = y2;
      if (void 0 !== splitEnd) {
        (this._yStrips[last] as Interval)[1] = Math.max(
          splitEnd,
          (this._yStrips[last] as Interval)[1],
        );
      }
      strip[0] = Math.max(stripStart, y1);
      strip[1] = y2;
      this._yStrips.splice(last, 0, strip);
      this._intervals.splice(last, 0, copyIntervals(this._intervals[last] as Interval[]));
    }
    const consolidateFrom = Math.max(0, first - 2);
    const consolidateTo = Math.min(last + 1, this._yStrips.length - 1);
    for (let i = first; i <= last; i++) {
      const intervals = this._intervals[i] as Interval[];
      const from = this._locate(intervals, x1);
      const to = this._locate(intervals, x2);
      const merged: Interval = new Array(2) as Interval;
      merged[0] = from.outside ? x1 : (intervals[from.idx] as Interval)[0];
      merged[1] = to.outside ? x2 : (intervals[to.idx] as Interval)[0];
      intervals.splice(from.idx, to.idx - from.idx, merged);
    }
    // Fill the gaps between the touched strips with new strips.
    for (let i = first; i < last; i++) {
      const upper = this._yStrips[i] as Interval;
      const lower = this._yStrips[i + 1] as Interval;
      y1 = upper[1];
      y2 = lower[0];
      if (y1 !== y2) {
        strip = new Array(2) as Interval;
        strip[0] = y1;
        strip[1] = y2;
        this._yStrips.splice(i + 1, 0, strip);
        this._intervals.splice(i + 1, 0, [[x1, x2]]);
        i += 1;
        last += 1;
      }
    }
    if (!noConsolidate) this._consolidate(consolidateFrom, consolidateTo);
  }

  /** Drops empty strips and intervals, joins touching intervals and equal neighbour strips. */
  _consolidate(from: number, to: number): void {
    for (let i = to; i >= from; i--) {
      const strip = this._yStrips[i] as Interval;
      if (strip[0] !== strip[1]) {
        let intervals = this._intervals[i] as Interval[];
        if (intervals.length) {
          this._intervals[i] = intervals.filter((interval) => !(interval[0] >= interval[1]));
          intervals = this._intervals[i] as Interval[];
          let previous: Interval;
          for (let k = intervals.length - 1; k > 0; k--) {
            previous = intervals[k - 1] as Interval;
            const current = intervals[k] as Interval;
            if (previous[1] == current[0]) {
              intervals.splice(k, 1);
              previous[1] = current[1];
            }
          }
          if (
            i < this._intervals.length - 1 &&
            (this._yStrips[i] as Interval)[1] === (this._yStrips[i + 1] as Interval)[0]
          ) {
            const below = this._intervals[i + 1] as Interval[];
            const own = this._intervals[i] as Interval[];
            if (below.length === own.length) {
              let k = 0;
              while (
                k < own.length &&
                (own[k] as Interval)[0] == (below[k] as Interval)[0] &&
                (own[k] as Interval)[1] == (below[k] as Interval)[1]
              ) {
                k++;
              }
              if (k == own.length) {
                (this._yStrips[i] as Interval)[1] = (this._yStrips[i + 1] as Interval)[1];
                this._yStrips.splice(i + 1, 1);
                this._intervals.splice(i + 1, 1);
              }
            }
          }
        } else {
          this._yStrips.splice(i, 1);
          this._intervals.splice(i, 1);
        }
      } else {
        this._yStrips.splice(i, 1);
        this._intervals.splice(i, 1);
      }
    }
  }

  /** The union as rectangles, one per strip and interval. */
  getRects(consolidate?: boolean): Rect[] {
    if (consolidate) this._consolidate(0, this._yStrips.length - 1);
    const rects: Rect[] = [];
    for (let i = 0; i < this._yStrips.length; i++) {
      const intervals = this._intervals[i] as Interval[];
      const strip = this._yStrips[i] as Interval;
      for (let k = 0; k < intervals.length; k++) {
        const interval = intervals[k] as Interval;
        rects.push(new Rect(interval[0], strip[0], interval[1] - interval[0], strip[1] - strip[0]));
      }
    }
    return rects;
  }
}

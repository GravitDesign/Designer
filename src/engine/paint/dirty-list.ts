// Old: chunk.vendor.js module 664 (GDirtyList).
import { Rect } from "../math/rect.ts";
import type { Transform } from "../math/transform.ts";

/**
 * A set of dirty rectangles plus their union, as handed to the paint code.
 * `intersect` narrows it to one tile, `transform` maps it to another space.
 */
export class DirtyMatcher {
  /** A matcher over `rects` (the list is copied, the rectangles are not). */
  static from(rects: Rect[]): DirtyMatcher {
    const matcher = new DirtyMatcher();
    let united: Rect | null = null;
    for (const rect of rects) united = united ? united.united(rect) : rect;
    matcher._unitedArea = united;
    matcher._rects = rects.slice();
    return matcher;
  }

  _unitedArea: Rect | null = null;
  _rects: Rect[] | null = null;
  _nonIntersectingRects: Rect[] | null = null;

  /** The parts of the dirty rectangles inside `area`, or null if there are none. */
  intersect(area: Rect): DirtyMatcher | null {
    let result: DirtyMatcher | null = null;
    const parts: Rect[] = [];
    let united: Rect | null = null;
    const rects = this._rects as Rect[];
    for (let i = 0; i < rects.length; i++) {
      const part = area.intersected(rects[i] as Rect);
      if (!part.isEmpty()) {
        parts.push(part);
        united = null === united ? part : united.united(part);
      }
    }
    if (united && !united.isEmpty()) {
      result = new DirtyMatcher();
      result._unitedArea = united;
      result._rects = new Array<Rect>(parts.length);
      for (let i = 0; i < parts.length; i++) result._rects[i] = parts[i] as Rect;
    }
    return result;
  }

  isDirty(area: Rect): boolean {
    if (this._unitedArea && !this._unitedArea.intersectsRect(area)) return false;
    if (this._rects && this._rects.length > 0) {
      for (let i = 0; i < this._rects.length; ++i) {
        if ((this._rects[i] as Rect).intersectsRect(area)) return true;
      }
    }
    return false;
  }

  transform(transform: Transform): void {
    if (this._unitedArea) this._unitedArea = transform.mapRect(this._unitedArea);
    if (this._rects && this._rects.length > 0) {
      for (let i = 0; i < this._rects.length; ++i) {
        this._rects[i] = transform.mapRect(this._rects[i] as Rect);
      }
    }
  }

  clip(area: Rect): void {
    if (this._rects && this._rects.length > 0) {
      if (this._unitedArea) this._unitedArea = area.intersected(this._unitedArea);
      for (let i = 0; i < this._rects.length; ++i) {
        this._rects[i] = area.intersected(this._rects[i] as Rect);
      }
    } else {
      this._unitedArea = area;
      this._rects = [area];
    }
  }

  getDirtyArea(): Rect | null {
    return this._unitedArea;
  }

  getDirtyRectangles(): Rect[] | null {
    return this._rects;
  }

  /** The dirty rectangles cut so that none overlaps another; cached after the first call. */
  getNonIntersectingDirtyRectangles(): Rect[] | null {
    if (this._nonIntersectingRects) return this._nonIntersectingRects;
    if (!this._rects) return null;
    let done: Rect[] = [];
    for (let i = 0; i < this._rects.length; i++) {
      let pieces: Rect[] = [this._rects[i] as Rect];
      for (let j = 0; j < done.length; j++) {
        let next: Rect[] = [];
        for (let k = 0; k < pieces.length; k++) {
          let rest: Rect | Rect[] = (pieces[k] as Rect).subtracted(done[j] as Rect, true);
          if (rest instanceof Array) {
            rest = rest.filter((r) => r && r.getWidth() > 0 && r.getHeight() > 0);
            next = next.concat(rest);
          } else if (rest instanceof Rect && rest.getWidth() > 0 && rest.getHeight() > 0) {
            next.push(rest);
          }
        }
        pieces = next;
      }
      done = done.concat(pieces);
    }
    this._nonIntersectingRects = done;
    return done;
  }
}

/** [x, y, width, height] of one collected dirty rectangle. */
type DirtyEntry = [number, number, number, number];

/**
 * Collects dirty rectangles, rounded out to whole pixels and clamped to an
 * optional area. New rectangles are trimmed against the ones already there
 * and merged with one when the union wastes less than `options.epsilon`
 * square pixels.
 */
export class DirtyList {
  static options = {
    epsilon: 2500,
    bufferSize: 10,
  };

  static Matcher = DirtyMatcher;

  _area: Rect | null = null;
  _dirties: (DirtyEntry | undefined)[] | null = null;
  _numDirties = 0;
  /**
   * The entries of `_dirties` in the same order, less some of the emptied
   * ones (0 x 0, left behind by a merge or a covering rectangle). Emptied
   * entries can't trim or merge with a rectangle that has an area, so such
   * a rectangle only needs these; without this every merge left one more
   * entry behind that each later rectangle had to step over.
   */
  _live: DirtyEntry[] = [];
  /** Entries emptied since `_live` was last compacted (an entry may count twice). */
  _emptied = 0;

  setArea(area: Rect | null): void {
    this._area = area;
  }

  getArea(): Rect | null {
    return this._area;
  }

  /** Adds a dirty rectangle; false if it was empty, outside the area or already covered. */
  dirty(x: number, y: number, width: number, height: number): boolean {
    const left = Math.floor(x);
    const top = Math.floor(y);
    width = Math.ceil(x + width) - left;
    height = Math.ceil(y + height) - top;
    x = left;
    y = top;
    if (this._area) {
      if (!this._area.intersectsRectXYWH(x, y, width, height)) return false;
      if (x < this._area.getX()) x = this._area.getX();
      if (y < this._area.getY()) y = this._area.getY();
      if (x + width > this._area.getX() + this._area.getWidth()) {
        width = this._area.getX() + this._area.getWidth() - x;
      }
      if (y + height > this._area.getY() + this._area.getHeight()) {
        height = this._area.getY() + this._area.getHeight() - y;
      }
    }
    if (null == this._dirties) {
      this._dirties = new Array<DirtyEntry | undefined>(DirtyList.options.bufferSize);
    } else if (this._numDirties == this._dirties.length) {
      this._dirties.length += DirtyList.options.bufferSize;
    }
    // A rectangle without an area goes over every entry, emptied ones too,
    // as before (it can stop on an emptied one at its corner).
    let dirties = this._dirties;
    let numDirties = this._numDirties;
    if (width > 0 && height > 0) {
      if (this._emptied > 32 && this._emptied * 2 > this._live.length) {
        this._live = this._live.filter((entry) => entry[2] !== 0 || entry[3] !== 0);
        this._emptied = 0;
      }
      dirties = this._live;
      numDirties = this._live.length;
    }

    // Trim the new rectangle against the existing ones (or the existing ones
    // against it); every change starts the scan over.
    for (let i = 0; i < numDirties; i++) {
      const entry = dirties[i] as DirtyEntry;
      const ex = entry[0];
      const ey = entry[1];
      const ew = entry[2];
      const eh = entry[3];
      if (x >= ex) {
        if (y >= ey) {
          if (x + width <= ex + ew) {
            if (y + height <= ey + eh) return false;
            if (y < ey + eh) {
              height = y + height - (ey + eh);
              y = ey + eh;
              i = -1;
              continue;
            }
          } else if (x < ex + ew && y + height <= ey + eh) {
            width = x + width - (ex + ew);
            x = ex + ew;
            i = -1;
            continue;
          }
        } else if (x + width <= ex + ew && y + height > ey && y + height <= ey + eh) {
          height = ey - y;
          i = -1;
          continue;
        }
      } else if (x <= ex) {
        if (y <= ey && x + width >= ex + ew && y + height >= ey + eh) {
          entry[2] = 0;
          entry[3] = 0;
          this._emptied++;
        } else {
          if (ex < x + width && ey >= y && ey + eh <= y + height) {
            entry[2] = entry[2] - (x + width - entry[0]);
            entry[0] = x + width;
            i = -1;
            continue;
          }
          if (ex + ew <= x + width) {
            if (ey >= y && ey < y + height) {
              entry[3] = eh - (y + height - ey);
              entry[1] = y + height;
              i = -1;
              continue;
            }
            if (ey + eh > y && ey + eh <= y + height) {
              entry[3] = y - ey;
              i = -1;
              continue;
            }
          }
        }
      } else {
        // Unreachable (x < ex already went to the branch above); kept as the
        // old code had it.
        if (x + width > ex && x + width <= ex + ew && y >= ey && y + height <= ey + eh) {
          width = ex - x;
          i = -1;
          continue;
        }
        if (ex + ew > x && ex + ew <= x + width && ey >= y && ey + eh <= y + height) {
          entry[2] = x - ex;
          i = -1;
          continue;
        }
      }
    }

    // Merge with an existing rectangle when the union wastes little space.
    for (let i = 0; i < numDirties; i++) {
      const entry = dirties[i] as DirtyEntry;
      if (
        width > 0 &&
        height > 0 &&
        entry[2] > 0 &&
        entry[3] > 0 &&
        (Math.max(x + width, entry[0] + entry[2]) - Math.min(x, entry[0])) *
          (Math.max(y + height, entry[1] + entry[3]) - Math.min(y, entry[1])) <
          width * height + entry[2] * entry[3] + DirtyList.options.epsilon
      ) {
        const mergedX = Math.min(entry[0], x);
        const mergedY = Math.min(entry[1], y);
        const mergedWidth = Math.max(x + width, entry[0] + entry[2]) - Math.min(entry[0], x);
        const mergedHeight = Math.max(y + height, entry[1] + entry[3]) - Math.min(entry[1], y);
        entry[2] = 0;
        entry[3] = 0;
        this._emptied++;
        return this.dirty(mergedX, mergedY, mergedWidth, mergedHeight);
      }
    }
    const added: DirtyEntry = [x, y, width, height];
    this._dirties[this._numDirties++] = added;
    this._live.push(added);
    return true;
  }

  translate(dx: number, dy: number): void {
    if (this._dirties && this._numDirties > 0) {
      for (let i = 0; i < this._numDirties; ++i) {
        const entry = this._dirties[i] as DirtyEntry;
        entry[0] += dx;
        entry[1] += dy;
      }
    }
  }

  /** The collected rectangles as a matcher (null if none is left), then resets. */
  flush(): DirtyMatcher | null {
    let matcher: DirtyMatcher | null = null;
    if (this._numDirties > 0) {
      matcher = new DirtyMatcher();
      const rects = new Array<Rect>(this._numDirties);
      matcher._rects = rects;
      let count = 0;
      for (let i = 0; i < this._numDirties; ++i) {
        const entry = (this._dirties as (DirtyEntry | undefined)[])[i];
        if (entry && entry[2] > 0 && entry[3] > 0) {
          const rect = new Rect(entry[0], entry[1], entry[2], entry[3]);
          rects[count++] = rect;
          matcher._unitedArea =
            null == matcher._unitedArea ? rect : matcher._unitedArea.united(rect);
        }
      }
      rects.length = count;
      if (0 == rects.length) matcher = null;
    }
    this.reset();
    return matcher;
  }

  reset(): void {
    if (this._numDirties > 0) {
      (this._dirties as unknown[]).length = DirtyList.options.bufferSize;
      this._numDirties = 0;
      this._live = [];
      this._emptied = 0;
    }
  }

  toString(): string {
    return "[Object GDirtyList]";
  }
}

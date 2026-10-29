import { describe, expect, it } from "vitest";
import { Rect } from "../math/rect.ts";
import { Transform } from "../math/transform.ts";
import { DirtyList, DirtyMatcher } from "./dirty-list.ts";

const box = (r: Rect | undefined) => (r ? [r.getX(), r.getY(), r.getWidth(), r.getHeight()] : null);

type Entry = [number, number, number, number];

/** DirtyList.dirty as it was before it kept a list of the live entries, to compare against. */
class ReferenceList extends DirtyList {
  override dirty(x: number, y: number, width: number, height: number): boolean {
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
      this._dirties = new Array<Entry | undefined>(DirtyList.options.bufferSize);
    } else if (this._numDirties == this._dirties.length) {
      this._dirties.length += DirtyList.options.bufferSize;
    }
    const dirties = this._dirties;

    // Trim the new rectangle against the existing ones (or the existing ones
    // against it); every change starts the scan over.
    for (let i = 0; i < this._numDirties; i++) {
      const entry = dirties[i] as Entry;
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
    for (let i = 0; i < this._numDirties; i++) {
      const entry = dirties[i] as Entry;
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
        return this.dirty(mergedX, mergedY, mergedWidth, mergedHeight);
      }
    }
    dirties[this._numDirties++] = [x, y, width, height];
    return true;
  }
}

/** A seeded generator, so a failure can be replayed. */
function random(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
}

/** Feeds both lists the same rectangles; every result and every flush must match. */
function compare(seed: number, area: Rect | null, count: number, flushEvery: number): number {
  const next = random(seed);
  const list = new DirtyList();
  const reference = new ReferenceList();
  list.setArea(area);
  reference.setArea(area);
  let rects = 0;
  for (let i = 0; i < count; i++) {
    const kind = next();
    let x = next() * 1600 - 50;
    let y = next() * 1000 - 50;
    let width = 1 + next() * 20;
    let height = 1 + next() * 20;
    if (kind < 0.15 && reference._numDirties > 0) {
      // On the corner of an entry, often an emptied one.
      const entry = (reference._dirties as Entry[])[
        Math.floor(next() * reference._numDirties)
      ] as Entry;
      x = entry[0];
      y = entry[1];
    }
    if (kind < 0.05) {
      // No area: whole pixels, so it stays empty after rounding.
      x = Math.round(x);
      y = Math.round(y);
      width = 0;
      height = next() < 0.5 ? 0 : Math.round(height);
    } else if (kind > 0.95) {
      width = 100 + next() * 400;
      height = 100 + next() * 400;
    }
    expect(list.dirty(x, y, width, height)).toBe(reference.dirty(x, y, width, height));
    if (i % flushEvery === flushEvery - 1) {
      const got = list.flush();
      const want = reference.flush();
      expect(got ? (got.getDirtyRectangles() as Rect[]).map(box) : null).toEqual(
        want ? (want.getDirtyRectangles() as Rect[]).map(box) : null,
      );
      expect(got ? box(got.getDirtyArea() as Rect) : null).toEqual(
        want ? box(want.getDirtyArea() as Rect) : null,
      );
      rects += want ? (want.getDirtyRectangles() as Rect[]).length : 0;
    }
  }
  return rects;
}

describe("DirtyList", () => {
  it("rounds rectangles out to whole pixels and clamps them to the area", () => {
    const list = new DirtyList();
    list.setArea(new Rect(0, 0, 100, 100));
    expect(list.dirty(-5.5, 10.2, 20, 5.5)).toBe(true);
    expect(list.dirty(200, 200, 5, 5)).toBe(false);
    const matcher = list.flush() as DirtyMatcher;
    // Clamping the left edge keeps the width (the old behaviour): -6..15 becomes 0..21.
    expect((matcher.getDirtyRectangles() as Rect[]).map(box)).toEqual([[0, 10, 21, 6]]);
  });

  it("ignores a rectangle inside an existing one and trims overlaps", () => {
    const list = new DirtyList();
    // Far apart, so the merge rule (waste under epsilon) doesn't kick in.
    list.dirty(0, 0, 100, 100);
    expect(list.dirty(10, 10, 20, 20)).toBe(false);
    list.dirty(50, 50, 100, 30);
    const rects = (list.flush() as DirtyMatcher).getDirtyRectangles() as Rect[];
    expect(rects.map(box)).toEqual([
      [0, 0, 100, 100],
      [100, 50, 50, 30],
    ]);
  });

  it("merges two rectangles when the union wastes less than epsilon", () => {
    const list = new DirtyList();
    list.dirty(0, 0, 10, 10);
    list.dirty(20, 0, 10, 10);
    const rects = (list.flush() as DirtyMatcher).getDirtyRectangles() as Rect[];
    expect(rects.map(box)).toEqual([[0, 0, 30, 10]]);
  });

  it("grows its buffer and resets after flush", () => {
    const list = new DirtyList();
    for (let i = 0; i < 12; i++) list.dirty(i * 1000, 0, 10, 10);
    expect(list._numDirties).toBe(12);
    list.translate(5, 1);
    const rects = (list.flush() as DirtyMatcher).getDirtyRectangles() as Rect[];
    expect(rects).toHaveLength(12);
    expect(box(rects[11])).toEqual([11005, 1, 10, 10]);
    expect(list.flush()).toBeNull();
  });

  it("keeps the same rectangles as before over many merges, with an area", () => {
    // Small rectangles packed close merge again and again, each merge
    // leaving an emptied entry behind.
    let rects = 0;
    for (const seed of [1, 2, 3]) rects += compare(seed, new Rect(0, 0, 1600, 1000), 3000, 1000);
    expect(rects).toBeGreaterThan(0);
  });

  it("keeps the same rectangles as before over many merges, without an area", () => {
    let rects = 0;
    for (const seed of [4, 5]) rects += compare(seed, null, 3000, 700);
    expect(rects).toBeGreaterThan(0);
  });

  it("keeps the same rectangles as before when flushed often", () => {
    compare(6, new Rect(0, 0, 1600, 1000), 2000, 37);
  });

  it("forgets the emptied and live entries on flush", () => {
    const list = new DirtyList();
    list.dirty(0, 0, 10, 10);
    list.dirty(20, 0, 10, 10);
    list.flush();
    // Left over from before the flush, the first entry would cover this one.
    expect(list.dirty(25, 0, 5, 5)).toBe(true);
    expect(((list.flush() as DirtyMatcher).getDirtyRectangles() as Rect[]).map(box)).toEqual([
      [25, 0, 5, 5],
    ]);
  });
});

describe("DirtyMatcher", () => {
  const matcher = () => DirtyMatcher.from([new Rect(0, 0, 10, 10), new Rect(5, 5, 10, 10)]);

  it("intersects with an area and answers isDirty", () => {
    const m = matcher();
    expect(box(m.getDirtyArea() as Rect)).toEqual([0, 0, 15, 15]);
    const part = m.intersect(new Rect(8, 0, 20, 4)) as DirtyMatcher;
    expect((part.getDirtyRectangles() as Rect[]).map(box)).toEqual([[8, 0, 2, 4]]);
    expect(m.intersect(new Rect(50, 50, 5, 5))).toBeNull();
    expect(m.isDirty(new Rect(14, 14, 3, 3))).toBe(true);
    expect(m.isDirty(new Rect(11, 0, 3, 3))).toBe(false);
  });

  it("cuts overlapping rectangles apart", () => {
    const rects = matcher().getNonIntersectingDirtyRectangles() as Rect[];
    let area = 0;
    for (const r of rects) area += r.getWidth() * r.getHeight();
    expect(area).toBe(175);
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        expect((rects[i] as Rect).intersectsRect(rects[j] as Rect)).toBe(false);
      }
    }
  });

  it("transforms and clips", () => {
    const m = matcher();
    m.transform(new Transform().translated(10, 0));
    expect(box(m.getDirtyArea() as Rect)).toEqual([10, 0, 15, 15]);
    m.clip(new Rect(0, 0, 12, 12));
    expect((m.getDirtyRectangles() as Rect[]).map(box)).toEqual([
      [10, 0, 2, 10],
      [0, 0, 0, 0],
    ]);
    const empty = new DirtyMatcher();
    empty.clip(new Rect(1, 2, 3, 4));
    expect((empty.getDirtyRectangles() as Rect[]).map(box)).toEqual([[1, 2, 3, 4]]);
  });
});

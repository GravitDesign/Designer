import { describe, expect, it } from "vitest";
import { Rect } from "../math/rect.ts";
import { Transform } from "../math/transform.ts";
import { DirtyList, DirtyMatcher } from "./dirty-list.ts";

const box = (r: Rect | undefined) => (r ? [r.getX(), r.getY(), r.getWidth(), r.getHeight()] : null);

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

import { describe, expect, it } from "vitest";
import { Rect } from "../math/rect.ts";
import { RectMatcher } from "./rect-matcher.ts";

const rects = (m: RectMatcher) =>
  m.getRects().map((r) => [r.getX(), r.getY(), r.getWidth(), r.getHeight()]);

function area(m: RectMatcher): number {
  return m.getRects().reduce((sum, r) => sum + r.getWidth() * r.getHeight(), 0);
}

describe("RectMatcher", () => {
  it("merges overlapping rectangles into strips without double counting", () => {
    const m = new RectMatcher();
    m.merge(new Rect(0, 0, 10, 10));
    m.merge(new Rect(5, 5, 10, 10));
    expect(area(m)).toBe(175);
    expect(rects(m)).toEqual([
      [0, 0, 10, 5],
      [0, 5, 15, 5],
      [5, 10, 10, 5],
    ]);
  });

  it("joins touching rectangles", () => {
    const m = new RectMatcher();
    m.merge(new Rect(0, 0, 10, 10));
    m.merge(new Rect(10, 0, 10, 10));
    expect(rects(m)).toEqual([[0, 0, 20, 10]]);
  });

  it("subtracts a hole", () => {
    const m = new RectMatcher();
    m.merge(new Rect(0, 0, 30, 30));
    m.subtract(new Rect(10, 10, 10, 10));
    expect(area(m)).toBe(800);
    expect(rects(m)).toEqual([
      [0, 0, 30, 10],
      [0, 10, 10, 10],
      [20, 10, 10, 10],
      [0, 20, 30, 10],
    ]);
  });

  it("subtracts everything and resets", () => {
    const m = new RectMatcher();
    m.merge(new Rect(0, 0, 10, 10));
    m.subtract(new Rect(-5, -5, 20, 20));
    expect(rects(m)).toEqual([]);
    m.subtract(new Rect(0, 0, 1, 1));
    m.merge(new Rect(1, 1, 1, 1));
    m.reset();
    expect(m.getRects()).toEqual([]);
  });

  it("finds values in long lists with the binary search", () => {
    const m = new RectMatcher();
    const strips: [number, number][] = [];
    for (let i = 0; i < 20; i++) strips.push([i * 10, i * 10 + 5]);
    expect(m._locate(strips, 42)).toEqual({ idx: 4, outside: false });
    expect(m._locate(strips, 47)).toEqual({ idx: 5, outside: true });
    expect(m._locate(strips, 500)).toEqual({ idx: 20, outside: true });
    expect(m._locate(strips.slice(0, 3), 7)).toEqual({ idx: 1, outside: true });
  });
});

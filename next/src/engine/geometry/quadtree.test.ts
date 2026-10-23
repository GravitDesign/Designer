import { describe, expect, it } from "vitest";
import { QuadTree, QuadTreeElement } from "./quadtree.ts";

function box(x: number, y: number, w: number, h: number, data?: string): QuadTreeElement {
  const e = new QuadTree.Element(x, y, w, h);
  if (data !== undefined) e.data = data;
  return e;
}

describe("QuadTree", () => {
  it("defaults its limits and element fields", () => {
    const t = new QuadTree({ x: 0, y: 0, width: 100, height: 100 });
    expect([t.max_objects, t.max_levels, t.level, t.nodes]).toEqual([10, 4, 0, null]);
    const e = new QuadTreeElement();
    expect([e.x, e.y, e.width, e.height, e.data]).toEqual([0, 0, 0, 0, null]);
  });

  it("indexes quadrants as bottom right, top right, bottom left, top left", () => {
    const t = new QuadTree({ x: 0, y: 0, width: 100, height: 100 });
    expect(t.getIndex(box(60, 60, 10, 10))).toBe(0);
    expect(t.getIndex(box(60, 10, 10, 10))).toBe(1);
    expect(t.getIndex(box(10, 60, 10, 10))).toBe(2);
    expect(t.getIndex(box(10, 10, 10, 10))).toBe(3);
    // Crossing the middle, or touching it from the top/left side.
    expect(t.getIndex(box(45, 10, 10, 10))).toBe(-1);
    expect(t.getIndex(box(10, 40, 10, 10))).toBe(-1);
    expect(t.getIndex(box(-1, 10, 10, 10))).toBe(-1);
  });

  it("splits past max_objects and keeps boxes on an edge in the parent", () => {
    const t = new QuadTree<QuadTreeElement>({ x: 0, y: 0, width: 100, height: 100 }, 2);
    const crossing = box(45, 45, 10, 10, "crossing");
    const a = box(1, 1, 5, 5, "a");
    const b = box(10, 10, 5, 5, "b");
    t.insert(a);
    t.insert(crossing);
    expect(t.nodes).toBeNull();
    t.insert(b);
    expect(t.nodes?.length).toBe(4);
    expect(t.objects).toEqual([crossing]);
    expect(t.nodes?.[3]?.objects).toEqual([a, b]);
    expect(t.nodes?.[0]?.bounds).toEqual({ x: 50, y: 50, width: 50, height: 50 });
    // Parent boxes first, then the quadrant the query fits in.
    expect(t.retrieve(box(2, 2, 1, 1))).toEqual([crossing, a, b]);
    // A query that fits no quadrant collects all four.
    const c = box(70, 70, 5, 5, "c");
    t.insert(c);
    expect(t.retrieve(box(40, 40, 20, 20)).map((e) => e.data)).toEqual(["crossing", "c", "a", "b"]);
  });

  it("filters by intersection or containment", () => {
    const t = new QuadTree<QuadTreeElement>({ x: 0, y: 0, width: 100, height: 100 });
    const a = box(0, 0, 10, 10);
    const b = box(5, 5, 10, 10);
    const c = box(20, 20, 5, 5);
    for (const e of [a, b, c]) t.insert(e);
    const query = box(0, 0, 12, 12);
    expect(t.retrieve(query, QuadTree.RETRIEVE_MODE_INTERSECT)).toEqual([a, b]);
    expect(t.retrieve(query, QuadTree.RETRIEVE_MODE_FULLYCONTAINED)).toEqual([a]);
    // Touching edges don't intersect.
    expect(t.retrieve(box(10, 10, 1, 1), QuadTree.RETRIEVE_MODE_INTERSECT)).toEqual([b]);
    expect(t.retrieve(query)).toBe(t.objects);
  });

  it("removes by identity and merges empty quadrants", () => {
    const t = new QuadTree<QuadTreeElement>({ x: 0, y: 0, width: 100, height: 100 }, 1);
    const a = box(1, 1, 5, 5);
    const b = box(60, 60, 5, 5);
    t.insert(a);
    t.insert(b);
    expect(t.nodes).not.toBeNull();
    expect(t.remove(box(1, 1, 5, 5))).toBe(false);
    expect(t.remove(a)).toBe(true);
    expect(t.nodes).not.toBeNull();
    expect(t.remove(b)).toBe(true);
    expect(t.nodes).toBeNull();
  });

  it("throws on clear, as the old code did", () => {
    const leaf = new QuadTree({ x: 0, y: 0, width: 100, height: 100 });
    expect(() => leaf.clear()).toThrow(TypeError);
    const split = new QuadTree({ x: 0, y: 0, width: 100, height: 100 });
    split.split();
    expect(() => split.clear()).toThrow(TypeError);
  });
});

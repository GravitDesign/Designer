import { afterEach, describe, expect, it, vi } from "vitest";
import type { AcceleratedApi } from "../../../engine/scene/element-accelerated.ts";
import { Group } from "../../../engine/scene/group.ts";
import { FontManager } from "../../../engine/text/fonts/font-manager.ts";
import { EPSParser } from "./eps-parser.ts";

type Box = { getX(): number; getY(): number; getWidth(): number; getHeight(): number } | null;
type TreeEntry = { x: number; y: number; width: number; height: number; data: unknown };
type Tree = { objects: TreeEntry[]; nodes: Tree[] | null } | null;
type Inspected = Group & {
  _geometryBBox: Box;
  _paintBBox: Box;
  _childrenPaintBBox: Box;
  _sourceBBox: Box;
  _preTransformRect: Box;
  _collidesWithChildren: unknown;
  _childrenPaintQTree: Tree;
  _childrenGeometryQTree: Tree;
};
type Child = {
  _elementIndex: number;
  getChildren(): unknown[];
  getPaintBBox(): Box;
  getGeometryBBox(): Box;
};

function parser(): { p: EPSParser; handed: unknown[] } {
  const handed: unknown[] = [];
  const p = new EPSParser(
    new Uint8Array(0),
    (_error, group) => handed.push(group),
    new FontManager(),
    () => {},
  );
  return { p, handed };
}

/** A parser that fills its group the old way: every geometry bracket runs. */
function unbatchedParser(): { p: EPSParser; handed: unknown[] } {
  const result = parser();
  // The group is still empty, so this only lifts the block.
  result.p._endGroupBatch();
  return result;
}

const segment = (type: string, x: number, y: number) => ({ type, coord: { x, y } });
const square = (x: number, y: number, size: number) => [
  [
    segment("moveto", x, y),
    segment("lineto", x + size, y),
    segment("lineto", x + size, y + size),
    segment("lineto", x, y + size),
    segment("closepath", x, y),
  ],
];
const rgb = { type: "rgb", value: [10, 20, 30] };
const linear = {
  type: "linear",
  value: [0, 0, 300, 50],
  stops: [
    { position: 0, opacity: 1, color: { type: "rgb", value: [255, 0, 0] } },
    { position: 1, opacity: 1, color: { type: "rgb", value: [0, 0, 255] } },
  ],
};

const COUNT = 80;

/**
 * The same drawing on both parsers: squares spread out (enough to split
 * the quadtree), every fifth one inside a clip, which makes the group
 * update the clip again, and a gradient sized by the group half way.
 */
function draw(p: EPSParser): unknown[] {
  const gradients: unknown[] = [];
  for (let i = 0; i < COUNT; ++i) {
    const x = (i * 37) % 500;
    const y = Math.floor(i / 7) * 23;
    const clips = i % 5 === 0 ? [square(x - 2, y - 2, 30)] : [];
    p.fill(square(x, y, 10 + (i % 4)) as never, rgb as never, clips as never, false);
    if (i === COUNT / 2) gradients.push(p.getGColor(linear as never, p.ggroup as never));
  }
  gradients.push(p.getGColor(linear as never, p.ggroup as never));
  return gradients;
}

const box = (b: Box): number[] | null =>
  b ? [b.getX(), b.getY(), b.getWidth(), b.getHeight()] : null;

/** The tree with each entry as its box and the index of its child, in retrieve order. */
function tree(t: Tree, children: unknown[]): unknown {
  if (!t) return null;
  return {
    objects: t.objects.map((o) => [o.x, o.y, o.width, o.height, children.indexOf(o.data)]),
    nodes: t.nodes ? t.nodes.map((n) => tree(n, children)) : null,
  };
}

/** Everything the group keeps: its caches, its trees and its children's indices and boxes. */
function state(group: Group): unknown {
  const g = group as Inspected;
  // The group's tree entries as its next read sees them.
  (group as unknown as AcceleratedApi)._applyPendingAccelUpdates();
  const children = group.getChildren();
  return {
    caches: {
      geometry: box(g._geometryBBox),
      paint: box(g._paintBBox),
      childrenPaint: box(g._childrenPaintBBox),
      source: box(g._sourceBBox),
      preTransform: box(g._preTransformRect),
      collides: g._collidesWithChildren,
    },
    paintTree: tree(g._childrenPaintQTree, children),
    geometryTree: tree(g._childrenGeometryQTree, children),
    children: children.map((node) => {
      const child = node as unknown as Child;
      return {
        index: child._elementIndex,
        inside: child.getChildren ? child.getChildren().length : 0,
        paint: box(child.getPaintBBox()),
        geometry: box(child.getGeometryBBox()),
      };
    }),
    geometry: box(group.getGeometryBBox() as Box),
    paint: box(group.getPaintBBox() as Box),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("EPSParser filling its group", () => {
  it("hands over the same group as when every geometry bracket ran", () => {
    const batched = parser();
    const reference = unbatchedParser();
    const gradients = draw(batched.p);
    const referenceGradients = draw(reference.p);
    batched.p.doneCall();
    reference.p.doneCall();
    expect(batched.handed).toEqual([batched.p.ggroup]);
    expect(batched.p.ggroup.getChildren()).toHaveLength(COUNT);
    expect(gradients).toEqual(referenceGradients);
    // Before anything reads the boxes again: the caches as handed over.
    expect(state(batched.p.ggroup)).toEqual(state(reference.p.ggroup));
  });

  it("measures the group a few times, not once per shape", () => {
    const measure = vi.spyOn(Group.prototype, "_calculateGeometryBBox");
    const reference = unbatchedParser();
    draw(reference.p);
    reference.p.doneCall();
    // The old way measures it at least once for every shape.
    expect(measure.mock.calls.length).toBeGreaterThan(COUNT);
    measure.mockClear();
    const batched = parser();
    draw(batched.p);
    batched.p.doneCall();
    expect(measure.mock.calls.length).toBeLessThan(10);
  });

  it("lifts the block when it hands the group over", () => {
    const { p } = parser();
    draw(p);
    p.doneCall();
    const group = p.ggroup as unknown as { _blockedChanges?: unknown };
    expect(group._blockedChanges).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";
import { Vertex } from "../geometry/vertex.ts";
import { VertexInfo } from "../geometry/vertex-info.ts";
import { Point } from "../math/point.ts";
import { Transform } from "../math/transform.ts";
import { BorderPaintLayer } from "../style/border-paint-layer.ts";
import { RGBColor } from "../color/rgb-color.ts";
import { NodeChange, NodeFlag } from "./node-change.ts";
import { Node } from "./node.ts";
import { AnchorPoint } from "./path-base.ts";
import { Path, type PathIntersection } from "./path.ts";
import type { PolyLine } from "../geometry/boolean/poly-segments.ts";

type Spec = [number, number] | Record<string, unknown>;

function path(points: Spec[], closed = false): Path {
  const p = new Path(closed);
  for (const spec of points) {
    const ap = new AnchorPoint();
    if (Array.isArray(spec)) ap.setProperties(["x", "y"], spec);
    else ap.setProperties(Object.keys(spec), Object.values(spec));
    p.getAnchorPoints().appendChild(ap);
  }
  return p;
}

function anchors(p: Path): number[][] {
  return (p.getAnchorPoints().getChildren() as AnchorPoint[]).map((ap) => [ap.$x, ap.$y]);
}

describe("GPath", () => {
  it("is node 'path' and saves `closed`", () => {
    const p = path(
      [
        [0, 0],
        [1, 1],
      ],
      true,
    );
    const blob = JSON.parse(Node.serialize(p) as string) as Record<string, unknown>;
    expect(blob["@"]).toBe("path");
    expect(blob["closed"]).toBe(true);
    expect(new Path()._paintSharp).toBe(true);
  });

  it("takes an old `rtxt` as `refs` when restoring", () => {
    const blob: Record<string, unknown> = { rtxt: ["t1"] };
    new Path()._handleChange(NodeChange.PrepareRestore, { blob });
    expect(blob["refs"]).toEqual(["t1"]);
    const both: Record<string, unknown> = { rtxt: ["t1"], refs: ["t2"] };
    new Path()._handleChange(NodeChange.PrepareRestore, { blob: both });
    expect(both["refs"]).toEqual(["t2"]);
    const restored = Node.deserialize(JSON.stringify({ "@": "path", rtxt: ["t1"] })) as Path;
    expect(restored.getProperty("rtxt")).toEqual(["t1"]);
  });

  it("goes into layers, groups, pages, shapes and compound paths only", () => {
    expect(new Path().validateInsertion(new Path() as never)).toBe(true);
    expect(new Path().validateInsertion(new AnchorPoint() as never)).toBe(false);
  });

  it("tells straight lines", () => {
    expect(
      path([
        [0, 0],
        [10, 10],
      ]).isLine(),
    ).toBe(true);
    expect(path([{ x: 0, y: 0, hrx: 0, hry: 0 }, [10, 10]]).isLine()).toBe(true);
    expect(path([{ x: 0, y: 0, hrx: 5, hry: 0 }, [10, 10]]).isLine()).toBe(false);
    expect(
      path([
        [0, 0],
        [10, 10],
        [20, 20],
      ]).isLine(),
    ).toBe(false);
    expect(
      path([
        [0, 0],
        [10, 10],
        [20, 20],
      ]).isMultiPointsLine(),
    ).toBe(true);
    expect(
      path([
        [0, 0],
        [10, 10],
        [20, 21],
      ]).isMultiPointsLine(),
    ).toBe(false);
  });

  it("inserts a point on a straight segment", () => {
    const p = path([
      [0, 0],
      [100, 0],
      [100, 100],
    ]);
    const inserted = p.insertHitPoint({ segment: 2, slope: 0.25 });
    expect([inserted?.$x, inserted?.$y]).toEqual([100, 25]);
    expect(anchors(p)).toEqual([
      [0, 0],
      [100, 0],
      [100, 25],
      [100, 100],
    ]);
  });

  it("splits a cubic segment without changing the shape", () => {
    const p = path([
      { x: 0, y: 0, hrx: 0, hry: 50 },
      { x: 100, y: 0, hlx: 100, hly: 50 },
    ]);
    const before = VertexInfo.getSegmentPoint(p, 1, 0.5) as Point;
    const inserted = p.insertHitPoint({ segment: 1, slope: 0.5 }) as AnchorPoint;
    expect(inserted.$x).toBeCloseTo(before.getX(), 10);
    expect(inserted.$y).toBeCloseTo(before.getY(), 10);
    expect(inserted.$tp).toBe("R");
    // The halves keep the curve: the split point lies on both.
    expect(inserted.$hly).toBeCloseTo(37.5, 10);
    expect(inserted.$hry).toBeCloseTo(37.5, 10);
  });

  it("raises a quadratic segment to cubics when splitting it", () => {
    const p = path([{ x: 0, y: 0, hrx: 50, hry: 50 }, [100, 0]]);
    const inserted = p.insertHitPoint({ segment: 1, slope: 0.5 }) as AnchorPoint;
    expect([inserted.$x, inserted.$y]).toEqual([50, 25]);
    expect(inserted.$hlx).not.toBe(null);
    expect(inserted.$hrx).not.toBe(null);
  });

  it("inserts nothing at the ends of a segment or without a hit", () => {
    const p = path([
      [0, 0],
      [100, 0],
    ]);
    expect(p.insertHitPoint({ segment: 1, slope: 0 })).toBe(null);
    expect(p.insertHitPoint({ segment: 1, slope: 1 })).toBe(null);
    expect(p.insertHitPoint(null)).toBe(null);
    expect(p.insertHitPoint({ segment: 5, slope: 0.5 })).toBe(null);
  });

  it("closes a path whose last point lies on the first", () => {
    const p = path([[0, 0], [10, 0], [10, 10], { x: 0, y: 0, hlx: -1, hly: 5 }]);
    p.correctClosedAttribute();
    expect(p.getProperty("closed")).toBe(true);
    expect(anchors(p)).toEqual([
      [0, 0],
      [10, 0],
      [10, 10],
    ]);
    const first = p.getAnchorPoints().getFirstChild() as AnchorPoint;
    expect([first.$hlx, first.$hly]).toEqual([-1, 5]);
    const open = path([
      [0, 0],
      [10, 0],
      [0, 1],
    ]);
    open.correctClosedAttribute();
    expect(open.getProperty("closed")).toBe(false);
  });

  it("keeps the selected anchor points selected in a clone", () => {
    const p = path([
      [0, 0],
      [10, 0],
      [10, 10],
    ]);
    (p.getAnchorPoints().getChildByIndex(1) as AnchorPoint).setFlag(NodeFlag.Selected);
    const copy = p.clone() as Path;
    const selected = copy
      .getAnchorPoints()
      .getChildren()
      .map((ap) => ap.hasFlag(NodeFlag.Selected));
    expect(selected).toEqual([false, true, false]);
  });

  it("finds pivots with their details", () => {
    const p = path([[0, 0], { x: 10, y: 0, tp: "TS" }]);
    p.setProperty("trf", new Transform(1, 0, 0, 1, 5, 0));
    const pivots = p.findPivots(true) as { point: Point; ptType: string; autoH: boolean }[];
    expect(pivots.map((pivot) => [pivot.point.getX(), pivot.ptType, pivot.autoH])).toEqual([
      [5, "R", false],
      [15, "TS", false],
    ]);
    expect(p.findPivots()).toHaveLength(1);
  });

  it("measures the angle of a multi-point line even when it is flat", () => {
    const p = path([
      [0, 0],
      [10, 0],
      [20, 0],
    ]);
    p.setProperty("trf", new Transform(0, 1, -1, 0, 0, 0));
    expect(p.getAngle()).toBeCloseTo(-Math.PI / 2, 12);
  });

  it("adds butt-cap borders of a line across it only", () => {
    const p = path([
      [0, 0],
      [100, 0],
    ]);
    const border = new BorderPaintLayer();
    border.setProperties(["_pt", "_bw", "_blc"], [new RGBColor([0, 0, 0]), 10, "butt"]);
    p.getPaintLayers()?.appendChild(border);
    const box = p.getPaintBBox();
    expect([box?.getX(), box?.getWidth(), box?.getHeight()]).toEqual([0, 100, 10]);
  });

  it("inserts knife intersections into both paths", () => {
    const a = path([
      [0, 0],
      [100, 0],
    ]);
    const b = path([
      [50, -50],
      [50, 50],
    ]);
    const hit: PathIntersection = {
      pt: new Point(50, 0),
      polySeg0: { seg: 1 } as PolyLine,
      polySeg1: { seg: 1 } as PolyLine,
      slope0: 0.5,
      slope1: 0.5,
    };
    const added = Path.addIntersectionPoints(a, b, [hit]) as AnchorPoint[][];
    expect(added.map((list) => list.map((ap) => [ap.$x, ap.$y]))).toEqual([[[50, 0]], [[50, 0]]]);
    expect(anchors(a)).toEqual([
      [0, 0],
      [50, 0],
      [100, 0],
    ]);
    // On an existing point only with useExisting.
    const atEnd = { ...hit, pt: new Point(100, 0), slope0: 1, slope1: 1 };
    expect(
      Path.addIntersectionPoints(
        path([
          [0, 0],
          [100, 0],
        ]),
        null,
        [atEnd],
      ),
    ).toBe(null);
    const existing = Path.addIntersectionPoints(
      path([
        [0, 0],
        [100, 0],
      ]),
      null,
      [atEnd],
      true,
    );
    expect(existing?.[0]?.[0]?.$x).toBe(100);
  });

  it("generates the segment middle", () => {
    const p = path([
      [0, 0],
      [100, 0],
    ]);
    const middle = p.getSegmentMiddle(1) as Point;
    expect([middle.getX(), middle.getY()]).toEqual([50, 0]);
    const v = new Vertex();
    p.rewindVertices(0);
    expect(p.readVertex(v) && v.command).toBe(Vertex.Command.Move);
  });
});

import { describe, expect, it } from "vitest";
import { packPoint } from "../core/util.ts";
import { VertexContainer } from "../geometry/vertex-container.ts";
import { Vertex } from "../geometry/vertex.ts";
import { Point } from "../math/point.ts";
import { Transform } from "../math/transform.ts";
import { Node } from "./node.ts";
import { AnchorPoint, AnchorPoints, PathBase } from "./path-base.ts";
import { Path } from "./path.ts";

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

function verts(source: { rewindVertices(i: number): boolean; readVertex(v: Vertex): boolean }) {
  const out: number[][] = [];
  if (!source.rewindVertices(0)) return out;
  const v = new Vertex();
  while (source.readVertex(v)) out.push([v.command, v.x, v.y]);
  return out;
}

function points(p: PathBase): AnchorPoint[] {
  return p.getAnchorPoints().getChildren() as AnchorPoint[];
}

const C = Vertex.Command;

describe("GPathBase.AnchorPoint serialization", () => {
  it("writes the compact form: type, auto flag, packed position, handles, radii", () => {
    const ap = new AnchorPoint();
    ap.setProperties(["x", "y", "tp", "hlx", "hly", "cl", "cr"], [10, 20, "B", 1, 2, 3, 3]);
    expect(ap.serialize()).toEqual([
      "B",
      packPoint(10, 20),
      "h",
      packPoint(1, 2),
      "C",
      packPoint(3, 3),
    ]);
  });

  it("leaves out handles of auto-handle points and default values", () => {
    const ap = new AnchorPoint();
    ap.$ah = true;
    ap.$hrx = 5;
    ap.$hry = 6;
    expect(ap.serialize()).toEqual([true, packPoint(0, 0)]);
  });

  it("rounds coordinates to float32 through the packed form", () => {
    const ap = new AnchorPoint();
    ap.setProperties(["x", "y"], [0.1, 1 / 3]);
    const copy = ap.clone();
    expect(copy.$x).toBe(Math.fround(0.1));
    expect(copy.$y).toBe(Math.fround(1 / 3));
    expect(copy).not.toBe(ap);
  });

  it("reads the legacy unpacked numeric form", () => {
    const ap = new AnchorPoint();
    ap.deserialize(["TS", 100, 0, "h", 1, 2, "H", 3, 4, "C", 5, 6]);
    expect([ap.$tp, ap.$x, ap.$y, ap.$hlx, ap.$hly, ap.$hrx, ap.$hry, ap.$cl, ap.$cr]).toEqual([
      "TS",
      100,
      0,
      1,
      2,
      3,
      4,
      5,
      6,
    ]);
  });

  it("keeps the multi-reference and reference ids", () => {
    const ap = new AnchorPoint();
    ap._multiReferenceId = "m";
    ap._referenceId = "r";
    const copy = new AnchorPoint();
    copy.deserialize(ap.serialize());
    expect([copy._multiReferenceId, copy._referenceId]).toEqual(["m", "r"]);
  });

  it("stores points as `pts` and restores them", () => {
    const p = path([[0, 0], { x: 10, y: 0, hrx: 15, hry: 5 }, [10, 10]], true);
    const json = Node.serialize(p) as string;
    expect(JSON.parse(json).pts).toEqual([
      [packPoint(0, 0)],
      [packPoint(10, 0), "H", packPoint(15, 5)],
      [packPoint(10, 10)],
    ]);
    const back = Node.deserialize(json) as Path;
    expect(verts(back)).toEqual(verts(p));
    expect(back.getProperty("closed")).toBe(true);
  });

  it("marks sketch paths in the point list", () => {
    const p = path([
      [0, 0],
      [1, 1],
    ]);
    p.setSketchPath(true);
    const data = p.getAnchorPoints().serialize();
    expect(data[0]).toBe(3735932941);
    const copy = new AnchorPoints();
    copy.deserialize(data);
    expect(copy._sketchPath).toBe(true);
    expect(copy.getChildren()).toHaveLength(2);
  });
});

describe("GPathBase.AnchorPoint property changes", () => {
  it("keeps both corner radii equal while `cu` is set", () => {
    const ap = new AnchorPoint();
    ap.setProperty("cl", 7);
    expect(ap.$cr).toBe(7);
    ap.setProperty("cu", false);
    ap.setProperty("cl", 2);
    expect([ap.$cl, ap.$cr]).toEqual([2, 7]);
  });

  it("replaces invalid coordinates by 0 and invalid handles by null", () => {
    const ap = new AnchorPoint();
    ap.setProperties(["x", "y", "hlx", "hry"], [NaN, Infinity, -Infinity, NaN]);
    expect([ap.$x, ap.$y, ap.$hlx, ap.$hry]).toEqual([0, 0, null, null]);
  });

  it("mirrors the following handle of a mirrored point", () => {
    const p = path([[0, 0], { x: 100, y: 0, tp: "TM", hlx: 80, hly: -20 }, [200, 0]]);
    const ap = points(p)[1] as AnchorPoint;
    expect([ap.$hrx, ap.$hry]).toEqual([120, 20]);
    ap.setProperties(["hrx", "hry"], [130, 10]);
    expect([ap.$hlx, ap.$hly]).toEqual([70, -10]);
  });

  it("turns the other handle of a symmetric point and keeps its length", () => {
    const p = path([
      [0, 0],
      { x: 100, y: 0, tp: "TS", hlx: 90, hly: 0, hrx: 130, hry: 0 },
      [200, 0],
    ]);
    const ap = points(p)[1] as AnchorPoint;
    ap.setProperties(["hlx", "hly"], [100, -10]);
    expect(ap.$hrx).toBeCloseTo(100, 10);
    expect(ap.$hry).toBeCloseTo(30, 10);
  });

  it("computes auto handles tangent to the circle through the neighbours", () => {
    const p = path([[0, 0], { x: 50, y: 50, tp: "TS", ah: true }, [100, 0]]);
    const ap = points(p)[1] as AnchorPoint;
    // The circle through the three points has its center at (50, 0).
    expect(ap.$hly).toBeCloseTo(50, 10);
    expect(ap.$hry).toBeCloseTo(50, 10);
    expect(ap.$hlx as number).toBeLessThan(50);
    expect(ap.$hrx as number).toBeGreaterThan(50);
  });

  it("recalculates auto handles when a neighbour moves", () => {
    const p = path([[0, 0], { x: 50, y: 50, tp: "TS", ah: true }, [100, 0]]);
    const ap = points(p)[1] as AnchorPoint;
    const before = ap.$hrx;
    (points(p)[2] as AnchorPoint).setProperty("x", 200);
    expect(ap.$hrx).not.toBe(before);
  });

  it("flips handles and radii", () => {
    const ap = new AnchorPoint();
    ap.setProperties(["hlx", "hly", "hrx", "hry", "cu", "cl", "cr"], [1, 2, 3, 4, false, 5, 6]);
    ap.flip();
    expect([ap.$hlx, ap.$hly, ap.$hrx, ap.$hry, ap.$cl, ap.$cr]).toEqual([3, 4, 1, 2, 6, 5]);
  });

  it("can only be inserted into anchor points", () => {
    expect(new AnchorPoint().validateInsertion(new AnchorPoints() as never)).toBe(true);
    expect(new AnchorPoint().validateInsertion(new Path() as never)).toBe(false);
  });
});

describe("GPathBase.AnchorPoints vertices", () => {
  it("draws lines, then closes a closed path", () => {
    expect(
      verts(
        path(
          [
            [0, 0],
            [10, 0],
            [10, 10],
          ],
          true,
        ),
      ),
    ).toEqual([
      [C.Move, 0, 0],
      [C.Line, 10, 0],
      [C.Line, 10, 10],
      [C.Line, 0, 0],
      [C.Close, 0, 0],
    ]);
    expect(
      verts(
        path(
          [
            [0, 0],
            [10, 0],
            [10, 10],
          ],
          false,
        ),
      ),
    ).toEqual([
      [C.Move, 0, 0],
      [C.Line, 10, 0],
      [C.Line, 10, 10],
    ]);
  });

  it("uses quadratic and cubic curves for one and two handles", () => {
    expect(verts(path([{ x: 0, y: 0, hrx: 5, hry: 5 }, [10, 0]]))).toEqual([
      [C.Move, 0, 0],
      [C.Curve, 10, 0],
      [C.Curve, 5, 5],
    ]);
    expect(
      verts(
        path([
          { x: 0, y: 0, hrx: 2, hry: 5 },
          { x: 10, y: 0, hlx: 8, hly: 5 },
        ]),
      ),
    ).toEqual([
      [C.Move, 0, 0],
      [C.Curve2, 10, 0],
      [C.Curve2, 2, 5],
      [C.Curve2, 8, 5],
    ]);
  });

  it("cuts a bevel corner at the shoulders", () => {
    const p = path([[0, 0], { x: 10, y: 0, tp: "B", cl: 2, cr: 2 }, [10, 10]]);
    expect(verts(p)).toEqual([
      [C.Move, 0, 0],
      [C.Line, 8, 0],
      [C.Line, 10, 2],
      [C.Line, 10, 10],
    ]);
  });

  it("rounds a corner with the circle coefficient", () => {
    const p = path([[0, 0], { x: 10, y: 0, tp: "R", cl: 2, cr: 2 }, [10, 10]]);
    const k = 0.55191502;
    expect(verts(p)).toEqual([
      [C.Move, 0, 0],
      [C.Line, 8, 0],
      [C.Curve2, 10, 2],
      [C.Curve2, 8 + 2 * k, 0],
      [C.Curve2, 10, 2 - 2 * k],
      [C.Line, 10, 10],
    ]);
  });

  it("shrinks both radii in proportion when they don't fit the segment", () => {
    const p = path([
      [0, 0],
      { x: 10, y: 0, tp: "B", cl: 8, cr: 8 },
      { x: 10, y: 10, tp: "B", cl: 12, cr: 12 },
      [0, 10],
    ]);
    // On the 10 long segment, 8 and 12 become 4 and 6.
    const v = verts(p);
    expect(v[2]).toEqual([C.Line, 10, 4]);
    expect(v[3]).toEqual([C.Line, 10, 4]);
  });

  it("starts a closed path at the first corner's right shoulder", () => {
    const p = path([{ x: 0, y: 0, tp: "B", cl: 2, cr: 2 }, [10, 0], [10, 10], [0, 10]], true);
    const v = verts(p);
    expect(v[0]).toEqual([C.Move, 2, 0]);
    expect(v[v.length - 2]).toEqual([C.Line, 2, 0]);
  });

  it("maps the anchors by `trf`, but the source box is untransformed", () => {
    const p = path([
      [0, 0],
      [10, 0],
      [10, 10],
    ]);
    p.setProperty("trf", new Transform(2, 0, 0, 2, 5, 5));
    expect(verts(p)[1]).toEqual([C.Line, 25, 5]);
    expect(p.getSourceBBox()?.getWidth()).toBe(10);
    expect(p.getGeometryBBox()?.getWidth()).toBe(20);
  });

  it("can't be removed from its path", () => {
    expect(new AnchorPoints().validateRemoval()).toBe(false);
  });

  it("finds the neighbours around the ends of closed paths", () => {
    const p = path(
      [
        [0, 0],
        [10, 0],
        [10, 10],
      ],
      true,
    );
    const [a, , c] = points(p) as [AnchorPoint, AnchorPoint, AnchorPoint];
    expect(p.getAnchorPoints().getNextPoint(c)).toBe(a);
    expect(p.getAnchorPoints().getPreviousPoint(a)).toBe(c);
    p.setProperty("closed", false);
    expect(p.getAnchorPoints().getNextPoint(c)).toBe(null);
  });
});

describe("GPathBase editing", () => {
  it("tells clockwise from counter-clockwise and reverses the order", () => {
    const p = path(
      [
        [0, 0],
        [10, 0],
        [10, 10],
      ],
      true,
    );
    expect(p.isClockWise()).toBe(true);
    p.reverseOrder();
    expect(p.isClockWise()).toBe(false);
    expect(points(p).map((ap) => [ap.$x, ap.$y])).toEqual([
      [10, 10],
      [10, 0],
      [0, 0],
    ]);
  });

  it("scales corner radii by the square root of the area scale, unless `csc` is off", () => {
    const make = () => path([[0, 0], { x: 10, y: 0, tp: "B", cl: 2, cr: 2 }, [10, 10]]);
    const source = make();
    const target = make();
    source.transformStyledCorners(target, new Transform(4, 0, 0, 1, 0, 0));
    expect((points(target)[1] as AnchorPoint).$cl).toBe(4);
    const off = make();
    const offTarget = make();
    off.setProperty("csc", false);
    off.transformStyledCorners(offTarget, new Transform(4, 0, 0, 1, 0, 0));
    expect((points(offTarget)[1] as AnchorPoint).$cl).toBe(2);
  });

  it("transfers corner radii point by point", () => {
    const source = path([[0, 0], { x: 10, y: 0, tp: "B", cl: 2, cr: 2 }]);
    const target = path([
      [0, 0],
      [10, 0],
      [20, 0],
    ]);
    source.transferStyledCorners(target);
    expect(points(target).map((ap) => ap.$cl)).toEqual([0, 2, 0]);
  });

  it("hits segments and snaps to their middle", () => {
    const p = path([
      [0, 0],
      [100, 0],
      [100, 100],
    ]);
    const hit = p.pathHitTest(new Point(48, 1), null, false, 4);
    expect(hit?.element).toBe(p);
    expect([hit?.data.segment, hit?.data.slope, hit?.data.x, hit?.data.y]).toEqual([1, 0.5, 50, 0]);
    expect(p.pathHitTest(new Point(30, 1), null, false, 4)?.data.slope).toBeCloseTo(0.3, 10);
    expect(p.pathHitTest(new Point(50, 50), null, false, 4)).toBe(null);
  });

  it("finds the inside of closed paths only with `inside`", () => {
    const p = path(
      [
        [0, 0],
        [100, 0],
        [100, 100],
      ],
      true,
    );
    expect(p.pathHitTest(new Point(80, 20), null, false, 1)).toBe(null);
    expect(p.pathHitTest(new Point(80, 20), null, true, 1)?.data.outline).toBe(false);
  });

  it("restores the transform after a hit test", () => {
    const p = path([
      [0, 0],
      [100, 0],
    ]);
    const trf = new Transform(1, 0, 0, 1, 10, 10);
    p.setProperty("trf", trf);
    expect(p.pathHitTest(new Point(60, 10), null, false, 1)?.data.segment).toBe(1);
    expect(p.$trf).toBe(trf);
  });

  it("lists the corner points as pivots", () => {
    const p = path([[0, 0], { x: 10, y: 0, tp: "TS" }, [20, 0]]);
    expect((p.findPivots() as Point[]).map((pt) => [pt.getX(), pt.getY()])).toEqual([
      [0, 0],
      [20, 0],
    ]);
  });

  it("knows its corner types", () => {
    expect(PathBase.isCornerType("U")).toBe(true);
    expect(PathBase.isCornerType("TS")).toBe(false);
  });

  it("copies the anchor points container", () => {
    const p = path([
      [1, 2],
      [3, 4],
    ]);
    const copy = p.cloneAnchorPoints();
    expect(copy).not.toBe(p.getAnchorPoints());
    const box = new VertexContainer();
    copy._generateVertices(box, null, false);
    expect(verts(box)).toEqual([
      [C.Move, 1, 2],
      [C.Line, 3, 4],
    ]);
  });
});

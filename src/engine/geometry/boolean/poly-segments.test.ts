import { describe, expect, it } from "vitest";
import { Point } from "../../math/point.ts";
import { Transform } from "../../math/transform.ts";
import { PolyIntersector, type PolyLine } from "./poly-segments.ts";
import { OLD, build, ellipse, rect, verts } from "./test-helpers.ts";

function list(poly: PolyLine): unknown[] {
  const out: unknown[] = [];
  for (let n: PolyLine | null = poly; n; n = n.next)
    out.push(
      n.point
        ? [
            n.point.getX(),
            n.point.getY(),
            n.seg,
            n.m,
            n.isLast,
            n.isLastSegment,
            n.firstSegNum === undefined ? "U" : n.firstSegNum,
          ]
        : "end",
    );
  return out;
}

type Hits = ReturnType<PolyIntersector["intersect"]>;

const describeHits = (hits: Hits): number[][] =>
  (hits ?? []).map((r) => [
    r.pt.getX(),
    r.pt.getY(),
    r.slope0,
    r.slope1,
    r.polySeg0.seg,
    r.polySeg1.seg,
  ]);

describe("PolyIntersector._makePolygon", () => {
  it("closes an open sub-path and marks its last segment", () => {
    const intersector = new PolyIntersector(true, false, false, 2);
    const open = build(rect(0, 0, 10, 10).slice(0, 12));
    // The closing point repeats the start with the next segment number;
    // the point before it keeps the previous number (old quirk).
    expect(list(intersector._makePolygon(open))).toEqual(OLD.openSquareClosed);
  });

  it("flattens a quadratic with the scale's tolerance and keeps its parameters", () => {
    const intersector = new PolyIntersector(false, true, false, 4);
    expect(list(intersector._makePolygon(build([1, 0, 0, 3, 100, 0, 3, 50, 80])))).toEqual(
      OLD.quadFlat,
    );
  });
});

describe("PolyIntersector default flattening", () => {
  it("uses a tolerance of 0.25 without an approximation scale", () => {
    let count = 0;
    const poly = new PolyIntersector()._makePolygon(
      build([1, 0, 0, 4, 100, 0, 4, 30, 90, 4, 70, -90]),
    );
    for (let n: PolyLine | null = poly; n; n = n.next) count++;
    expect(count).toBe(OLD.defaultScaleCount);
  });
});

describe("PolyIntersector.intersect", () => {
  it("finds where two rectangles cross, without the shared corner duplicates", () => {
    const hits = new PolyIntersector(true, true, false, 4).intersect(
      build(rect(0, 0, 100, 100)),
      build(rect(50, 50, 100, 100)),
    );
    expect(describeHits(hits)).toEqual(OLD.rectIsects);
  });

  it("intersects curves on the curves with useIntersector", () => {
    const hits = new PolyIntersector(true, true, true, 0.125).intersect(
      build(ellipse(50, 50, 50, 50)),
      build(ellipse(100, 50, 50, 50)),
    );
    expect(describeHits(hits)).toEqual(OLD.circleIsects);
  });

  it("interpolates the curve parameter on flattened segments", () => {
    // Without retainBezier the hits are on the flattened quadratic; the
    // one on its last flattened segment interpolates up to 1.
    const hits = new PolyIntersector(true, false, false, 4).intersect(
      build([1, 0, 0, 3, 100, 0, 3, 50, 80, 5, 0, 0]),
      build([1, 99, -10, 2, 99, 50, 2, 120, 50, 5, 0, 0]),
    );
    expect(describeHits(hits)).toEqual(OLD.flatQuadLine);
  });

  it("reports a crossing at a shared vertex once", () => {
    const hits = new PolyIntersector(true, false, false, 4).intersect(
      build(rect(0, 0, 100, 100)),
      build([1, 50, -50, 2, 150, 50, 2, 50, 150, 2, -50, 50, 5, 0, 0]),
    );
    expect(describeHits(hits)).toEqual(OLD.cornerDedupe);
  });

  it("answers [] or null in first-only mode", () => {
    const hit = new PolyIntersector().intersect(
      build(rect(0, 0, 100, 100)),
      build(rect(50, 50, 100, 100)),
      false,
      true,
    );
    const miss = new PolyIntersector().intersect(
      build(rect(0, 0, 10, 10)),
      build(rect(50, 50, 10, 10)),
      false,
      true,
    );
    expect(JSON.stringify(hit)).toBe(OLD.firstOnlyHit);
    expect(JSON.stringify(miss)).toBe(OLD.firstOnlyMiss);
  });
});

describe("PolyIntersector.redistributeVertexSource", () => {
  it("groups each outer sub-path with the ones inside it", () => {
    const source = build([
      ...rect(0, 0, 100, 100),
      ...rect(25, 25, 50, 50),
      ...rect(200, 0, 10, 10),
    ]);
    const groups = PolyIntersector.redistributeVertexSource(source).containers;
    expect(groups.map((g) => g.map((s) => verts(s)))).toEqual(OLD.redistribute);
  });

  it("maps the sub-paths through a transform", () => {
    const source = build([...rect(0, 0, 100, 100), ...rect(25, 25, 50, 50)]);
    const groups = PolyIntersector.redistributeVertexSource(
      source,
      new Transform(2, 0, 0, 2, 5, 5),
    ).containers;
    expect(groups.map((g) => g.map((s) => verts(s)))).toEqual(OLD.redistributeT);
  });
});

describe("PolyLine", () => {
  it("tests points and measures area, centroid and sub-path numbers", () => {
    const poly = PolyIntersector.polyFromVertexSource(build(rect(0, 0, 100, 100)), false, true);
    expect([
      poly.getOddEven(new Point(50, 50)),
      poly.getOddEven(new Point(150, 50)),
      poly.getWinding(new Point(50, 50)),
      poly.area(),
      poly.centroid().getX(),
      poly.centroid().getY(),
      poly.markIndices(3),
    ]).toEqual(OLD.oddEven);
  });

  it("reuses an equal point unless forced", () => {
    const poly = PolyIntersector.polyFromVertexSource(build(rect(0, 0, 100, 100)), false, true);
    expect(poly.appendPoint(0, 0)).toBe(poly);
    const forced = poly.appendPoint(0, 0, true);
    expect(forced).not.toBe(poly);
    expect(poly.next).toBe(forced);
  });
});

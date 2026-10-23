// Expected values were recorded from the old module (chunk.vendor.js 647)
// run in Node with the old GPoint, GMath and big.js.
import { describe, expect, it } from "vitest";
import { Point } from "../../math/point.ts";
import { Big } from "./big.ts";
import { Intersection, Polynomial, intersect, type IntersectionSegment } from "./intersection.ts";

const p = (x: number, y: number): Point => new Point(x, y);

type CurveHit = { m: number; p: Point } | { m0: number; m1: number; p: Point };
const hits = (list: CurveHit[]): number[][] =>
  list.map((h) =>
    "m" in h ? [h.m, h.p.getX(), h.p.getY()] : [h.m0, h.m1, h.p.getX(), h.p.getY()],
  );

const cubic = [p(0, 0), p(30, 100), p(70, -60), p(100, 40)] as const;

interface TestSegment extends IntersectionSegment {
  name: string;
  next: TestSegment | null;
}

const node = (point: Point | null, m: number, name = ""): TestSegment => ({
  point,
  next: null,
  m,
  currCurve: null,
  nextCurve: null,
  cp1: null,
  cp2: null,
  name,
});

/** The cubic flattened into start -> mid -> end, and a horizontal line at y=10. */
function segments(): { start: TestSegment; mid: TestSegment; line: TestSegment } {
  const start = node(p(0, 0), 0, "start");
  const mid = node(p(50, 20), 0.5, "mid");
  const end = node(p(100, 40), 1, "end");
  start.next = mid;
  mid.next = end;
  end.next = node(null, 0);
  start.cp1 = p(30, 100);
  start.cp2 = p(70, -60);
  start.nextCurve = end;
  start.currCurve = start;
  mid.currCurve = start;
  const line = node(p(-10, 10), 0, "line");
  line.next = node(p(110, 10), 0);
  return { start, mid, line };
}

describe("Intersection constants", () => {
  it("keeps the old epsilons", () => {
    expect(Intersection.LARGE_EPS).toBe(1e-4);
    expect(Intersection.SMALL_EPS).toBe(1e-12);
    expect(Intersection.TINY_EPS).toBe(1e-14);
    // Not 12: _roundPoint keeps 11 decimals.
    expect(Intersection.LOG_EPS).toBe(11.999999999999998);
  });

  it("rounds points to 11 decimals", () => {
    const r = Intersection._roundPoint(p(1 / 3, -2 / 3));
    expect([r.getX(), r.getY()]).toEqual([0.33333333333, -0.66666666667]);
  });
});

describe("_checkDegree", () => {
  it("classifies lines, quadratics and cubics", () => {
    const { mid, line } = segments();
    expect(Intersection._checkDegree(line)).toBe(1);
    expect(Intersection._checkDegree(mid)).toBe(3);
    const q = node(p(0, 0), 0);
    q.next = node(p(100, 0), 1);
    q.currCurve = q;
    q.nextCurve = q.next;
    const degree = (cp1: Point, cp2: Point | null): number => {
      q.cp1 = cp1;
      q.cp2 = cp2;
      return Intersection._checkDegree(q);
    };
    // Control point on the chord: a line.
    expect(degree(p(50, 0), null)).toBe(1);
    expect(degree(p(50, 1e-13), null)).toBe(2);
    // On the line but outside the chord.
    expect(degree(p(150, 0), null)).toBe(2);
    expect(degree(p(50, 50), null)).toBe(2);
    // cp2 on the end point, or equal to cp1: quadratic.
    expect(degree(p(50, 50), p(100, 0))).toBe(2);
    expect(degree(p(50, 50), p(50, 50))).toBe(2);
    expect(degree(p(50, 50), p(60, 50))).toBe(3);
  });
});

describe("intersect", () => {
  it("returns the crossing of two lines, or null", () => {
    const a = node(p(0, 0), 0);
    a.next = node(p(10, 10), 0);
    const b = node(p(0, 10), 0);
    b.next = node(p(10, 0), 0);
    const r = intersect(a, b) ?? [];
    expect(r.map((x) => [x.pt.getX(), x.pt.getY(), x.slope0, x.slope1])).toEqual([
      [5, 5, 0.5, 0.5],
    ]);
    expect(r[0]?.polySeg0).toBe(a);
    const c = node(p(20, 0), 0);
    c.next = node(p(30, 10), 0);
    expect(intersect(a, c)).toBeNull();
  });

  it("finds cubic/line hits with big.js and places them on the flattened segment", () => {
    const { mid, line } = segments();
    const r = intersect(mid, line) ?? [];
    expect(
      r.map((x) => [
        x.pt.getX(),
        x.pt.getY(),
        x.slope0,
        x.slope1,
        x.polySeg0.name,
        x.polySeg1.name,
      ]),
    ).toEqual([
      [3.34801388223, 10, 0.03676074277951666, 0.11123344901858333, "start", "line"],
      [62.71801973529, 10, 0.6214653458778656, 0.6059834977940833, "mid", "line"],
      [85.08781253633, 10, 0.8417739113426177, 0.7923984378027501, "mid", "line"],
    ]);
  });

  it("swaps the slopes when the line comes first", () => {
    const { mid, line } = segments();
    const r = intersect(line, mid) ?? [];
    expect(r.map((x) => [x.slope0, x.slope1, x.polySeg0.name, x.polySeg1.name])).toEqual([
      [0.11123344901858333, 0.03676074277951666, "line", "start"],
      [0.6059834977940833, 0.6214653458778656, "line", "mid"],
      [0.7923984378027501, 0.8417739113426177, "line", "mid"],
    ]);
  });

  it("assigns the curve parameters of quadratic/cubic hits to the right segment", () => {
    const quadratic = (): TestSegment => {
      const start = node(p(0, 0), 0, "q0");
      const mid = node(p(50, 50), 0.5, "q1");
      const end = node(p(100, 0), 1, "q2");
      start.next = mid;
      mid.next = end;
      end.next = node(null, 0);
      start.cp1 = p(50, 100);
      start.nextCurve = end;
      start.currCurve = start;
      mid.currCurve = start;
      return start;
    };
    const describe = (r: ReturnType<typeof intersect<TestSegment>>): unknown[] =>
      (r ?? []).map((x) => [
        x.pt.getX(),
        x.pt.getY(),
        x.slope0,
        x.slope1,
        x.polySeg0.name,
        x.polySeg1.name,
      ]);
    const rename = (s: TestSegment): TestSegment => {
      for (
        let n: TestSegment | null = s.currCurve as TestSegment, i = 0;
        n?.point;
        n = n.next, i++
      ) {
        n.name = "c" + i;
      }
      return s;
    };
    expect(describe(intersect(quadratic(), rename(segments().mid)))).toEqual([
      [0, 0, -0, 0, "q0", "c0"],
      [21.69611745492317, 33.97780465748963, 0.2169611745492317, 0.22654426457783788, "q0", "c0"],
      [90.58551182061322, 17.0563246051762, 0.9058551182061322, 0.8985907696746664, "q1", "c1"],
    ]);
    expect(describe(intersect(rename(segments().mid), quadratic()))).toEqual([
      [0, 0, 0, -0, "c0", "q0"],
      [21.69611745492317, 33.97780465748963, 0.22654426457783788, 0.2169611745492317, "c0", "q0"],
      [90.58551182061322, 17.0563246051762, 0.8985907696746664, 0.9058551182061322, "c1", "q1"],
    ]);
  });

  it("uses the double precision variant when fast", () => {
    const { mid, line } = segments();
    const r = intersect(mid, line, true) ?? [];
    expect(r.map((x) => [x.pt.getX(), x.pt.getY(), x.slope1])).toEqual([
      [3.348013882227845, 10.000000000000002, 0.11123344901856537],
      [62.718019735290966, 10.000000000000005, 0.6059834977940913],
      [85.08781253632733, 10.000000000000007, 0.7923984378027278],
    ]);
  });
});

describe("curve intersections", () => {
  it("intersects a cubic with a line", () => {
    const line = [p(-10, 10), p(110, 10)] as const;
    expect(hits(Intersection.intersectBezier3Line(...cubic, ...line))).toEqual([
      [0.03676074277951666, 3.348013882227845, 10.000000000000002],
      [0.6214653458778656, 62.718019735290966, 10.000000000000005],
      [0.8417739113426177, 85.08781253632733, 10.000000000000007],
    ]);
    // The precise variant rounds the hit points.
    expect(hits(Intersection.intersectBezier3LinePrecise(...cubic, ...line))).toEqual([
      [0.03676074277951666, 3.34801388223, 10],
      [0.6214653458778656, 62.71801973529, 10],
      [0.8417739113426177, 85.08781253633, 10],
    ]);
    expect(hits(Intersection.intersectBezier3LinePrecise(...cubic, p(0, 50), p(100, -10)))).toEqual(
      [
        [0.26945801618964793, 26.03815601341, 34.37710639195],
        [0.5000000000000006, 50, 20],
        [0.7305419838103514, 73.96184398659, 5.62289360805],
      ],
    );
  });

  it("intersects two cubics through the Bezout resultant", () => {
    const other = [p(0, 40), p(30, -60), p(70, 100), p(100, 0)] as const;
    const expected = [
      [0.08397485283107815, 0.08397485283107815, 7.757446595155629, 20.000000000000004],
      [0.5000000000000001, 0.5000000000000004, 50.000000000000014, 20.000000000000014],
      [0.916025147168921, 0.9160251471689211, 92.2425534048443, 20.000000000000057],
    ];
    expect(hits(Intersection.intersectBezier3Bezier3(...cubic, ...other, false))).toEqual(expected);
    expect(hits(Intersection.intersectBezier3Bezier3(...cubic, ...other, true))).toEqual(expected);
  });

  it("intersects quadratics with quadratics, cubics and lines", () => {
    const quad = [p(0, 0), p(50, 100), p(100, 0)] as const;
    expect(
      hits(Intersection.intersectBezier2Bezier2(...quad, p(0, 60), p(50, -40), p(100, 60))),
    ).toEqual([
      [0.18377223398316206, 0.1837722339831621, 18.377223398316207, 30],
      [0.816227766016838, 0.816227766016838, 81.6227766016838, 30.00000000000003],
    ]);
    expect(hits(Intersection.intersectBezier2Bezier3(...quad, ...cubic))).toEqual([
      // The quadratic parameter of the shared start point is -0.
      [0, -0, 0, 0],
      [0.22654426457783788, 0.2169611745492317, 21.69611745492317, 33.97780465748963],
      [0.8985907696746664, 0.9058551182061322, 90.58551182061322, 17.0563246051762],
    ]);
    expect(hits(Intersection.intersectBezier2Line(...quad, p(0, 25), p(100, 25)))).toEqual([
      [0.8535533905932737, 85.35533905932738, 25],
      [0.1464466094067262, 14.64466094067262, 24.999999999999996],
    ]);
  });

  it("keeps the Jenkins-Traub iteration of the quartic resultant", () => {
    const r = Intersection.intersectBezier2Bezier2(
      p(30, 90),
      p(6.643631448969245, -25),
      p(80, -45.279769133776426),
      p(23.139941971749067, 56.42947922460735),
      p(70, 38.38912108913064),
      p(23.900905717164278, 70),
    );
    expect(hits(r)).toEqual([
      [0.020353861582646744, 0.1595452474551617, 25.00899715347786, 55.71566681848911],
      [0.9727562378647414, 0.09826129008937526, 26.343734854320672, 68.31445373715809],
    ]);
  });

  it("hit-tests a cubic", () => {
    expect(Intersection.hitTestBezier3(...cubic, p(50, 20), 1)).toBe(0.4999999999999992);
    expect(Intersection.hitTestBezier3(...cubic, p(50, 90), 1)).toBeNull();
  });
});

describe("Polynomial", () => {
  it("takes the coefficients highest first and reverses the array in place", () => {
    const coefficients = [1, 2, 3];
    const poly = new Polynomial(coefficients);
    expect(poly.coefs).toBe(coefficients);
    expect(coefficients).toEqual([3, 2, 1]);
  });

  it("solves higher degrees with Jenkins-Traub", () => {
    expect(new Polynomial([1, -10, 35, -50, 24]).getRoots()).toEqual([
      1, 1.9999999999999998, 3.0000000000000013, 3.999999999999999,
    ]);
    expect(new Polynomial([1, 0, -14, 0, 49, 0, -36]).getRoots()).toEqual([
      1.0000000000000002, -1, -2, 1.999999999999999, -2.9999999999999996, 3.000000000000001,
    ]);
    // (2x - 1)^5: five nearly equal roots.
    expect(new Polynomial([32, -80, 80, -40, 10, -1]).getRootsInInterval(0, 1)).toEqual([
      0.5000000000000036, 0.49999999999999645, 0.4999999999999998, 0.5000000000000001,
      0.5000000000000001,
    ]);
  });

  it("solves with big.js coefficients", () => {
    const coefficients = [2, -3, -11, 6].map((c) => new Big(c));
    expect(new Polynomial(coefficients).getRoots(true)).toEqual([0.5, -2, 3]);
  });

  it("drops leading coefficients within the tolerance", () => {
    expect(new Polynomial([1e-7, 1, -2]).getRoots()).toEqual([2]);
    expect(new Polynomial([1e-7]).getRoots()).toBeNull();
    expect(new Polynomial([5]).getRoots()).toEqual([]);
  });

  it("throws in scale() like the old code, which reads an undeclared variable", () => {
    expect(() => new Polynomial([2, 4, 8]).scale()).toThrow(ReferenceError);
    const precise = new Polynomial([new Big(2), new Big(4)]);
    expect(() => precise.scale(true)).not.toThrow();
    expect(precise.coefs.map(String)).toEqual(["2", "2"]);
  });

  it("removes roots within TINY_EPS after sorting", () => {
    const roots = [0.5, 0.1, 0.5 + 1e-15, 0.3];
    Intersection.removeMultipleRoots(roots);
    expect(roots).toEqual([0.1, 0.3, 0.5]);
  });
});

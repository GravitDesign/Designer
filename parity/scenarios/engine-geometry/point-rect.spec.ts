import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, geo } from "./lib.ts";

// GPoint and GRect: every public method over hand-picked edge cases and a
// seeded random set.
const scenarios = defineScenarios([
  geo("point/arithmetic", ["ENG-GEOM-001"], (L, G) => {
    const xs = [0, 1, -1, 0.5, -2.25, 1e-15, 1e15, 3.141592653589793, -0.1, 100];
    const r = L.floats(11, 40, -500, 500);
    const pts: [number, number][] = [];
    for (let i = 0; i < xs.length; i++)
      pts.push([xs[i] as number, xs[(i * 3 + 1) % xs.length] as number]);
    for (let i = 0; i < r.length; i += 2) pts.push([r[i] as number, r[i + 1] as number]);
    const out: unknown[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i] as [number, number];
      const [bx, by] = pts[(i + 7) % pts.length] as [number, number];
      const a = new G.GPoint(ax, ay);
      const b = new G.GPoint(bx, by);
      const s = (i % 5) - 2.5;
      out.push({
        in: [ax, ay, bx, by, s],
        x: a.getX(),
        y: a.getY(),
        scale: L.enc(a.scale(s)),
        multiply: L.enc(a.multiply(b)),
        subtract: L.enc(a.subtract(b)),
        add: L.enc(a.add(b)),
        cross: L.enc(a.cross(b)),
        dot: L.enc(a.dot(b)),
        translated: L.enc(a.translated(bx, s)),
        rotated: L.enc(a.rotated(s)),
        rotatedAt: L.enc(a.rotatedAt(s, b)),
        rotatedAtNull: L.enc(a.rotatedAt(s, null)),
        lerp: [0, 0.25, 0.5, 1, -1, 2].map((t) => L.enc(a.lerp(b, t))),
        isFinite: a.isFinite(),
        toString: a.toString(),
      });
    }
    return out;
  }),
  geo("point/statics", ["ENG-GEOM-001"], (L, G) => {
    const P = (x: unknown, y: unknown) => new G.GPoint(x, y);
    const a = P(1, 2);
    const out: Record<string, unknown> = {
      equalsSame: G.GPoint.equals(a, a),
      equalsClose: G.GPoint.equals(a, P(1 + 1e-15, 2)),
      equalsFar: G.GPoint.equals(a, P(1 + 1e-13, 2)),
      equalsEps: G.GPoint.equals(a, P(1.05, 2.05), 0.1),
      equalsEpsMiss: G.GPoint.equals(a, P(1.2, 2), 0.1),
      equalsNull: G.GPoint.equals(null, null),
      equalsOneNull: G.GPoint.equals(a, null),
      equalsNullOne: G.GPoint.equals(null, a),
      min: L.enc(G.GPoint.min(P(3, -1), P(-2, 5), P(0, 0))),
      max: L.enc(G.GPoint.max(P(3, -1), P(-2, 5), P(0, 0))),
      minOne: L.enc(G.GPoint.min(P(7, 8))),
      minNone: L.enc(G.GPoint.min()),
      finiteNaN: P(NaN, 1).isFinite(),
      finiteInf: P(1, Infinity).isFinite(),
      finiteString: P("1", 1).isFinite(),
      finiteUndef: new G.GPoint().isFinite(),
    };
    const r = L.floats(12, 60, -100, 100);
    const pts = [];
    for (let i = 0; i < r.length; i += 2) pts.push(P(r[i], r[i + 1]));
    out.minRandom = L.enc(G.GPoint.min(...pts));
    out.maxRandom = L.enc(G.GPoint.max(...pts));
    return out;
  }),
  geo("rect/basics", ["ENG-GEOM-002"], (L, G) => {
    const rects = [
      [0, 0, 10, 10],
      [5, 5, 0, 0],
      [-3, 4, -6, 8],
      [1.5, -2.5, 3.25, -7],
      [0, 0, 1e-15, 1],
      [-1e6, -1e6, 2e6, 2e6],
    ];
    const r = L.floats(21, 24, -50, 50);
    for (let i = 0; i < r.length; i += 4)
      rects.push([r[i], r[i + 1], r[i + 2], r[i + 3]] as number[]);
    const sides = Object.keys(G.GRect.Side).map((k) => G.GRect.Side[k]);
    const probes = [
      [0, 0],
      [10, 10],
      [5, 5],
      [-3, 4],
      [-9, 12],
      [2, 1],
      [11, 3],
      [3.3, -4],
    ];
    return {
      sideEnum: L.enc(G.GRect.Side),
      unit: L.enc(G.GRect.UNIT_RECT),
      empty: L.enc(new G.GRect()),
      rects: rects.map(([x, y, w, h]) => {
        const a = new G.GRect(x, y, w, h);
        return {
          in: [x, y, w, h],
          get: [a.getX(), a.getY(), a.getWidth(), a.getHeight(), a.getX2(), a.getY2()],
          isEmpty: a.isEmpty(),
          serialize: L.enc(G.GRect.serialize(a)),
          sides: sides.map((s) => L.enc(a.getSide(s))),
          closest: probes.map(([px, py]) => a.getClosestSideName(new G.GPoint(px, py))),
          contains: probes.map(([px, py]) => [
            a.containsPoint(new G.GPoint(px, py)),
            a.containsPoint(new G.GPoint(px, py), true),
            a.containsPointXY(px, py),
            a.containsPointXY(px, py, true),
          ]),
          expanded: L.enc(a.expanded(1, 2, 3, 4)),
          expandedNeg: L.enc(a.expanded(-1, -1, -1, -1)),
          translated: L.enc(a.translated(-2.5, 7)),
          scaled: L.enc(a.scaled(2, -0.5)),
          scaledAt: L.enc(a.scaledAt(1.5, 3, new G.GPoint(1, -1))),
          scaledAtNull: L.enc(a.scaledAt(1.5, 3, null)),
          aligned: L.enc(a.toAlignedRect()),
          grid: [1, 4, 7.5, 0.3].map((g) => L.enc(a.toAlignedWithGrid(g))),
          rounded: [undefined, 0, 1, 3, 12].map((p) => L.enc(a.toRoundedPrecision(p))),
          toString: a.toString(),
        };
      }),
      badSide: L.run(() => new G.GRect(0, 0, 1, 1).getSide("xx")),
      fromPoints: L.enc(
        G.GRect.fromPoints(new G.GPoint(3, 1), new G.GPoint(-1, 7), new G.GPoint(2, -4)),
      ),
      deserialize: [[1, 2, 3, 4], [1, 2, 3], null, [1, 2, 3, 4, 5]].map((s) =>
        L.enc(G.GRect.deserialize(s)),
      ),
      equals: [
        G.GRect.equals(new G.GRect(1, 2, 3, 4), new G.GRect(1, 2, 3, 4 + 1e-15)),
        G.GRect.equals(new G.GRect(1, 2, 3, 4), new G.GRect(1, 2, 3, 4.001)),
        G.GRect.equals(null, null),
        G.GRect.equals(null, new G.GRect()),
        G.GRect.equals(new G.GRect(), null),
      ],
    };
  }),
  geo("rect/set-operations", ["ENG-GEOM-002"], (L, G) => {
    // Pairs that hit every branch: disjoint, touching, overlapping on each
    // side, nested both ways, identical, empty, negative sizes.
    const pairs: number[][] = [
      [0, 0, 10, 10, 20, 20, 5, 5],
      [0, 0, 10, 10, 10, 0, 5, 10],
      [0, 0, 10, 10, 0, 10, 10, 5],
      [0, 0, 10, 10, 5, 5, 10, 10],
      [0, 0, 10, 10, -5, -5, 10, 10],
      [0, 0, 10, 10, 2, 2, 4, 4],
      [2, 2, 4, 4, 0, 0, 10, 10],
      [0, 0, 10, 10, 0, 0, 10, 10],
      [0, 0, 10, 10, 3, -2, 4, 20],
      [0, 0, 10, 10, -2, 3, 20, 4],
      [0, 0, 10, 10, -2, -2, 5, 20],
      [0, 0, 10, 10, 7, -2, 5, 20],
      [0, 0, 10, 10, -2, -2, 20, 5],
      [0, 0, 10, 10, -2, 7, 20, 5],
      [0, 0, 10, 10, 3, -2, 4, 5],
      [0, 0, 10, 10, 3, 7, 4, 5],
      [0, 0, 10, 10, -2, 3, 5, 4],
      [0, 0, 10, 10, 7, 3, 5, 4],
      [0, 0, 10, 10, 3, 3, 0, 0],
      [0, 0, 0, 0, 3, 3, 5, 5],
      [0, 0, 10, 0, 3, -3, 5, 5],
      [10, 10, -10, -10, 5, 5, 10, 10],
      [0, 0, 10, 10, 15, 15, -10, -10],
      [-5, -5, 2, 2, -5, -5, 2, 2],
    ];
    const r = L.floats(31, 40 * 8, -20, 20);
    for (let i = 0; i < r.length; i += 8) pairs.push(r.slice(i, i + 8));
    return pairs.map((p) => {
      const a = new G.GRect(p[0], p[1], p[2], p[3]);
      const b = new G.GRect(p[4], p[5], p[6], p[7]);
      return {
        in: p,
        containsRect: [a.containsRect(b), a.containsRect(b, true), b.containsRect(a)],
        intersects: [a.intersectsRect(b), a.intersectsRect(b, true), b.intersectsRect(a)],
        intersectsXYWH: [
          a.intersectsRectXYWH(p[4], p[5], p[6], p[7]),
          a.intersectsRectXYWH(p[4], p[5], p[6], p[7], true),
        ],
        united: [L.enc(a.united(b)), L.enc(a.united(b, true)), L.enc(b.united(a, true))],
        unitedSame: [a.united(b, true) === a, a.united(b, true) === b],
        subtracted: [
          L.enc(a.subtracted(b)),
          L.enc(a.subtracted(b, true)),
          L.enc(b.subtracted(a, true)),
        ],
        intersected: [L.enc(a.intersected(b)), L.enc(b.intersected(a))],
        xyOffset: [
          L.enc(a.getXYOffset(b, true, true)),
          L.enc(a.getXYOffset(b, true, false, true)),
          L.enc(a.getXYOffset(b, false, true, true)),
          L.enc(a.getXYOffset(b, true, true, true)),
        ],
      };
    });
  }),
]);

paritySuite("engine-geometry point and rect", scenarios, { newApp: false });

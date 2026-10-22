import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, geo } from "./lib.ts";

// GMath: every public function, split by topic. Inputs are hand-picked edge
// cases plus seeded random values; results keep full precision.
const scenarios = defineScenarios([
  geo("math/scalar", ["ENG-GEOM-005"], (L, G) => {
    const M = G.GMath;
    const vals = [
      0, 1, -1, 0.5, -0.5, 1.5, -1.5, 2.5, -2.5, 359, 360, 361, -360, -720.5, 1e-15, -1e-15,
      3.141592653589793, 6.283185307179586, -6.283185307179586, 12.566370614359172, 7, 1e9, 0.125,
      0.005, 1.005, 2.675, -2.675, 123.456,
    ];
    vals.push(...L.floats(51, 30, -1000, 1000));
    return {
      consts: [M.PI2, M.PIHALF, M.defaultEps],
      perValue: vals.map((v) => ({
        v,
        toRadians: L.enc(M.toRadians(v)),
        toDegrees: L.enc(M.toDegrees(v)),
        normRad: L.enc(M.normalizeAngleRadians(v)),
        normDeg: L.enc(M.normalizeAngleDegrees(v)),
        round: [
          L.enc(M.round(v)),
          L.enc(M.round(v, true)),
          L.enc(M.round(v, false, 2)),
          L.enc(M.round(v, true, 2)),
          L.enc(M.round(v, false, -3)),
          L.enc(M.round(v, true, 5)),
        ],
        mod: [L.enc(M.mod(v, 7)), L.enc(M.mod(v, 0.3)), L.enc(M.mod(v, -4))],
        div: [L.enc(M.div(v, 7)), L.enc(M.div(v, 0.3)), L.enc(M.div(v, -4))],
        clamp: [L.enc(M.clamp(v, -10, 10)), L.enc(M.clamp(v, 5, 1))],
        normValue: [
          L.enc(M.normalizeValue(v, -10, 10)),
          L.enc(M.normalizeValue(v, -10, 10, 0, 1)),
          L.enc(M.normalizeValue(v, 0, 360, -1, 1)),
          L.enc(M.normalizeValue(v, 5, 5, 0, 1)),
        ],
        eq: [
          M.isEqualEps(v, v + 1e-15),
          M.isEqualEps(v, v + 1e-13),
          M.isEqualEps(v, 0, 0.6),
          M.isEqualEps(v, 0),
        ],
        rsqrt: v > 0 ? L.enc(M.Q_rsqrt(v)) : null,
      })),
      nextPowerOf2: [
        0,
        1,
        2,
        3,
        4,
        5,
        7,
        8,
        9,
        100,
        1023,
        1024,
        1025,
        65535,
        1e6,
        2 ** 30,
        2 ** 31 - 1,
        -5,
      ].map((v) => M.nextPowerOf2(v)),
      turnAngle: (() => {
        const r = L.floats(52, 40 * 8, -10, 10);
        const out = [];
        const P = (x: unknown, y: unknown) => new G.GPoint(x, y);
        out.push(L.enc(M.getTurnAngle(P(0, 0), P(1, 0), P(0, 0), P(-1, 0))));
        out.push(L.enc(M.getTurnAngle(P(0, 0), P(1, 0), P(0, 0), P(-1, -1e-16))));
        out.push(L.enc(M.getTurnAngle(P(0, 0), P(0, 0), P(0, 0), P(1, 1))));
        for (let i = 0; i < r.length; i += 8) {
          out.push(
            L.enc(
              M.getTurnAngle(
                P(r[i], r[i + 1]),
                P(r[i + 2], r[i + 3]),
                P(r[i + 4], r[i + 5]),
                P(r[i + 6], r[i + 7]),
              ),
            ),
          );
        }
        return out;
      })(),
      normalizePoint: [
        [0, 0],
        [3, 4],
        [1e-8, 0],
        [-5, 12],
        [1e10, 1],
      ].map(([x, y]) => L.enc(M.normalizePoint(new G.GPoint(x, y)))),
    };
  }),
  geo("math/intersections", ["ENG-GEOM-005"], (L, G) => {
    const M = G.GMath;
    const r = L.floats(53, 60 * 8, -50, 50);
    const segs: number[][] = [
      [0, 0, 10, 10, 0, 10, 10, 0],
      [0, 0, 10, 0, 5, -5, 5, 5],
      [0, 0, 10, 0, 0, 1, 10, 1],
      [0, 0, 10, 0, 5, 0, 15, 0],
      [0, 0, 10, 0, 10, 0, 20, 5],
      [0, 0, 10, 0, 11, -5, 11, 5],
      [0, 0, 0, 0, 1, 1, 2, 2],
    ];
    for (let i = 0; i < r.length; i += 8) segs.push(r.slice(i, i + 8));
    const lineIs = segs.map((s) => {
      const ext: number[] = [];
      const p1 = L.run(() =>
        M.getIntersectionPoint(s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7]),
      );
      const p2 = L.run(() =>
        M.getIntersectionPoint(s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7], ext),
      );
      return {
        in: s,
        seg: p1,
        line: p2,
        params: L.enc(ext),
        fromPoints: L.run(() =>
          M.getLinesFromPointsIntersection(s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7]),
        ),
        lines: L.run(() => M.getLinesIntersection(s[0], s[1], s[2], s[3], s[4], s[5])),
        circum: L.run(() => M.getCircumcircleCenter(s[0], s[1], s[2], s[3], s[4], s[5])),
        solve: L.run(() => M.solveLinear2Pseudo(s[0], s[1], s[2], s[3], s[4], s[5])),
      };
    });
    const solveSpecial = [
      [1, 1, 2, 1, 1, 2],
      [1, -1, 0, 2, -2, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 1, 0, 0, 1],
      [1, 0, 3, 2, 0, 6],
      [0, 1, 3, 0, 2, 6],
      [1, 2, 3, 2, 4, 7],
      [2, 0, 4, 0, 0, 0],
    ].map((s) => L.run(() => M.solveLinear2Pseudo(s[0], s[1], s[2], s[3], s[4], s[5])));
    const circleLine = [];
    const cl: number[][] = [
      [0, 0, 1, 0, 0, 0, 5],
      [0, 0, 1, 0, 0, 5, 5],
      [0, 0, 1, 0, 0, 6, 5],
      [0, 0, 0, 0, 0, 0, 5],
      [-10, 3, 2, 1, 1, 1, 4],
    ];
    for (let i = 0; i < 40 * 7; i += 7)
      cl.push(r.slice(i, i + 7).map((v, k) => (k === 6 ? Math.abs(v) : v)));
    for (const c of cl) {
      const out: number[] = [];
      M.circleLineIntersection(c[0], c[1], c[2], c[3], c[4], c[5], c[6], out);
      circleLine.push({ in: c, out: L.enc(out) });
    }
    const circleCircle = [];
    const cc: number[][] = [
      [0, 0, 5, 10, 0, 5],
      [0, 0, 5, 8, 0, 5],
      [0, 0, 5, 11, 0, 5],
      [0, 0, 5, 0, 0, 3],
      [0, 0, 5, 2, 0, 3],
      [0, 0, 5, 1, 0, 3],
      [1, 1, 2, 1, 1, 2],
    ];
    for (let i = 0; i < 40 * 6; i += 6)
      cc.push(r.slice(i, i + 6).map((v, k) => (k === 2 || k === 5 ? Math.abs(v) : v)));
    for (const c of cc) {
      const out: unknown[] = [];
      M.circleCircleIntersection(c[0], c[1], c[2], c[3], c[4], c[5], out);
      circleCircle.push({ in: c, out: L.enc(out) });
    }
    return { lineIs, solveSpecial, circleLine, circleCircle };
  }),
  geo("math/distances", ["ENG-GEOM-005"], (L, G) => {
    const M = G.GMath;
    const P = (x: unknown, y: unknown) => new G.GPoint(x, y);
    const r = L.floats(54, 60 * 8, -20, 20);
    const sets: number[][] = [
      [0, 0, 10, 0, 5, 5, 0, 0],
      [0, 0, 10, 0, -5, 5, 0, 0],
      [0, 0, 10, 0, 15, 5, 0, 0],
      [0, 0, 0, 0, 3, 4, 0, 0],
      [0, 0, 10, 0, 5, 0, 1, 1],
      [0, 0, 10, 10, 0, 0, 10, 10],
      [0, 0, 10, 0, 0.1, 0.1, 9.9, -0.1],
    ];
    for (let i = 0; i < r.length; i += 8) sets.push(r.slice(i, i + 8));
    return sets.map((s) => {
      const [x1, y1, x2, y2, px, py, qx, qy] = s;
      const t1: number[] = [];
      const t2: number[] = [];
      const t3: number[] = [];
      const d1 = M.sqrSegmentDist(x1, y1, x2, y2, px, py, t1);
      const d2 = M.sqrSegmentDist(x1, y1, x2, y2, px, py, t2, 4);
      const d3 = M.sqrSegmentDist(x1, y1, x2, y2, px, py, t3, 1e-6);
      return {
        in: s,
        vDot: [L.enc(M.vDotProduct(x1, y1, x2, y2)), L.enc(M.vDotProduct(null, y1, x2, y2))],
        ptSqrDist: [L.enc(M.ptSqrDist(x1, y1, px, py)), L.enc(M.ptSqrDist(x1, undefined, px, py))],
        ptDist: L.enc(M.ptDist(x1, y1, px, py)),
        side: M.segmentSide(x1, y1, x2, y2, px, py),
        sqrSegDist: [
          L.enc(M.sqrSegmentDist(x1, y1, x2, y2, px, py)),
          L.enc(d1),
          L.enc(t1),
          L.enc(d2),
          L.enc(t2),
          L.enc(d3),
          L.enc(t3),
        ],
        segToSeg: L.enc(M.getSegmToSegmSqrDist(P(x1, y1), P(x2, y2), P(px, py), P(qx, qy))),
        pointToLine: L.enc(M.pointToLineDist(x1, y1, x2, y2, px, py)),
        projection: [
          L.enc(M.getVectorProjection(x1, y1, x2, y2, px, py)),
          L.enc(M.getVectorProjection(x1, y1, x2, y2, px, py, true)),
          L.enc(M.getVectorProjection(x1, y1, x2, y2, px, py, false, true)),
        ],
        coDirected: M.isCoDirected(x1, y1, x2, y2, px, py, qx, qy),
        sin: L.enc(M.getSin(x1, y1, x2, y2, px, py)),
        rotSeg: M.getRotationSegment(P(x1, y1), P(px, py)),
        atSegment: [0, 0.3, 1, -0.5, 1.5].map((t) => L.enc(M.getPointAtSegment(x1, y1, x2, y2, t))),
        atLength: [-1, 0, 2.5, 7, 100].map((l) => [
          L.enc(M.getPointAtLength(x1, y1, x2, y2, l)),
          L.enc(M.getPointAtLength(x1, y1, x2, y2, l, true)),
        ]),
      };
    });
  }),
  geo("math/bezier", ["ENG-GEOM-005"], (L, G) => {
    const M = G.GMath;
    const P = (x: unknown, y: unknown) => new G.GPoint(x, y);
    const r = L.floats(55, 30 * 8, -100, 100);
    const curves: number[][] = [
      // x0 y0 c1x c1y c2x c2y x3 y3
      [0, 0, 0, 100, 100, 100, 100, 0],
      [0, 0, 100, 100, 0, 100, 100, 0],
      [0, 0, 33, 33, 66, 66, 100, 100],
      [0, 0, 0, 0, 100, 0, 100, 0],
      [0, 0, 150, 100, -50, 100, 100, 0],
      [10, 10, 10, 10, 10, 10, 10, 10],
      [0, 0, 100, 0, 0, 100, 100, 100],
    ];
    for (let i = 0; i < r.length; i += 8) curves.push(r.slice(i, i + 8));
    const ts = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1];
    return curves.map((c) => {
      const [x0, y0, x1, y1, x2, y2, x3, y3] = c;
      const ax = new Float64Array(3);
      const ay = new Float64Array(3);
      M.getBezierDerivativeEquationCoeffs(x0, y0, x3, y3, x1, y1, x2, y2, ax, ay);
      const splits: number[] = [];
      const nSplits = M.getCubicCurveSplits(ax, ay, splits);
      const px = [x0, x1, x2, x3];
      const py = [y0, y1, y2, y3];
      const selfIs: number[] = [];
      const selfRet = L.run(() => M.getBezierSelfIntersections(px, py, selfIs));
      const casteljau = [0.3, 0.5].map((t) => {
        const a = new Float64Array(4);
        const b = new Float64Array(4);
        M.getCtrlPtsCasteljau(x0, x1, x2, x3, t, null, a, b);
        const left = new Float64Array(4);
        M.getCtrlPtsCasteljau(x0, x1, x2, x3, t, 1, left);
        const right = new Float64Array(4);
        M.getCtrlPtsCasteljau(x0, x1, x2, x3, t, 2, right);
        return L.enc([a, b, left, right]);
      });
      const ctrl = [
        [0, 1],
        [0, 0.4],
        [0.4, 1],
        [0.2, 0.7],
      ].map(([a, b]) => {
        const out = new Float64Array(4);
        M.getCtrlPts(x0, x3, x1, x2, a, b, out);
        const q = new Float64Array(3);
        M.getCtrlPtsQuadratic(x0, x3, x1, a, b, q);
        return L.enc([out, q]);
      });
      const qa = new Float64Array(3);
      const qb = new Float64Array(3);
      M.divideQuadraticCurve(x0, x1, x3, 0.35, qa, qb);
      return {
        in: c,
        quadAt: ts.map((t) => L.enc(M.getCurveAtT(x0, x3, x1, t))),
        cubicAt: ts.map((t) => L.enc(M.getCubicCurveAtT(x0, x3, x1, x2, t))),
        evalCubic: ts.map((t) => L.enc(M.evalCubic(x0, x1, x2, x3, t))),
        deriv: L.enc([ax, ay]),
        splits: [nSplits, L.enc(splits)],
        selfIs: [selfRet, L.enc(selfIs)],
        casteljau,
        ctrl,
        divideQuad: L.enc([qa, qb]),
        arcQuad: [undefined, 0.5, 1e-3].map((e) =>
          L.run(() => M.getArcLengthQuadratic(P(x0, y0), P(x1, y1), P(x3, y3), e)),
        ),
        arcCubic: [undefined, 1, 1e-4].map((e) =>
          L.run(() => M.getArcLengthCubic(P(x0, y0), P(x3, y3), P(x1, y1), P(x2, y2), e)),
        ),
      };
    });
  }),
  geo("math/polynomials", ["ENG-GEOM-005", "ENG-BOOL-003"], (L, G) => {
    const M = G.GMath;
    const rnd = L.rng(56);
    const polys: number[][] = [
      [1, -6, 11, -6],
      [1, 0, 0, 0],
      [1, -1.5, 0.75, -0.125],
      [2, -3, 1, 0],
      [0, 1, -1, 0.25],
      [1, 0, 1, 0],
      [-4, 6, -2.25, 0.1],
    ];
    for (let i = 0; i < 25; i++) {
      // Cubics with roots spread around [0, 1].
      const a = rnd() * 1.4 - 0.2;
      const b = rnd() * 1.4 - 0.2;
      const c = rnd() * 1.4 - 0.2;
      const k = rnd() * 10 - 5 || 1;
      polys.push([k, -k * (a + b + c), k * (a * b + b * c + a * c), -k * a * b * c]);
    }
    for (let i = 0; i < 10; i++)
      polys.push([rnd() * 4 - 2, rnd() * 4 - 2, rnd() * 4 - 2, rnd() * 4 - 2]);
    const cubic = polys.map((p) => {
      const roots01: number[] = [];
      const n01 = M.getCubicRoots(p, 0, 1, roots01, false, 1e-6);
      const rootsWide: number[] = [];
      const nWide = M.getCubicRoots(p, -0.5, 1.5, rootsWide, false, 1e-9);
      const quad: number[] = [];
      M.getQuadraticRoots(p[0], p[1], p[2], quad);
      const deriv = new Float64Array(3);
      const okDeriv = M.getCoeffPolyDeriv(p, 3, deriv);
      const deriv2 = new Float64Array(2);
      M.getCoeffPolyDeriv(deriv, 2, deriv2);
      const f0 = M.evalPoly(p, 3, 0);
      const f1 = M.evalPoly(p, 3, 1);
      const newton = L.run(() => M.locateByNewton(0, 1, f0, f1, p, 3, deriv, deriv2, 1e-6));
      const inv = new Float64Array(4);
      M.inversePolyInterval(p, 3, 0.2, 0.9, inv);
      const invUnary = new Float64Array(4);
      M.inversePolyUnaryInterval(p, 3, invUnary);
      const shifted = new Float64Array(4);
      M.shiftPoly(p, 3, 0.5, shifted);
      const shiftedOne = new Float64Array(4);
      M.shiftPolyOne(p, 3, shiftedOne);
      return {
        in: p,
        roots01: [n01, L.enc(roots01.slice(0, n01))],
        rootsWide: [nWide, L.enc(rootsWide.slice(0, nWide))],
        quad: L.enc(quad),
        deriv: [okDeriv, L.enc(deriv), L.enc(deriv2)],
        eval: [-1, 0, 0.3, 1, 2.5].map((x) => L.enc(M.evalPoly(p, 3, x))),
        evalDegenerate: [L.enc(M.evalPoly(p, 0, 2)), L.enc(M.evalPoly(p, -1, 2))],
        newton,
        inv: L.enc(inv),
        invUnary: L.enc(invUnary),
        shifted: L.enc(shifted),
        shiftedOne: L.enc(shiftedOne),
        descartes: [M.estimPositiveRootsDescartes(p, 3), M.estimPositiveRootsDescartes(inv, 3)],
      };
    });
    // Degree 5 polynomials as used by the curve hit test: Sturm sequences,
    // root counting and isolation.
    const quintics: number[][] = [
      [1, -2.5, 2.35, -1.025, 0.2024, -0.0144],
      [1, 0, -1.25, 0, 0.25, 0],
      [3, -1, 0.5, -2, 1, -0.1],
    ];
    for (let i = 0; i < 12; i++) {
      const rs = [rnd(), rnd(), rnd(), rnd() * 2 - 0.5, rnd() * 2 - 0.5];
      let c = [1];
      for (const root of rs) {
        const next = new Array(c.length + 1).fill(0);
        for (let j = 0; j < c.length; j++) {
          next[j] += c[j] as number;
          next[j + 1] -= (c[j] as number) * root;
        }
        c = next;
      }
      quintics.push(c);
    }
    const quintic = quintics.map((p) => {
      const d = new Float64Array(5);
      M.getCoeffPolyDeriv(p, 5, d);
      const d2 = new Float64Array(4);
      M.getCoeffPolyDeriv(d, 4, d2);
      const seq: number[][] = [];
      M.getSturmPRS(p, 5, d, seq);
      const lo = 0;
      const hi = 1;
      const cache: unknown[] = [];
      const vals = [M.evalPoly(p, 5, lo), M.evalPoly(p, 5, hi)];
      const count = M.countRootsNSturm(p, 5, d, lo, hi, seq, cache, vals.slice());
      const intervals: number[][] = [];
      L.run(() =>
        M.locRootsSturm(p, 5, d, lo, hi, seq, count, cache.slice(), vals.slice(), intervals, 0),
      );
      const inv = new Float64Array(6);
      M.inversePolyInterval(p, 5, lo, hi, inv);
      const newton = L.run(() =>
        M.locateByNewton(lo, hi, vals[0], vals[1], p, 5, d, d2, 0.005, seq, cache.slice()),
      );
      return {
        in: p,
        seq: L.enc(seq),
        count,
        cache: L.enc(cache),
        intervals: L.enc(intervals),
        inv: L.enc(inv),
        descartes: M.estimPositiveRootsDescartes(inv, 5),
        newton,
      };
    });
    const comb = [];
    for (let n = 0; n <= 6; n++)
      for (let k = 0; k <= n + 1; k++) comb.push([n, k, L.run(() => M.combNK(n, k))]);
    const usort = [
      [[0.5, 0.2, 0.2, 1.2, -0.1, 0.9], 0, 1],
      [[0.5], 0, 1],
      [[2], 0, 1],
      [[], 0, 1],
      [[0, 1, 1, 0], 0, 1],
    ].map(([arr, a, b]) => {
      const out: number[] = [];
      const n = M.uSortSegment(a, b, (arr as number[]).slice(), out);
      return [n, L.enc(out)];
    });
    return { cubic, quintic, comb, usort };
  }),
]);

paritySuite("engine-geometry math", scenarios, { newApp: false });

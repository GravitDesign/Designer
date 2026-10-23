import { describe, expect, it } from "vitest";
import { Point } from "../math/point.ts";
import { VertexFitter, type CubicBezier } from "./vertex-fitter.ts";
import oldFits from "./test-data/old-vertex-fitter.json";

const P = (x: number, y: number) => new Point(x, y);
const xy = (curves: CubicBezier[] | null) =>
  curves && curves.map((c) => c.map((p) => [p.getX(), p.getY()]));

describe("VertexFitter", () => {
  it("defaults error and tolerance", () => {
    const f = new VertexFitter();
    expect(f.error).toBe(1e-6);
    expect(f.tolerance).toBe(Math.sqrt(1e-6 + 1e-9));
    expect(new VertexFitter(7).tolerance).toBe(Math.sqrt(7 + 1e-9));
    expect(f.force).toBe(false);
  });

  it("fits two points with control points at the thirds, or along given tangents", () => {
    const f = new VertexFitter(7);
    expect(xy(f.fitCurve([P(0, 0), P(30, 0)], 1))).toEqual([
      [
        [0, 0],
        [10, 0],
        [20, 0],
        [30, 0],
      ],
    ]);
    const third = Math.sqrt(200) / 3;
    expect(xy(f.fitCurve([P(0, 0), P(10, 10)], 1, P(1, 0), P(-1, 0)))).toEqual([
      [
        [0, 0],
        [third, 0],
        [10 - third, 10],
        [10, 10],
      ],
    ]);
  });

  it("returns null without segments to spend", () => {
    expect(new VertexFitter().fitCurve([P(0, 0), P(1, 1)], 0)).toBeNull();
  });

  it("fits a sampled cubic in one segment", () => {
    const b = [P(0, 0), P(10, 30), P(40, 30), P(50, 0)];
    const points: Point[] = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const u = 1 - t;
      const w = [u * u * u, 3 * t * u * u, 3 * t * t * u, t * t * t] as const;
      let x = 0;
      let y = 0;
      for (let k = 0; k < 4; k++) {
        x += (w[k] as number) * (b[k] as Point).getX();
        y += (w[k] as number) * (b[k] as Point).getY();
      }
      points.push(P(x, y));
    }
    // The freehand tool's settings: the error is a squared distance.
    const fitter = new VertexFitter(7);
    const result = fitter.fitCurve(points, 5) as CubicBezier[];
    expect(result.length).toBe(1);
    const fitted = result[0] as Point[];
    expect([fitted[0], fitted[3]]).toEqual([points[0], points[20]]);
    const samples: Point[] = [];
    for (let i = 0; i <= 400; i++) samples.push(fitter._evalBezier(3, fitted, i / 400));
    for (const p of points) {
      const nearest = Math.min(...samples.map((q) => Math.sqrt(p.subtract(q).dot(p.subtract(q)))));
      expect(nearest).toBeLessThan(fitter.tolerance);
    }
    // A tighter error needs more segments, joined end to start.
    const tight = new VertexFitter(1).fitCurve(points, 20) as CubicBezier[];
    expect(tight.length).toBe(2);
    expect((tight[0] as Point[])[3]).toBe((tight[1] as Point[])[0]);
    expect(new VertexFitter(1).fitCurve(points, 1)).toBeNull();
  });

  it("splits at a corner and needs more than one segment for it", () => {
    const corner = [P(0, 0), P(10, 0), P(20, 0), P(20, 10), P(20, 20)];
    const f = new VertexFitter(7);
    expect(f.fitCurve(corner, 1)).toBeNull();
    expect(xy(f.fitCurve(corner, 20))).toEqual([
      [
        [0, 0],
        [3.333333333333333, 0],
        [6.666666666666666, 0],
        [10, 0],
      ],
      [
        [10, 0],
        [25.66666666666666, 0],
        [20, 6.666666666666668],
        [20, 20],
      ],
    ]);
  });

  it("evaluates beziers and parameterizes by chord length", () => {
    const f = new VertexFitter();
    const b = [P(0, 0), P(0, 10), P(10, 10), P(10, 0)];
    expect(f._evalBezier(3, b, 0.5)).toEqual(P(5, 7.5));
    expect(f._chordLengthParameterize([P(0, 0), P(3, 4), P(3, 9)], 0, 2)).toEqual([0, 0.5, 1]);
    expect(f._chordLengthParameterize([P(1, 1), P(1, 1)], 0, 1)).toBeNull();
  });

  it("reports a hook as a negative error with the split before it", () => {
    const f = new VertexFitter();
    const loop = [P(0, 0), P(0, 20), P(10, 20), P(10, 0)];
    // The points lie on the curve, but the curve bulges between them.
    const points = [P(0, 0), P(5, 15), P(10, 0)];
    const split: number[] = [];
    const error = f._computeMaxError(points, 0, 2, loop, [0, 0.5, 1], split);
    // Bulge at t = 0.25: |(2.5, 7.5) - (1.5625, 11.25)| over the chord |(5, 15)|.
    const bulge = Math.sqrt(0.9375 * 0.9375 + 3.75 * 3.75);
    expect(error).toBeCloseTo(-bulge / (Math.sqrt(250) + f.tolerance), 12);
    expect(split).toEqual([0]);
    // Off the curve, the distance wins.
    const off = [P(0, 0), P(5, 0), P(10, 0)];
    expect(f._computeMaxError(off, 0, 2, loop, [0, 0.5, 1], split)).toBe(15 / f.tolerance);
    expect(split).toEqual([1]);
  });

  it("collapses the control points onto the end points in a degenerate fit, as the old code did", () => {
    // Recorded from old module 380 (GVertexFitter._generateBezier).
    const f = new VertexFitter();
    const bezier = f._generateBezier(
      [P(0, 0), P(5, 5), P(10, 0)],
      0,
      2,
      [0, 0.5, 1],
      P(0, -1),
      P(0, -1),
    );
    expect(bezier.map((p) => [p.getX(), p.getY()])).toEqual([
      [0, 0],
      [0, 0],
      [10, 0],
      [10, 0],
    ]);
  });
});

// Fits recorded from the old GVertexFitter (module 380, loaded in Node).
// The first two point sets reach the hook split and the refit with a zeroed
// end tangent; the seeded sets were picked because they hit a hook (negative
// error from _computeMaxError) at least once.
describe("VertexFitter against old outputs", () => {
  interface FitCase {
    name: string;
    points: [number, number][];
    error: number;
    maxSegments: number;
    left?: [number, number];
    right?: [number, number];
    expected: number[][][] | null;
  }
  for (const c of oldFits as FitCase[]) {
    it(c.name, () => {
      const f = new VertexFitter(c.error);
      const result = f.fitCurve(
        c.points.map(([x, y]) => P(x, y)),
        c.maxSegments,
        c.left && P(c.left[0], c.left[1]),
        c.right && P(c.right[0], c.right[1]),
      );
      expect(xy(result)).toEqual(c.expected);
    });
  }
});

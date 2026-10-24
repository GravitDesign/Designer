import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { VertexContainer } from "../geometry/vertex-container.ts";
import { VertexInfo } from "../geometry/vertex-info.ts";
import { Point } from "../math/point.ts";
import { Rect } from "../math/rect.ts";
import { Transform } from "../math/transform.ts";
import { TLPathTextTransformer } from "./tl-path-text-transformer.ts";

const here = dirname(fileURLToPath(import.meta.url));

/** Recorded from the old module 215 by running probePath below against it (scratch script). */
const expected = JSON.parse(
  readFileSync(resolve(here, "gtl/__fixtures__/old-transformers.json"), "utf8"),
) as { path: Record<string, unknown> };

/* eslint-disable @typescript-eslint/no-explicit-any -- the probe drives the old and the new engine through the same untyped surface */
// probe-start
function probePath(G: any): Record<string, unknown> {
  const num = (n: number): number | string =>
    Object.is(n, -0) ? "-0" : Number.isNaN(n) ? "NaN" : n;
  const mtx = (m: any): unknown => (m ? m.getMatrix().map(num) : m === null ? null : "undef");
  const pt = (p: any): unknown => (p ? [num(p.getX()), num(p.getY())] : p);
  // The base path: a vertex container plus what GPath adds (bbox, closed, reverse).
  const makePath = (vertices: number[][], closed: boolean): any => ({
    _vc: (() => {
      const vc = new G.VertexContainer();
      for (const v of vertices) vc.addVertex(v[0], v[1], v[2]);
      return vc;
    })(),
    $closed: closed,
    rewindVertices(i: number) {
      return this._vc.rewindVertices(i);
    },
    readVertex(v: any) {
      return this._vc.readVertex(v);
    },
    hasVertexForRead() {
      return this._vc.hasVertexForRead();
    },
    _calculateGeometryBBox() {
      return G.VertexInfo.calculateBounds(this._vc, true);
    },
    reverseOrder() {
      this._vc = G.VertexContainer.clone(this._vc, true);
    },
  });
  const circle: number[][] = [];
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    circle.push([i ? 2 : 1, 100 + 100 * Math.cos(a), 100 + 100 * Math.sin(a)]);
  }
  circle.push([5, 0, 0]);
  const k = 0.552284749831 * 80;
  const ellipse = [
    [1, 0, 50],
    [4, 80, -30],
    [4, 0, 50 - k * 0.5],
    [4, 80 - k, -30],
    [4, 160, 50],
    [4, 80 + k, -30],
    [4, 160, 50 - k * 0.5],
    [4, 80, 130],
    [4, 160, 50 + k * 0.5],
    [4, 80 + k, 130],
    [4, 0, 50],
    [4, 80 - k, 130],
    [4, 0, 50 + k * 0.5],
    [5, 0, 0],
  ];
  const open = [
    [1, 0, 100],
    [2, 100, 0],
    [2, 200, 100],
  ];
  const twoSub = [
    [1, 0, 0],
    [2, 0.3, 0],
    [1, 10, 10],
    [2, 110, 10],
    [2, 110, 60],
  ];
  const paths: Record<string, [number[][], boolean]> = {
    circle: [circle, true],
    ellipse: [ellipse, true],
    open: [open, false],
    twoSub: [twoSub, false],
  };
  const lineSets: Record<string, unknown[]> = {
    none: [],
    one: [{ baseline: 12, ascent: 11, descent: 3 }],
    two: [
      { baseline: 12, ascent: 11, descent: 3 },
      { baseline: 30, ascent: 11, descent: 3 },
    ],
  };
  const paramSets: Record<string, unknown> = {
    shared: undefined,
    outside: { side: 1, direction: 0, offset: 0, distance: 0 },
    offset: { side: -1, direction: 0, offset: 5, distance: 0 },
    distance: { side: -1, direction: 0, offset: 0, distance: 40 },
    inwards: { side: -1, direction: 1, offset: 0, distance: 0 },
    farOut: { side: 1, direction: 0, offset: -2.5, distance: 900 },
  };
  const bounds = new G.Rect(0.5, -9, 7, 10);
  const scale = new G.Transform(1, 0, 0, 1, 3, -2);
  const out: Record<string, unknown> = {};
  for (const [pname, [vertices, closed]] of Object.entries(paths)) {
    for (const [lname, lines] of Object.entries(lineSets)) {
      for (const [sname, params] of Object.entries(paramSets)) {
        const key = pname + "-" + lname + "-" + sname;
        const core = {
          getLines: () => lines,
          getRenderBounds: () => new G.Rect(-3, -4, 50, 60),
          _calculateRenderBounds: () => new G.Rect(-3, -4, 50, 60),
        };
        const record: Record<string, unknown> = {};
        try {
          const t = new G.Path(core, makePath(vertices, closed), params);
          const matrices: unknown[] = [];
          for (const x of [0, 30, 100, 290, 700]) {
            for (const y of [0, 12, 30]) {
              matrices.push(
                mtx(t.getMatrix(x, y, bounds, undefined, x === 30 ? scale : undefined)),
              );
            }
          }
          record.matrices = matrices;
          record.totals = t._totalDist;
          record.box = pt(t.getBoxOrigin());
          record.pre = mtx(t.getPreTransform());
          const inverse: unknown[] = [];
          for (const [x, y] of [
            [0, 0],
            [100, -5],
            [150, 150],
            [40, 220],
            [-300, -300],
          ]) {
            inverse.push(pt(t._inverseTransform(new G.Point(x, y), false)));
            inverse.push(pt(t._inverseTransform(new G.Point(x, y), true)));
          }
          record.inverse = inverse;
        } catch (e) {
          record.error = String((e as Error).name);
        }
        out[key] = record;
      }
    }
  }
  out.statics = [
    G.Path.TYPE,
    G.Path.OUTSIDE,
    G.Path.INSIDE,
    G.Path.DIRECTION_OUTWARDS,
    G.Path.DIRECTION_INWARDS,
    G.Path.MIN_SPATH_LEN,
    G.Path.TransformerParams,
  ];
  return out;
}
// probe-end
/* eslint-enable @typescript-eslint/no-explicit-any */

const G = {
  Path: TLPathTextTransformer,
  Rect,
  Point,
  Transform,
  VertexContainer,
  VertexInfo,
};

describe("TLPathTextTransformer", () => {
  const actual = JSON.parse(JSON.stringify(probePath(G))) as Record<string, unknown>;

  it("keeps the old statics", () => {
    expect(actual.statics).toEqual(expected.path.statics);
  });

  for (const key of Object.keys(expected.path).filter((k) => k !== "statics")) {
    it("places glyphs and maps points back like the old transformer: " + key, () => {
      expect(actual[key]).toEqual(expected.path[key]);
    });
  }

  it("reverses the base path only for inward text", () => {
    let reversed = 0;
    const path = {
      rewindVertices: () => false,
      readVertex: () => false,
      hasVertexForRead: () => false,
      _calculateGeometryBBox: () => new Rect(0, 0, 1, 1),
      reverseOrder: () => {
        reversed++;
      },
    };
    new TLPathTextTransformer(null, path);
    new TLPathTextTransformer(null, path, { side: -1, direction: 1, offset: 0, distance: 0 });
    expect(reversed).toBe(1);
  });
});

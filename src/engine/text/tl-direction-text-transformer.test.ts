import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { Point } from "../math/point.ts";
import { Rect } from "../math/rect.ts";
import { Transform } from "../math/transform.ts";
import { TextTransformer } from "./gtl/transformer-util.ts";
import { VERTICAL_ORIENTATION_RANGE_ENDS } from "./gtl/vertical-orientation-data.ts";
import {
  TLDirectionTextTransformer,
  verticalOrientationOf,
} from "./tl-direction-text-transformer.ts";
import { TLPathTextTransformer } from "./tl-path-text-transformer.ts";
import { VertexContainer } from "../geometry/vertex-container.ts";
import { VertexInfo } from "../geometry/vertex-info.ts";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Recorded from the old modules 266 and 650 (scratch script outside the
 * repo runs probeDirection below against them). The orientation map was
 * recorded with the old table and the old search.
 */
const expected = JSON.parse(
  readFileSync(resolve(here, "gtl/__fixtures__/old-transformers.json"), "utf8"),
) as { direction: unknown; orientation: Record<string, string> };

/* eslint-disable @typescript-eslint/no-explicit-any -- the probe drives the old and the new engine through the same untyped surface */
// probe-start
function probeDirection(G: any): unknown {
  const num = (n: number): number | string =>
    Object.is(n, -0) ? "-0" : Number.isNaN(n) ? "NaN" : n;
  const mtx = (m: any): unknown => (m ? m.getMatrix().map(num) : m === null ? null : "undef");
  const out: Record<string, unknown> = {};
  const bounds = new G.Rect(1, -8, 6, 9);
  const scale = new G.Transform(2, 0, 0, 2, 1, 1);
  const core = {
    getLines: () => [],
    getRenderBounds: () => new G.Rect(0, 0, 100, 40),
    _calculateRenderBounds: () => new G.Rect(0, 0, 100, 40),
  };
  const noBoundsCore = { ...core, getRenderBounds: () => null };
  const placements: Record<string, unknown> = {
    none: undefined,
    plain: { next: 9, prev: 8, unicode: 65 },
    xoff: { next: 9, prev: 8, unicode: 65, xoff: 0.5 },
    upright: { next: 12, prev: 12, unicode: 0x4e2d },
    tu: { next: 12, prev: 12, unicode: 0x3001 },
    tr: { next: 12, prev: 12, unicode: 0x3008 },
    noUnicode: { next: 9 },
  };
  for (const direction of [0, 1, 2, 3, 7]) {
    for (const [name, placement] of Object.entries(placements)) {
      for (const [mname, matrix] of [
        ["none", undefined],
        ["scale", scale],
      ] as const) {
        const t = new G.Dir(core, { direction });
        out["m" + direction + "-" + name + "-" + mname] = mtx(
          t.getMatrix(10, 20, bounds, placement, matrix),
        );
      }
    }
    const t = new G.Dir(noBoundsCore, { direction });
    out["nobounds" + direction] = mtx(t.getMatrix(10, 20, bounds, placements.plain));
    out["pre" + direction] = mtx(t.getPreTransform({ _getWidth: () => 50 }));
    const p = t.inverseTransform(new G.Point(3, 4));
    out["inv" + direction] = [num(p.getX()), num(p.getY())];
  }
  const t = new G.Dir(core, { direction: 1 });
  t.setDirection(2);
  out.setDirection = [t.getDirection(), t.getType(), G.Dir.TYPE, G.Dir.TransformerParams];

  // The chain through the base class: a direction followed by a recorder.
  const seen: unknown[] = [];
  const tail = new G.Base(core);
  tail._type = "tail";
  tail.getMatrix = function (x: number, y: number, b: any, p: any, m: any) {
    seen.push([num(x), num(y), b.getX(), typeof p === "object" ? "obj" : p, mtx(m)]);
    return G.Base.prototype.getMatrix.call(this, x, y, b, p, m);
  };
  tail.getBoxOrigin = () => new G.Point(5, 6);
  const head = new G.Dir(core, { direction: 1 });
  head.append(tail);
  out.chainMatrix = mtx(head.getMatrix(10, 20, bounds, placements.xoff));
  const ttb = new G.Dir(core, { direction: 2 });
  ttb.append(tail);
  out.chainTtb = mtx(ttb.getMatrix(10, 20, bounds, placements.upright, scale));
  out.chainSeen = seen;
  out.chainGet = [
    head.get("tail") === tail,
    head.get("direction") === head,
    new G.Dir(core, { direction: 0 }).get("path"),
    head.getFirst() === head,
    tail.getFirst() === head,
    head.getLast() === tail,
    head.getBoxOrigin().getX(),
  ];
  const middle = new G.Dir(core, { direction: 3 });
  tail.prepend(middle);
  out.chainPrepend = [head._next === middle, middle._next === tail, tail._prev === middle];
  out.chainRemove = [middle.remove() === tail, head._next === tail, tail._prev === head];
  const lone = new G.Dir(core, { direction: 0 });
  out.loneRemove = lone.remove();
  const tr = lone.transform({ fake: true }, 1, 2, bounds);
  out.transformNoMatrix = tr.fake === true;
  const rtl = new G.Dir(core, { direction: 1 });
  const wrapped = rtl.transform(new G.VertexContainer(), 1, 2, bounds, placements.plain as any);
  out.transformWrapped = mtx(wrapped.getTransform());
  return out;
}
// probe-end
/* eslint-enable @typescript-eslint/no-explicit-any */

const G = {
  Dir: TLDirectionTextTransformer,
  Path: TLPathTextTransformer,
  Base: TextTransformer,
  Rect,
  Point,
  Transform,
  VertexContainer,
  VertexInfo,
};

describe("TLDirectionTextTransformer", () => {
  it("builds the same glyph matrices, pre-transforms and chains as the old transformer", () => {
    expect(JSON.parse(JSON.stringify(probeDirection(G)))).toEqual(expected.direction);
  });

  it("looks up vertical orientations like the old table and search", () => {
    const actual: Record<string, string> = {};
    for (const code of Object.keys(expected.orientation)) {
      actual[code] = verticalOrientationOf(Number(code));
    }
    expect(actual).toEqual(expected.orientation);
    expect(VERTICAL_ORIENTATION_RANGE_ENDS.length).toBe(997);
  });

  it("keeps CJK upright and Latin rotated top to bottom", () => {
    expect(verticalOrientationOf(0x4e2d)).toBe("U");
    expect(verticalOrientationOf(65)).toBe("R");
    const t = new TLDirectionTextTransformer(null, { direction: TLDirectionTextTransformer.TTB });
    const bounds = new Rect(0, -10, 10, 10);
    const upright = t.getMatrix(0, 0, bounds, { unicode: 0x4e2d, next: 10 }) as Transform;
    const rotated = t.getMatrix(0, 0, bounds, { unicode: 65, next: 10 }) as Transform;
    expect(upright.getMatrix()).not.toEqual(rotated.getMatrix());
  });
});

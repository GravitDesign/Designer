import { describe, expect, it } from "vitest";
import { Rect } from "../../../engine/math/rect.ts";
import { Transform } from "../../../engine/math/transform.ts";
import { Node } from "../../../engine/scene/node.ts";
import recorded from "./__fixtures__/old-outputs.json" with { type: "json" };
import type { SketchPathData } from "./sketch-data.ts";
import { SketchPathUtil } from "./sketch-path-util.ts";
import { SketchPoint } from "./sketch-point.ts";
import { SketchRect } from "./sketch-rect.ts";

/** Random ids differ between runs. */
function withoutIds(json: string): string {
  return json
    .replace(/"@id":"[^"]+",?/g, "")
    .replace(/"#","[^"]+"/g, '"#","<id>"')
    .replace(/,?"(_layId|_effId)":"[^"]+"/g, "");
}

const cp = (x: number, y: number, extra: Record<string, unknown> = {}) => ({
  cornerRadius: 0,
  curveMode: 1,
  curveFrom: `{${x}, ${y}}`,
  curveTo: `{${x}, ${y}}`,
  point: `{${x}, ${y}}`,
  ...extra,
});

type Matrix = [number, number, number, number, number, number];
type Frame = [number, number, number, number];
type PathCase = [SketchPathData, Matrix | null, boolean, Frame, number | undefined];

const CASES: Record<string, PathCase> = {
  "square-fixed": [
    { isClosed: true, points: [cp(0, 0), cp(1, 0), cp(1, 1), cp(0, 1)] },
    [100, 0, 0, 60, 10, 20],
    true,
    [10, 20, 100, 60],
    8,
  ],
  radii: [
    {
      points: [
        cp(0, 0, { cornerRadius: 4 }),
        cp(1, 0, { cornerRadius: 50 }),
        cp(1, 1),
        cp(0, 1, { cornerRadius: undefined }),
      ],
    },
    [80, 0, 0, 80, 0, 0],
    true,
    [0, 0, 80, 80],
    6,
  ],
  curves: [
    {
      points: [
        cp(0, 1),
        cp(0.3, 0, { curveMode: 3, curveFrom: "{0.45, 0}", curveTo: "{0.15, 0}" }),
        cp(0.7, 1, { curveMode: 4, curveFrom: "{0.9, 1}", curveTo: "{0.6, 0.8}" }),
        cp(1, 0, { curveMode: 2, curveFrom: "{1, 0.2}", curveTo: "{1, 0.2}" }),
      ],
    },
    [120, 0, 0, 60, 5, 5],
    false,
    [5, 5, 120, 60],
    undefined,
  ],
  "curve-first": [
    { points: [cp(0, 0, { curveMode: 2 }), cp(1, 0), cp(1, 1)] },
    null,
    true,
    [0, 0, 1, 1],
    undefined,
  ],
  "bad-mode": [
    {
      points: [
        cp(0, 0),
        cp(1, 0, { curveMode: 0, cornerRadius: 5 }),
        cp(1, 1),
        cp(0, 1, { curveMode: 7 }),
      ],
    },
    [60, 0, 0, 60, 0, 0],
    true,
    [0, 0, 60, 60],
    undefined,
  ],
  "bad-first": [
    { points: [cp(0, 0, { curveMode: 0, cornerRadius: 5 }), cp(1, 0)] },
    null,
    true,
    [0, 0, 60, 60],
    undefined,
  ],
  single: [{ points: [cp(0.5, 0.5)] }, null, true, [0, 0, 40, 40], undefined],
  empty: [{ points: [] }, null, true, [0, 0, 40, 40], undefined],
};

describe("SketchPathUtil.generatePath", () => {
  for (const [name, [path, matrix, closed, frame, radius]] of Object.entries(CASES)) {
    it(`builds ${name} like the old importer`, () => {
      const expected = (recorded.paths as Record<string, { ok?: string | null; error?: string }>)[
        name
      ];
      const run = () =>
        SketchPathUtil.generatePath(
          path,
          matrix ? new Transform(...matrix) : null,
          closed,
          new Rect(...frame),
          radius,
        );
      if (expected?.error) {
        expect(run).toThrow(TypeError);
        return;
      }
      const node = run();
      const json = node ? withoutIds(Node.serialize(node as unknown as Node) as string) : null;
      expect(json).toBe(expected?.ok ? withoutIds(expected.ok) : null);
    });
  }

  it("caps a corner radius at half the frame's shorter side", () => {
    expect(SketchPathUtil.getPointsMinDistance(new Rect(3, 4, 30, 12))).toBe(
      recorded.rect.minDistance,
    );
  });
});

describe("SketchRect and SketchPoint", () => {
  it("maps one frame onto another", () => {
    expect(
      String(SketchRect.getTransformation(new Rect(10, 20, 100, 50), new Rect(0, 5, 200, 25))),
    ).toBe(recorded.rect.transformation);
  });

  it("scales an empty side to 0", () => {
    expect(
      String(SketchRect.getTransformation(new Rect(10, 20, 0, 50), new Rect(0, 5, 200, 25))),
    ).toBe(recorded.rect.emptyFrom);
  });

  it("parses Sketch point strings", () => {
    expect(String(SketchPoint.parse(" {0.25,  -3e2} "))).toBe(recorded.rect.point);
  });
});

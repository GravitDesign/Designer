// Runs the shared paint canvas and tile cases against the results recorded
// once from the old modules 14, 934 and 663 (see testing/paint-canvas-cases.ts
// and testing/tile-cases.ts).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Point } from "../math/point.ts";
import { Rect } from "../math/rect.ts";
import { Transform } from "../math/transform.ts";
import { DirtyMatcher } from "./dirty-list.ts";
import { PaintCanvas } from "./paint-canvas.ts";
import { RenderScheduler } from "./render-scheduler.ts";
import { RendererConfig } from "./renderer-config.ts";
import { TileCache } from "./tile-cache.ts";
import { TileRenderer } from "./tile-renderer.ts";
import { installFakeCanvas } from "./testing/fake-canvas.ts";
import { PAINT_CANVAS_CASES } from "./testing/paint-canvas-cases.ts";
import paintCanvasExpected from "./testing/paint-canvas-cases.json" with { type: "json" };
import { TILE_CASES, renderNew, type TileLib } from "./testing/tile-cases.ts";
import tileExpected from "./testing/tile-cases.json" with { type: "json" };

let uninstall: () => void;
beforeAll(() => {
  uninstall = installFakeCanvas();
});
afterAll(() => uninstall());

const lib: TileLib = {
  PaintCanvas,
  Rect,
  Point,
  Transform,
  TileCache,
  TileRenderer,
  DirtyMatcher,
  RendererConfig,
  render: renderNew(RenderScheduler.render.bind(RenderScheduler)),
};

function run(cases: Record<string, (lib: TileLib) => unknown>, name: string): unknown {
  try {
    return { value: JSON.parse(JSON.stringify((cases[name] as (lib: TileLib) => unknown)(lib))) };
  } catch (error) {
    return { throws: String(error) };
  }
}

describe("PaintCanvas against old outputs", () => {
  for (const [name, expected] of Object.entries(paintCanvasExpected)) {
    it(name, () => {
      expect(run(PAINT_CANVAS_CASES, name)).toEqual(expected);
    });
  }
});

describe("TileCache and TileRenderer against old outputs", () => {
  for (const [name, expected] of Object.entries(tileExpected)) {
    it(name, () => {
      expect(run(TILE_CASES, name)).toEqual(expected);
    });
  }
});

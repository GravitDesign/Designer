import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Point } from "../math/point.ts";
import { Rect } from "../math/rect.ts";
import { Transform } from "../math/transform.ts";
import { DirtyMatcher } from "./dirty-list.ts";
import { PaintCanvas, type Canvas2DPaintCanvas } from "./paint-canvas.ts";
import { PaintContext } from "./paint-context.ts";
import { RendererConfig } from "./renderer-config.ts";
import { TileCache } from "./tile-cache.ts";
import { TileGrid } from "./tile-grid.ts";
import { TileRenderer } from "./tile-renderer.ts";
import { installFakeCanvas, logOf } from "./testing/fake-canvas.ts";

let uninstall: () => void;
beforeAll(() => {
  uninstall = installFakeCanvas();
});
afterAll(() => uninstall());

const box = (r: Rect) => [r.getX(), r.getY(), r.getWidth(), r.getHeight()];

function canvas(width: number, height: number): Canvas2DPaintCanvas {
  const c = new PaintCanvas(false, true);
  c.resize(width, height);
  return c;
}

describe("TileGrid", () => {
  it("creates tiles on the grid where something is drawn", () => {
    const grid = new TileGrid(100, 100);
    expect(grid.isEmpty()).toBe(true);
    grid.drawFragmentFrom(canvas(300, 300), 0, 0, 50, 150, 100, 20);
    expect(grid._paintCanvases.map((item) => [item.x, item.y])).toEqual([
      [0, 100],
      [100, 100],
    ]);
    const second = grid._paintCanvases[1]?.canvas as Canvas2DPaintCanvas;
    expect(
      logOf(second)
        .filter((e) => e.startsWith("clearRect") || e.startsWith("drawImage"))
        .slice(-2),
    ).toEqual([
      "clearRect(0,50,50,20)",
      expect.stringMatching(/^drawImage\(canvas#\d+,50,0,50,20,0,50,50,20\)$/),
    ]);
    grid.destroy();
    expect(grid.isEmpty()).toBe(true);
  });
});

describe("TileCache", () => {
  it("never matches a zoom with its first entry (the old undefined scale)", () => {
    const cache = new TileCache();
    expect(cache._cachedCanvases[0]?.scale).toBeUndefined();
    expect(cache._getItemFromZoom(1)).toBeUndefined();
  });

  it("stores painted areas per zoom and serves them on the next render", () => {
    const cache = new TileCache();
    const tile = canvas(200, 200);
    tile.prepare();
    tile.finish();
    cache.setCache(tile, [new Rect(0, 0, 50, 50)], 2, new Point(10, 20));
    const dirty = DirtyMatcher.from([new Rect(0, 0, 100, 100)]);
    const rest = cache.cachedRender(tile, dirty, new Point(10, 20), 2, 0, 0) as DirtyMatcher;
    // The cached 50 x 50 corner came from the cache; the rest is left to paint.
    const left = (rest.getDirtyRectangles() as Rect[]).map(box);
    expect(left).toEqual([
      [50, 0, 50, 50],
      [0, 50, 100, 50],
    ]);
    expect(
      cache.cachedRender(
        tile,
        DirtyMatcher.from([new Rect(0, 0, 10, 10)]),
        new Point(10, 20),
        2,
        0,
        0,
      ),
    ).toBeNull();
    // Another zoom has nothing.
    const other = DirtyMatcher.from([new Rect(0, 0, 10, 10)]);
    expect(cache.cachedRender(tile, other, new Point(10, 20), 3, 0, 0)).toBe(other);
  });

  it("forgets stale areas and keeps at most MAX_CACHED_ZOOM_LEVELS levels", () => {
    const cache = new TileCache();
    const tile = canvas(100, 100);
    cache.setCache(tile, [new Rect(0, 0, 50, 50)], 1, new Point(0, 0));
    cache.setDirty(new Rect(0, 0, 25, 50), 1, 0, 0);
    const rest = cache.cachedRender(
      tile,
      DirtyMatcher.from([new Rect(0, 0, 50, 50)]),
      new Point(0, 0),
      1,
      0,
      0,
    );
    expect(((rest as DirtyMatcher).getDirtyRectangles() as Rect[]).map(box)).toEqual([
      [0, 0, 25, 50],
    ]);
    for (let level = 2; level < 10; level++)
      cache.setCache(tile, [new Rect(0, 0, 1, 1)], level, new Point(0, 0));
    expect(cache._cachedCanvases).toHaveLength(RendererConfig.MAX_CACHED_ZOOM_LEVELS);
    expect(() => cache.setCache(tile, [new Rect(0, 0, 1, 1)], 1, new Point(0.5, 0))).toThrow();
  });
});

describe("TileRenderer", () => {
  it("paints only what the cache doesn't have and reports the tile canvas", () => {
    const renderer = new TileRenderer(1, 1);
    renderer.resize(100, 80);
    expect([renderer.getWidth(), renderer.getHeight()]).toEqual([100, 80]);
    const context = new PaintContext();
    context.dirtyMatcher = DirtyMatcher.from([new Rect(10, 10, 30, 20)]);
    const painted: Rect[][] = [];
    const scene = {
      paint(paintContext: PaintContext) {
        painted.push((paintContext.dirtyMatcher?.getDirtyRectangles() as Rect[]).slice());
        paintContext.canvas?.fillRect(0, 0, 5, 5, "#ff0000");
      },
    };
    const results: unknown[] = [];
    renderer.paintAndRender(
      scene,
      context,
      new Transform(),
      new Point(0, 0),
      1,
      null,
      true,
      (c, finished) => {
        results.push([c, finished]);
      },
    );
    expect(painted.map((rects) => rects.map(box))).toEqual([[[10, 10, 30, 20]]]);
    const tile = renderer._paintCanvases[0] as Canvas2DPaintCanvas;
    expect(results).toEqual([[tile._canvasContext.canvas, true]]);
    expect(renderer.getSubCanvasContainingGraphic(tile._canvasContext.canvas)?.canvas).toBe(tile);
    expect(renderer.getConsolidatedCanvas()).toBe(renderer.getConsolidatedCanvas());
  });

  it("reports nothing to paint when no tile is dirty", () => {
    const renderer = new TileRenderer(1, 1);
    renderer.resize(50, 50);
    const context = new PaintContext();
    context.dirtyMatcher = DirtyMatcher.from([new Rect(500, 500, 10, 10)]);
    const results: unknown[] = [];
    renderer.paintAndRender(
      { paint: () => results.push("painted") },
      context,
      new Transform(),
      new Point(0, 0),
      1,
      null,
      true,
      (c, finished, skipped) => results.push([c, finished, skipped]),
    );
    expect(results).toEqual([[null, true, false]]);
  });
});

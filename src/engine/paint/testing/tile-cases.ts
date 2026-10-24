// Tile cache and tile renderer cases whose results were recorded once from
// the old modules 934 (tile cache) and 663 (tile renderer) on the fake
// canvas, see tile-cases.json. Like paint-canvas-cases.ts, the cases only
// use members the old and new classes share.
import type { DirtyMatcher as DirtyMatcherClass } from "../dirty-list.ts";
import type { RendererConfig as RendererConfigObject } from "../renderer-config.ts";
import type { TileCache as TileCacheClass } from "../tile-cache.ts";
import type { TileRenderer as TileRendererClass } from "../tile-renderer.ts";
import type { PaintLib } from "./paint-canvas-cases.ts";
import type { FakeCanvas, FakeContext2D } from "./fake-canvas.ts";
import type { RecorderStateContext } from "../recorder-state-context.ts";
import type { Rect as RectClass } from "../../math/rect.ts";

export interface TileLib extends PaintLib {
  TileCache: typeof TileCacheClass;
  TileRenderer: typeof TileRendererClass;
  DirtyMatcher: typeof DirtyMatcherClass;
  RendererConfig: typeof RendererConfigObject;
  /** Brings a tile canvas to the state after its first render. */
  render(canvas: PaintCanvasInstance): void;
}

type PaintCanvasInstance = InstanceType<PaintLib["PaintCanvas"]>;

const box = (rect: RectClass) => [rect.getX(), rect.getY(), rect.getWidth(), rect.getHeight()];

/** The canvas that receives the drawing: the old recorder's real canvas, or the canvas itself. */
function realCanvas(canvas: PaintCanvasInstance): FakeCanvas {
  const element = canvas._canvasContext.canvas as unknown as {
    $realCanvas?: FakeCanvas;
    __realCanvas?: FakeCanvas;
  };
  return element.$realCanvas || element.__realCanvas || (element as unknown as FakeCanvas);
}

function logOf(canvas: PaintCanvasInstance): string[] {
  return (realCanvas(canvas).getContext("2d") as FakeContext2D).log;
}

/** Canvas ids differ between runs; number them by first appearance. */
function normalize(log: string[], ids: Map<string, number>): string[] {
  return log.map((entry) =>
    entry.replace(/canvas#(\d+)/g, (_match, id: string) => {
      if (!ids.has(id)) ids.set(id, ids.size + 1);
      return "canvas@" + String(ids.get(id));
    }),
  );
}

function filled(lib: TileLib, width: number, height: number): PaintCanvasInstance {
  const canvas = new lib.PaintCanvas(false, true);
  canvas.resize(width, height);
  canvas.prepare();
  canvas.fillRect(0, 0, width, height, "#ff0000" as never);
  canvas.finish();
  return canvas;
}

function withConfig<T>(lib: TileLib, changes: Record<string, number>, run: () => T): T {
  const config = lib.RendererConfig as unknown as Record<string, number>;
  const saved: Record<string, number> = {};
  for (const key in changes) {
    saved[key] = config[key] as number;
    config[key] = changes[key] as number;
  }
  try {
    return run();
  } finally {
    for (const key in saved) config[key] = saved[key] as number;
  }
}

export const TILE_CASES: Record<string, (lib: TileLib) => unknown> = {
  gimmick(lib) {
    const cache = new lib.TileCache();
    cache.setCache(
      filled(lib, 100, 80) as never,
      [new lib.Rect(0, 0, 50, 40)],
      1,
      new lib.Point(0, 0),
    );
    cache.setCache(
      filled(lib, 100, 80) as never,
      [new lib.Rect(10, 0, 30, 30)],
      0.5,
      new lib.Point(0, 0),
    );
    const results: Record<string, unknown> = {};
    const ids = new Map<string, number>();
    const take = (name: string, gimmick: PaintCanvasInstance | null) => {
      results[name] = gimmick
        ? { size: [gimmick.getWidth(), gimmick.getHeight()], log: normalize(logOf(gimmick), ids) }
        : null;
    };
    take("atTwo", cache.getGimmick([new lib.Rect(0, 0, 100, 80)], new lib.Point(0, 0), 2) as never);
    take(
      "shifted",
      cache.getGimmick([new lib.Rect(0, 0, 60, 50)], new lib.Point(10, 6), 4) as never,
    );
    take(
      "belowAll",
      cache.getGimmick([new lib.Rect(0, 0, 60, 50)], new lib.Point(0, 0), 0.5) as never,
    );
    take(
      "twoAreas",
      cache.getGimmick(
        [new lib.Rect(0, 0, 10, 10), new lib.Rect(20, 0, 10, 10)],
        new lib.Point(0, 0),
        2,
      ) as never,
    );
    take(
      "notAtZero",
      cache.getGimmick([new lib.Rect(1, 0, 10, 10)], new lib.Point(0, 0), 2) as never,
    );
    take(
      "outside",
      cache.getGimmick([new lib.Rect(0, 0, 10, 10)], new lib.Point(500, 500), 2) as never,
    );
    take("none", cache.getGimmick(null, new lib.Point(0, 0), 2) as never);
    return results;
  },

  evictsOldestPerZoom(lib) {
    return withConfig(
      lib,
      {
        CACHE_CANVAS_GRID_ITEM_WIDTH: 10,
        CACHE_CANVAS_GRID_ITEM_HEIGHT: 10,
        MAX_CACHED_PER_ONE_ZOOM: 3,
      },
      () => {
        const cache = new lib.TileCache();
        const tile = filled(lib, 40, 40);
        cache.setCache(tile as never, [new lib.Rect(0, 0, 25, 15)], 3, new lib.Point(0, 0));
        const entry = cache._getItemFromZoom(3);
        const afterFirst = {
          items: entry?.canvasGrid._paintCanvases.map((item) => [item.x, item.y]),
          rects: entry?.cacheMatcher.getRects().map(box),
        };
        cache.setCache(
          tile as never,
          [new lib.Rect(0, 30, 12, 5), new lib.Rect(30, 0, 5, 5)],
          3,
          new lib.Point(0, 0),
        );
        return {
          afterFirst,
          items: entry?.canvasGrid._paintCanvases.map((item) => [item.x, item.y]),
          rects: entry?.cacheMatcher.getRects().map(box),
        };
      },
    );
  },

  cachedRenderShifted(lib) {
    const cache = new lib.TileCache();
    cache.setCache(
      filled(lib, 100, 80) as never,
      [new lib.Rect(0, 0, 60, 50)],
      2,
      new lib.Point(30, 20),
    );
    const tile = new lib.PaintCanvas(false, true);
    tile.resize(50, 50);
    const before = logOf(tile).length;
    const rest = cache.cachedRender(
      tile as never,
      lib.DirtyMatcher.from([new lib.Rect(0, 0, 50, 50)]),
      new lib.Point(10, 5),
      2,
      25,
      10,
    );
    return {
      rest: rest ? (rest.getDirtyRectangles() || []).map(box) : null,
      log: normalize(logOf(tile).slice(before), new Map()),
    };
  },

  moveContent(lib) {
    const renderer = new lib.TileRenderer(1, 1);
    renderer.resize(60, 40);
    const tile = renderer._paintCanvases[0] as unknown as PaintCanvasInstance;
    const ids = new Map<string, number>();
    // Before the first render the old code had no real context to copy with.
    let before = logOf(tile).length;
    renderer.moveContent(new lib.Rect(0, 0, 60, 40), new lib.Rect(10, 5, 60, 40));
    // The old clear of a fresh tile was recorded and only ran at the next
    // replay, so only the copies are compared.
    const fresh = normalize(logOf(tile).slice(before), ids).filter((entry) =>
      entry.startsWith("drawImage"),
    );
    tile.prepare();
    tile.fillRect(0, 0, 60, 40, "#00ff00" as never);
    tile.finish();
    lib.render(tile);
    before = logOf(tile).length;
    const helperBefore = logOf(renderer._panHelper as never).length;
    renderer.moveContent(new lib.Rect(5, 0, 40, 30), new lib.Rect(-5, 8, 40, 30));
    return {
      fresh,
      tile: normalize(logOf(tile).slice(before), ids),
      helper: normalize(logOf(renderer._panHelper as never).slice(helperBefore), ids),
    };
  },

  drawTo(lib) {
    const renderer = new lib.TileRenderer(1, 1);
    renderer.resize(60, 40);
    const tile = renderer._paintCanvases[0] as unknown as PaintCanvasInstance;
    tile.prepare();
    tile.finish();
    lib.render(tile);
    const ids = new Map<string, number>();
    ids.set(String(realCanvas(tile).id), 1);
    const target = new lib.PaintCanvas(false, true);
    target.resize(100, 100);
    target.prepare();
    const results: Record<string, unknown> = {};
    const step = (name: string, run: () => void) => {
      const before = logOf(target).length;
      run();
      results[name] = normalize(logOf(target).slice(before), ids);
    };
    const dirty = () =>
      lib.DirtyMatcher.from([new lib.Rect(5.5, 2, 10, 10), new lib.Rect(50, 30, 30, 30)]);
    const other = realCanvas(filled(lib, 20, 20));
    step("all", () => renderer.drawTo(target as never));
    step("dirty", () => renderer.drawTo(target as never, dirty()));
    step("dirtyOwnTile", () =>
      renderer.drawTo(target as never, dirty(), realCanvas(tile) as unknown as HTMLCanvasElement),
    );
    step("dirtyGimmick", () =>
      renderer.drawTo(target as never, dirty(), other as unknown as HTMLCanvasElement),
    );
    step("ownTile", () =>
      renderer.drawTo(target as never, null, realCanvas(tile) as unknown as HTMLCanvasElement),
    );
    step("gimmick", () =>
      renderer.drawTo(target as never, null, other as unknown as HTMLCanvasElement),
    );
    return results;
  },
};

/** For the new classes: the tile's wrapper context has to have been rendered once. */
export function renderNew(
  render: (context: RecorderStateContext | null, depth: number, callback: () => void) => unknown,
): (canvas: PaintCanvasInstance) => void {
  return (canvas) => {
    render(canvas.getRendererContext() as RecorderStateContext | null, 0, () => {});
  };
}

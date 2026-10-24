// Old: chunk.vendor.js module 934.
//
// Keeps what the tile canvases showed, per zoom level, in 1024 px canvas
// grids, so a repaint can copy unchanged parts instead of painting them.
// While a zoom level has nothing yet, getGimmick scales up a lower cached
// level as a placeholder (the "low-res gimmick").
import { GObject, registerClass } from "../core/object.ts";
import type { Point } from "../math/point.ts";
import { Rect } from "../math/rect.ts";
import { Transform } from "../math/transform.ts";
import type { Destroyable } from "./destroyable.ts";
import { DirtyMatcher } from "./dirty-list.ts";
import { PaintCanvas, type Canvas2DPaintCanvas } from "./paint-canvas.ts";
import { RectMatcher } from "./rect-matcher.ts";
import { RendererConfig } from "./renderer-config.ts";
import { TileGrid } from "./tile-grid.ts";

/** One zoom level of the cache. */
export class TileCacheEntry {
  canvasGrid: TileGrid;
  scale: number;
  cacheMatcher: RectMatcher;

  constructor(canvasGrid: TileGrid, scale: number) {
    this.canvasGrid = canvasGrid;
    this.scale = scale;
    this.cacheMatcher = new RectMatcher();
  }
}

export class TileCache extends GObject implements Destroyable {
  static {
    // The old class was an anonymous module export: this name is new and the
    // type id comes from the fresh counter, not from core/type-ids.ts.
    // Nothing serializes it.
    registerClass(this, "GTileCache");
  }

  static CacheEntry = TileCacheEntry;

  _cachedCanvases: TileCacheEntry[];
  _resolution: number;
  _currentCanvasGrid: TileGrid;

  constructor(resolution?: number) {
    super();
    this._currentCanvasGrid = new TileGrid(
      RendererConfig.CACHE_CANVAS_GRID_ITEM_WIDTH,
      RendererConfig.CACHE_CANVAS_GRID_ITEM_HEIGHT,
    );
    // The old code passed `this.scale`, which a cache doesn't have, so the
    // first entry's scale is undefined and never matches a zoom.
    this._cachedCanvases = [
      new TileCacheEntry(this._currentCanvasGrid, (this as unknown as { scale: number }).scale),
    ];
    this._resolution = resolution || 1;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- empty in the old code
  resize(width: number, height: number): void {}

  /**
   * A placeholder for a full repaint at `scale`: the largest cached level
   * below it, scaled up. Only for one area starting at 0, 0; null otherwise.
   */
  getGimmick(areas: Rect[] | null, origin: Point, scale: number): Canvas2DPaintCanvas | null {
    if (!areas || !areas.length) return null;
    const first = areas[0] as Rect;
    if (areas.length > 1 || 0 != first.getX() || 0 != first.getY()) return null;
    let best = -1;
    let bestIndex = 0;
    for (let i = 0; i < this._cachedCanvases.length; i++) {
      const levelScale = (this._cachedCanvases[i] as TileCacheEntry).scale;
      if (
        levelScale < scale &&
        levelScale > best &&
        !(this._cachedCanvases[i] as TileCacheEntry).canvasGrid.isEmpty()
      ) {
        best = levelScale;
        bestIndex = i;
      }
    }
    if (best < 0) return null;
    const ratio = best / scale;
    const result = new PaintCanvas(false, true, false);
    const lowRes = new PaintCanvas(false, true, false);
    const entry = this._cachedCanvases[bestIndex] as TileCacheEntry;
    let united = new Rect(0, 0, 1, 1);
    for (let i = 0; i < areas.length; i++) united = united.united(areas[i] as Rect);
    const cached = entry.cacheMatcher.getRects();
    const grid = entry.canvasGrid;
    const parts: Rect[] = [];
    const scaledAreas = areas.map((area) =>
      area
        .scaledAt(ratio, ratio, area.getSide(Rect.Side.TOP_LEFT))
        .translated(origin.getX() * ratio, origin.getY() * ratio)
        .toAlignedRect(),
    );
    for (let i = 0; i < cached.length; i++) {
      for (let j = 0; j < scaledAreas.length; j++) {
        const part = (scaledAreas[j] as Rect).intersected(cached[i] as Rect);
        if (part && !part.isEmpty()) parts.push(part);
      }
    }
    if (!parts.length) return null;
    lowRes.resize(united.getWidth() * ratio, united.getHeight() * ratio);
    lowRes.prepare();
    result.resize(united.getWidth(), united.getHeight());
    result.prepare();
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i] as Rect;
      const local = part.translated(-origin.getX() * ratio, -origin.getY() * ratio);
      grid.drawFragmentTo(
        lowRes,
        part.getX(),
        part.getY(),
        local.getX(),
        local.getY(),
        part.getWidth(),
        part.getHeight(),
      );
      result.drawImageFragment(
        lowRes,
        local.getX(),
        local.getY(),
        local.getX() / ratio,
        local.getY() / ratio,
        part.getWidth(),
        part.getHeight(),
        void 0,
        void 0,
        void 0,
        part.getWidth() / ratio,
        part.getHeight() / ratio,
      );
    }
    return result;
  }

  /**
   * Copies the cached parts of `dirty` at `scale` into `canvas` (a tile at
   * x, y of the view, `origin` the scroll offset) and returns what is left
   * to paint, or null when the cache had everything.
   */
  cachedRender(
    canvas: Canvas2DPaintCanvas,
    dirty: DirtyMatcher,
    origin: Point,
    scale: number,
    x: number,
    y: number,
  ): DirtyMatcher | null {
    const entry = this._getItemFromZoom(scale);
    if (!entry) return dirty;
    const cached = entry.cacheMatcher.getRects();
    const grid = entry.canvasGrid;
    dirty.transform(new Transform().translated(origin.getX() + x, origin.getY() + y));
    let hits: Rect[] = [];
    for (let i = 0; i < cached.length; i++) {
      const hit = dirty.intersect(cached[i] as Rect);
      if (hit) hits = hits.concat(hit.getDirtyRectangles() as Rect[]);
    }
    for (let i = 0; i < hits.length; i++) {
      const hit = hits[i] as Rect;
      const local = hit.translated(-origin.getX() - x, -origin.getY() - y);
      grid.drawFragmentTo(
        canvas,
        hit.getX(),
        hit.getY(),
        local.getX(),
        local.getY(),
        hit.getWidth(),
        hit.getHeight(),
      );
    }
    dirty.transform(new Transform().translated(-origin.getX() - x, -origin.getY() - y));
    const rects = dirty.getDirtyRectangles() as Rect[];
    const rest = new RectMatcher();
    for (let i = 0; i < rects.length; i++) rest.merge(rects[i] as Rect);
    for (let i = 0; i < hits.length; i++) {
      rest.subtract((hits[i] as Rect).translated(-origin.getX() - x, -origin.getY() - y));
    }
    const left = rest.getRects();
    let nothingLeft = true;
    for (let i = 0; i < left.length; i++) {
      if (!(left[i] as Rect).isEmpty()) {
        nothingLeft = false;
        break;
      }
    }
    if (RendererConfig.SHOW_CACHE_DEBUG_LOG) {
      console.log("(render) matcher has " + entry.cacheMatcher.getRects().length + " rects");
    }
    return nothingLeft ? null : DirtyMatcher.from(left);
  }

  /**
   * Stores the painted `areas` of `canvas` (at `origin`, default its own) in
   * the level for `scale` (default the canvas scale times the screen DPI).
   */
  setCache(
    canvas: Canvas2DPaintCanvas,
    areas: Rect[] | null,
    scale?: number,
    origin?: Point,
  ): void {
    const at = origin || (canvas.getOrigin() as Point);
    const x = at.getX();
    const y = at.getY();
    const level =
      "number" == typeof scale ? scale : (canvas.getScale() as number) * PaintCanvas.getScreenDPI();
    let entry = this._getItemFromZoom(level);
    if (!entry) entry = this._getNewItem(level);
    if (areas) {
      const merged = new RectMatcher();
      for (let i = 0; i < areas.length; i++) merged.merge((areas[i] as Rect).toAlignedRect());
      const rects = merged.getRects();
      for (let i = 0; i < rects.length; i++) {
        const rect = rects[i] as Rect;
        const placed = rect.translated(x, y);
        entry.cacheMatcher.merge(placed);
        entry.canvasGrid.drawFragmentFrom(
          canvas,
          rect.getX(),
          rect.getY(),
          placed.getX(),
          placed.getY(),
          placed.getWidth(),
          placed.getHeight(),
        );
        while (entry.canvasGrid._paintCanvases.length > RendererConfig.MAX_CACHED_PER_ONE_ZOOM) {
          const dropped = entry.canvasGrid._paintCanvases.shift() as {
            x: number;
            y: number;
            canvas: Canvas2DPaintCanvas;
          };
          entry.cacheMatcher.subtract(
            new Rect(dropped.x, dropped.y, dropped.canvas.getWidth(), dropped.canvas.getHeight()),
          );
        }
      }
      if (RendererConfig.SHOW_CACHE_DEBUG_LOG) {
        console.log("Adding " + areas.length + " areas");
        areas.forEach((area) => {
          console.log(
            "new GRect(" +
              area.getX() +
              "," +
              area.getY() +
              "," +
              area.getWidth() +
              "," +
              area.getHeight() +
              ");",
          );
        });
        console.log("Now cache has " + entry.cacheMatcher.getRects().length + " rects");
      }
      // The cache is only consistent at whole-pixel origins.
      if (Math.floor(x) !== x) throw new Error();
      if (Math.floor(y) !== y) throw new Error();
    } else console.warn("Set cache with empty areas");
  }

  /**
   * Marks `area` (view coordinates at `scale`, moved by x, y) as stale in
   * every level; without an area all of the cache goes stale.
   */
  setDirty(area: Rect | null | undefined, scale: number, x: number, y: number): void {
    if (RendererConfig.SHOW_CACHE_DEBUG_LOG) {
      console.log("Subtracting:");
      console.log(area ? area.translated(x, y).toString() : "all");
    }
    if (area) {
      for (let i = 0; i < this._cachedCanvases.length; i++) {
        const entry = this._cachedCanvases[i] as TileCacheEntry;
        const ratio = entry.scale / scale;
        const stale = area.translated(x, y).scaled(ratio, ratio).toAlignedRect();
        entry.cacheMatcher.subtract(stale);
      }
    } else {
      for (let i = 0; i < this._cachedCanvases.length; i++) {
        (this._cachedCanvases[i] as TileCacheEntry).cacheMatcher.reset();
      }
    }
  }

  /** The level for `scale`, moved to the end (most recently used). */
  _getItemFromZoom(scale: number): TileCacheEntry | undefined {
    let found: TileCacheEntry | undefined;
    let index = 0;
    for (let i = 0; i < this._cachedCanvases.length && !found; i++) {
      if ((this._cachedCanvases[i] as TileCacheEntry).scale == scale) {
        found = this._cachedCanvases[i];
        index = i;
      }
    }
    if (found) {
      this._cachedCanvases.splice(index, 1);
      this._cachedCanvases.push(found);
    }
    return found;
  }

  /** A new level; the oldest goes when there are more than MAX_CACHED_ZOOM_LEVELS. */
  _getNewItem(scale: number): TileCacheEntry {
    const entry = new TileCacheEntry(
      new TileGrid(
        RendererConfig.CACHE_CANVAS_GRID_ITEM_WIDTH,
        RendererConfig.CACHE_CANVAS_GRID_ITEM_HEIGHT,
      ),
      scale,
    );
    this._cachedCanvases.push(entry);
    if (this._cachedCanvases.length > RendererConfig.MAX_CACHED_ZOOM_LEVELS)
      this._cachedCanvases.shift();
    return entry;
  }

  destroy(): void {
    for (let i = 0; i < this._cachedCanvases.length; i++) {
      const entry = this._cachedCanvases[i] as TileCacheEntry;
      entry.canvasGrid.destroy();
      entry.cacheMatcher.reset();
    }
    this._cachedCanvases = [];
  }
}

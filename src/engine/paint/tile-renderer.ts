// Old: chunk.vendor.js module 663.
//
// The scene canvas of the view: a grid of tile canvases (1 x 1 with the
// current config) the scene is painted into, with the tile cache in front
// and a queue that keeps only the latest paint request while one runs.
import { GObject, registerClass } from "../core/object.ts";
import { Point } from "../math/point.ts";
import { Rect } from "../math/rect.ts";
import { Transform } from "../math/transform.ts";
import type { Destroyable } from "./destroyable.ts";
import type { DirtyMatcher } from "./dirty-list.ts";
import { PaintCanvas, type Canvas2DPaintCanvas } from "./paint-canvas.ts";
import type { PaintContext } from "./paint-context.ts";
import type { RenderParameters } from "./render-job.ts";
import { RenderRequest, type PaintableScene, type RenderResultCallback } from "./render-request.ts";
import { RenderScheduler } from "./render-scheduler.ts";
import { RendererConfig } from "./renderer-config.ts";
import { TileCache } from "./tile-cache.ts";

/** Where a tile sits in the grid. */
export interface SubCanvasInfo {
  canvas: Canvas2DPaintCanvas;
  cx: number;
  cy: number;
}

/** What the tile canvases are drawn into. */
export interface TileTarget {
  drawImage(image: PaintCanvas | HTMLCanvasElement, x?: number, y?: number): void;
  drawImageFragment(
    image: PaintCanvas | HTMLCanvasElement,
    sx: number,
    sy: number,
    dx: number,
    dy: number,
    width: number,
    height: number,
  ): void;
}

type GridVisitor = (canvas: Canvas2DPaintCanvas, x: number, y: number) => boolean | undefined;

export class TileRenderer extends GObject implements Destroyable {
  static {
    // The old class was an anonymous module export: this name is new and the
    // type id comes from the fresh counter, not from core/type-ids.ts.
    // Nothing serializes it.
    registerClass(this, "GTileRenderer");
  }

  _paintCanvases: Canvas2DPaintCanvas[];
  _paintCanvasCache: TileCache;
  _panHelper: Canvas2DPaintCanvas;
  _numHorizontal: number;
  _numVertical: number;
  _consolidatedCanvas: Canvas2DPaintCanvas | null = null;
  _renderQueue: RenderRequest[] | null = null;

  constructor(horizontal: number, vertical: number) {
    super();
    this._paintCanvases = [];
    this._numHorizontal = horizontal;
    this._numVertical = vertical;
    const threaded = this.isThreaded();
    for (let i = 0; i < horizontal; i++) {
      for (let j = 0; j < vertical; j++)
        this._paintCanvases.push(new PaintCanvas(true, false, true, threaded));
    }
    this._panHelper = new PaintCanvas(false, true);
    this._panHelper.setRenderAlgorithm(PaintCanvas.RenderAlgorithm.Crisp);
    this._panHelper.setImageSmoothingQuality(PaintCanvas.SmoothingQuality.High);
    this._panHelper.prepare();
    this._paintCanvasCache = new TileCache();
  }

  /** Visits the tiles column by column with their position; a visitor returning false stops. */
  _iterateGrid(visit: GridVisitor): boolean | undefined {
    let x = 0;
    let canvas: Canvas2DPaintCanvas | undefined;
    for (let column = 0; column < this._numHorizontal; column++) {
      let y = 0;
      for (let row = 0; row < this._numVertical; row++) {
        canvas = this._paintCanvases[column * this._numVertical + row] as Canvas2DPaintCanvas;
        const result = visit(canvas, x, y);
        if (false === result) return result;
        y += canvas.getHeight();
      }
      x += (canvas as Canvas2DPaintCanvas).getWidth();
    }
    return undefined;
  }

  _iterateGridAsync(visit: GridVisitor): void {
    this._iterateGrid((canvas, x, y) => {
      setTimeout(() => {
        visit(canvas, x, y);
      });
    });
  }

  getWidth(): number {
    let width = 0;
    for (let i = 0; i < this._numHorizontal; i++) {
      width += (this._paintCanvases[i * this._numVertical] as Canvas2DPaintCanvas).getWidth();
    }
    return width;
  }

  getHeight(): number {
    let height = 0;
    for (let i = 0; i < this._numVertical; i++)
      height += (this._paintCanvases[i] as Canvas2DPaintCanvas).getHeight();
    return height;
  }

  /** Splits width x height over the tiles; the last column and row take the remainder. */
  resize(width: number, height: number): void {
    if (width == this.getWidth() && height == this.getHeight()) return;
    const columnWidth = Math.floor(width / this._numHorizontal);
    const rowHeight = Math.floor(height / this._numVertical);
    const lastWidth = width - columnWidth * (this._numHorizontal - 1);
    const lastHeight = height - rowHeight * (this._numVertical - 1);
    let maxWidth = 1;
    let maxHeight = 1;
    for (let column = 0; column < this._numHorizontal; column++) {
      const tileWidth = column === this._numHorizontal - 1 ? lastWidth : columnWidth;
      maxWidth = Math.max(maxWidth, tileWidth);
      for (let row = 0; row < this._numVertical; row++) {
        const tileHeight = row === this._numVertical - 1 ? lastHeight : rowHeight;
        maxHeight = Math.max(maxHeight, tileHeight);
        (this._paintCanvases[column * this._numVertical + row] as Canvas2DPaintCanvas).resize(
          tileWidth,
          tileHeight,
        );
      }
    }
    this._panHelper.resize(maxWidth, maxHeight);
    this._paintCanvasCache.resize(width, height);
    this._consolidatedCanvas = null;
  }

  isThreaded(): boolean {
    return RendererConfig.WORKER_RENDERING_ENABLED;
  }

  /** Queues a paint of `scene`; only the latest request waits while one runs. */
  paintAndRender(
    scene: PaintableScene,
    paintContext: PaintContext,
    viewTransform: Transform,
    origin: Point,
    scale: number,
    screen: Rect | null,
    panRepaint: boolean,
    callback: RenderResultCallback,
  ): void {
    const request = new RenderRequest();
    request.callback = callback;
    request.origin = origin;
    request.paintContext = paintContext;
    request.panRepaint = panRepaint;
    request.scale = scale;
    request.scene = scene;
    request.screen = screen;
    request.viewTransform = viewTransform;
    if (this._renderQueue) this._renderQueue.push(request);
    else this._renderQueue = [request];
    this._scheduleRender();
  }

  _renderNext(): boolean {
    const queue = this._renderQueue as RenderRequest[];
    if (1 === queue.length) {
      this._renderQueue = [];
      return false;
    }
    this._renderQueue = [queue[queue.length - 1] as RenderRequest];
    this._scheduleRender();
    return true;
  }

  _scheduleRender(): void {
    const queue = this._renderQueue as RenderRequest[];
    if (0 === queue.length || queue.length > 1) return;
    const request = queue[0] as RenderRequest;
    if (
      RenderScheduler.isRenderPhase() ||
      this._paintCanvases.some((canvas) =>
        RenderScheduler.isRenderPhase(canvas.getRendererContext()),
      )
    ) {
      console.log("SCHEDULERENDER: ERROR: render phase render, waiting");
    } else {
      this._paintAndRenderInternal(
        request.scene as PaintableScene,
        request.paintContext as PaintContext,
        request.viewTransform as Transform,
        request.origin as Point,
        request.scale,
        request.screen,
        request.panRepaint as boolean,
        request.callback as RenderResultCallback,
      );
    }
  }

  /**
   * Paints the dirty parts of every tile (after copying what the cache has)
   * and reports each finished tile; with one tile and the low-res gimmick on,
   * a scaled-up cached level is reported first.
   */
  _paintAndRenderInternal(
    scene: PaintableScene,
    paintContext: PaintContext,
    viewTransform: Transform,
    origin: Point,
    scale: number,
    screen: Rect | null,
    panRepaint: boolean,
    callback: RenderResultCallback,
  ): void {
    let pending = 0;
    let finishedCount = 0;
    const threaded = this.isThreaded();
    const dirtyMatcher = paintContext.dirtyMatcher as DirtyMatcher;
    let anySkipped = false;
    const paintedAreas: Rect[][] = [];
    const tileOrigins: Point[] = [];
    const paintStarts: (number | false)[] = [];
    const gimmickShown: boolean[] = [];
    const onRendered = (
      canvas: HTMLCanvasElement | null,
      finished: boolean,
      skipped: boolean,
      parameters?: RenderParameters,
    ): void => {
      if (finished) finishedCount++;
      if (finished && !skipped) {
        const index = this._getGridIndexForNativeCanvas(canvas);
        if (
          !(!RendererConfig.ENABLE_CACHE || false === paintStarts[index]) &&
          paintedAreas[index] &&
          (!parameters || (!parameters.quickRender && !parameters.noWebGL)) &&
          Date.now() - (paintStarts[index] as number) >
            RendererConfig.CACHE_WHEN_DRAWING_LONGER_THAN
        ) {
          const tile = this._paintCanvases[index] as Canvas2DPaintCanvas;
          this._paintCanvasCache.setCache(
            tile,
            paintedAreas[index] as Rect[],
            scale,
            tileOrigins[index],
          );
        }
      }
      if (skipped) anySkipped = true;
      if (finishedCount === pending) {
        paintContext.dirtyMatcher = dirtyMatcher;
        if (!this._renderNext()) callback(canvas, true, anySkipped);
      } else if (
        (RendererConfig.DRAW_DURING_RENDERING || RendererConfig.SHOW_LOWRES_GIMMICK) &&
        (finished || 1 === pending)
      ) {
        if (RendererConfig.SHOW_LOWRES_GIMMICK && 1 === pending) {
          const index = this._getGridIndexForNativeCanvas(canvas);
          if (!gimmickShown[index]) {
            const gimmick = this._paintCanvasCache.getGimmick(
              paintedAreas[index] as Rect[],
              tileOrigins[index] as Point,
              scale,
            );
            if (gimmick) callback(gimmick._canvasContext.canvas, false, anySkipped);
            gimmickShown[index] = true;
          }
        } else callback(canvas, false, anySkipped);
      }
    };
    let index = 0;
    const contexts: unknown[] = [];
    const iterate: (this: TileRenderer, visit: GridVisitor) => unknown =
      panRepaint || 1 === this._paintCanvases.length || this.isThreaded()
        ? this._iterateGrid
        : this._iterateGridAsync;
    iterate.call(this, (canvas, x, y) => {
      const tileRect = new Rect(x, y, canvas.getWidth(), canvas.getHeight());
      let dirty = dirtyMatcher.intersect(tileRect);
      if (dirty) {
        pending++;
        let gimmick: Canvas2DPaintCanvas | null = null;
        let toPaint: DirtyMatcher | null = RendererConfig.ENABLE_CACHE
          ? this._paintCanvasCache.cachedRender(canvas, dirty, origin, scale, x, y)
          : dirty;
        if (
          RendererConfig.SHOW_LOWRES_GIMMICK_FOR_QUICKRENDER &&
          ((RenderScheduler.getRenderParameters() || {}).quickRender ||
            (RenderScheduler.getRenderParameters() || {}).noWebGL) &&
          toPaint &&
          1 === this._paintCanvases.length
        ) {
          const areas = (toPaint.getDirtyRectangles() as Rect[]).slice();
          gimmickShown[index] = true;
          gimmick = this._paintCanvasCache.getGimmick(areas, origin, scale);
          if (gimmick) toPaint = null;
        }
        // The old code took the time after recording, so it covered the
        // replay, where the drawing happened. Painting draws now, so the
        // clock starts before it.
        const paintStart = Date.now();
        let canvasFailure: { error: unknown } | null = null;
        if (toPaint) {
          dirty = toPaint;
          if (!dirty.getDirtyRectangles()) console.warn("EMPTY DIRTY RECTS");
          dirty.transform(new Transform().translated(-x, -y));
          canvas.prepare(dirty.getDirtyRectangles());
          paintedAreas[index] = (dirty.getDirtyRectangles() as Rect[]).slice();
          tileOrigins[index] = origin.add(new Point(x, y));
          dirty.transform(new Transform().translated(x, y));
          canvas.setOrigin(tileOrigins[index] as Point);
          canvas.setScale(scale);
          canvas.setMasked(-1);
          RenderScheduler.begin(threaded);
          paintContext.canvas = canvas;
          const toScene = new Transform().multiplied(viewTransform);
          dirty.transform(toScene);
          paintContext.dirtyMatcher = dirty;
          try {
            scene.paint(paintContext, screen);
          } catch (error) {
            // Any painting error fails the tile like the old replay's canvas
            // errors did (BUGS-FIXED.md "BUG-009 A painting error leaves the
            // render phase on and the view stops repainting").
            canvasFailure = { error };
          } finally {
            try {
              canvas.finish();
            } finally {
              RenderScheduler.finish();
            }
          }
        }
        try {
          if (RendererConfig.DEBUG_GRID_PAINT_DELAY > 0) {
            paintStarts[index] =
              !!toPaint && paintStart + index * RendererConfig.DEBUG_GRID_PAINT_DELAY;
            if (canvasFailure) throw canvasFailure.error;
            const tileIndex = index;
            RenderScheduler.render(
              canvas.getRendererContext(),
              0,
              (result, finished, skipped, parameters) => {
                setTimeout(
                  () => {
                    onRendered(result, finished, skipped, parameters);
                  },
                  (tileIndex + Math.random()) * RendererConfig.DEBUG_GRID_PAINT_DELAY,
                );
              },
            );
          } else {
            paintStarts[index] = !!toPaint && paintStart;
            if (canvasFailure) throw canvasFailure.error;
            if (gimmick) onRendered(gimmick._canvasContext.canvas, true, false);
            else RenderScheduler.render(canvas.getRendererContext(), 0, onRendered);
          }
        } catch (error) {
          console.error("Render error at canvas " + index + ":" + String(error));
          this.cleanup();
          callback(null, true, false);
          this._renderNext();
          return false;
        } finally {
          contexts.push(canvas.getRendererContext());
        }
      }
      index++;
      return undefined;
    });
    this._consolidatedCanvas = null;
    if (iterate === this._iterateGrid) {
      contexts.forEach((context) => {
        RenderScheduler.disposeWorkerDataAfterRender(context);
      });
      if (0 === pending) {
        callback(null, true, false);
        this._renderNext();
      }
    }
  }

  /** The tile whose canvas is `canvas`. */
  _getGridIndexForNativeCanvas(canvas: unknown): number {
    for (let i = 0; i < this._paintCanvases.length; i++) {
      const tile = this._paintCanvases[i] as Canvas2DPaintCanvas;
      const context = tile.getRendererContext();
      if (context) {
        if (context.canvas === canvas) return i;
      } else {
        // The old code looked these up on `self` (the window) and failed;
        // tiles always have a renderer context, so this isn't reached.
        throw new TypeError("Cannot read properties of undefined (reading '" + i + "')");
      }
    }
    return -1;
  }

  /** Undoes the open saves of every tile after a failed pass. */
  cleanup(): void {
    for (let i = 0; i < this._paintCanvases.length; i++) {
      RenderScheduler.forceCleanup(
        (this._paintCanvases[i] as Canvas2DPaintCanvas).getRendererContext(),
      );
    }
  }

  setDirtyCache(area: Rect | null | undefined, scale: number, x: number, y: number): void {
    this._paintCanvasCache.setDirty(area, scale, x, y);
  }

  /** Scrolls the content: keeps `area` and moves it to `to`. */
  moveContent(area: Rect, to: Rect): void {
    this._consolidatedCanvas = null;
    const helper = this._panHelper;
    helper.resize(this.getWidth(), this.getHeight());
    helper.clearRect(0, 0, helper.getWidth(), helper.getHeight());
    this.drawFragmentTo(
      this._panHelper,
      area.getX(),
      area.getY(),
      area.getX(),
      area.getY(),
      area.getWidth(),
      area.getHeight(),
    );
    const target = to;
    const dx = area.getX() - to.getX();
    const dy = area.getY() - to.getY();
    this._iterateGrid((canvas, x, y) => {
      const tileRect = new Rect(x, y, canvas.getWidth(), canvas.getHeight());
      const part = target.intersected(tileRect);
      const context = canvas.getRendererContext();
      // Before its first render the old recorder had no real context: the
      // clear went into the recording (run at the next replay) and nothing
      // was copied.
      const real = context && context.hasRealContext ? context.real : null;
      if (real) real.clearRect(0, 0, canvas.getWidth(), canvas.getHeight());
      else canvas.clearRect(0, 0, canvas.getWidth(), canvas.getHeight());
      if (!part.isEmpty() && real) {
        real.drawImage(
          this._panHelper._canvasContext.canvas,
          part.getX() + dx,
          part.getY() + dy,
          part.getWidth(),
          part.getHeight(),
          part.getX() - x,
          part.getY() - y,
          part.getWidth(),
          part.getHeight(),
        );
      }
    });
  }

  drawFragmentTo(
    target: TileTarget,
    x: number,
    y: number,
    dx: number,
    dy: number,
    width: number,
    height: number,
  ): void {
    const area = new Rect(x, y, width, height);
    dx -= x;
    dy -= y;
    this._iterateGrid((canvas, tileX, tileY) => {
      const tileRect = new Rect(tileX, tileY, canvas.getWidth(), canvas.getHeight());
      const part = area.intersected(tileRect);
      if (!part.isEmpty()) {
        target.drawImageFragment(
          canvas,
          part.getX() - tileX,
          part.getY() - tileY,
          part.getX() + dx,
          part.getY() + dy,
          part.getWidth(),
          part.getHeight(),
        );
      }
    });
  }

  drawFragmentFrom(
    image: PaintCanvas,
    sx: number,
    sy: number,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const area = new Rect(x, y, width, height);
    x = sx - x;
    y = sy - y;
    this._iterateGrid((canvas, tileX, tileY) => {
      const tileRect = new Rect(tileX, tileY, canvas.getWidth(), canvas.getHeight());
      const part = area.intersected(tileRect);
      if (!part.isEmpty()) {
        canvas.drawImageFragment(
          image,
          part.getX() + x,
          part.getY() + y,
          part.getX() - tileX,
          part.getY() - tileY,
          part.getWidth(),
          part.getHeight(),
        );
      }
    });
    this._consolidatedCanvas = null;
  }

  /** The tile showing `graphic` (a tile's canvas) and its position. */
  getSubCanvasContainingGraphic(graphic: unknown): SubCanvasInfo | null {
    let found: SubCanvasInfo | null = null;
    this._iterateGrid((canvas, x, y) => {
      const tileCanvas = canvas._canvasContext.canvas;
      if (tileCanvas === graphic) {
        found = { canvas, cx: x, cy: y };
        return false;
      }
      return undefined;
    });
    return found;
  }

  /**
   * Draws the tiles into `target`: the parts in `dirty` (or everything),
   * only the tile showing `graphic` if given, else the graphic itself (a
   * low-res placeholder).
   */
  drawTo(
    target: TileTarget,
    dirty?: DirtyMatcher | null,
    graphic?: HTMLCanvasElement | null,
  ): void {
    let result: boolean | undefined;
    if (dirty) {
      const rects = dirty.getNonIntersectingDirtyRectangles() as Rect[];
      result = this._iterateGrid((canvas, x, y) => {
        if (graphic && canvas._canvasContext.canvas !== graphic) return undefined;
        const tileRect = new Rect(x, y, canvas.getWidth(), canvas.getHeight());
        for (let i = 0; i < rects.length; ++i) {
          let part = (rects[i] as Rect).toAlignedRect();
          part = part.intersected(tileRect);
          if (!part.isEmpty()) {
            target.drawImageFragment(
              canvas,
              part.getX() - x,
              part.getY() - y,
              part.getX(),
              part.getY(),
              part.getWidth(),
              part.getHeight(),
            );
          }
        }
        if (graphic) return false;
        return undefined;
      });
      if (graphic && false !== result && RendererConfig.SHOW_LOWRES_GIMMICK) {
        const bounds = new Rect(0, 0, graphic.width, graphic.height);
        for (let i = 0; i < rects.length; ++i) {
          let part = (rects[i] as Rect).toAlignedRect();
          part = part.intersected(bounds);
          if (!part.isEmpty()) {
            target.drawImageFragment(
              graphic,
              part.getX(),
              part.getY(),
              part.getX(),
              part.getY(),
              part.getWidth(),
              part.getHeight(),
            );
          }
        }
      }
    } else {
      result = this._iterateGrid((canvas, x, y) => {
        if (graphic) {
          if (canvas._canvasContext.canvas === graphic) {
            target.drawImage(canvas, x, y);
            return false;
          }
        } else target.drawImage(canvas, x, y);
        return undefined;
      });
      if (graphic && false !== result && RendererConfig.SHOW_LOWRES_GIMMICK)
        target.drawImage(graphic, 0, 0);
    }
  }

  /** All tiles in one canvas (cached until the next change). */
  getConsolidatedCanvas(): Canvas2DPaintCanvas {
    if (this._consolidatedCanvas) return this._consolidatedCanvas;
    const canvas = new PaintCanvas(false, true);
    canvas.resize(this.getWidth(), this.getHeight());
    canvas.prepare();
    this._iterateGrid((tile, x, y) => {
      canvas.drawImage(tile, x, y);
    });
    this._consolidatedCanvas = canvas;
    return canvas;
  }

  isMasked(): boolean {
    return (this._paintCanvases[0] as Canvas2DPaintCanvas).isMasked();
  }

  destroy(): void {
    for (let i = 0; i < this._paintCanvases.length; i++)
      (this._paintCanvases[i] as Canvas2DPaintCanvas).destroy();
    this._panHelper.destroy();
    if (this._consolidatedCanvas) {
      this._consolidatedCanvas.destroy();
      this._consolidatedCanvas = null;
    }
    this.cleanCache();
  }

  clear(): void {
    this._iterateGrid((canvas) => {
      canvas.clearRect(0, 0, canvas.getWidth(), canvas.getHeight());
    });
    this._consolidatedCanvas = null;
    this.cleanCache();
  }

  cleanCache(): void {
    this._paintCanvasCache.destroy();
  }

  setImageSmoothingQuality(quality: number): void {
    for (let i = 0; i < this._paintCanvases.length; i++) {
      (this._paintCanvases[i] as Canvas2DPaintCanvas).setImageSmoothingQuality(quality);
    }
  }

  setRenderAlgorithm(algorithm: number): void {
    for (let i = 0; i < this._paintCanvases.length; i++) {
      (this._paintCanvases[i] as Canvas2DPaintCanvas).setRenderAlgorithm(algorithm);
    }
  }
}

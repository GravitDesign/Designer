// Old: chunk.vendor.js module 936.
import { GObject, registerClass } from "../core/object.ts";
import { Rect } from "../math/rect.ts";
import type { Destroyable } from "./destroyable.ts";
import { PaintCanvas, type Canvas2DPaintCanvas } from "./paint-canvas.ts";

/** One cache tile and its position in the grid's space. */
export interface TileGridItem {
  x: number;
  y: number;
  canvas: Canvas2DPaintCanvas;
}

/** What tiles can be drawn into: anything with clearRect and drawImageFragment. */
export interface FragmentTarget {
  clearRect(x: number, y: number, width: number, height: number): void;
  drawImageFragment(
    image: PaintCanvas,
    sx: number,
    sy: number,
    dx: number,
    dy: number,
    width: number,
    height: number,
  ): void;
}

/**
 * A sparse grid of fixed-size canvases (1024 x 1024 for the cache), created
 * where something is drawn into it. The tile cache keeps one per zoom level.
 */
export class TileGrid extends GObject implements Destroyable {
  static {
    registerClass(this, "GTileGrid");
  }

  _paintCanvases: TileGridItem[];
  _itemWidth: number;
  _itemHeight: number;
  _originX = 0;
  _originY = 0;

  constructor(itemWidth: number, itemHeight: number) {
    super();
    this._paintCanvases = [];
    this._itemWidth = itemWidth;
    this._itemHeight = itemHeight;
  }

  _iterateGrid(visit: (canvas: Canvas2DPaintCanvas, x: number, y: number) => void): void {
    for (let i = 0; i < this._paintCanvases.length; i++) {
      const item = this._paintCanvases[i] as TileGridItem;
      visit(item.canvas, item.x, item.y);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- empty in the old code
  _iterateWholeGrid(visit: unknown, x: number, y: number, width: number, height: number): void {}

  setOrigin(x: number, y: number): void {
    this._originX = x;
    this._originY = y;
  }

  isEmpty(): boolean {
    return !this._paintCanvases.length;
  }

  /** Copies the grid's x, y, width, height (plus origin) to dx, dy of `target`, clearing first. */
  drawFragmentTo(
    target: FragmentTarget,
    x: number,
    y: number,
    dx: number,
    dy: number,
    width: number,
    height: number,
  ): void {
    x += this._originX;
    y += this._originY;
    const area = new Rect(x, y, width, height);
    dx -= x;
    dy -= y;
    this._iterateGrid((canvas, tileX, tileY) => {
      const tile = new Rect(tileX, tileY, canvas.getWidth(), canvas.getHeight());
      const part = area.intersected(tile);
      if (!part.isEmpty()) {
        target.clearRect(part.getX() + dx, part.getY() + dy, part.getWidth(), part.getHeight());
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

  drawImageFragment(
    image: PaintCanvas,
    sx: number,
    sy: number,
    dx: number,
    dy: number,
    width: number,
    height: number,
  ): void {
    this.drawFragmentFrom(image, sx, sy, dx, dy, width, height);
  }

  /** Copies sx, sy of `image` to the grid at x, y (plus origin), making tiles as needed. */
  drawFragmentFrom(
    image: PaintCanvas,
    sx: number,
    sy: number,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    x += this._originX;
    y += this._originY;
    const area = new Rect(x, y, width, height);
    x = sx - x;
    y = sy - y;
    let tileX = this._itemWidth * Math.floor(area.getX() / this._itemWidth);
    const firstTileY = this._itemHeight * Math.floor(area.getY() / this._itemHeight);
    while (tileX < area.getX2()) {
      for (let tileY = firstTileY; tileY < area.getY2();) {
        const tile = new Rect(tileX, tileY, this._itemWidth, this._itemHeight);
        const part = area.intersected(tile);
        if (!part.isEmpty()) {
          let item: TileGridItem | null = null;
          for (let i = 0; i < this._paintCanvases.length && !item; i++) {
            const candidate = this._paintCanvases[i] as TileGridItem;
            if (candidate.x === tileX && candidate.y === tileY) item = candidate;
          }
          if (!item) {
            const canvas = new PaintCanvas(false, true);
            canvas.setRenderAlgorithm(PaintCanvas.RenderAlgorithm.Crisp);
            canvas.setImageSmoothingQuality(PaintCanvas.SmoothingQuality.High);
            canvas.prepare();
            canvas.resize(this._itemWidth, this._itemHeight);
            item = { x: tileX, y: tileY, canvas };
            this._paintCanvases.push(item);
          }
          item.canvas.clearRect(
            part.getX() - tileX,
            part.getY() - tileY,
            part.getWidth(),
            part.getHeight(),
          );
          item.canvas.drawImageFragment(
            image,
            part.getX() + x,
            part.getY() + y,
            part.getX() - tileX,
            part.getY() - tileY,
            part.getWidth(),
            part.getHeight(),
          );
        }
        tileY += this._itemHeight;
      }
      tileX += this._itemWidth;
    }
  }

  destroy(): void {
    this._iterateGrid((canvas) => {
      canvas.destroy();
    });
    this._paintCanvases = [];
  }

  clear(): void {
    this.destroy();
  }
}

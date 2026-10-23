// Old: chunk.vendor.js module 1452 (GPDFRect).
import { Rect } from "../../../engine/math/rect.ts";

export const PDFRect = {
  /**
   * Splits an area into tiles of at most `size` (default 1024), row by row
   * from the top left, measured from 0, 0. Null when it fits one tile.
   */
  tile(area: Rect, size?: number): Rect[] | null {
    let tileWidth: number;
    let tileHeight: number;
    let x: number;
    let y = 0;
    let tiles: Rect[] | null = [];
    const width = area.getWidth();
    const height = area.getHeight();
    if (width > (size = size || 1024) || height > size) {
      while (y < height) {
        tileHeight = size;
        if (y + size >= height) tileHeight = height - y;
        x = 0;
        while (x < width) {
          tileWidth = size;
          if (x + size >= width) tileWidth = width - x;
          tiles.push(new Rect(x, y, tileWidth, tileHeight));
          x += tileWidth;
        }
        y += tileHeight;
      }
    } else tiles = null;
    return tiles;
  },

  toString(): string {
    return "[Object GPDFRect]";
  },
};

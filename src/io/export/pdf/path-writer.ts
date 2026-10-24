// Old: chunk.vendor.js module 1147 (the PDF path).
import { PDFObjectCollection } from "./object-collection.ts";
import {
  PDFBezierCurveTo,
  PDFLineTo,
  PDFMoveTo,
  PDFPointTo,
  type PDFPageSizeSource,
} from "./path-commands.ts";
import { PDFObject } from "./pdf-object.ts";
import type { PDFOutput } from "./output.ts";

/** A path as PDF commands, one per line; quadratic curves become cubic ones. */
export class PDFPath extends PDFObject {
  _doc: PDFPageSizeSource;
  _collection: PDFObjectCollection;

  constructor(document: PDFPageSizeSource) {
    super();
    this._doc = document;
    this._collection = new PDFObjectCollection();
  }

  peek(): unknown {
    return this._collection.peek().getValue();
  }

  /**
   * Raises the curve to a cubic one from the last point. Without a last
   * point the old code called its own `_x` and `_y`, which the path
   * doesn't have, so it throws a TypeError here as well.
   */
  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void {
    let start;
    const last = this.peek();
    if (last instanceof PDFPointTo) start = last.getPoint();
    else {
      if (!(last instanceof PDFBezierCurveTo)) {
        const self = this as unknown as Record<string, (value: number) => number>;
        this._collection.add(
          (self._x as (value: number) => number)(cx) +
            " " +
            (self._y as (value: number) => number)(cy) +
            " " +
            (self._x as (value: number) => number)(x) +
            " " +
            (self._y as (value: number) => number)(y) +
            " y",
        );
        console.log("WARN: Unsupported operator: " + String(last));
        return;
      }
      start = last.getPoint3();
    }
    const startX = start.getX();
    const startY = start.getY();
    const endX = x;
    const endY = y;
    const c1x = startX + (2 / 3) * (cx - startX);
    const c1y = startY + (2 / 3) * (cy - startY);
    const c2x = x + (2 / 3) * (cx - x);
    const c2y = y + (2 / 3) * (cy - y);
    this.bezierCurveTo(c1x, c1y, c2x, c2y, endX, endY);
  }

  bezierCurveTo(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): void {
    this._collection.add(new PDFBezierCurveTo(this._doc, x1, y1, x2, y2, x3, y3));
  }

  lineTo(x: number, y: number): void {
    this._collection.add(new PDFLineTo(this._doc, x, y));
  }

  moveTo(x: number, y: number): void {
    this._collection.add(new PDFMoveTo(this._doc, x, y));
  }

  close(): void {
    this._collection.add("h");
  }

  override write(output: PDFOutput): void {
    this._collection.write(output);
  }
}

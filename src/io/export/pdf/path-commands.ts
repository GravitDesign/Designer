// Old: chunk.vendor.js module 1420 (the PDF path commands).
import { Point } from "../../../engine/math/point.ts";
import type { PDFMediaBox } from "./media-box.ts";
import { PDFNumber } from "./pdf-number.ts";
import { PDFObject } from "./pdf-object.ts";
import type { PDFOutput } from "./output.ts";

/** What the path commands need from the document: the current page size. */
export interface PDFPageSizeSource {
  getPageSize(): PDFMediaBox;
}

/**
 * One path command in page coordinates: y is flipped against the page
 * height, x and y keep four decimals. A command with a NaN coordinate
 * writes nothing.
 */
export class PDFPathCommand extends PDFObject {
  declare _pageSize: PDFMediaBox | null;

  constructor(document: PDFPageSizeSource) {
    super();
    this._pageSize = document.getPageSize();
  }

  _y(y: number): number {
    return (this._pageSize as PDFMediaBox).relativeY(y);
  }

  _x(x: number): number {
    return PDFNumber.normalizeNumber(x);
  }
}

PDFPathCommand.prototype._pageSize = null;

/** `x y m` or `x y l`. */
export class PDFPointTo extends PDFPathCommand {
  _point: Point;
  _operator: string;

  constructor(document: PDFPageSizeSource, operator: string, x: number, y: number) {
    super(document);
    this._point = new Point(x, y);
    this._operator = operator;
  }

  getPoint(): Point {
    return this._point;
  }

  override write(output: PDFOutput): void {
    if (Number.isNaN(this._point.getX()) || Number.isNaN(this._point.getY())) return;
    output.write(this._x(this._point.getX()));
    output.writeSpace();
    output.write(this._y(this._point.getY()));
    output.writeSpace();
    output.write(this._operator);
  }
}

export class PDFMoveTo extends PDFPointTo {
  constructor(document: PDFPageSizeSource, x: number, y: number) {
    super(document, "m", x, y);
  }
}

export class PDFLineTo extends PDFPointTo {
  constructor(document: PDFPageSizeSource, x: number, y: number) {
    super(document, "l", x, y);
  }
}

/** `x1 y1 x2 y2 x3 y3 c`. */
export class PDFBezierCurveTo extends PDFPathCommand {
  _point1: Point;
  _point2: Point;
  _point3: Point;

  constructor(
    document: PDFPageSizeSource,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
  ) {
    super(document);
    this._point1 = new Point(x1, y1);
    this._point2 = new Point(x2, y2);
    this._point3 = new Point(x3, y3);
  }

  getPoint1(): Point {
    return this._point1;
  }

  getPoint2(): Point {
    return this._point2;
  }

  getPoint3(): Point {
    return this._point3;
  }

  override write(output: PDFOutput): void {
    if (
      Number.isNaN(this._point1.getX()) ||
      Number.isNaN(this._point1.getY()) ||
      Number.isNaN(this._point2.getX()) ||
      Number.isNaN(this._point2.getY()) ||
      Number.isNaN(this._point3.getX()) ||
      Number.isNaN(this._point3.getY())
    ) {
      return;
    }
    output.write(this._x(this._point1.getX()));
    output.writeSpace();
    output.write(this._y(this._point1.getY()));
    output.writeSpace();
    output.write(this._x(this._point2.getX()));
    output.writeSpace();
    output.write(this._y(this._point2.getY()));
    output.writeSpace();
    output.write(this._x(this._point3.getX()));
    output.writeSpace();
    output.write(this._y(this._point3.getY()));
    output.writeSpace();
    output.write("c");
  }
}

/** The command classes under their old names (GPDFPathCommand.MoveTo, ...). */
export const PathCommands = {
  PointTo: PDFPointTo,
  MoveTo: PDFMoveTo,
  LineTo: PDFLineTo,
  BezierCurveTo: PDFBezierCurveTo,
};

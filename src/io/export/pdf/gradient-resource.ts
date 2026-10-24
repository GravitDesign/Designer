// Old: chunk.vendor.js module 1227 (the PDF gradient shading base).
import type { Transform } from "../../../engine/math/transform.ts";
import type { LinearGradient } from "../../../engine/style/linear-gradient.ts";
import type { RadialGradient } from "../../../engine/style/radial-gradient.ts";
import type { PDFColorSpace } from "./color-spaces.ts";
import { PDFExponentialFunction } from "./exponential-function.ts";
import { PDFIndirectReference } from "./indirect-reference.ts";
import { PDFArray } from "./pdf-array.ts";
import type { PDFMediaBox } from "./media-box.ts";
import type { PDFIndirectObject } from "./xref-entry.ts";
import type { PDFObject } from "./pdf-object.ts";
import { PDFShading } from "./shading.ts";
import { PDFStitchingFunction } from "./stitching-function.ts";
import { transformFields } from "./transform-fields.ts";

/** A stop as the PDF context collects it: offset and CSS color. */
export interface PDFGradientStop {
  stop: number;
  color: string;
}

/**
 * What the PDF context's createLinearGradient and createRadialGradient
 * return: an engine gradient with the canvas coordinates (`_x0` ...) and
 * the stops added through `addColorStop` (in `_stops2`).
 */
export type PDFCanvasGradient = (LinearGradient | RadialGradient) & {
  _x0?: number;
  _y0?: number;
  _x1?: number;
  _y1?: number;
  _stops2?: PDFGradientStop[];
  addColorStop(offset: number, color: string): void;
};

/** What the shading needs from the document. */
export interface PDFShadingDocument {
  relativeY(y: number): number;
  getColorSpace(): PDFColorSpace;
  getIndirectObject<T extends PDFObject>(object: T): PDFIndirectObject<T>;
  addIndirectObject(object: PDFIndirectObject): void;
  getPageSize(): PDFMediaBox;
}

export interface PDFPaintOptions {
  transform?: Transform | null;
  doc: PDFShadingDocument;
  color: unknown;
  colorSpace?: PDFColorSpace | null;
  coords?: PDFArray;
}

/**
 * A gradient as a shading: the gradient transform flipped into page
 * coordinates, one exponential function per pair of stops (a first stop
 * at 0 is added when missing), stitched together, extended at both ends.
 * Nothing is filled in when the transform can't be inverted.
 */
export class PDFGradientShading extends PDFShading {
  declare transform: Transform | null;
  declare _gradient: PDFCanvasGradient;

  constructor(type: number, options: PDFPaintOptions) {
    super();
    if (!(options && options.transform && options.doc)) return;
    const document = options.doc;
    const ty = transformFields(options.transform)._ty;
    const tx = transformFields(options.transform)._tx;
    this.transform = options.transform;
    this.transform = this.transform
      .translated(-tx, -ty)
      .scaled(1, -1)
      .translated(tx, document.relativeY(ty));
    if (!this.isValid()) return;
    const colorSpace = options.colorSpace || options.doc.getColorSpace();
    this._initShading(type, colorSpace);
    this._gradient = options.color as PDFCanvasGradient;
    const encode = new PDFArray();
    const bounds = new PDFArray();
    const functions = new PDFArray();
    const stops = (this._gradient._stops2 as PDFGradientStop[])
      .slice()
      .sort((a, b) => a.stop - b.stop);
    let first = stops[0] as PDFGradientStop;
    if (0 !== first.stop) {
      first = Object.assign({}, first);
      first.stop = 0;
      stops.unshift(first);
    }
    stops.forEach((stop, index) => {
      const next = index < stops.length - 1 ? index + 1 : index;
      const from = colorSpace.parseColor((stops[index] as PDFGradientStop).color);
      const to = colorSpace.parseColor((stops[next] as PDFGradientStop).color);
      if (from.hasTransparency() || to.hasTransparency()) this._hasTransparency = true;
      const segment = new PDFExponentialFunction();
      segment.put("/C0", from.asArray());
      segment.put("/C1", to.asArray());
      segment.put("/N", 1);
      const segmentObject = document.getIndirectObject(segment);
      document.addIndirectObject(segmentObject);
      functions.push(new PDFIndirectReference(segmentObject));
      if (index > 0) bounds.push(stop.stop);
      encode.push(0);
      encode.push(1);
    });
    const stitching = document.getIndirectObject(
      new PDFStitchingFunction(encode, bounds, functions),
    );
    document.addIndirectObject(stitching);
    const extend = new PDFArray();
    extend.push(true);
    extend.push(true);
    this.put("/Coords", options.coords);
    this.put("/Extend", extend);
    this.put("/Function", new PDFIndirectReference(stitching));
  }

  override isValid(): boolean {
    return !!this.transform && this.transform.invertible();
  }

  getGradient(): PDFCanvasGradient {
    return this._gradient;
  }

  override equals(other: unknown): boolean {
    return other instanceof PDFGradientShading && this._gradient == other._gradient;
  }
}

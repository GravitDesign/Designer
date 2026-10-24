// Old: chunk.vendor.js module 1415 (the PDF axial shading).
import {
  PDFGradientShading,
  type PDFCanvasGradient,
  type PDFPaintOptions,
} from "./gradient-resource.ts";
import { PDFArray } from "./pdf-array.ts";
import { PDFShading } from "./shading.ts";

/** A linear gradient: /Coords [x0 y0 x1 y1] from the canvas gradient. */
export class PDFAxialShading extends PDFGradientShading {
  constructor(options: PDFPaintOptions) {
    const gradient = options.color as PDFCanvasGradient;
    const coords = new PDFArray();
    coords.push(gradient._x0);
    coords.push(gradient._y0);
    coords.push(gradient._x1);
    coords.push(gradient._y1);
    options.coords = coords;
    super(PDFShading.Type.AXIAL, options);
  }
}

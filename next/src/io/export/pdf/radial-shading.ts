// Old: chunk.vendor.js module 1418 (the PDF radial shading).
import type { RadialGradient } from "../../../engine/style/radial-gradient.ts";
import { PDFGradientShading, type PDFPaintOptions } from "./gradient-resource.ts";
import { PDFArray } from "./pdf-array.ts";
import { PDFShading } from "./shading.ts";

/** A radial gradient: /Coords [fx fy 0 cx cy scale]. */
export class PDFRadialShading extends PDFGradientShading {
  constructor(options: PDFPaintOptions) {
    const gradient = options.color as RadialGradient;
    const coords = new PDFArray();
    coords.push(gradient._fx);
    coords.push(gradient._fy);
    coords.push(0);
    coords.push(gradient._cx);
    coords.push(gradient._cy);
    coords.push(gradient._scale);
    options.coords = coords;
    super(PDFShading.Type.RADIAL, options);
  }
}

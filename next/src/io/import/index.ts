// Old: chunk.vendor.js module 1201: the importers, and the pdf.js worker
// location (now the bundled worker each PDF import starts, see
// io/import/pdf/pdfjs.ts). It also gives the Sketch importer the PDF
// renderer its image fills use.
import { BitmapImport } from "./bitmap-import.ts";
import { EPSImport } from "./eps/eps-import.ts";
import { PDFImport, renderPdfImage } from "./pdf/pdf-import.ts";
import { SketchImport } from "./sketch/sketch-import.ts";
import { SketchTexturePattern } from "./sketch/sketch-texture-pattern.ts";
import { SVGImport } from "./svg/svg-import.ts";

SketchTexturePattern.pdfRenderer = renderPdfImage;

export const Importers = {
  GSVGImport: SVGImport,
  GPDFImport: PDFImport,
  GSketchImport: SketchImport,
  GEPSImport: EPSImport,
  GBitmapImport: BitmapImport,
};

export { BitmapImport, EPSImport, PDFImport, SketchImport, SVGImport };

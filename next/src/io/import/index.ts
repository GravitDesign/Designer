// Old: chunk.vendor.js module 1201: the importers, and the pdf.js worker
// location (now the bundled worker each PDF import starts, see
// io/import/pdf/pdfjs.ts). The Sketch importer installs the PDF renderer
// of its image fills itself (sketch-import.ts).
import { BitmapImport } from "./bitmap-import.ts";
import { EPSImport } from "./eps/eps-import.ts";
import { PDFImport } from "./pdf/pdf-import.ts";
import { SketchImport } from "./sketch/sketch-import.ts";
import { SVGImport } from "./svg/svg-import.ts";

export const Importers = {
  GSVGImport: SVGImport,
  GPDFImport: PDFImport,
  GSketchImport: SketchImport,
  GEPSImport: EPSImport,
  GBitmapImport: BitmapImport,
};

export { BitmapImport, EPSImport, PDFImport, SketchImport, SVGImport };

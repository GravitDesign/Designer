import { BitmapImport } from "../../io/import/bitmap-import.ts";
import { EPSImport } from "../../io/import/eps/eps-import.ts";
import { EPSParser } from "../../io/import/eps/eps-parser.ts";
import { PDFImport } from "../../io/import/pdf/pdf-import.ts";

/** io-import-pdf-eps in the parity bridge, under the old class names (importer index, vendor module 1201). */
export const ioImportPdfEps = {
  GPDFImport: PDFImport,
  GEPSImport: EPSImport,
  GEPSParser: EPSParser,
  GBitmapImport: BitmapImport,
};

// Old: chunk.vendor.js module 1437 (the PDF font resource).
import type { PDFIndirectReference } from "./indirect-reference.ts";
import type { PDFFont } from "./pdf-font.ts";
import { PDFResource } from "./resource.ts";

/** A font in the resources, named by the font's own resource name (F0, F1, ...). */
export class PDFFontResource extends PDFResource<PDFFont> {
  constructor(reference: PDFIndirectReference<PDFFont>) {
    super(reference.getPDFObject().getName(), reference);
  }

  getFont(): PDFFont {
    return this.getPDFObject();
  }
}

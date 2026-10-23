// Old: chunk.vendor.js module 855 (the PDF fill paint).
import type { PDFPaintOptions } from "./gradient-resource.ts";
import { OPERATIONFLAG_FILL } from "./operation-flags.ts";
import { PDFPaintStyle, type PDFPaintDocument } from "./pattern-resource.ts";

export class PDFFillPaint extends PDFPaintStyle {
  constructor(options: PDFPaintOptions & { doc: PDFPaintOptions["doc"] & PDFPaintDocument }) {
    super(options, OPERATIONFLAG_FILL);
  }
}

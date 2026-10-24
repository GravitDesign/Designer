// Old: chunk.vendor.js module 853 (the PDF stroke paint).
import type { PDFPaintOptions } from "./gradient-resource.ts";
import { OPERATIONFLAG_STROKE } from "./operation-flags.ts";
import { PDFPaintStyle, type PDFPaintDocument } from "./pattern-resource.ts";

export class PDFStrokePaint extends PDFPaintStyle {
  constructor(options: PDFPaintOptions & { doc: PDFPaintOptions["doc"] & PDFPaintDocument }) {
    super(options, OPERATIONFLAG_STROKE);
  }
}

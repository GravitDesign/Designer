// Old: chunk.vendor.js module 797 (the exporter registry).
//
// The three exporters, static classes without a shared interface.

import { BitmapExport } from "./bitmap-export.ts";
import { PDFExport } from "./pdf/pdf-export.ts";
import { SvgExport } from "./svg/svg-export.ts";

/** What the export glue calls on the SVG exporter (GSVGExport). */
export interface SvgExporter {
  export(
    node: unknown,
    options: Record<string, unknown>,
    callback: (error: unknown, data?: string | null) => void,
  ): unknown;
  getUnsupportedFeatures(node: unknown): unknown[];
}

/** A running PDF export (what GPDFExport.export returns). */
export interface PdfExportJob {
  isAbort(): boolean;
  abort(): void;
}

/** What the export glue calls on the PDF exporter (GPDFExport). */
export interface PdfExporter {
  export(
    node: unknown,
    options: Record<string, unknown>,
    callback: (error: unknown, data?: BlobPart | null) => void,
    writer: unknown,
    messenger: unknown,
  ): PdfExportJob | null | undefined;
  isSupported(node: unknown, withEffects: boolean, size: string): boolean;
}

export const exporters: {
  BitmapExport: typeof BitmapExport;
  SVGExport: SvgExporter | null;
  PDFExport: PdfExporter | null;
} = {
  BitmapExport,
  SVGExport: SvgExport,
  PDFExport,
};

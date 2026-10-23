// Starts a PDF export worker (see pdf-export.worker.ts). The old exporter
// loaded public/pdfexport.worker.js (with a cache-busting query, through
// a blob importScripts when the page origin differed); Vite bundles the
// module worker and gives it a hashed URL instead.
import type { PDFExportWorker } from "../../io/export/pdf/pdf-document.ts";

export function createExportWorker(): PDFExportWorker {
  return new Worker(new URL("./pdf-export.worker.ts", import.meta.url), {
    type: "module",
  }) as unknown as PDFExportWorker;
}

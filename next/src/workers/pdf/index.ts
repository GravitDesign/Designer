// Starts a pdf.js worker (see pdf.worker.ts). The old app let pdf.js
// create it from public/pdf.worker.js; the importer now passes it to
// pdf.js as the port of a PDFWorker.

export function createPdfWorker(): Worker {
  return new Worker(new URL("./pdf.worker.ts", import.meta.url), { type: "module" });
}

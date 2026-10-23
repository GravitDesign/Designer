/**
 * app.pdfExport for the io-export-pdf scenarios (contract in
 * parity/scenarios/io-export-pdf/contract.ts): PDFExport.export through
 * the exporter registry with no writer and no dialog, as old-hooks.js
 * calls GPDFExport.export in the old app.
 */
import type { Node } from "../../engine/scene/node.ts";
import { exporters } from "../../io/export/index.ts";

interface PdfExportOutcome {
  called: boolean;
  error: unknown;
  data: unknown;
}

function exportPdf(
  element: Node | Node[],
  options: Record<string, unknown>,
  timeoutMs?: number,
): Promise<PdfExportOutcome> {
  return new Promise((resolve) => {
    let done = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const finish = (outcome: PdfExportOutcome) => {
      if (done) return;
      done = true;
      if (timer) clearTimeout(timer);
      resolve(outcome);
    };
    timer = setTimeout(
      () => finish({ called: false, error: null, data: null }),
      timeoutMs || 120000,
    );
    try {
      exporters.PDFExport.export(
        element,
        options,
        (error, data) => finish({ called: true, error: error || null, data: data || null }),
        null,
        null,
      );
    } catch (error) {
      finish({ called: false, error, data: null });
    }
  });
}

export const pdfExportHooks = {
  pdfExport: { export: exportPdf },
};

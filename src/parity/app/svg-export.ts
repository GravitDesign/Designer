/**
 * app.svgExport for the io-export-svg scenarios (contract in
 * parity/scenarios/io-export-svg/contract.ts): the real SvgExport and
 * ExportCompat, with the scenario's font manager installed in the
 * OpenType text meter while a body runs, as old-hooks.js does in the old
 * app.
 */
import type { Node } from "../../engine/scene/node.ts";
import type { FontManager } from "../../engine/text/fonts/font-manager.ts";
import { openTypeMeasure } from "../../engine/text/gtl/measure.ts";
import { ExportCompat } from "../../io/export/export-compat.ts";
import type { SvgExportOptions } from "../../io/export/svg/svg-images.ts";
import { SvgExport } from "../../io/export/svg/svg-export.ts";

interface SvgExportOutcome {
  called: boolean;
  error: string | null;
  svg: string | null;
}

async function withTextMeter<T>(fontManager: FontManager, body: () => Promise<T>): Promise<T> {
  const previous = openTypeMeasure.fontManager;
  openTypeMeasure.fontManager = fontManager;
  try {
    return await body();
  } finally {
    openTypeMeasure.fontManager = previous;
  }
}

function exportSvg(
  node: Node | Node[],
  options: SvgExportOptions | null,
  timeoutMs?: number,
): Promise<SvgExportOutcome> {
  return new Promise((resolve) => {
    let done = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const finish = (outcome: SvgExportOutcome) => {
      if (done) return;
      done = true;
      if (timer) clearTimeout(timer);
      resolve(outcome);
    };
    timer = setTimeout(() => finish({ called: false, error: null, svg: null }), timeoutMs || 30000);
    try {
      SvgExport.export(node, options, (error, svg) =>
        finish({
          called: true,
          error: error ? String(error) : null,
          svg: typeof svg === "string" ? svg : null,
        }),
      );
    } catch (error) {
      const e = error as Error | null;
      finish({
        called: false,
        error: "<" + String(e && e.name) + "> " + String(e && e.message),
        svg: null,
      });
    }
  });
}

export const svgExportHooks = {
  svgExport: {
    exporter: () => SvgExport,
    exportCompat: () => ExportCompat,
    withTextMeter,
    export: exportSvg,
  },
};

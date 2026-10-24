/**
 * app.svgImport for the io-import-svg scenarios (contract in
 * parity/scenarios/io-import-svg/contract.ts): GSVGImport.import with the
 * scenario's font manager also installed in the OpenType text meter
 * while the import runs, as old-hooks.js does in the old app.
 */
import type { FontManager } from "../../engine/text/fonts/font-manager.ts";
import { openTypeMeasure } from "../../engine/text/gtl/measure.ts";
import {
  SVGImport,
  type SvgImportInfo,
  type SvgImportOptions,
} from "../../io/import/svg/svg-import.ts";
import type { ImportNode } from "../../io/import/svg/svg-parser.ts";

type SvgSource = { text: string } | { base64: string };

interface SvgImportOutcome {
  called: boolean;
  error: unknown;
  node: ImportNode | null;
  info: SvgImportInfo | null;
}

function decode(source: SvgSource): string | Uint8Array {
  if ("text" in source) return source.text;
  const binary = atob(source.base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function importSvg(
  source: SvgSource,
  options: SvgImportOptions,
  fontManager: FontManager,
  timeoutMs?: number,
): Promise<SvgImportOutcome> {
  return new Promise((resolve) => {
    const previous = openTypeMeasure.fontManager;
    openTypeMeasure.fontManager = fontManager;
    let done = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const finish = (outcome: SvgImportOutcome) => {
      if (done) return;
      done = true;
      openTypeMeasure.fontManager = previous;
      if (timer) clearTimeout(timer);
      resolve(outcome);
    };
    timer = setTimeout(
      () => finish({ called: false, error: null, node: null, info: null }),
      timeoutMs || 10000,
    );
    try {
      SVGImport.import(decode(source), options, fontManager, (error, node, info) =>
        finish({ called: true, error: error || null, node: node || null, info: info || null }),
      );
    } catch (error) {
      finish({ called: false, error, node: null, info: null });
    }
  });
}

export const svgImportHooks = {
  svgImport: { import: importSvg },
};

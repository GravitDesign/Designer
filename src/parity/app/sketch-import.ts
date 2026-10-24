/**
 * app.sketchImport for the io-import-sketch scenarios (contract in
 * parity/scenarios/io-import-sketch/contract.ts): GSketchImport.import
 * with a new workspace around the scenario's font manager, which is also
 * installed in the OpenType text meter until release(), as old-hooks.js
 * does in the old app.
 */
import { Workspace } from "../../engine/scene/workspace.ts";
import type { FontManager } from "../../engine/text/fonts/font-manager.ts";
import { openTypeMeasure } from "../../engine/text/gtl/measure.ts";
import type { SketchLoadOptions } from "../../io/import/sketch/sketch-file.ts";
import { SketchImport } from "../../io/import/sketch/sketch-import.ts";

interface SketchImportOutcome {
  called: boolean;
  result: unknown;
}

const saved: (FontManager | null)[] = [];

function decode(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function importSketch(
  base64: string,
  options: SketchLoadOptions,
  fontManager: FontManager,
  timeoutMs?: number,
): Promise<SketchImportOutcome> {
  return new Promise((resolve) => {
    saved.push(openTypeMeasure.fontManager);
    openTypeMeasure.fontManager = fontManager;
    const workspace = new Workspace();
    workspace._fontManager = fontManager;
    let done = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const finish = (outcome: SketchImportOutcome) => {
      if (done) return;
      done = true;
      if (timer) clearTimeout(timer);
      resolve(outcome);
    };
    timer = setTimeout(() => finish({ called: false, result: null }), timeoutMs || 10000);
    try {
      SketchImport.import(decode(base64), { ...options, workspace }, (result) =>
        finish({ called: true, result }),
      );
    } catch (error) {
      finish({ called: false, result: error });
    }
  });
}

function release(): void {
  if (saved.length) openTypeMeasure.fontManager = saved[0] as FontManager | null;
  saved.length = 0;
}

export const sketchImportHooks = {
  sketchImport: { import: importSketch, release },
};

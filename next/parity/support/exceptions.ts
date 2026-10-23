import fs from "node:fs";
import path from "node:path";
import { NEXT_ROOT } from "./env.ts";

/**
 * A parity scenario where the new app deliberately differs from the old
 * one because it fixes a bug. The new app's output is compared against
 * `<scenario id>.fixed.<ext>` instead, which holds the correct behaviour.
 */
export interface ParityException {
  scenario: string;
  /** Id of the entry in docs/rewrite/BUGS-FIXED.md, e.g. "BUG-001". */
  bug: string;
}

/** Every allowed difference. Keep in sync with BUGS-FIXED.md. */
export const EXCEPTIONS: readonly ParityException[] = [
  // BUG-002: a radial gradient's moved center survives save and load. The
  // .fixed files equal the old output except that the center is restored.
  // Not ported yet; they will need an exception and a .fixed file from the
  // new app's output once enabled (fills-gradients.gvdesign has a radial
  // gradient at 0.3/0.7 that the old app draws at 0.5/0.5):
  // - corpus/fills-gradients/render-light, render-dark, preview, bitmap
  // - platform/gvthumb/corpus/fills-gradients
  // - import-export/corpus/fills-gradients (export hashes)
  // compat/fills-gradients/roundtrip's cross-app test needs nothing: the old
  // app opens the new app's file and loses the center as it always did.
  { scenario: "engine-model/colors/gradients", bug: "BUG-002" },
  { scenario: "corpus/fills-gradients/document", bug: "BUG-002" },
  { scenario: "corpus/fills-gradients/resave", bug: "BUG-002" },
  { scenario: "compat/fills-gradients/roundtrip", bug: "BUG-002" },
];

export function exceptionFor(scenarioId: string): ParityException | undefined {
  return EXCEPTIONS.find((e) => e.scenario === scenarioId);
}

let bugsFixed: string | undefined;

export function assertExceptionIsDocumented(exception: ParityException): void {
  bugsFixed ??= fs.readFileSync(path.join(NEXT_ROOT, "docs", "rewrite", "BUGS-FIXED.md"), "utf8");
  if (!new RegExp(`^## ${exception.bug}\\b`, "m").test(bugsFixed)) {
    throw new Error(
      `${exception.scenario} names ${exception.bug}, which BUGS-FIXED.md doesn't have`,
    );
  }
}

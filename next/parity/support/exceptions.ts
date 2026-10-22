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
export const EXCEPTIONS: readonly ParityException[] = [];

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

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

/**
 * The exceptions of one fixed bug: parity/exceptions/BUG-NNN.json.
 * `pending` lists scenarios that will need a `.fixed` file once they are
 * enabled for the new app (not compared yet, so no exception applies).
 */
interface BugExceptions {
  bug: string;
  why: string;
  scenarios: string[];
  pending?: string[];
}

const EXCEPTIONS_DIR = path.join(NEXT_ROOT, "parity", "exceptions");

function loadExceptions(): ParityException[] {
  if (!fs.existsSync(EXCEPTIONS_DIR)) return [];
  const out: ParityException[] = [];
  const files = fs
    .readdirSync(EXCEPTIONS_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();
  for (const file of files) {
    const entry = JSON.parse(
      fs.readFileSync(path.join(EXCEPTIONS_DIR, file), "utf8"),
    ) as BugExceptions;
    if (`${entry.bug}.json` !== file) {
      throw new Error(`parity/exceptions/${file} names ${entry.bug}`);
    }
    for (const scenario of entry.scenarios) out.push({ scenario, bug: entry.bug });
  }
  return out;
}

/**
 * Every allowed difference, one file per BUGS-FIXED.md entry, so each fix
 * commit only adds its own file.
 */
export const EXCEPTIONS: readonly ParityException[] = loadExceptions();

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

import fs from "node:fs";
import path from "node:path";
import { NEXT_ROOT } from "./env.ts";
import type { PngRemoval, RemovalRule } from "./removed.ts";

/**
 * A parity scenario where the new app deliberately differs from the old
 * one, because it fixes a bug (BUG-NNN, docs/rewrite/BUGS-FIXED.md) or
 * because a feature was removed (DROP-NNN, docs/rewrite/REMOVED.md). The
 * new app's output is compared against `<scenario id>.fixed.<ext>`
 * instead, which holds the intended behaviour.
 */
export interface ParityException {
  scenario: string;
  /** Id of the entry, e.g. "BUG-001" or "DROP-001". */
  bug: string;
}

/**
 * The exceptions of one entry: parity/exceptions/BUG-NNN.json or
 * DROP-NNN.json. `pending` lists scenarios that will need a `.fixed`
 * file once they are enabled for the new app (not compared yet, so no
 * exception applies).
 */
export interface EntryExceptions {
  bug: string;
  why: string;
  scenarios: string[];
  pending?: string[];
  /**
   * DROP entries: how each `.fixed` file differs from the old output
   * (parity/support/removed.ts, checked by removed.test.ts), and the old
   * app variant (old-variants.ts) that must produce the `.fixed` output
   * itself (checked by the "old app without ..." tests of suite.ts).
   */
  removed?: {
    rules?: RemovalRule[];
    png?: Record<string, PngRemoval>;
    oldVariant?: string;
  };
}

const EXCEPTIONS_DIR = path.join(NEXT_ROOT, "parity", "exceptions");

/** The document that must describe an entry, by its id prefix. */
export function documentFor(id: string): "BUGS-FIXED.md" | "REMOVED.md" {
  if (/^BUG-\d+$/.test(id)) return "BUGS-FIXED.md";
  if (/^DROP-\d+$/.test(id)) return "REMOVED.md";
  throw new Error(`parity exception id ${id} is neither BUG-NNN nor DROP-NNN`);
}

function loadEntries(): EntryExceptions[] {
  if (!fs.existsSync(EXCEPTIONS_DIR)) return [];
  const out: EntryExceptions[] = [];
  const files = fs
    .readdirSync(EXCEPTIONS_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();
  for (const file of files) {
    const entry = JSON.parse(
      fs.readFileSync(path.join(EXCEPTIONS_DIR, file), "utf8"),
    ) as EntryExceptions;
    if (`${entry.bug}.json` !== file) {
      throw new Error(`parity/exceptions/${file} names ${entry.bug}`);
    }
    documentFor(entry.bug);
    out.push(entry);
  }
  return out;
}

/** Every BUGS-FIXED.md and REMOVED.md entry with its scenarios. */
export const ENTRIES: readonly EntryExceptions[] = loadEntries();

/** The entries that list a scenario (a scenario can show several removed features). */
export function entriesFor(scenarioId: string): EntryExceptions[] {
  return ENTRIES.filter((e) => e.scenarios.includes(scenarioId));
}

function loadExceptions(): ParityException[] {
  return ENTRIES.flatMap((entry) =>
    entry.scenarios.map((scenario) => ({ scenario, bug: entry.bug })),
  );
}

/**
 * Every allowed difference, one file per BUGS-FIXED.md or REMOVED.md
 * entry, so each commit only adds its own file.
 */
export const EXCEPTIONS: readonly ParityException[] = loadExceptions();

export function exceptionFor(scenarioId: string): ParityException | undefined {
  return EXCEPTIONS.find((e) => e.scenario === scenarioId);
}

const documents = new Map<string, string>();

/** Whether the entry's document has a `## <id>` heading for it. */
export function isDocumented(id: string): boolean {
  const name = documentFor(id);
  let text = documents.get(name);
  if (text === undefined) {
    const file = path.join(NEXT_ROOT, "docs", "rewrite", name);
    text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
    documents.set(name, text);
  }
  return new RegExp(`^## ${id}\\b`, "m").test(text);
}

export function assertExceptionIsDocumented(exception: ParityException): void {
  if (!isDocumented(exception.bug)) {
    throw new Error(
      `${exception.scenario} names ${exception.bug}, which ${documentFor(exception.bug)} doesn't have`,
    );
  }
}

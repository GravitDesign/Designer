import fs from "node:fs";
import path from "node:path";
import { NEXT_ROOT } from "./env.ts";
import type { AppKind } from "./apps.ts";

/**
 * A deliberate break of one feature, used to prove that the scenarios
 * covering it can fail. Sabotage (GD_PARITY_SABOTAGE) only proves the
 * comparison runs; a mutation proves the recorded output depends on the
 * feature. Mutations live in parity/mutations/<area>.json.
 */
export interface Mutation {
  id: string;
  /** Inventory ids the mutation breaks. */
  covers: string[];
  /** Scenario ids that must fail while the mutation is active. */
  scenarios: string[];
  /**
   * JavaScript run in the page after the harness is installed, per app.
   * It replaces or wraps the function behind the feature, e.g.
   * `G.GRect.prototype.united = function () { return this; }`. `G` and
   * `app` (window.__parity) are in scope.
   */
  patch: Partial<Record<AppKind, string>>;
  /**
   * Where the patch runs: in the page (default) or, for the Electron
   * suite, in the main process before the app's own main script.
   */
  target?: "page" | "electron-main";
}

export function loadMutations(): Mutation[] {
  const dir = path.join(NEXT_ROOT, "parity", "mutations");
  if (!fs.existsSync(dir)) return [];
  const out: Mutation[] = [];
  for (const file of fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()) {
    const list = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")) as Mutation[];
    for (const m of list) out.push(m);
  }
  const ids = new Set<string>();
  for (const m of out) {
    if (ids.has(m.id)) throw new Error(`duplicate mutation id ${m.id}`);
    ids.add(m.id);
  }
  return out;
}

/** The patch to apply to `kind` for the mutation named in GD_MUTATION, if any. */
export function activeMutationPatch(kind: AppKind): string | undefined {
  const id = process.env.GD_MUTATION;
  if (!id) return undefined;
  if (process.env.GD_RECORD === "1") throw new Error("never record with a mutation active");
  const mutation = loadMutations().find((m) => m.id === id);
  if (!mutation) throw new Error(`GD_MUTATION=${id} is not in parity/mutations/`);
  if (mutation.target === "electron-main") return undefined;
  const patch = mutation.patch[kind];
  if (!patch) return undefined;
  return `(() => { const { G, app } = window.__parity; ${patch}\n})();`;
}

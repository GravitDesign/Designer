// Extracts the old app's translation tables into JSON data files.
//
//   node scripts/extract-locales.ts
//
// The old bundles hold each table as `JSON.parse('<string literal>')` in its
// own webpack module. This script finds those modules through
// docs/rewrite/old-module-index.tsv, decodes the string literal and writes
// the parsed table, formatted with prettier so `prettier --check` passes.
// The tables are data, so nothing is translated or renamed: class keys keep
// their old "G" prefix ("GSubAction", "GLength").
import fs from "node:fs";
import path from "node:path";
import { format } from "prettier";

const nextRoot = path.resolve(import.meta.dirname, "..");
const legacyRoot = path.join(nextRoot, "legacy");

interface TableSource {
  bundle: "chunk.vendor.js" | "designer.browser.dev.js";
  module: number;
  out: string;
  what: string;
}

const engineData = "src/engine/core/locale/data";

export const TABLES: readonly TableSource[] = [
  {
    bundle: "designer.browser.dev.js",
    module: 814,
    out: "src/app/locale/data/en.json",
    what: "Designer project: the app's strings (English only, the other 14 entries are empty)",
  },
  {
    bundle: "chunk.vendor.js",
    module: 886,
    out: `${engineData}/designer-temporary.json`,
    what: "Designer project overrides in 14 languages (GCommonNames, GLength units, ...)",
  },
  {
    bundle: "chunk.vendor.js",
    module: 888,
    out: `${engineData}/designer-diff.json`,
    what: "Designer project diff table: sub-action strings (GSubAction, GMergeSubAction, ...)",
  },
  {
    bundle: "chunk.vendor.js",
    module: 887,
    out: `${engineData}/cloud-diff.json`,
    what: "Cloud project diff table: server error strings",
  },
  {
    bundle: "chunk.vendor.js",
    module: 885,
    out: `${engineData}/web-trial.json`,
    what: "WebTrial project in 15 languages",
  },
];

/** Line range (1-based, inclusive) of every module, from the module index. */
export function readModuleIndex(tsv: string): Map<string, [number, number]> {
  const ranges = new Map<string, [number, number]>();
  for (const line of tsv.split(/\r?\n/).slice(1)) {
    const [bundle, module, lines] = line.split("\t");
    if (!bundle || !module || !lines) continue;
    const match = /^(\d+)-(\d+)$/.exec(lines);
    if (!match) continue;
    ranges.set(`${bundle}:${module}`, [Number(match[1]), Number(match[2])]);
  }
  return ranges;
}

const SIMPLE_ESCAPES: Record<string, string> = {
  n: "\n",
  r: "\r",
  t: "\t",
  b: "\b",
  f: "\f",
  v: "\v",
  "0": "\0",
};

/**
 * Decodes the JavaScript string literal that starts at `start` (a quote
 * character). Returns the value and the index after the closing quote.
 */
export function decodeStringLiteral(source: string, start: number): { value: string; end: number } {
  const quote = source[start];
  if (quote !== "'" && quote !== '"') throw new Error(`No string literal at ${start}`);
  let value = "";
  let i = start + 1;
  for (;;) {
    const ch = source[i];
    if (ch === undefined) throw new Error("Unterminated string literal");
    if (ch === quote) return { value, end: i + 1 };
    if (ch !== "\\") {
      value += ch;
      i++;
      continue;
    }
    const next = source[i + 1];
    if (next === undefined) throw new Error("Unterminated escape");
    if (next === "x") {
      value += String.fromCharCode(parseInt(source.slice(i + 2, i + 4), 16));
      i += 4;
    } else if (next === "u" && source[i + 2] === "{") {
      const close = source.indexOf("}", i);
      value += String.fromCodePoint(parseInt(source.slice(i + 3, close), 16));
      i = close + 1;
    } else if (next === "u") {
      value += String.fromCharCode(parseInt(source.slice(i + 2, i + 6), 16));
      i += 6;
    } else if (next === "\n") {
      // Line continuation.
      i += 2;
    } else {
      value += SIMPLE_ESCAPES[next] ?? next;
      i += 2;
    }
  }
}

/** The table a module's `JSON.parse('...')` call builds. */
export function extractTable(moduleSource: string): unknown {
  const call = moduleSource.indexOf("JSON.parse(");
  if (call < 0) throw new Error("Module has no JSON.parse call");
  let start = call + "JSON.parse(".length;
  while (/\s/.test(moduleSource[start] ?? "")) start++;
  return JSON.parse(decodeStringLiteral(moduleSource, start).value);
}

async function main(): Promise<void> {
  const index = readModuleIndex(
    fs.readFileSync(path.join(nextRoot, "docs/rewrite/old-module-index.tsv"), "utf8"),
  );
  const bundles = new Map<string, string[]>();
  for (const table of TABLES) {
    let lines = bundles.get(table.bundle);
    if (!lines) {
      lines = fs.readFileSync(path.join(legacyRoot, "public", table.bundle), "utf8").split("\n");
      bundles.set(table.bundle, lines);
    }
    const range = index.get(`${table.bundle}:${table.module}`);
    if (!range) throw new Error(`Module ${table.bundle} ${table.module} is not in the index`);
    const source = lines.slice(range[0] - 1, range[1]).join("\n");
    const data = extractTable(source);
    const text = await format(JSON.stringify(data), { parser: "json", printWidth: 100 });
    const out = path.join(nextRoot, table.out);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, text);
    console.log(`${table.out}: ${table.bundle} module ${table.module} (${table.what})`);
  }
}

if (import.meta.filename === process.argv[1] || process.argv[1]?.endsWith("extract-locales.ts")) {
  await main();
}

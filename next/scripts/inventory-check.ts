// Lists INVENTORY.md items that no test names. Tests name items in a
// `covers: [...]` list or with `covers("ID")`.
//
//   node scripts/inventory-check.ts            report only
//   node scripts/inventory-check.ts --strict   exit 1 when an item has no
//                                              test or is not checked off
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const inventory = fs.readFileSync(path.join(root, "docs", "rewrite", "INVENTORY.md"), "utf8");
const itemPattern = /^- \[( |x)\] ([A-Z]+-[A-Z0-9]+-\d+) /gm;
const items = new Map<string, boolean>();
for (const m of inventory.matchAll(itemPattern)) items.set(m[2] as string, m[1] === "x");

const testRoots = [
  "src",
  "parity/scenarios",
  "parity/self-test",
  "e2e",
  "server",
  "electron",
  "scripts",
];
const idPattern = /\b([A-Z]{2,5}-[A-Z0-9]{2,10}-\d{3})\b/g;
const named = new Map<string, Set<string>>();

function walk(dir: string): void {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules") walk(full);
    } else if (
      /\.(test|spec)\.tsx?$/.test(entry.name) ||
      full.includes(`${path.sep}scenarios${path.sep}`)
    ) {
      const text = fs.readFileSync(full, "utf8");
      for (const m of text.matchAll(idPattern)) {
        const id = m[1] as string;
        if (!named.has(id)) named.set(id, new Set());
        named.get(id)?.add(path.relative(root, full));
      }
    }
  }
}
for (const r of testRoots) walk(path.join(root, r));

const untested = [...items.keys()].filter((id) => !named.has(id));
const unchecked = [...items.entries()].filter(([, done]) => !done).map(([id]) => id);
const unknown = [...named.keys()].filter((id) => !items.has(id) && !id.startsWith("BUG-"));

const byPrefix = new Map<string, number>();
for (const id of untested) {
  const prefix = id.split("-").slice(0, 2).join("-");
  byPrefix.set(prefix, (byPrefix.get(prefix) ?? 0) + 1);
}

console.log(
  `${items.size} items, ${items.size - untested.length} named by a test, ${items.size - unchecked.length} checked off.`,
);
if (unknown.length > 0)
  console.log(`Tests name ids that are not in the inventory: ${unknown.join(", ")}`);
if (untested.length > 0) {
  console.log("Items without a test, by category:");
  for (const [prefix, count] of [...byPrefix.entries()].sort())
    console.log(`  ${prefix}: ${count}`);
}
if (
  process.argv.includes("--strict") &&
  (untested.length > 0 || unchecked.length > 0 || unknown.length > 0)
) {
  process.exit(1);
}

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { TABLES, decodeStringLiteral, extractTable, readModuleIndex } from "./extract-locales.ts";

const nextRoot = path.resolve(import.meta.dirname, "..");
const legacyRoot = path.join(nextRoot, "legacy");

describe("decodeStringLiteral", () => {
  it("decodes the escapes webpack and prettier write", () => {
    const source = String.raw`x('a\'b\\c\nä\x41\u{1F600}"') rest`;
    const { value, end } = decodeStringLiteral(source, 2);
    expect(value).toBe("a'b\\c\näA\u{1F600}\"");
    expect(source.slice(end)).toBe(") rest");
    expect(decodeStringLiteral(String.raw`"it's \"q\""`, 0).value).toBe('it\'s "q"');
  });

  it("rejects unterminated literals", () => {
    expect(() => decodeStringLiteral("'abc", 0)).toThrow("Unterminated");
  });
});

describe("extractTable", () => {
  it("parses the JSON.parse call of a module", () => {
    const module = `function (e) {\n  e.exports = JSON.parse(\n    '[{"a":"it\\'s"}]',\n  );\n}`;
    expect(extractTable(module)).toEqual([{ a: "it's" }]);
  });
});

describe("committed tables", () => {
  const index = readModuleIndex(
    fs.readFileSync(path.join(nextRoot, "docs/rewrite/old-module-index.tsv"), "utf8"),
  );
  const bundles = new Map<string, string[]>();
  it.each(TABLES.map((t) => [t.out, t] as const))("%s matches the old bundle", (_out, table) => {
    let lines = bundles.get(table.bundle);
    if (!lines) {
      lines = fs.readFileSync(path.join(legacyRoot, "public", table.bundle), "utf8").split("\n");
      bundles.set(table.bundle, lines);
    }
    const range = index.get(`${table.bundle}:${table.module}`);
    expect(range).toBeDefined();
    const [first, last] = range ?? [0, 0];
    const expected = extractTable(lines.slice(first - 1, last).join("\n"));
    const committed: unknown = JSON.parse(fs.readFileSync(path.join(nextRoot, table.out), "utf8"));
    expect(committed).toEqual(expected);
  });
});

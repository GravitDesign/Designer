import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { EXPECTED_ROOT, NEXT_ROOT } from "./env.ts";

const dir = path.join(NEXT_ROOT, "parity", "ported");
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".json")) : [];

function hasExpected(id: string): boolean {
  const base = path.join(EXPECTED_ROOT, id);
  const folder = path.dirname(base);
  if (!fs.existsSync(folder)) return false;
  const name = path.basename(base);
  return fs.readdirSync(folder).some((f) => f.startsWith(`${name}.`));
}

describe("parity/ported", () => {
  it.each(files.length > 0 ? files : ["(none)"])("%s lists only recorded scenarios", (file) => {
    if (file === "(none)") return;
    const ids = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")) as string[];
    expect(Array.isArray(ids)).toBe(true);
    expect(ids.filter((id) => !hasExpected(id))).toEqual([]);
  });
});

// Runs annotations-probe.ts against the port and compares every section
// with what the same probe returned in the old app's page
// (__fixtures__/old-annotations.json).
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { probeAnnotations } from "./annotations-probe.ts";

const here = dirname(fileURLToPath(import.meta.url));
const expected = JSON.parse(
  readFileSync(resolve(here, "__fixtures__/old-annotations.json"), "utf8"),
) as Record<string, Record<string, unknown>>;

// BUG-003 (BUGS-FIXED.md): the old app restored none of an "ann"'s meta
// properties, so it read back the defaults and saved only "@". The port
// restores and saves them as the probe wrote them.
expected["empty"] = {
  restored: ["T", "u9", 4, "N", true, true, "L", 2, "e@example.com", ["u9", "u8"]],
  saved: ["T", "u9", 4, "N", true, true, "L", 2, "e@example.com", ["u9", "u8"]],
  savedKeys: ["@", "email", "loc", "name", "read", "rmd", "rsv", "seq", "text", "typ", "uid"],
};

// The whole G namespace and the app hooks, as the parity bridge builds them.
function merge(modules: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const exports of Object.values(modules)) {
    for (const part of Object.values(exports as Record<string, unknown>)) {
      if (typeof part === "object" && part !== null) Object.assign(out, part);
    }
  }
  return out;
}
const G = merge(import.meta.glob("../../../parity/g/*.ts", { eager: true }));
const app = merge(import.meta.glob("../../../parity/app/*.ts", { eager: true }));

const actual = JSON.parse(JSON.stringify(probeAnnotations(G, app))) as Record<
  string,
  Record<string, unknown>
>;

describe("annotations against the old engine", () => {
  for (const section of Object.keys(expected)) {
    for (const name of Object.keys(expected[section] as object)) {
      it(`${section}: ${name}`, () => {
        expect((actual[section] as Record<string, unknown>)[name]).toEqual(
          (expected[section] as Record<string, unknown>)[name],
        );
      });
    }
  }
});

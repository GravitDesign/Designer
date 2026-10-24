import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runInterpreter } from "./test-support.ts";

const CORPUS = path.join(import.meta.dirname, "__fixtures__", "corpus");

/**
 * The bytes a corpus program dumps: its `dump` fills one rectangle per
 * byte, as wide as the byte's value (the second corner's x under the
 * default CTM).
 */
function dumped(name: string): string {
  const input = new Uint8Array(fs.readFileSync(path.join(CORPUS, name)));
  const run = runInterpreter(input, { outlineFonts: true });
  return run.messages
    .filter((m) => "func" in m && m.func === "fill")
    .map((m) => {
      const path = (m as { data: unknown[] }).data[0] as { coord: { x: number } }[][];
      return String.fromCharCode(path[0]?.[1]?.coord.x as number);
    })
    .join("");
}

describe("PostScript filters (BUG-115)", () => {
  it.each([
    ["filter-lzw.ps", "-----A---B"],
    ["filter-ascii85.ps", "Hello World!"],
    ["filter-ascii85-string.ps", "Hello "],
    ["filter-subfile-eod.ps", "\nabcEN xyz"],
    ["filter-subfile-count.ps", "\nab%cd"],
  ])("%s reads %j", (name, text) => {
    expect(dumped(name)).toBe(text);
  });
});

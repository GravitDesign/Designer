// Test support for the opentype unit tests: reads the fonts bundled with
// the old app (legacy/public/assets/font) and the reference values
// dumped from the old bundle (__fixtures__). Only tests import this file.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Font } from "./font.ts";
import { parse } from "./opentype.ts";

const here = dirname(fileURLToPath(import.meta.url));
const fontDir = resolve(here, "../../../../legacy/public/assets/font");

/** The bytes of a bundled font, path relative to public/assets/font. */
export function readTestFont(name: string): ArrayBuffer {
  const bytes = readFileSync(resolve(fontDir, name));
  const buffer = new ArrayBuffer(bytes.length);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

const parsed = new Map<string, Font>();

/** Parses a bundled font once per test file and caches it. */
export function parseTestFont(name: string): Font {
  let font = parsed.get(name);
  if (!font) {
    font = parse(readTestFont(name));
    parsed.set(name, font);
  }
  return font;
}

/** A reference fixture dumped from the old bundle. */
export function readFixture<T>(name: string): T {
  return JSON.parse(readFileSync(resolve(here, "__fixtures__", name), "utf8")) as T;
}

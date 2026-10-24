import fs from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";
import type { AppKind } from "./apps.ts";
import { comparePng, diffJson, formatJsonDiff } from "./compare.ts";
import { EXPECTED_ROOT, NEXT_ROOT, OUTPUT_ROOT } from "./env.ts";
import zlib from "node:zlib";
import { documentIds, normalizeDocumentString, normalizeOrigin, type Json } from "./normalize.ts";
import { extensionFor, type Scenario } from "./scenario.ts";

/** Output of a scenario in the form it is stored on disk. */
export type StoredOutput = Buffer;

function toBuffer(value: unknown, encoding: "base64" | "utf8"): Buffer {
  if (Buffer.isBuffer(value)) return value;
  if (typeof value !== "string") {
    throw new Error(`expected a string or Buffer, got ${typeof value}`);
  }
  const dataUrl = /^data:[^;,]+(;base64)?,(.*)$/s.exec(value);
  if (dataUrl) {
    return Buffer.from(dataUrl[2] ?? "", dataUrl[1] ? "base64" : "utf8");
  }
  return Buffer.from(value, encoding);
}

/**
 * JSON can't hold -0, NaN, ±Infinity or undefined: JSON.stringify turns
 * them into 0, null or nothing, which would hide a difference. They are
 * stored as tagged strings instead ("<-0>", "<NaN>", "<Infinity>",
 * "<-Infinity>", "<undefined>"). Playwright carries all of them out of
 * the page intact.
 */
export function tagSpecialValues(value: unknown): unknown {
  if (typeof value === "number") {
    if (Object.is(value, -0)) return "<-0>";
    if (Number.isNaN(value)) return "<NaN>";
    if (value === Infinity) return "<Infinity>";
    if (value === -Infinity) return "<-Infinity>";
    return value;
  }
  if (value === undefined) return "<undefined>";
  if (Array.isArray(value)) return value.map(tagSpecialValues);
  if (typeof value === "object" && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) out[key] = tagSpecialValues(child);
    return out;
  }
  return value;
}

/** Ids of the file a scenario loads, which must survive unchanged. */
function idsOfLoadedFile(scenario: Scenario): string[] {
  const spec = scenario.keepIdsOf;
  if (!spec) return [];
  const rel = typeof spec === "function" ? spec(scenario.args) : spec;
  let bytes = fs.readFileSync(path.join(NEXT_ROOT, rel));
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) bytes = zlib.gunzipSync(bytes);
  return documentIds(JSON.parse(bytes.toString("utf8")) as Json);
}

/**
 * Turns the raw value a scenario returned into its stored form. `origin`
 * is the page origin of the app that produced it; text output has it
 * replaced by a placeholder (normalizeOrigin).
 */
export function storeOutput(scenario: Scenario, raw: unknown, origin?: string): StoredOutput {
  switch (scenario.kind) {
    case "json":
      return Buffer.from(
        normalizeOrigin(JSON.stringify(tagSpecialValues(raw ?? null), null, 1), origin) + "\n",
        "utf8",
      );
    case "document": {
      if (typeof raw !== "string") throw new Error("document scenarios must return a JSON string");
      return Buffer.from(
        normalizeOrigin(
          normalizeDocumentString(raw, {
            dropKeys: scenario.dropKeys,
            keepIds: idsOfLoadedFile(scenario),
          }),
          origin,
        ) + "\n",
        "utf8",
      );
    }
    case "text":
      if (typeof raw !== "string") throw new Error("text scenarios must return a string");
      return Buffer.from(normalizeOrigin(raw, origin), "utf8");
    case "png":
    case "bytes":
      return toBuffer(raw, "base64");
  }
}

/** The origin of the page, or undefined for a page without one (about:blank). */
function pageOrigin(page: Page): string | undefined {
  try {
    const origin = new URL(page.url()).origin;
    return origin === "null" ? undefined : origin;
  } catch {
    return undefined;
  }
}

/** Runs a scenario in an already opened app page. */
export async function runScenario(
  page: Page,
  kind: AppKind,
  scenario: Scenario,
): Promise<StoredOutput> {
  let raw: unknown;
  if (scenario.driver) {
    raw = await scenario.driver({ page, kind }, scenario.args);
  } else if (scenario.inPage) {
    const source = scenario.inPage.toString();
    raw = await page.evaluate(
      async ({ source: fnSource, args }) => {
        // The scenario function arrives as source text; rebuilding it here is
        // the only way to run the same code in both apps.
        const fn = (0, eval)(`(${fnSource})`) as (p: unknown, a: unknown) => unknown;
        const parity = (window as unknown as { __parity: unknown }).__parity;
        const result = await fn(parity, args);
        // Buffers can't cross the bridge; scenarios return data URLs or
        // base64 for binary output.
        return result;
      },
      { source, args: scenario.args as unknown },
    );
  } else {
    throw new Error(`scenario ${scenario.id} has neither inPage nor driver`);
  }
  return storeOutput(scenario, raw, pageOrigin(page));
}

export function expectedPath(scenario: Scenario, variant = ""): string {
  return path.join(EXPECTED_ROOT, `${scenario.id}${variant}${extensionFor(scenario)}`);
}

export function readExpected(scenario: Scenario, variant = ""): StoredOutput | undefined {
  const file = expectedPath(scenario, variant);
  return fs.existsSync(file) ? fs.readFileSync(file) : undefined;
}

export function writeExpected(scenario: Scenario, output: StoredOutput, variant = ""): void {
  const file = expectedPath(scenario, variant);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, output);
}

function writeActual(scenario: Scenario, label: string, output: Buffer): string {
  const file = path.join(OUTPUT_ROOT, `${scenario.id}.${label}${extensionFor(scenario)}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, output);
  return file;
}

/**
 * Throws with a readable report when `actual` differs from `expected` in
 * any way. `label` names the side that produced `actual` ("old", "new").
 */
export function assertSameOutput(
  scenario: Scenario,
  expected: StoredOutput,
  actual: StoredOutput,
  label: string,
): void {
  if (scenario.kind === "png") {
    const result = comparePng(expected, actual);
    if (result.differentPixels === 0) return;
    const actualFile = writeActual(scenario, label, actual);
    let diffFile = "";
    if (result.diffPng) diffFile = writeActual(scenario, `${label}.diff`, result.diffPng);
    throw new Error(
      `${scenario.id}: ${result.differentPixels} pixels differ` +
        (result.sizeMatches ? "" : " (image sizes differ)") +
        `\nactual: ${actualFile}` +
        (diffFile ? `\ndiff:   ${diffFile}` : ""),
    );
  }
  if (expected.equals(actual)) return;
  const actualFile = writeActual(scenario, label, actual);
  let detail: string;
  if (scenario.kind === "json" || scenario.kind === "document") {
    const e = JSON.parse(expected.toString("utf8")) as Json;
    const a = JSON.parse(actual.toString("utf8")) as Json;
    const diffs = diffJson(e, a);
    detail = diffs.length > 0 ? formatJsonDiff(diffs) : "(same values, different formatting)";
  } else if (scenario.kind === "text") {
    detail =
      `expected ${JSON.stringify(expected.toString("utf8").slice(0, 400))}\n` +
      `got      ${JSON.stringify(actual.toString("utf8").slice(0, 400))}`;
  } else {
    detail = `expected ${expected.length} bytes, got ${actual.length} bytes`;
  }
  throw new Error(`${scenario.id}: output differs from expected\n${detail}\nactual: ${actualFile}`);
}

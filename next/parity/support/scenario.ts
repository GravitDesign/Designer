import type { Page } from "@playwright/test";
import type { AppKind, OpenOptions } from "./apps.ts";

/**
 * What a scenario produces, and how its output is stored and compared:
 * - json: any JSON value, stored pretty-printed and compared exactly.
 * - document: a serialized scene (JSON string); random ids are renamed
 *   before storing and comparing (see normalize.ts).
 * - png: a PNG (Buffer, or a data URL string from the page), compared
 *   pixel by pixel with zero tolerance.
 * - text: a string, compared exactly.
 * - bytes: a Buffer (or base64 string from the page), compared exactly.
 */
export type ScenarioKind = "json" | "document" | "png" | "text" | "bytes";

/** What a scenario's in-page function receives as its first argument. */
export interface ParityHandle {
  /** The engine namespace, keyed by the old class names (GRectangle, ...). */
  // The scenario code runs in two different engines through the same names,
  // so it can only be typed loosely here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  G: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app: any;
}

export interface ScenarioContext {
  page: Page;
  kind: AppKind;
}

export interface Scenario<A = unknown> {
  /** Unique path-like id; the expected file is parity/expected/<id>.<ext>. */
  id: string;
  /** Inventory ids this scenario covers. */
  covers: readonly string[];
  kind: ScenarioKind;
  /** How to open the app. Defaults to { newDocument: true }. */
  open?: OpenOptions;
  /**
   * Runs inside the page with window.__parity. It is sent to the page as
   * source text, so it must not use anything from its enclosing module.
   */
  inPage?: (parity: ParityHandle, args: A) => unknown;
  /** Runs in Node and drives the page (pointer, keyboard, screenshots). */
  driver?: (context: ScenarioContext, args: A) => Promise<unknown>;
  args?: A;
  /** Keys dropped from a document before comparing (compared elsewhere). */
  dropKeys?: readonly string[];
  /** Milliseconds; defaults to the Playwright test timeout. */
  timeout?: number;
  /** File extension of the expected file, e.g. ".pdf" for kind "bytes". */
  extension?: string;
}

export function defineScenarios<A>(list: Scenario<A>[]): Scenario<A>[] {
  return list;
}

export function extensionFor(scenario: Pick<Scenario, "kind" | "extension">): string {
  if (scenario.extension) return scenario.extension;
  switch (scenario.kind) {
    case "json":
    case "document":
      return ".json";
    case "png":
      return ".png";
    case "text":
      return ".txt";
    case "bytes":
      return ".bin";
  }
}

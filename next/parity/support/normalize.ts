/**
 * Makes serialized documents from two runs comparable.
 *
 * The old app gives every node a random id (`@id`), every style and paint
 * layer a random hash (`#`, `&`, `_effId`, `_layId` ...), and other nodes
 * refer to those ids by value. Two runs never produce the same random
 * strings, so ids are renamed to `id1`, `id2`, ... in order of first
 * appearance, and every other string equal to a renamed id is replaced the
 * same way. The structure of the references survives, the random values
 * don't.
 *
 * Nothing else is touched: numbers, key order and all other strings must
 * match exactly.
 */

/** Keys whose string values are random ids generated at creation time. */
export const RANDOM_ID_KEYS: ReadonlySet<string> = new Set(["@id", "#", "&", "_effId", "_layId"]);

/** Keys whose value is an array of random ids. */
export const RANDOM_ID_ARRAY_KEYS: ReadonlySet<string> = new Set(["__ids"]);

/**
 * Keys holding the wall-clock time of the save (ms since 1970). The value
 * is replaced with "<time>" when it is a number; any other type is kept so
 * a wrong type still shows up as a difference.
 */
export const TIME_KEYS: ReadonlySet<string> = new Set(["lmd"]);

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

function isObject(value: Json): value is { [key: string]: Json } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function looksLikeJsonDocument(value: string): boolean {
  const first = value.charAt(0);
  const last = value.charAt(value.length - 1);
  return (first === "{" && last === "}") || (first === "[" && last === "]");
}

function tryParse(value: string): Json | undefined {
  try {
    return JSON.parse(value) as Json;
  } catch {
    return undefined;
  }
}

/** Collects random ids in depth-first, key-order sequence. */
function collectIds(value: Json, ids: Map<string, string>): void {
  if (Array.isArray(value)) {
    for (const item of value) collectIds(item, ids);
    return;
  }
  if (isObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      if (RANDOM_ID_KEYS.has(key) && typeof child === "string") {
        if (!ids.has(child)) ids.set(child, `id${ids.size + 1}`);
      } else if (RANDOM_ID_ARRAY_KEYS.has(key) && Array.isArray(child)) {
        for (const item of child) {
          if (typeof item === "string" && !ids.has(item)) ids.set(item, `id${ids.size + 1}`);
        }
      } else if (typeof child === "string" && looksLikeJsonDocument(child)) {
        const nested = tryParse(child);
        if (nested !== undefined) collectIds(nested, ids);
      } else {
        collectIds(child, ids);
      }
    }
  }
}

function rename(value: Json, ids: Map<string, string>): Json {
  if (typeof value === "string") {
    const renamed = ids.get(value);
    if (renamed !== undefined) return renamed;
    if (looksLikeJsonDocument(value)) {
      const nested = tryParse(value);
      if (nested !== undefined && typeof nested === "object" && nested !== null) {
        return JSON.stringify(rename(nested, ids));
      }
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => rename(item, ids));
  if (isObject(value)) {
    const out: { [key: string]: Json } = {};
    for (const [key, child] of Object.entries(value)) {
      out[key] = TIME_KEYS.has(key) && typeof child === "number" ? "<time>" : rename(child, ids);
    }
    return out;
  }
  return value;
}

export interface NormalizeOptions {
  /** Keys removed before comparing, e.g. `_preview`, compared separately. */
  dropKeys?: readonly string[];
}

function dropKeys(value: Json, keys: ReadonlySet<string>): Json {
  if (Array.isArray(value)) return value.map((item) => dropKeys(item, keys));
  if (isObject(value)) {
    const out: { [key: string]: Json } = {};
    for (const [key, child] of Object.entries(value)) {
      if (!keys.has(key)) out[key] = dropKeys(child, keys);
    }
    return out;
  }
  return value;
}

/** Returns the document with random ids renamed in a stable order. */
export function normalizeDocument(doc: Json, options: NormalizeOptions = {}): Json {
  const trimmed = options.dropKeys ? dropKeys(doc, new Set(options.dropKeys)) : doc;
  const ids = new Map<string, string>();
  collectIds(trimmed, ids);
  return rename(trimmed, ids);
}

/** Same as normalizeDocument, for a serialized JSON string. */
export function normalizeDocumentString(json: string, options: NormalizeOptions = {}): string {
  return JSON.stringify(normalizeDocument(JSON.parse(json) as Json, options), null, 1);
}

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
 * Ids that come from a file the scenario loaded are kept as they are
 * (`keepIds`), so an app that regenerates ids on load or save still shows
 * up as a difference.
 *
 * Nothing else is touched: numbers, key order and all other strings must
 * match exactly. JSON nested inside strings has its ids renamed in place,
 * without re-serializing, so its formatting is compared too.
 */

/** Keys whose string values are random ids generated at creation time. */
export const RANDOM_ID_KEYS: ReadonlySet<string> = new Set([
  "@id",
  "#",
  "&",
  "_effId",
  "_layId",
  "uuid",
]);

/** Keys whose value is an array of random ids. */
export const RANDOM_ID_ARRAY_KEYS: ReadonlySet<string> = new Set(["__ids"]);

/**
 * Keys holding the wall-clock time of the save (ms since 1970). The value
 * is replaced with "<time>" when it is a number from the last day (the
 * time the test ran); anything else is kept, so a wrong type or a stale or
 * made-up time still shows up as a difference.
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

/** Strings holding a JSON document after a one-letter type prefix, e.g. "N#{...}". */
const PREFIXED_JSON = /^([A-Za-z])#([[{][\s\S]*)$/;
const DICTIONARY_URL = /^dictionary:\/\/(.+)$/;

/** The JSON text inside a string value, if it holds one. */
function nestedJson(value: string): { prefix: string; json: string } | undefined {
  if (looksLikeJsonDocument(value)) return { prefix: "", json: value };
  const match = PREFIXED_JSON.exec(value);
  const json = match?.[2];
  if (match && json !== undefined && looksLikeJsonDocument(json)) {
    return { prefix: `${match[1] ?? ""}#`, json };
  }
  return undefined;
}

interface IdTable {
  ids: Map<string, string>;
  keep: ReadonlySet<string>;
}

function addId(table: IdTable, id: string): void {
  if (!table.keep.has(id) && !table.ids.has(id)) table.ids.set(id, `id${table.ids.size + 1}`);
}

/** Collects random ids in depth-first, key-order sequence. */
function collectIds(value: Json, table: IdTable): void {
  if (typeof value === "string") {
    const nested = nestedJson(value);
    if (nested) {
      const parsed = tryParse(nested.json);
      if (parsed !== undefined) collectIds(parsed, table);
    }
    return;
  }
  if (Array.isArray(value)) {
    // Compact anchor arrays mark references as [..., "#", id] or [..., "&", id].
    for (let i = 0; i < value.length; i++) {
      const item = value[i] as Json;
      const next = value[i + 1];
      if ((item === "#" || item === "&") && typeof next === "string") {
        addId(table, next);
        i++;
        continue;
      }
      collectIds(item, table);
    }
    return;
  }
  if (isObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      if (RANDOM_ID_KEYS.has(key) && typeof child === "string") {
        addId(table, child);
      } else if (RANDOM_ID_ARRAY_KEYS.has(key) && Array.isArray(child)) {
        for (const item of child) if (typeof item === "string") addId(table, item);
      } else {
        collectIds(child, table);
      }
    }
  }
}

/** Renames ids inside JSON text without re-serializing it. */
function renameInJsonText(text: string, ids: Map<string, string>): string {
  return text.replace(/"((?:[^"\\]|\\.)*)"/g, (token: string, inner: string) => {
    const renamed = ids.get(inner);
    if (renamed !== undefined) return JSON.stringify(renamed);
    // JSON text inside a string inside JSON text (e.g. reftxt -> atPath).
    if (!inner.includes("\\")) return token;
    const value = tryParse(token);
    if (typeof value !== "string") return token;
    const nested = nestedJson(value);
    if (!nested) return token;
    const inside = nested.prefix + renameInJsonText(nested.json, ids);
    return inside === value ? token : JSON.stringify(inside);
  });
}

const DAY_MS = 24 * 60 * 60 * 1000;

function isRecentTime(value: Json): boolean {
  const now = Date.now();
  return typeof value === "number" && value > now - DAY_MS && value <= now + 60_000;
}

function rename(value: Json, ids: Map<string, string>): Json {
  if (typeof value === "string") {
    const renamed = ids.get(value);
    if (renamed !== undefined) return renamed;
    const url = DICTIONARY_URL.exec(value);
    if (url) {
      const id = ids.get(url[1] ?? "");
      return id === undefined ? value : `dictionary://${id}`;
    }
    const nested = nestedJson(value);
    if (nested) return nested.prefix + renameInJsonText(nested.json, ids);
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => rename(item, ids));
  if (isObject(value)) {
    const out: { [key: string]: Json } = {};
    for (const [key, child] of Object.entries(value)) {
      // Maps keyed by reference id (the scene's _links) rename their keys too.
      const name = ids.get(key) ?? key;
      out[name] = TIME_KEYS.has(key) && isRecentTime(child) ? "<time>" : rename(child, ids);
    }
    return out;
  }
  return value;
}

export interface NormalizeOptions {
  /** Keys removed before comparing, e.g. `_preview`, compared separately. */
  dropKeys?: readonly string[];
  /**
   * Ids that must come out unchanged, usually the ids of a file the
   * scenario loaded (see documentIds).
   */
  keepIds?: Iterable<string>;
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

/** Every random id in a document, in first-appearance order. */
export function documentIds(doc: Json): string[] {
  const table: IdTable = { ids: new Map(), keep: new Set() };
  collectIds(doc, table);
  return [...table.ids.keys()];
}

/** Returns the document with random ids renamed in a stable order. */
export function normalizeDocument(doc: Json, options: NormalizeOptions = {}): Json {
  const trimmed = options.dropKeys ? dropKeys(doc, new Set(options.dropKeys)) : doc;
  const table: IdTable = { ids: new Map(), keep: new Set(options.keepIds ?? []) };
  collectIds(trimmed, table);
  return rename(trimmed, table.ids);
}

/** Same as normalizeDocument, for a serialized JSON string. */
export function normalizeDocumentString(json: string, options: NormalizeOptions = {}): string {
  return JSON.stringify(normalizeDocument(JSON.parse(json) as Json, options), null, 1);
}

/** What the page origin of either app becomes in stored output. */
export const ORIGIN_PLACEHOLDER = "<origin>";

/**
 * Replaces the app's own page origin ("http://127.0.0.1:3190" for the old
 * app, the new app's port for the new one) with one placeholder, so
 * addresses the apps build from location.origin (rich tooltip videos, for
 * example) compare equal. Other hosts, ports and schemes stay as they are.
 */
export function normalizeOrigin(text: string, origin: string | undefined): string {
  if (!origin) return text;
  return text.split(origin).join(ORIGIN_PLACEHOLDER);
}

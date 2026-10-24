/**
 * What the first start of the desktop app takes over from the old desktop
 * app's profile, decided from what is on disk.
 *
 * Why this is needed: the old app keeps its data in the page's
 * localStorage and IndexedDB, which Chromium keeps per origin. The
 * released old builds (1.0.0 and 1.0) served the page from a random port
 * (`listen(0)`), so every launch got a new origin
 * (http://127.0.0.1:<port>) and started empty (#6); the old data stays in
 * the profile under all those origins. Builds from the repo since #6 use
 * the fixed port 47823, as the new app does, so their data carries over
 * by itself: the same userData folder ("gravit-designer-local", from
 * package.json "name") and the same origin.
 *
 * So:
 * - localStorage: when the new origin has no "designer.settings" yet,
 *   each kept key (LocalStorageKeys) is taken from the newest old origin
 *   that has it. The newest origin is the old app's last session. Keys of
 *   the dropped licence, cloud and analytics code are left behind.
 * - Imported fonts (IndexedDB gravitFontsDB): every font file from every
 *   old origin that the new origin doesn't have, and the font list
 *   extended by them (newest origin first). Each old session started
 *   without the fonts of the sessions before, so a user may have imported
 *   different fonts in different sessions; all of them come back.
 * - Recent files: none to take over. The old desktop app never recorded
 *   any: its runtime was "browser" (getRuntime never said Electron), so
 *   addToRecentFiles did nothing, and its main process kept no list
 *   (parity electron/app-menu, platform/files/recent-files).
 */
import type { StoredOrigin } from "./chromium-local-storage.ts";
import { LocalStorageKeys } from "../storage/local-storage.ts";

/** The keys taken over, in LocalStorageKeys order. */
export const MIGRATED_LOCAL_STORAGE_KEYS: readonly string[] = Object.values(LocalStorageKeys);

/** The old app's own origins: the embedded server on 127.0.0.1, any port. */
const LOCAL_ORIGIN = /^http:\/\/127\.0\.0\.1:(\d+)$/;

/** An origin with a gravitFontsDB folder in the profile. */
export interface FontDatabaseOrigin {
  origin: string;
  /** The folder's modification time (Unix ms), used when localStorage has no time for it. */
  modified: number;
}

export interface MigrationPlan {
  target: string;
  /** Raw localStorage values to write, key → value (only keys the target lacks). */
  localStorage: Record<string, string>;
  /** Which origin each of those keys came from. */
  localStorageFrom: Record<string, string>;
  /** Old origins whose font databases to read, newest first. */
  fontOrigins: string[];
}

function isLegacy(origin: string, target: string): boolean {
  return origin !== target && LOCAL_ORIGIN.test(origin);
}

/**
 * The plan for `target` (the new app's origin): which localStorage values
 * to write and which old font databases to read.
 */
export function planMigration(
  stored: readonly StoredOrigin[],
  fontDatabases: readonly FontDatabaseOrigin[],
  target: string,
): MigrationPlan {
  const recency = new Map<string, number>();
  for (const o of stored) if (o.lastModified !== null) recency.set(o.origin, o.lastModified);
  for (const f of fontDatabases) {
    if (!recency.has(f.origin)) recency.set(f.origin, f.modified);
  }
  const newestFirst = (a: string, b: string): number =>
    (recency.get(b) ?? -Infinity) - (recency.get(a) ?? -Infinity) || (a < b ? -1 : 1);

  const plan: MigrationPlan = { target, localStorage: {}, localStorageFrom: {}, fontOrigins: [] };
  const own = stored.find((o) => o.origin === target);
  if (!own || own.items["designer.settings"] === undefined) {
    const legacy = stored
      .filter((o) => isLegacy(o.origin, target))
      .sort((a, b) => newestFirst(a.origin, b.origin));
    for (const key of MIGRATED_LOCAL_STORAGE_KEYS) {
      if (own && own.items[key] !== undefined) continue;
      const source = legacy.find((o) => o.items[key] !== undefined);
      if (!source) continue;
      plan.localStorage[key] = source.items[key] as string;
      plan.localStorageFrom[key] = source.origin;
    }
  }
  plan.fontOrigins = fontDatabases
    .map((f) => f.origin)
    .filter((origin) => isLegacy(origin, target))
    .sort(newestFirst);
  return plan;
}

/** "http_127.0.0.1_61805.indexeddb.leveldb" → "http://127.0.0.1:61805" (null for other folders). */
export function originOfIndexedDbFolder(name: string): string | null {
  const match = /^http_127\.0\.0\.1_(\d+)\.indexeddb\.leveldb$/.exec(name);
  return match ? `http://127.0.0.1:${match[1]}` : null;
}

/** A stored IndexedDB value, in a form that survives JSON. */
export type EncodedValue =
  | { kind: "json"; json: unknown }
  | { kind: "binary"; type: "ArrayBuffer" | "Uint8Array" | "Blob"; mime?: string; base64: string };

/** The gravitFontsDB entries of one origin (null when it has no such database). */
export interface FontDump {
  origin: string;
  entries: { key: string; value: EncodedValue }[];
}

/** One entry of the font list ("_gravit_font_list_"). */
interface FontListItem {
  family?: unknown;
  weight?: unknown;
  style?: unknown;
}

export const FONT_LIST_KEY = "_gravit_font_list_";
/** The cached system font list keys: per machine and rebuilt by the app, so never copied. */
const NATIVE_FONT_KEYS = /^_gravit_native_font_list/;

function fontKey(item: FontListItem): string {
  return `${String(item.family)}_${String(item.weight)}_${String(item.style)}`;
}

function listOf(dump: FontDump | null): FontListItem[] {
  const entry = dump?.entries.find((e) => e.key === FONT_LIST_KEY);
  if (!entry || entry.value.kind !== "json" || !Array.isArray(entry.value.json)) return [];
  return entry.value.json as FontListItem[];
}

/** What to write into the target's gravitFontsDB. */
export interface FontWrites {
  /** Font files to add, in order. */
  put: { key: string; value: EncodedValue }[];
  /** The new font list, or null when it stays as it is. */
  list: unknown[] | null;
  /** The font keys added (for the log). */
  added: string[];
}

/**
 * Merges old font databases (newest first) into the target's: font files
 * the target lacks are added, and their list entries appended to the
 * target's list in source order. A list entry whose file is in neither
 * database is left out (the old app would list a font it can't load).
 */
export function mergeFonts(target: FontDump | null, sources: readonly FontDump[]): FontWrites {
  const have = new Set((target?.entries ?? []).map((e) => e.key));
  const put: { key: string; value: EncodedValue }[] = [];
  for (const source of sources) {
    for (const entry of source.entries) {
      if (entry.key === FONT_LIST_KEY || NATIVE_FONT_KEYS.test(entry.key)) continue;
      if (have.has(entry.key)) continue;
      have.add(entry.key);
      put.push(entry);
    }
  }
  const list: unknown[] = [...listOf(target)];
  const listed = new Set(listOf(target).map(fontKey));
  for (const source of sources) {
    for (const item of listOf(source)) {
      const key = fontKey(item);
      if (listed.has(key) || !have.has(key)) continue;
      listed.add(key);
      list.push(item);
    }
  }
  const changed = list.length !== listOf(target).length;
  return { put, list: changed ? list : null, added: put.map((p) => p.key) };
}

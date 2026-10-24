/**
 * First start after the old desktop app: takes over what its released
 * builds left in the profile under their random-port origins (see
 * src/app/migration/plan.ts for what and why). Runs once per profile,
 * before the main window opens; the marker file records that it ran and
 * what it did.
 *
 * localStorage is read straight from the profile's LevelDB files. The
 * font databases are read and everything is written by Chromium itself,
 * in a hidden window that visits each origin. While it runs, every http
 * request of the session is answered with a blank page (protocol.handle),
 * so visiting http://127.0.0.1:<old port> needs no server there and the
 * visit to the app's own origin doesn't start the app.
 */
import fs from "node:fs";
import path from "node:path";
import { BrowserWindow, session } from "electron";
import {
  decodeLocalStorage,
  type StoredOrigin,
} from "../src/app/migration/chromium-local-storage.ts";
import { readLevelDb } from "../src/app/migration/leveldb.ts";
import {
  applyMigration,
  dumpFontDatabase,
  type MigrationApplied,
  type MigrationPayload,
} from "../src/app/migration/page-scripts.ts";
import {
  mergeFonts,
  originOfIndexedDbFolder,
  planMigration,
  type FontDatabaseOrigin,
  type FontDump,
} from "../src/app/migration/plan.ts";

export const MIGRATION_MARKER = "gravit-migration.json";
const MIGRATION_VERSION = 1;
/** Any path works: every request gets the blank page while the migration runs. */
const BLANK_PATH = "/__gravit-migration__";
const STEP_TIMEOUT_MS = 15_000;

export interface MigrationReport {
  version: number;
  date: string;
  /** localStorage keys written, with the origin each came from. */
  localStorage: Record<string, string>;
  /** Font keys added to gravitFontsDB. */
  fonts: string[];
  /** Old origins found in the profile. */
  origins: string[];
  errors: string[];
}

/** The localStorage origins of a profile, read from its LevelDB files. */
export function readProfileLocalStorage(userData: string): StoredOrigin[] {
  const dir = path.join(userData, "Local Storage", "leveldb");
  if (!fs.existsSync(dir)) return [];
  const files = fs
    .readdirSync(dir)
    .filter((name) => /\.(log|ldb|sst)$/i.test(name))
    .map((name) => ({ name, bytes: new Uint8Array(fs.readFileSync(path.join(dir, name))) }));
  return decodeLocalStorage(readLevelDb(files));
}

/** The origins with an IndexedDB folder in the profile (any database). */
export function readProfileIndexedDbOrigins(userData: string): FontDatabaseOrigin[] {
  const dir = path.join(userData, "IndexedDB");
  if (!fs.existsSync(dir)) return [];
  const out: FontDatabaseOrigin[] = [];
  for (const name of fs.readdirSync(dir)) {
    const origin = originOfIndexedDbFolder(name);
    if (origin) out.push({ origin, modified: fs.statSync(path.join(dir, name)).mtimeMs });
  }
  return out;
}

function withTimeout<T>(promise: Promise<T>, what: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${what} timed out`)), STEP_TIMEOUT_MS);
    }),
  ]).finally(() => clearTimeout(timer));
}

/** Calls a self-contained page function in `win` with JSON arguments. */
async function runInPage<T>(
  win: BrowserWindow,
  fn: (...args: never[]) => Promise<T>,
  ...args: unknown[]
): Promise<T> {
  const call = `(${fn.toString()})(${args.map((a) => JSON.stringify(a)).join(",")})`;
  return (await win.webContents.executeJavaScript(call, true)) as T;
}

/**
 * Runs the migration unless the marker says it ran. `target` is the app's
 * origin (http://127.0.0.1:47823). Never throws: failures are recorded in
 * the marker and logged, and the app starts as usual.
 */
export async function migrateLegacyProfile(
  userData: string,
  target: string,
): Promise<MigrationReport | null> {
  const marker = path.join(userData, MIGRATION_MARKER);
  if (fs.existsSync(marker)) return null;
  const report: MigrationReport = {
    version: MIGRATION_VERSION,
    date: new Date().toISOString(),
    localStorage: {},
    fonts: [],
    origins: [],
    errors: [],
  };
  try {
    const stored = readProfileLocalStorage(userData);
    const fontDatabases = readProfileIndexedDbOrigins(userData);
    const plan = planMigration(stored, fontDatabases, target);
    report.origins = [
      ...new Set([...stored.map((o) => o.origin), ...fontDatabases.map((f) => f.origin)]),
    ]
      .filter((o) => o !== target)
      .sort();
    if (Object.keys(plan.localStorage).length > 0 || plan.fontOrigins.length > 0) {
      await runMigration(plan.localStorage, plan.fontOrigins, target, report);
      for (const key of Object.keys(report.localStorage)) {
        report.localStorage[key] = plan.localStorageFrom[key] ?? "";
      }
    }
  } catch (error) {
    report.errors.push(String(error instanceof Error ? error.message : error));
  }
  try {
    fs.writeFileSync(marker, JSON.stringify(report, null, 2) + "\n");
  } catch (error) {
    console.error("migration: cannot write the marker", error);
  }
  if (report.errors.length > 0) console.error("migration:", report.errors.join("; "));
  return report;
}

async function runMigration(
  localStorage: Record<string, string>,
  fontOrigins: readonly string[],
  target: string,
  report: MigrationReport,
): Promise<void> {
  const ses = session.defaultSession;
  ses.protocol.handle(
    "http",
    () =>
      new Response("<!doctype html><title>Gravit Designer</title>", {
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
  );
  const win = new BrowserWindow({
    show: false,
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
  });
  try {
    const sources: FontDump[] = [];
    for (const origin of fontOrigins) {
      try {
        await withTimeout(win.loadURL(origin + BLANK_PATH), `loading ${origin}`);
        const dump = await withTimeout(
          runInPage(win, dumpFontDatabase),
          `reading fonts of ${origin}`,
        );
        if (dump) sources.push(dump);
      } catch (error) {
        report.errors.push(String(error instanceof Error ? error.message : error));
      }
    }
    await withTimeout(win.loadURL(target + BLANK_PATH), `loading ${target}`);
    const own = await withTimeout(runInPage(win, dumpFontDatabase), "reading the app's fonts");
    const fonts = mergeFonts(own, sources);
    const payload: MigrationPayload = {
      localStorage,
      fonts: fonts.put,
      fontList: fonts.list,
    };
    const applied = await withTimeout(
      runInPage<MigrationApplied>(win, applyMigration, payload),
      "writing the app's storage",
    );
    for (const key of applied.localStorage) report.localStorage[key] = "";
    report.fonts = applied.fonts;
    // localStorage is written to disk lazily; make sure it is before the
    // app's own window reads it from another renderer.
    ses.flushStorageData();
  } finally {
    win.destroy();
    ses.protocol.unhandle("http");
  }
}

// Shared driver code for the platform scenarios: HTTP responses, browser
// storage snapshots, menus, downloads and the gvthumb test tool.
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { APIResponse, Page } from "@playwright/test";
import { appUrl, openApp, type AppKind, type OpenOptions } from "../../support/apps.ts";
import { LEGACY_ROOT, NEXT_ROOT } from "../../support/env.ts";
import { normalizeDocument, type Json } from "../../support/normalize.ts";

/** Base URL of the app under test, without the trailing slash. */
export function base(kind: AppKind): string {
  return appUrl(kind).replace(/\/$/, "");
}

/**
 * Replaces the app's own origin (which differs between the two apps: they
 * run on different ports) with "<origin>" everywhere in a string.
 */
export function stripOrigin(kind: AppKind, value: string): string {
  const origin = base(kind);
  const host = origin.replace(/^https?:\/\//, "");
  return value.split(origin).join("<origin>").split(host).join("<host>");
}

export function sha256(data: Buffer | string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

/** Response headers that are part of the contract (others vary per run). */
const CONTRACT_HEADERS = ["content-type", "cache-control", "location"] as const;

export interface RecordOptions {
  method?: "GET" | "HEAD" | "POST" | "PUT";
  /** JSON body for POST/PUT. */
  data?: unknown;
  /**
   * How the body is recorded: "text" as is, "json" parsed, "hash" as
   * length + sha256 (large static files), "none" not at all (bundles,
   * whose content is the app itself).
   */
  body?: "text" | "json" | "hash" | "none";
  /** Extra headers to record besides content-type, cache-control, location. */
  headers?: readonly string[];
}

/** What one HTTP request returned, in a comparable form. */
export async function recordResponse(
  page: Page,
  kind: AppKind,
  urlPath: string,
  options: RecordOptions = {},
): Promise<Record<string, unknown>> {
  const method = options.method ?? "GET";
  const response: APIResponse = await page.request.fetch(base(kind) + urlPath, {
    method,
    maxRedirects: 0,
    ...(options.data !== undefined ? { data: options.data as object } : {}),
  });
  const headers = response.headers();
  const out: Record<string, unknown> = {
    request: `${method} ${urlPath}`,
    status: response.status(),
  };
  for (const name of [...CONTRACT_HEADERS, ...(options.headers ?? [])]) {
    const value = headers[name];
    if (value !== undefined) out[name] = stripOrigin(kind, value);
  }
  const mode = options.body ?? "text";
  if (method === "HEAD" || mode === "none") return out;
  const body = await response.body();
  if (mode === "hash") {
    out.length = body.length;
    out.sha256 = sha256(body);
  } else if (mode === "json") {
    out.body = JSON.parse(body.toString("utf8")) as unknown;
  } else {
    out.body = stripOrigin(kind, body.toString("utf8"));
  }
  return out;
}

/** Copy of a JSON value with object keys sorted, for order-free storage values. */
export function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

/** Parses a localStorage value the way gContainer.getProperty does (JSON). */
export function parseStored(raw: string | null): unknown {
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return { unparsedRaw: raw };
  }
}

/** All localStorage entries as raw strings. */
export async function localStorageEntries(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() => {
    const out: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key !== null) out[key] = localStorage.getItem(key) ?? "";
    }
    return out;
  });
}

/**
 * localStorage keys the old app keeps for the license, update check and
 * offline login. They are rewritten on their own schedule and recorded in
 * dropped.spec.ts, so storage diffs leave them out.
 */
export const LICENSE_KEYS: ReadonlySet<string> = new Set([
  "offline_cache",
  "last_update_check",
  "old_version",
  "enabled_subscriptions",
]);

/**
 * What changed in localStorage between two snapshots. "designer.settings"
 * is compared setting by setting ({ setting: { from, to } }); every other
 * key as its parsed value. Values are parsed JSON, the way the app reads
 * them back (gContainer.getProperty).
 */
export function storageDiff(
  before: Record<string, string>,
  after: Record<string, string>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
  for (const key of keys) {
    if (LICENSE_KEYS.has(key)) continue;
    const a = before[key] ?? null;
    const b = after[key] ?? null;
    if (a === b) continue;
    if (key === "designer.settings") {
      const from = (parseStored(a) ?? {}) as Record<string, unknown>;
      const to = (parseStored(b) ?? {}) as Record<string, unknown>;
      const changed: Record<string, unknown> = {};
      for (const s of [...new Set([...Object.keys(from), ...Object.keys(to)])].sort()) {
        if (JSON.stringify(from[s]) !== JSON.stringify(to[s])) {
          changed[s] = { from: from[s] ?? "(absent)", to: to[s] ?? "(absent)" };
        }
      }
      out[key] = changed;
    } else {
      out[key] = {
        from: a === null ? "(absent)" : parseStored(a),
        to: b === null ? "(absent)" : parseStored(b),
      };
    }
  }
  return out;
}

/** Waits until the old app wrote its startup settings (up to 15 s), so later diffs start clean. */
export async function waitForStartupWrites(page: Page): Promise<void> {
  await page
    .waitForFunction(() => localStorage.getItem("designer.settings") !== null, null, {
      timeout: 15_000,
    })
    .catch(() => undefined);
  await page.waitForTimeout(300);
}

/** localStorage "designer.settings" parsed, keys sorted (null when absent). */
export async function storedSettings(page: Page): Promise<unknown> {
  const raw = await page.evaluate(() => localStorage.getItem("designer.settings"));
  return sortKeys(parseStored(raw));
}

/** Names of the IndexedDB databases with their stores and keys. */
export async function indexedDbSummary(page: Page): Promise<unknown> {
  return page.evaluate(async () => {
    const out: { name: string; version: number; stores: { name: string; keys: string[] }[] }[] = [];
    const list = await indexedDB.databases();
    for (const info of list.sort((a, b) => String(a.name).localeCompare(String(b.name)))) {
      if (!info.name) continue;
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(info.name as string);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("open failed"));
      });
      const stores: { name: string; keys: string[] }[] = [];
      for (const name of [...db.objectStoreNames].sort()) {
        const keys = await new Promise<string[]>((resolve) => {
          const request = db.transaction(name, "readonly").objectStore(name).getAllKeys();
          request.onsuccess = () => resolve(request.result.map(String).sort());
          request.onerror = () => resolve([]);
        });
        stores.push({ name, keys });
      }
      db.close();
      out.push({ name: info.name, version: db.version, stores });
    }
    return out;
  });
}

/** Waits for fonts and two painted frames, then a short quiet period. */
export async function settle(page: Page, ms = 200): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  });
  await page.waitForTimeout(ms);
}

/** Clicks a main-menu path such as ["Edit", "Settings..."] with the mouse. */
export async function clickMenu(page: Page, items: readonly string[]): Promise<void> {
  const [top, ...rest] = items;
  if (!top) throw new Error("empty menu path");
  await page.locator(`nav.g-menu-bar >> text="${top}"`).first().click();
  await page.waitForTimeout(300);
  for (let d = 0; d < rest.length; d++) {
    const caption = rest[d] as string;
    const item = page
      .locator("ul.g-menu:not(.g-menu-root) > li.g-menu-item:visible", {
        has: page.locator(`:scope > .g-menu-item-caption:text-is("${caption}")`),
      })
      .last();
    if (d < rest.length - 1) {
      await item.hover();
      await page.waitForTimeout(350);
    } else {
      await item.click();
    }
  }
}

/** Opens Edit > Settings... and waits for the dialog. */
export async function openSettingsDialog(page: Page): Promise<void> {
  await clickMenu(page, ["Edit", "Settings..."]);
  await page.locator(".g-settings-dialog").waitFor();
}

/** Clicks "Save Changes" in the settings dialog and waits for it to close. */
export async function saveSettingsDialog(page: Page): Promise<void> {
  await page.locator('.g-settings-dialog button:text-is("Save Changes")').click();
  await page.locator(".g-settings-dialog").waitFor({ state: "detached" });
}

/** The app stylesheet that decides the theme, as a path. */
export async function themeStylesheet(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')]
      .map((l) => new URL(l.href).pathname)
      .filter((p) => /designer\.browser\.(light|dark)\.css$/.test(p)),
  );
}

/** Reloads the app (same context, same storage) and waits until it is usable. */
export async function reopen(page: Page, kind: AppKind, options: OpenOptions = {}): Promise<void> {
  await openApp(page, kind, options);
}

/** Inserts a rectangle and an ellipse through the engine API and clears the selection. */
export async function drawSample(page: Page): Promise<void> {
  await page.evaluate(() => {
    const { G, app } = (window as unknown as { __parity: ParityLike }).__parity;
    interface ParityLike {
      // The engine is only loosely typed from Node.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      G: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      app: any;
    }
    const r = new G.GRectangle();
    r.setProperty("trf", new G.GTransform(100, 0, 0, 60, 200, 160));
    const e = new G.GEllipse();
    e.setProperty("trf", new G.GTransform(75, 0, 0, 75, 475, 175));
    app.editor().insertElements([r, e]);
    app.editor().clearSelection();
  });
  await settle(page);
}

/**
 * Saves the active document through File > Download File (the fallback
 * the app uses without the File System Access API) and returns the bytes.
 */
export async function downloadDocument(page: Page): Promise<{ name: string; bytes: Buffer }> {
  const download = page.waitForEvent("download");
  await clickMenu(page, ["File", "Download File"]);
  const d = await download;
  const file = await d.path();
  return { name: d.suggestedFilename(), bytes: fs.readFileSync(file) };
}

/** Normalizes the random ids inside a serialized node string. */
export function normalizeNodeString(json: string): unknown {
  return normalizeDocument(JSON.parse(json) as Json);
}

/** A TrueType font from the old app's assets, used for the font import. */
export const SAMPLE_FONT = path.join(
  LEGACY_ROOT,
  "public",
  "assets",
  "font",
  "noto",
  "NotoSansAdlam-Regular.ttf",
);

/** A writable temp folder for files a driver hands to the page or a tool. */
export function tempDir(label: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `gd-platform-${label}-`));
}

// ---------------------------------------------------------------------------
// gvthumb
// ---------------------------------------------------------------------------

const GVTHUMB_DIR = path.join(NEXT_ROOT, "parity", "tools", "gvthumb");
const GVTHUMB_DLL = path.join(GVTHUMB_DIR, "build", "Release", "GravitThumbnail.dll");

export interface ThumbnailResult {
  /** HRESULTs of each COM step and the bitmap size, as gvthumb.ps1 prints them. */
  result: Record<string, unknown>;
  /** The thumbnail as PNG, when GetThumbnail succeeded. */
  png: Buffer | null;
}

function powershell(args: string[]): { status: number | null; stdout: string; stderr: string } {
  const r = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-STA", "-ExecutionPolicy", "Bypass", ...args],
    { encoding: "utf8", timeout: 600_000 },
  );
  if (r.error) throw r.error;
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

/** Builds GravitThumbnail.dll from native/gvthumb once, if it is missing. */
function ensureGvthumbDll(): string {
  if (process.env.GD_GVTHUMB_DLL) return process.env.GD_GVTHUMB_DLL;
  if (!fs.existsSync(GVTHUMB_DLL)) {
    const r = powershell(["-File", path.join(GVTHUMB_DIR, "build.ps1")]);
    if (r.status !== 0 || !fs.existsSync(GVTHUMB_DLL)) {
      throw new Error(`building GravitThumbnail.dll failed:\n${r.stdout}\n${r.stderr}`);
    }
  }
  return GVTHUMB_DLL;
}

/** Asks the gvthumb DLL for a thumbnail of `bytes` (a .gvdesign file's content). */
export function gvthumb(bytes: Buffer, size = 256): ThumbnailResult {
  if (process.platform !== "win32") throw new Error("gvthumb needs Windows");
  const dll = ensureGvthumbDll();
  const dir = tempDir("gvthumb");
  const file = path.join(dir, "input.gvdesign");
  const out = path.join(dir, "thumb.png");
  fs.writeFileSync(file, bytes);
  const r = powershell([
    "-File",
    path.join(GVTHUMB_DIR, "gvthumb.ps1"),
    "-Dll",
    dll,
    "-File",
    file,
    "-Out",
    out,
    "-Size",
    String(size),
  ]);
  if (r.status !== 0) throw new Error(`gvthumb.ps1 failed:\n${r.stdout}\n${r.stderr}`);
  const line = r.stdout.trim().split(/\r?\n/).pop() ?? "";
  const result = JSON.parse(line) as Record<string, unknown>;
  const png = fs.existsSync(out) ? fs.readFileSync(out) : null;
  fs.rmSync(dir, { recursive: true, force: true });
  return { result, png };
}

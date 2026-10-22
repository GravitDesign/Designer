// Shared driver code for the platform scenarios: HTTP responses, browser
// storage snapshots, menus, downloads and the gvthumb test tool.
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import type { APIResponse, Page } from "@playwright/test";
import { appUrl, openApp, type AppKind, type OpenOptions } from "../../support/apps.ts";
import { LEGACY_ROOT, NEXT_ROOT } from "../../support/env.ts";
import { normalizeDocument, type Json } from "../../support/normalize.ts";
import type { DocState } from "./contract.ts";

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

/**
 * Waits until the app has written its startup settings and they stopped
 * changing (the old app writes the merged object once its startup checks
 * ran), so later diffs start clean.
 */
export async function waitForStartupWrites(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const w = window as unknown as { __startupSettings?: { value: string; since: number } };
      const value = localStorage.getItem("designer.settings");
      // The app's own write holds the merged defaults (theme among them);
      // settings a test seeded before load may not.
      if (value === null || !value.includes('"theme"')) return false;
      if (w.__startupSettings?.value !== value) {
        w.__startupSettings = { value, since: performance.now() };
        return false;
      }
      return performance.now() - w.__startupSettings.since > 500;
    },
    null,
    { timeout: 30_000, polling: 100 },
  );
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

/** Waits for every stylesheet (a theme switch swaps one), fonts and two painted frames. */
export async function settle(page: Page): Promise<void> {
  await page.waitForFunction(() =>
    [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].every(
      (l) => l.sheet !== null,
    ),
  );
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  });
}

/** Waits until the active document is drawn and nothing is left to load (corpus hook). */
export async function settleDocument(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const { app } = (
      window as unknown as { __parity: { app: { corpus: { settle(): Promise<void> } } } }
    ).__parity;
    await app.corpus.settle();
  });
}

/** The open documents (PlatformHooks.documents). */
export async function documents(page: Page): Promise<DocState> {
  return page.evaluate(() =>
    (
      window as unknown as { __parity: { app: { platform: { documents(): DocState } } } }
    ).__parity.app.platform.documents(),
  );
}

/** Waits until the document titled `title` is active and has finished loading (corpus hook). */
export async function waitForOpened(page: Page, title: string): Promise<void> {
  await page.evaluate(async (t) => {
    const { app } = (
      window as unknown as {
        __parity: { app: { corpus: { waitForDocument(title: string): Promise<void> } } };
      }
    ).__parity;
    await app.corpus.waitForDocument(t);
  }, title);
}

/** Waits until at least `count` documents are open. */
export async function waitForDocumentCount(page: Page, count: number): Promise<void> {
  await page.waitForFunction(
    (n) =>
      (
        window as unknown as {
          __parity: { app: { platform: { documents(): { titles: string[] } } } };
        }
      ).__parity.app.platform.documents().titles.length >= n,
    count,
    { timeout: 30_000 },
  );
}

/** Visible dialogs (.g-dialog) with their class and text lines. */
export async function visibleDialogs(page: Page): Promise<{ className: string; text: string[] }[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>(".g-dialog")]
      .filter((d) => d.offsetParent !== null)
      .map((d) => ({
        className: d.className,
        text: d.innerText.split(/\s*\n\s*/).filter(Boolean),
      })),
  );
}

const SUBMENUS = "ul.g-menu:not(.g-menu-root):visible";

/** Waits until exactly `count` submenus are open. */
async function waitForMenus(page: Page, count: number): Promise<void> {
  await page.waitForFunction(
    (n) =>
      [...document.querySelectorAll("ul.g-menu:not(.g-menu-root)")].filter((m) => {
        const r = m.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(m).visibility !== "hidden";
      }).length === n,
    count,
  );
}

function menuItem(page: Page, depth: number, caption: string) {
  return page
    .locator(SUBMENUS)
    .nth(depth)
    .locator(":scope > li.g-menu-item", {
      has: page.locator(`:scope > .g-menu-item-caption:text-is("${caption}")`),
    })
    .first();
}

/**
 * Opens a main menu and hovers down a path of submenu captions, waiting
 * for each submenu to open (["File", "Open Recent"] leaves both open).
 */
export async function openMenu(page: Page, items: readonly string[]): Promise<void> {
  const [top, ...rest] = items;
  if (!top) throw new Error("empty menu path");
  await page
    .locator("nav.g-menu-bar ul.g-menu-root > li.g-menu-item", {
      has: page.locator(`:scope > .g-menu-item-caption:text-is("${top}")`),
    })
    .click();
  await waitForMenus(page, 1);
  for (let depth = 0; depth < rest.length; depth++) {
    const item = menuItem(page, depth, rest[depth] as string);
    await item.hover();
    if (await item.evaluate((li) => li.classList.contains("g-menu-item-menu"))) {
      await waitForMenus(page, depth + 2);
    }
  }
}

/** Clicks a main-menu path such as ["Edit", "Settings..."] and waits until the menus closed. */
export async function clickMenu(page: Page, items: readonly string[]): Promise<void> {
  const parents = items.slice(0, -1);
  const last = items[items.length - 1];
  if (!last) throw new Error("empty menu path");
  if (parents.length === 0) throw new Error("clickMenu needs a menu item, not only a menu");
  await openMenu(page, parents);
  await menuItem(page, parents.length - 1, last).click();
  await waitForMenus(page, 0);
}

/** Captions, disabled and checked flags of the deepest open submenu. */
export async function openMenuItems(
  page: Page,
): Promise<{ caption: string | null; disabled: boolean; checked: boolean }[]> {
  return page.evaluate(() => {
    const menus = [...document.querySelectorAll<HTMLElement>("ul.g-menu:not(.g-menu-root)")].filter(
      (m) => m.offsetParent !== null,
    );
    const last = menus[menus.length - 1];
    return last
      ? [...last.querySelectorAll<HTMLElement>(":scope > li.g-menu-item")].map((li) => ({
          caption: li.querySelector(":scope > .g-menu-item-caption")?.textContent ?? null,
          disabled: li.classList.contains("g-disabled"),
          checked: li.classList.contains("g-menu-item-checked"),
        }))
      : [];
  });
}

/** The items of a (sub)menu as the user sees them, e.g. ["View", "Canvas"]; closes it again. */
export async function menuState(
  page: Page,
  items: readonly string[],
): Promise<{ caption: string | null; disabled: boolean; checked: boolean }[]> {
  await openMenu(page, items);
  const state = (await openMenuItems(page)).filter((i) => i.caption !== null);
  await closeMenus(page);
  return state;
}

/** Closes open menus with Escape and waits until they are gone. */
export async function closeMenus(page: Page): Promise<void> {
  await page.keyboard.press("Escape");
  await waitForMenus(page, 0);
}

/** Opens Edit > Settings... and waits for the dialog. */
export async function openSettingsDialog(page: Page): Promise<void> {
  await clickMenu(page, ["Edit", "Settings..."]);
  await page.locator(".g-settings-dialog").waitFor();
}

/**
 * What Edit > Settings... shows: every switch, text field and select by its
 * data-setting, and the theme selector's caption. Closes it with Cancel.
 */
export async function settingsDialogState(page: Page): Promise<Record<string, unknown>> {
  await openSettingsDialog(page);
  const state = await page.evaluate(() => {
    const out: Record<string, unknown> = {};
    const dialog = document.querySelector(".g-settings-dialog");
    for (const e of dialog?.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
      "[data-setting]",
    ) ?? []) {
      const key = e.getAttribute("data-setting") ?? "?";
      out[key] = e instanceof HTMLInputElement && e.type === "checkbox" ? e.checked : e.value;
    }
    out.themeSelector =
      dialog?.querySelector<HTMLElement>(".g-theme-selector")?.innerText.trim() ?? null;
    return out;
  });
  await page.locator('.g-settings-dialog button:text-is("Cancel")').click();
  await page.locator(".g-settings-dialog").waitFor({ state: "detached" });
  return state;
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

/**
 * A saved .gvdesign in comparable form: the gzip header bytes, the
 * gunzipped scene with random ids renamed (normalize.ts), and its preview
 * image decoded in the page (size and a hash of the decoded pixels, so a
 * different preview render or JPEG quality shows up). `savedAfter` is the
 * time the save started: the save time stamp `lmd` must lie between it and
 * now; normalize.ts then replaces it with "<time>".
 */
export async function savedDocument(
  page: Page,
  bytes: Buffer,
  savedAfter: number,
): Promise<Record<string, unknown>> {
  const scene = JSON.parse(zlib.gunzipSync(bytes).toString("utf8")) as Record<string, Json>;
  const preview = scene._preview;
  let previewInfo: unknown = null;
  if (typeof preview === "string") {
    previewInfo = await page.evaluate(async (url) => {
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
      ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const digest = await crypto.subtle.digest("SHA-256", pixels);
      return {
        mime: /^data:([^;,]+)/.exec(url)?.[1] ?? null,
        width: canvas.width,
        height: canvas.height,
        pixelsSha256: [...new Uint8Array(digest)]
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(""),
      };
    }, preview);
  }
  const lmd = scene.lmd;
  const lmdInRun = typeof lmd === "number" && lmd >= savedAfter && lmd <= Date.now();
  const withoutPreview = { ...scene, _preview: "<preview, see previewImage>" };
  return {
    gzipHeader: bytes.subarray(0, 10).toString("hex"),
    lmdInRun,
    previewImage: previewInfo,
    document: normalizeDocument(withoutPreview as Json),
  };
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

/**
 * A font for the migration scenarios that the app doesn't ship: the old
 * app's OpenSans-ExtraBold.ttf with "Open Sans" renamed to "Mig Fonts" in
 * its name table (same length, so nothing else moves). The app lists it as
 * family "Mig Fonts Extrabold"; an unknown family falls back to Open Sans
 * Regular, which looks different. Written to a temp file on first use.
 */
export const MIGRATION_FONT_FAMILY = "Mig Fonts Extrabold";
let migrationFont: { file: string; bytes: Buffer } | undefined;
export function migrationFontFile(): { file: string; bytes: Buffer } {
  if (migrationFont) return migrationFont;
  const bytes = Buffer.from(
    fs.readFileSync(path.join(LEGACY_ROOT, "public", "assets", "font", "OpenSans-ExtraBold.ttf")),
  );
  const tables = bytes.readUInt16BE(4);
  for (let i = 0; i < tables; i++) {
    const entry = 12 + i * 16;
    if (bytes.toString("latin1", entry, entry + 4) !== "name") continue;
    const start = bytes.readUInt32BE(entry + 8);
    const end = start + bytes.readUInt32BE(entry + 12);
    const pairs: [Buffer, Buffer][] = [
      [Buffer.from("Open Sans", "latin1"), Buffer.from("Mig Fonts", "latin1")],
      [Buffer.from("Open Sans", "utf16le").swap16(), Buffer.from("Mig Fonts", "utf16le").swap16()],
    ];
    for (const [from, to] of pairs) {
      for (
        let at = bytes.indexOf(from, start);
        at >= 0 && at < end;
        at = bytes.indexOf(from, at + 1)
      ) {
        to.copy(bytes, at);
      }
    }
  }
  const file = path.join(tempDir("font"), "MigFonts-ExtraBold.ttf");
  fs.writeFileSync(file, bytes);
  migrationFont = { file, bytes };
  return migrationFont;
}

/** A writable temp folder for files a driver hands to the page or a tool. */
export function tempDir(label: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `gd-platform-${label}-`));
}

// ---------------------------------------------------------------------------
// File System Access API stand-in
// ---------------------------------------------------------------------------

/**
 * Installs stand-ins for showSaveFilePicker / showOpenFilePicker (before the
 * next load) that log every call (options, permission requests, writes) to
 * window.__fsaLog and keep the written bytes in window.__fsaWritten (base64,
 * one entry per write). Files to open are read from window.__fsaOpen as
 * base64.
 */
export async function installFsaStub(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as {
      __fsaLog: unknown[];
      __fsaWritten: string[];
      __fsaOpen: { name: string; base64: string }[];
      showSaveFilePicker: unknown;
      showOpenFilePicker: unknown;
    };
    w.__fsaLog = [];
    w.__fsaWritten = [];
    w.__fsaOpen = [];
    const log = (entry: unknown) => w.__fsaLog.push(JSON.parse(JSON.stringify(entry)) as unknown);
    const describe = async (data: unknown): Promise<unknown> => {
      const blob = data instanceof Blob ? data : new Blob([data as BlobPart]);
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = "";
      for (const b of bytes) binary += String.fromCharCode(b);
      w.__fsaWritten.push(btoa(binary));
      return {
        kind: data instanceof Blob ? "Blob" : Object.prototype.toString.call(data),
        type: data instanceof Blob ? data.type : null,
        // The bytes themselves are compared through savedDocument().
        write: w.__fsaWritten.length - 1,
      };
    };
    const handle = (name: string, file: File | null) => ({
      kind: "file",
      name,
      getFile: async () => {
        log({ call: "getFile", name });
        return file ?? new File([], name);
      },
      queryPermission: async (o: unknown) => {
        log({ call: "queryPermission", name, options: o ?? null });
        return "granted";
      },
      requestPermission: async (o: unknown) => {
        log({ call: "requestPermission", name, options: o ?? null });
        return "granted";
      },
      createWritable: async (o: unknown) => {
        log({ call: "createWritable", name, options: o ?? null });
        return {
          truncate: async (n: number) => log({ call: "truncate", name, size: n }),
          seek: async (n: number) => log({ call: "seek", name, position: n }),
          write: async (d: unknown) => log({ call: "write", name, data: await describe(d) }),
          close: async () => log({ call: "close", name }),
        };
      },
      isSameEntry: async () => false,
    });
    w.showSaveFilePicker = async (options: unknown) => {
      log({ call: "showSaveFilePicker", options: options ?? null });
      const suggested =
        (options as { suggestedName?: string } | undefined)?.suggestedName ?? "file";
      return handle(suggested, null);
    };
    w.showOpenFilePicker = async (options: unknown) => {
      log({ call: "showOpenFilePicker", options: options ?? null });
      return w.__fsaOpen.map((f) =>
        handle(f.name, new File([Uint8Array.from(atob(f.base64), (c) => c.charCodeAt(0))], f.name)),
      );
    };
  });
}

export async function fsaLog(page: Page): Promise<unknown[]> {
  return page.evaluate(() => (window as unknown as { __fsaLog: unknown[] }).__fsaLog);
}

/** Bytes of the `index`th write through a stubbed file handle. */
export async function fsaWritten(page: Page, index: number): Promise<Buffer> {
  const b64 = await page.evaluate(
    (i) => (window as unknown as { __fsaWritten: string[] }).__fsaWritten[i] ?? null,
    index,
  );
  if (b64 === null) throw new Error(`no write #${index} through the file handle`);
  return Buffer.from(b64, "base64");
}

/** Clears the stub's call log (the written bytes stay, numbered on). */
export async function clearFsaLog(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as unknown as { __fsaLog: unknown[] }).__fsaLog.length = 0;
  });
}

/** Waits until the stub saw a handle closed (`count` closes in the current log). */
export async function waitForFsaClose(page: Page, count = 1): Promise<void> {
  await page.waitForFunction(
    (n) =>
      (window as unknown as { __fsaLog: { call: string }[] }).__fsaLog.filter(
        (e) => e.call === "close",
      ).length >= n,
    count,
    { timeout: 30_000 },
  );
}

/**
 * The first save of a new document with the File System Access API: File >
 * Save opens the "file or cloud" chooser, "Save to File" picks a handle and
 * writes through it. Needs installFsaStub before the app loaded.
 */
export async function fsaFirstSave(page: Page): Promise<{ chooser: string[]; savedAfter: number }> {
  await clickMenu(page, ["File", "Save"]);
  const dialog = page.locator(".g-save-chooser-dialog");
  await dialog.waitFor();
  // Class names only: the chooser's cloud button is recorded (and dropped)
  // in dropped.spec.ts.
  const chooser = (await visibleDialogs(page)).map((d) => d.className).sort();
  const savedAfter = Date.now();
  await dialog.getByText("Save to File").first().click();
  await waitForFsaClose(page);
  await settle(page);
  return { chooser, savedAfter };
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

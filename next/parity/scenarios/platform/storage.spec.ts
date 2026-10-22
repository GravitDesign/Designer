// User data the app keeps in the browser: localStorage "designer.settings",
// "swatches" and the small UI flags, and the IndexedDB font store
// "gravitFontsDB". Each scenario does what a user does (Settings dialog,
// View menu, colour chooser, File > Import > Add Fonts...) and records
// exactly which keys change and what they hold.
//
// Migration (users moving to the new app on the same origin keep their
// data): old-session-profile records what a real old session leaves in
// the browser, and the migration-* scenarios seed exactly that recording
// before the app loads and record how it shows up in the UI (settings
// dialog, menus, theme, rulers, colour chooser, panels, a text drawn in
// the imported font).
import fs from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";
import type { AppKind } from "../../support/apps.ts";
import { EXPECTED_ROOT } from "../../support/env.ts";
import { normalizeDocument, type Json } from "../../support/normalize.ts";
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios } from "../../support/scenario.ts";
import {
  clickMenu,
  indexedDbSummary,
  LICENSE_KEYS,
  localStorageEntries,
  menuState,
  MIGRATION_FONT_FAMILY,
  migrationFontFile,
  openSettingsDialog,
  reopen,
  SAMPLE_FONT,
  saveSettingsDialog,
  settingsDialogState,
  settle,
  sha256,
  sortKeys,
  storageDiff,
  storedSettings,
  themeStylesheet,
  waitForStartupWrites,
} from "./lib.ts";

/** Settings the old app has defaults for (RUN-STORAGE-001), read through app.setting. */
const SETTING_KEYS = [
  "theme",
  "snap_disabled",
  "snap_zones",
  "snap_guides",
  "rulers_visible",
  "guide_lines_visible",
  "symbol_labels_visible",
  "grid_visible",
  "page_labels_visible",
  "highlight_on_hover",
  "invert_selection",
  "auto_expand_layers",
  "system_fonts_enabled",
  "symbols_panel_shown",
  "decimals_num",
  "enable_steps_debug",
  "enable_cache",
  "ui_toolbar_alignment",
  "eps_outline_fonts",
  "auto_save",
  "auto_save_interval",
  "notifications_disabled",
  "touch",
  "sidebars_left_active",
  "sidebars_right_active",
  "autosave-prompt-for-local-files-disabled",
  "dont_store_textpath",
  "disable_warning_unsupported_features",
  "scrubbing_flag",
  "show_welcome_screen",
  "language",
] as const;

async function readSettings(page: Page, keys: readonly string[]): Promise<Record<string, unknown>> {
  return page.evaluate((list) => {
    const { app } = (window as unknown as { __parity: { app: { setting(k: string): unknown } } })
      .__parity;
    const out: Record<string, unknown> = {};
    for (const key of list) {
      const value = app.setting(key);
      out[key] = value === undefined ? "(undefined)" : value;
    }
    return out;
  }, keys);
}

/** Inserts a rectangle and selects it, so the inspector shows its panels. */
async function selectRectangle(page: Page): Promise<void> {
  await page.evaluate(() => {
    const { G, app } = (window as unknown as { __parity: ParityLike }).__parity;
    interface ParityLike {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      G: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      app: any;
    }
    const r = new G.GRectangle();
    r.setProperty("trf", new G.GTransform(100, 0, 0, 60, 200, 160));
    app.editor().insertElements([r]);
    app.editor().updateSelection(false, [r]);
  });
  await page.locator("#right-sidebars .fill-properties-panel").first().waitFor();
  await settle(page);
}

/** Gives the active page a size: multipage mode refuses infinite pages. */
async function sizedPage(page: Page): Promise<void> {
  await page.evaluate(() => {
    const { app } = (window as unknown as { __parity: { app: ParityApp } }).__parity;
    interface ParityApp {
      scene(): { getActivePage(): { setProperties(k: string[], v: unknown[]): void } };
    }
    app.scene().getActivePage().setProperties(["w", "h"], [800, 600]);
  });
}

/** Opens the colour chooser of the first fill of the selected element. */
async function openFillChooser(page: Page): Promise<void> {
  await page
    .locator("#right-sidebars .fill-properties-panel .g-pattern-chooser .preview")
    .first()
    .click();
  await page.locator(".g-overlay .pattern-chooser").waitFor();
}

/**
 * Every switch in the settings dialog flipped, plus the non-switch editors
 * changed. "Disable notifications" is left alone: saving it asks the
 * server (PUT /user/settings, which doesn't exist), and the dialog then
 * fails to close; settings-dialog-notifications records that separately.
 */
async function changeEverySetting(page: Page): Promise<void> {
  const dialog = page.locator(".g-settings-dialog");
  const switches = dialog.locator(
    "label.g-switch:not(:has(input[data-setting='notifications_disabled']))",
  );
  const count = await switches.count();
  for (let i = 0; i < count; i++) await switches.nth(i).click();
  // Rounding is on now: type 3 decimals.
  const decimals = dialog.locator('[data-setting="decimals-num-val"]');
  await decimals.fill("3");
  await decimals.press("Tab");
  await dialog.locator('select[data-setting="auto_save_interval"]').selectOption("2");
  await dialog.locator(".g-theme-selector").click();
  await page.locator(".g-overlay.theme-selector .g-theme-row", { hasText: "Dark" }).click();
}

/** Swatch strings with their random ids renamed (id1, id2, ... across the list). */
function renameSwatchIds(raw: string): string {
  const list = (JSON.parse(raw) as string[]).map((s) => {
    try {
      return JSON.parse(s) as Json;
    } catch {
      return s; // a bare pattern string such as "C#[0,255,0]"
    }
  });
  const renamed = normalizeDocument(list as Json) as Json[];
  return JSON.stringify(renamed.map((s) => (typeof s === "string" ? s : JSON.stringify(s))));
}

/**
 * Adds a red colour and then a linear gradient as global swatches in the
 * fill's colour chooser; returns "swatches" after each.
 */
async function addGlobalSwatches(
  page: Page,
): Promise<{ afterColor: string | null; afterGradient: string | null }> {
  await selectRectangle(page);
  await openFillChooser(page);
  const overlay = page.locator(".g-overlay .pattern-chooser");
  await overlay.locator(".colors-palette .swatch").nth(13).click(); // red, C#[255,0,0]
  await overlay.locator('.palettes button[data-palette="swatches"]').click();
  const add = overlay.locator(".swatches-palette.global .swatches-wrapper.global .swatch-button");
  const stored = () => page.evaluate(() => localStorage.getItem("swatches"));
  const storedCount = async () => {
    const raw = await stored();
    return raw === null ? 0 : (JSON.parse(raw) as unknown[]).length;
  };
  const before = await storedCount();
  await add.click();
  await expect.poll(storedCount).toBe(before + 1);
  const afterColor = await stored();
  await overlay.locator("select.pattern-type-select").selectOption("Linear Gradient");
  await settle(page);
  await overlay.locator('.palettes button[data-palette="swatches"]').click();
  await add.click();
  await expect.poll(storedCount).toBe(before + 2);
  const afterGradient = await stored();
  return { afterColor, afterGradient };
}

/** Number of entries in IndexedDB gravitFontsDB/gravitFonts (0 when it doesn't exist). */
async function fontStoreCount(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const dbs = await indexedDB.databases();
    if (!dbs.some((d) => d.name === "gravitFontsDB")) return 0;
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("gravitFontsDB");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error ?? new Error("open failed"));
    });
    const count = await new Promise<number>((resolve) => {
      try {
        const r = db.transaction("gravitFonts").objectStore("gravitFonts").count();
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => resolve(0);
      } catch {
        resolve(0);
      }
    });
    db.close();
    return count;
  });
}

/**
 * Imports a font through File > Import > Add Fonts... and waits until the
 * font list and the font are stored; returns the file input's accept list.
 */
async function importFont(page: Page, file: string): Promise<string | null> {
  const chooser = page.waitForEvent("filechooser");
  await clickMenu(page, ["File", "Import", "Add Fonts..."]);
  const fc = await chooser;
  const accept = await page.evaluate(
    () => document.getElementById("file-input")?.getAttribute("accept") ?? null,
  );
  await fc.setFiles(file);
  await expect.poll(() => fontStoreCount(page), { timeout: 20_000 }).toBeGreaterThanOrEqual(2);
  await settle(page);
  return accept;
}

/** Every entry of gravitFontsDB: plain values as they are, font data as type, size and hash. */
async function fontDatabase(page: Page): Promise<{
  version: number;
  stores: string[];
  entries: Record<string, unknown>;
} | null> {
  return page.evaluate(async () => {
    const dbs = await indexedDB.databases();
    if (!dbs.some((d) => d.name === "gravitFontsDB")) return null;
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("gravitFontsDB");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error ?? new Error("open failed"));
    });
    const keys = await new Promise<IDBValidKey[]>((resolve) => {
      const r = db.transaction("gravitFonts").objectStore("gravitFonts").getAllKeys();
      r.onsuccess = () => resolve(r.result);
    });
    const entries: Record<string, unknown> = {};
    for (const key of keys) {
      const value = await new Promise<unknown>((resolve) => {
        const r = db.transaction("gravitFonts").objectStore("gravitFonts").get(key);
        r.onsuccess = () => resolve(r.result);
      });
      if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
        const view =
          value instanceof ArrayBuffer
            ? new Uint8Array(value)
            : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
        const digest = await crypto.subtle.digest("SHA-256", view.slice());
        entries[String(key)] = {
          type: Object.prototype.toString.call(value),
          byteLength: view.byteLength,
          sha256: [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join(""),
        };
      } else {
        entries[String(key)] = value;
      }
    }
    const out = { version: db.version, stores: [...db.objectStoreNames], entries };
    db.close();
    return out;
  });
}

// ---------------------------------------------------------------------------
// Migration input: a recorded old session
// ---------------------------------------------------------------------------

/** Where old-session-profile's recording is; the migration scenarios seed it. */
const PROFILE_FILE = path.join(EXPECTED_ROOT, "platform", "storage", "old-session-profile.json");

interface SessionProfile {
  /** Raw localStorage values (swatch ids renamed; license and time-stamped keys left out). */
  localStorage: Record<string, string>;
  /** IndexedDB gravitFontsDB as fontDatabase() reads it. */
  fonts: { version: number; stores: string[]; entries: Record<string, unknown> } | null;
}

/** Keys left out of the session snapshot: license data and time-stamped counters. */
const VOLATILE_KEYS: ReadonlySet<string> = new Set([
  ...LICENSE_KEYS,
  "pwa.show-install-dialog-3-times-a-week",
  "pwa.closed-install-pwa-dialog-date",
]);

async function sessionSnapshot(page: Page): Promise<SessionProfile> {
  const entries = await localStorageEntries(page);
  const storage: Record<string, string> = {};
  for (const key of Object.keys(entries).sort()) {
    if (VOLATILE_KEYS.has(key)) continue;
    const raw = entries[key] ?? "";
    storage[key] = key === "swatches" ? renameSwatchIds(raw) : raw;
  }
  return { localStorage: storage, fonts: await fontDatabase(page) };
}

function recordedProfile(): SessionProfile {
  if (!fs.existsSync(PROFILE_FILE)) {
    throw new Error(`${PROFILE_FILE} is missing: record platform/storage/old-session-profile`);
  }
  return JSON.parse(fs.readFileSync(PROFILE_FILE, "utf8")) as SessionProfile;
}

/**
 * Writes the recorded old session into the current origin, then reloads
 * the app. Two additions a real profile can also hold: a setting the app
 * doesn't know (it must survive) and a bare pattern string in "swatches"
 * (older builds stored those).
 */
async function seedProfile(page: Page, kind: AppKind): Promise<void> {
  await waitForStartupWrites(page);
  const profile = recordedProfile();
  const storage = { ...profile.localStorage };
  const settings = JSON.parse(storage["designer.settings"] ?? "{}") as Record<string, unknown>;
  storage["designer.settings"] = JSON.stringify({
    ...settings,
    a_key_from_the_future: { kept: true },
  });
  storage.swatches = JSON.stringify([
    ...(JSON.parse(storage.swatches ?? "[]") as string[]),
    "C#[0,255,0]",
  ]);
  let font: { list: unknown; key: string; base64: string; version: number } | null = null;
  if (profile.fonts) {
    const { bytes } = migrationFontFile();
    const data = Object.entries(profile.fonts.entries).filter(([k]) => k !== "_gravit_font_list_");
    const [key, info] = data[0] ?? [];
    if (data.length !== 1 || !key || (info as { sha256?: string }).sha256 !== sha256(bytes)) {
      throw new Error("the recorded font database doesn't hold exactly the imported font");
    }
    font = {
      list: profile.fonts.entries._gravit_font_list_,
      key,
      base64: bytes.toString("base64"),
      version: profile.fonts.version,
    };
  }
  await page.evaluate(
    async ({ entries, font: f }) => {
      localStorage.clear();
      for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, v);
      if (!f) return;
      // The layout recorded from the old app (GFontDBClient, module 1198):
      // one store "gravitFonts" without key path, the font list under
      // "_gravit_font_list_" and the font as an ArrayBuffer.
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("gravitFontsDB", f.version);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains("gravitFonts")) {
            request.result.createObjectStore("gravitFonts");
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("open failed"));
      });
      const bytes = Uint8Array.from(atob(f.base64), (c) => c.charCodeAt(0));
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("gravitFonts", "readwrite");
        const store = tx.objectStore("gravitFonts");
        store.put(f.list, "_gravit_font_list_");
        store.put(bytes.buffer, f.key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("write failed"));
      });
      db.close();
    },
    { entries: storage, font },
  );
  await reopen(page, kind, { newDocument: true });
  await waitForStartupWrites(page);
  await settle(page);
}

/** The UI the migrated settings show up in. */
async function shownSettings(page: Page): Promise<Record<string, unknown>> {
  return {
    settingsDialog: await settingsDialogState(page),
    viewMenu: await menuState(page, ["View"]),
    canvasMenu: await menuState(page, ["View", "Canvas"]),
    snapMenu: await menuState(page, ["View", "Snap to"]),
    stylesheet: await themeStylesheet(page),
    rulerWidgets: await page.locator(".g-ruler-widget:visible").count(),
  };
}

/** The UI the small flags show up in: the keep-ratio lock and the multipage switch. */
async function shownFlags(page: Page): Promise<Record<string, unknown>> {
  await sizedPage(page);
  await selectRectangle(page);
  return page.evaluate(() => ({
    keepRatio: [
      ...document.querySelectorAll<HTMLElement>(
        '#right-sidebars [data-title="Keep Ratio"][data-ratio]',
      ),
    ].map((e) => e.className),
    multipage:
      document.querySelector<HTMLInputElement>(
        '#left-sidebars input[data-property="multipage-switch"]',
      )?.checked ?? null,
  }));
}

/** The global swatches the colour chooser shows: one entry per swatch button. */
async function shownGlobalSwatches(page: Page): Promise<unknown> {
  await selectRectangle(page);
  await openFillChooser(page);
  await page.locator('.g-overlay .palettes button[data-palette="swatches"]').click();
  await page.locator(".g-overlay .swatches-palette.global").waitFor();
  await settle(page);
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>(".g-overlay .swatches-palette.global .swatch")].map(
      (s) => ({
        title: s.getAttribute("data-title"),
        background: s.style.background || getComputedStyle(s).backgroundImage,
      }),
    ),
  );
}

/** A text in `family` drawn by the engine once its font has loaded (PNG data URL). */
async function renderText(page: Page, family: string, text: string): Promise<string> {
  return page.evaluate(
    async ({ family: f, text: t }) => {
      const { G, app } = (window as unknown as { __parity: ParityLike }).__parity;
      interface ParityLike {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        G: any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        app: any;
      }
      const fm = app.scene().getWorkspace().getFontManager();
      const node = new G.GText();
      node.setProperty("trf", new G.GTransform(1, 0, 0, 1, 100, 100));
      app.editor().insertElements([node]);
      app.editor().clearSelection();
      // The family is set on the run, the way the text inspector does it.
      // A text set while its font still loads takes a deferred path, so it
      // is set once more after every font has resolved.
      const content = [
        { text: t, fontFamily: f, fontSize: 48, fontColor: new G.GRGBColor([0, 0, 0]) },
      ];
      const fontsIdle = async () => {
        let quiet = 0;
        for (let i = 0; i < 800 && quiet < 2; i++) {
          const busy = fm.hasPendingFonts() || fm.hasUnresolvedFonts() || node.hasFontsToResolve();
          quiet = busy ? 0 : quiet + 1;
          await new Promise((r) => setTimeout(r, 25));
        }
        if (quiet < 2) throw new Error("fonts did not settle");
      };
      for (let pass = 0; pass < 2; pass++) {
        node.setText(content);
        await fontsIdle();
      }
      await app.corpus.settle();
      const bmp = node.toBitmap(1, 1);
      const canvas = bmp.getHTMLElement(true) as HTMLCanvasElement;
      const data = (canvas.getContext("2d") as CanvasRenderingContext2D).getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      ).data;
      let ink = 0;
      for (let i = 3; i < data.length; i += 4) if ((data[i] as number) > 0) ink++;
      if (ink === 0) throw new Error(`text in ${f} painted nothing`);
      return bmp.toImageDataUrl() as string;
    },
    { family, text },
  );
}

const scenarios = defineScenarios([
  {
    id: "platform/storage/settings-defaults",
    covers: ["RUN-STORAGE-001", "UI-STORAGE-002", "FMT-AUTOSAVE-002", "FMT-STORAGE-014"],
    kind: "json",
    // The defaults every setting has after a clean start, and what the old
    // app has written to "designer.settings" by then (it writes the whole
    // merged object once its reminder check runs).
    driver: async ({ page }) => {
      await waitForStartupWrites(page);
      return {
        settings: await readSettings(page, SETTING_KEYS),
        stored: await storedSettings(page),
      };
    },
  },
  {
    id: "platform/storage/clean-start",
    covers: ["RUN-STORAGE-008", "RUN-STORAGE-009", "RUN-STORAGE-010", "UI-STORAGE-012"],
    kind: "json",
    // sessionStorage, IndexedDB and Cache Storage after start and a document:
    // all empty (the font database only exists once a font is imported).
    driver: async ({ page }) => {
      await waitForStartupWrites(page);
      return {
        sessionStorage: await page.evaluate(() => Object.keys(sessionStorage).sort()),
        indexedDB: await indexedDbSummary(page),
        caches: await page.evaluate(async () => (await caches.keys()).sort()),
      };
    },
  },
  {
    id: "platform/storage/settings-dialog-all",
    covers: [
      "UI-STORAGE-001",
      "UI-STORAGE-002",
      "RUN-STORAGE-001",
      "FMT-AUTOSAVE-002",
      "RUN-STORAGE-002",
    ],
    kind: "json",
    // Flip every switch in Edit > Settings..., set rounding to 3, the
    // auto-save interval to 20 min and the dark theme, then Save Changes.
    driver: async ({ page }) => {
      await waitForStartupWrites(page);
      const before = await localStorageEntries(page);
      await openSettingsDialog(page);
      await changeEverySetting(page);
      const whileOpen = storageDiff(before, await localStorageEntries(page));
      await saveSettingsDialog(page);
      await settle(page);
      return {
        changedBeforeSave: whileOpen,
        changedBySave: storageDiff(before, await localStorageEntries(page)),
        settings: await readSettings(page, SETTING_KEYS),
        stylesheet: await themeStylesheet(page),
      };
    },
  },
  {
    id: "platform/storage/settings-dialog-cancel",
    covers: ["UI-STORAGE-002"],
    kind: "json",
    // Same changes, then Cancel: nothing may be written.
    driver: async ({ page }) => {
      await waitForStartupWrites(page);
      const before = await localStorageEntries(page);
      await openSettingsDialog(page);
      await changeEverySetting(page);
      await page.locator('.g-settings-dialog button:text-is("Cancel")').click();
      await page.locator(".g-settings-dialog").waitFor({ state: "detached" });
      await settle(page);
      return {
        changed: storageDiff(before, await localStorageEntries(page)),
        theme: await readSettings(page, ["theme"]),
        stylesheet: await themeStylesheet(page),
      };
    },
  },
  {
    id: "platform/storage/settings-dialog-notifications",
    covers: ["UI-STORAGE-002"],
    kind: "json",
    // "Disable notifications" + Save Changes: the dialog saves the local
    // settings, then asks the server for the user settings, gets a 404
    // page, fails on JSON.parse and stays open (old bug).
    driver: async ({ page }) => {
      await waitForStartupWrites(page);
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      const before = await localStorageEntries(page);
      await openSettingsDialog(page);
      await page
        .locator(
          ".g-settings-dialog label.g-switch:has(input[data-setting='notifications_disabled'])",
        )
        .click();
      const failed = page.waitForEvent("pageerror", { timeout: 15_000 }).catch(() => null);
      const closed = page
        .locator(".g-settings-dialog")
        .waitFor({ state: "detached", timeout: 15_000 })
        .catch(() => null);
      await page.locator('.g-settings-dialog button:text-is("Save Changes")').click();
      // Either the save fails (the old app) or the dialog closes.
      await Promise.race([failed, closed]);
      await settle(page);
      return {
        changed: storageDiff(before, await localStorageEntries(page)),
        dialogOpen: await page.locator(".g-settings-dialog").count(),
        pageErrors: errors,
      };
    },
  },
  {
    id: "platform/storage/theme-survives-reload",
    covers: ["UI-STORAGE-002", "RUN-STORAGE-001"],
    kind: "json",
    driver: async ({ page, kind }) => {
      await waitForStartupWrites(page);
      await openSettingsDialog(page);
      await page.locator(".g-settings-dialog .g-theme-selector").click();
      await page.locator(".g-overlay.theme-selector .g-theme-row", { hasText: "Dark" }).click();
      await saveSettingsDialog(page);
      const stored = ((await storedSettings(page)) as Record<string, unknown> | null)?.theme;
      await reopen(page, kind, { newDocument: true });
      await settle(page);
      return {
        storedTheme: stored ?? null,
        afterReload: await readSettings(page, ["theme"]),
        stylesheet: await themeStylesheet(page),
      };
    },
  },
  {
    id: "platform/storage/view-menu-write-through",
    covers: ["RUN-STORAGE-002", "UI-STORAGE-002", "UI-STORAGE-006"],
    kind: "json",
    // Each View menu toggle writes localStorage at once; one diff per click.
    driver: async ({ page }) => {
      await waitForStartupWrites(page);
      const steps: { path: string; changed: unknown }[] = [];
      const paths = [
        ["View", "Canvas", "Show Rulers"],
        ["View", "Canvas", "Show Grid"],
        ["View", "Canvas", "Show Guide Lines"],
        ["View", "Canvas", "Show Symbol Labels"],
        // The snap targets first: with snapping off they may not apply.
        ["View", "Snap to", "Snap to Grid"],
        ["View", "Snap to", "Snap to Pages"],
        ["View", "Snap to", "Snap to Anchor Points"],
        ["View", "Snap to", "Use Snap Zones"],
        ["View", "Snap to", "Use Snapping"],
        ["View", "Outline View"],
        ["View", "Show Libraries Panel"],
        ["View", "Show Comments Panel"],
        ["View", "Show Symbols Panel"],
        ["View", "Show Layers Panel"],
        ["View", "Show Inspector Panel"],
      ];
      for (const p of paths) {
        const before = await localStorageEntries(page);
        await clickMenu(page, p);
        await settle(page);
        steps.push({
          path: p.join(" > "),
          changed: storageDiff(before, await localStorageEntries(page)),
        });
      }
      return steps;
    },
  },
  {
    id: "platform/storage/ui-flags",
    covers: ["UI-STORAGE-006", "UI-STORAGE-001"],
    kind: "json",
    // Small UI flags kept in their own localStorage keys.
    driver: async ({ page }) => {
      await waitForStartupWrites(page);
      await sizedPage(page);
      await selectRectangle(page);
      const steps: { action: string; changed: unknown }[] = [];
      const step = async (action: string, run: () => Promise<void>) => {
        const before = await localStorageEntries(page);
        await run();
        await settle(page);
        steps.push({ action, changed: storageDiff(before, await localStorageEntries(page)) });
      };
      const lock = page.locator('#right-sidebars [data-title="Keep Ratio"][data-ratio]');
      await step("inspector: keep ratio lock", () => lock.first().click());
      await step("inspector: keep ratio lock again", () => lock.first().click());
      const multipage = page.locator(
        '#left-sidebars label.g-switch:has(input[data-property="multipage-switch"])',
      );
      await step("pages: multipage switch", () => multipage.click());
      await step("pages: multipage switch again", () => multipage.click());
      return steps;
    },
  },
  {
    id: "platform/storage/welcome-dont-show",
    covers: ["UI-STORAGE-002", "RUN-STORAGE-001"],
    kind: "json",
    open: { newDocument: false },
    driver: async ({ page, kind }) => {
      await waitForStartupWrites(page);
      const before = await localStorageEntries(page);
      await page
        .locator(".g-new-document-dialog")
        .getByText("Don't show anymore at startup")
        .click();
      await settle(page);
      const changed = storageDiff(before, await localStorageEntries(page));
      await reopen(page, kind);
      await waitForStartupWrites(page);
      await settle(page);
      return {
        changed,
        welcomeVisibleAfterReload: await page
          .locator(".g-new-document-dialog-container.visible")
          .count(),
      };
    },
  },
  {
    id: "platform/storage/swatches",
    covers: ["UI-STORAGE-003", "UI-STORAGE-001", "FMT-STORAGE-014"],
    kind: "json",
    // Colour chooser > Swatches > "+" under Global: first a red colour,
    // then a linear gradient. "swatches" holds serialized GSwatch nodes
    // (random ids renamed across the whole list, so equal ids stay equal).
    driver: async ({ page }) => {
      await waitForStartupWrites(page);
      const { afterColor, afterGradient } = await addGlobalSwatches(page);
      const parse = (raw: string | null) =>
        raw === null
          ? null
          : (JSON.parse(renameSwatchIds(raw)) as string[]).map((s) => JSON.parse(s) as unknown);
      return { afterColor: parse(afterColor), afterGradient: parse(afterGradient) };
    },
  },
  {
    id: "platform/storage/font-import",
    covers: ["UI-STORAGE-012", "FMT-STORAGE-014", "FMT-GVD-012"],
    kind: "json",
    // File > Import > Add Fonts... with a TrueType file: the font list and
    // the font bytes land in IndexedDB gravitFontsDB.
    driver: async ({ page }) => {
      await waitForStartupWrites(page);
      const accept = await importFont(page, SAMPLE_FONT);
      return {
        accept,
        database: await fontDatabase(page),
        summary: await indexedDbSummary(page),
      };
    },
  },
  {
    id: "platform/storage/old-session-profile",
    covers: [
      "UI-STORAGE-001",
      "UI-STORAGE-002",
      "UI-STORAGE-003",
      "UI-STORAGE-006",
      "UI-STORAGE-012",
      "FMT-STORAGE-014",
    ],
    kind: "json",
    // A user session: every setting changed in the dialog, rulers and grid
    // on, outline view toggled on and off, two global swatches, the
    // keep-ratio and multipage flags, an imported font. Records what ends
    // up in localStorage and IndexedDB; the migration scenarios below seed
    // this recording.
    driver: async ({ page }) => {
      await waitForStartupWrites(page);
      await openSettingsDialog(page);
      await changeEverySetting(page);
      await saveSettingsDialog(page);
      await clickMenu(page, ["View", "Canvas", "Show Rulers"]);
      await clickMenu(page, ["View", "Canvas", "Show Grid"]);
      await clickMenu(page, ["View", "Outline View"]);
      await clickMenu(page, ["View", "Outline View"]);
      await sizedPage(page);
      await addGlobalSwatches(page);
      await page.keyboard.press("Escape");
      await page.locator('#right-sidebars [data-title="Keep Ratio"][data-ratio]').first().click();
      await page
        .locator('#left-sidebars label.g-switch:has(input[data-property="multipage-switch"])')
        .click();
      await importFont(page, migrationFontFile().file);
      await settle(page);
      return sessionSnapshot(page);
    },
  },
  {
    id: "platform/storage/migration-settings",
    covers: [
      "UI-STORAGE-002",
      "UI-STORAGE-001",
      "RUN-STORAGE-001",
      "FMT-STORAGE-014",
      "FMT-AUTOSAVE-002",
    ],
    kind: "json",
    // The recorded old session (plus a setting the app doesn't know) before
    // load: the settings dialog, the View menu checks, the theme and the
    // rulers must show every value, and the stored object keeps the
    // unknown key.
    driver: async ({ page, kind }) => {
      await seedProfile(page, kind);
      return { shown: await shownSettings(page), stored: sortKeys(await storedSettings(page)) };
    },
  },
  {
    id: "platform/storage/migration-window",
    covers: ["UI-STORAGE-002", "RUN-STORAGE-001"],
    kind: "png",
    // The same seeded session as it looks: dark theme, rulers and grid on
    // (toolbar, rulers, left panels and part of the canvas; the account
    // button at the top right belongs to the dropped cloud login).
    driver: async ({ page, kind }) => {
      await seedProfile(page, kind);
      // Right after load an overlay can still cover the window for a moment;
      // shoot once the menu bar is what the pointer would hit.
      await page.waitForFunction(() => {
        const hit = document.elementFromPoint(25, 18);
        return !!hit && !!hit.closest("nav.g-menu-bar");
      });
      await settle(page);
      return page.screenshot({
        clip: { x: 0, y: 0, width: 900, height: 420 },
        animations: "disabled",
        caret: "hide",
      });
    },
  },
  {
    id: "platform/storage/migration-swatches-flags",
    covers: ["UI-STORAGE-003", "UI-STORAGE-006", "FMT-STORAGE-014"],
    kind: "json",
    // The seeded swatches (plus a bare pattern string) and UI flags: what
    // the colour chooser and the panels show, and what stays stored.
    driver: async ({ page, kind }) => {
      await seedProfile(page, kind);
      const flags = await shownFlags(page);
      const shown = await shownGlobalSwatches(page);
      const entries = await localStorageEntries(page);
      return {
        shown,
        flags,
        swatchesStored: entries.swatches ? JSON.parse(renameSwatchIds(entries.swatches)) : null,
      };
    },
  },
  {
    id: "platform/storage/migration-fonts",
    covers: ["UI-STORAGE-012", "FMT-STORAGE-014", "FMT-GVD-012"],
    kind: "png",
    // The font the old session imported (from the seeded IndexedDB) draws
    // a text in its family (an extra-bold face, unlike the fallback).
    driver: async ({ page, kind }) => {
      await seedProfile(page, kind);
      return renderText(page, MIGRATION_FONT_FAMILY, "Migrated");
    },
  },
]);

paritySuite("platform storage", scenarios, { newApp: false });

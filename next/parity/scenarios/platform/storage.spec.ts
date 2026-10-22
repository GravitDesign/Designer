// User data the app keeps in the browser: localStorage "designer.settings",
// "swatches" and the small UI flags, and the IndexedDB font store
// "gravitFontsDB". Each scenario does what a user does (Settings dialog,
// View menu, colour chooser, File > Import > Add Fonts...) and records
// exactly which keys change and what they hold. The last scenarios seed
// old-style data before the app loads and record how it is read back:
// that is the migration test for users moving to the new app on the same
// origin.
import fs from "node:fs";
import type { Page } from "@playwright/test";
import type { AppKind } from "../../support/apps.ts";
import { paritySuite } from "../../support/suite.ts";
import { defineScenarios } from "../../support/scenario.ts";
import {
  clickMenu,
  indexedDbSummary,
  localStorageEntries,
  normalizeNodeString,
  openSettingsDialog,
  parseStored,
  reopen,
  SAMPLE_FONT,
  saveSettingsDialog,
  settle,
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
  await settle(page, 400);
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

// Old-style user data for the migration scenarios. Values differ from
// the defaults wherever the setting allows it.
const SEEDED_SETTINGS = {
  theme: "dark",
  snap_disabled: true,
  snap_zones: true,
  snap_guides: ["guide.points", "guide.grid"],
  rulers_visible: true,
  guide_lines_visible: false,
  symbol_labels_visible: false,
  grid_visible: false,
  page_labels_visible: false,
  highlight_on_hover: false,
  invert_selection: true,
  auto_expand_layers: false,
  symbols_panel_shown: true,
  decimals_num: 3,
  ui_toolbar_alignment: false,
  eps_outline_fonts: false,
  auto_save: true,
  auto_save_interval: 20,
  scrubbing_flag: true,
  dont_store_textpath: true,
  disable_warning_unsupported_features: true,
  show_welcome_screen: false,
  "autosave-prompt-for-local-files-disabled": true,
  a_key_from_the_future: { kept: true },
} as const;

const SEEDED_SWATCHES = [
  '{"@":"swatch","@id":"seed01","_pt":"C#[255,0,0]"}',
  '{"@":"swatch","@id":"seed02","_pt":"C#[0,128,255]","_op":0.5}',
  // A linear gradient in the shape the colour chooser writes it.
  '{"@":"swatch","@id":"seed03","_pt":"L#{\\"fx\\":0,\\"x\\":[{\\"p\\":0,\\"c\\":\\"C#[255,255,0]\\",\\"o\\":1},{\\"p\\":1,\\"c\\":\\"C#[0,0,255]\\",\\"o\\":1}]}"}',
  // A bare pattern string instead of a serialized swatch is read too.
  "C#[0,255,0]",
];

const SEEDED_FLAGS: Record<string, string> = {
  "designer.settings.dimension.preserveratio": "true",
  "designer.settings.outline-view.enabled": "true",
  "OutlineSidebar/Multipage_Mode": "true",
  "designer.settings.enhanced-tooltips.enabled": "false",
};

const FONT_FAMILY = "Noto Sans Adlam";

/** Writes old-style user data into the current origin, then reloads the app. */
async function seedAndReload(page: Page, kind: AppKind, withFont: boolean): Promise<void> {
  const font = withFont ? fs.readFileSync(SAMPLE_FONT).toString("base64") : null;
  await page.evaluate(
    async ({ settings, swatches, flags, font: fontBase64, family }) => {
      localStorage.clear();
      localStorage.setItem("designer.settings", JSON.stringify(settings));
      localStorage.setItem("swatches", JSON.stringify(swatches));
      for (const [k, v] of Object.entries(flags)) localStorage.setItem(k, v);
      if (!fontBase64) return;
      // Same layout GFontDBClient (module 1198) creates: database
      // gravitFontsDB v1, one store gravitFonts without key path, the font
      // list under "_gravit_font_list_" and each font as an ArrayBuffer under
      // "<family>_<weight>_<style>".
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("gravitFontsDB", 1);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains("gravitFonts")) {
            request.result.createObjectStore("gravitFonts");
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("open failed"));
      });
      const bytes = Uint8Array.from(atob(fontBase64), (c) => c.charCodeAt(0));
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("gravitFonts", "readwrite");
        const store = tx.objectStore("gravitFonts");
        store.put(
          [{ family, weight: "400", style: "N", subfamily: "Regular", displayname: family }],
          "_gravit_font_list_",
        );
        store.put(bytes.buffer, `${family}_400_N`);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("write failed"));
      });
      db.close();
    },
    {
      settings: SEEDED_SETTINGS,
      swatches: SEEDED_SWATCHES,
      flags: SEEDED_FLAGS,
      font,
      family: FONT_FAMILY,
    },
  );
  await reopen(page, kind, { newDocument: true });
  await settle(page, 500);
}

/** The global swatches the colour chooser shows: one entry per swatch button. */
async function shownGlobalSwatches(page: Page): Promise<unknown> {
  await selectRectangle(page);
  await openFillChooser(page);
  await page.locator('.g-overlay .palettes button[data-palette="swatches"]').click();
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
      await page.locator('.g-settings-dialog button:text-is("Save Changes")').click();
      await page.waitForTimeout(2000);
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
        await settle(page, 300);
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
      // Multipage mode refuses infinite pages, so give the page a size.
      await page.evaluate(() => {
        const { app } = (window as unknown as { __parity: { app: ParityApp } }).__parity;
        interface ParityApp {
          scene(): { getActivePage(): { setProperties(k: string[], v: unknown[]): void } };
        }
        app.scene().getActivePage().setProperties(["w", "h"], [800, 600]);
      });
      await selectRectangle(page);
      const steps: { action: string; changed: unknown }[] = [];
      const step = async (action: string, run: () => Promise<void>) => {
        const before = await localStorageEntries(page);
        await run();
        await settle(page, 300);
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
      await settle(page, 500);
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
    // (random @id renamed by normalize.ts).
    driver: async ({ page }) => {
      await waitForStartupWrites(page);
      await selectRectangle(page);
      await openFillChooser(page);
      const overlay = page.locator(".g-overlay .pattern-chooser");
      await overlay.locator(".colors-palette .swatch").nth(13).click(); // red, C#[255,0,0]
      await overlay.locator('.palettes button[data-palette="swatches"]').click();
      const add = overlay.locator(
        ".swatches-palette.global .swatches-wrapper.global .swatch-button",
      );
      await add.click();
      await settle(page);
      const afterColor = await page.evaluate(() => localStorage.getItem("swatches"));
      await overlay.locator("select.pattern-type-select").selectOption("Linear Gradient");
      await settle(page);
      await overlay.locator('.palettes button[data-palette="swatches"]').click();
      await add.click();
      await settle(page);
      const afterGradient = await page.evaluate(() => localStorage.getItem("swatches"));
      // Ids are renamed across the whole list, so equal ids stay equal.
      const norm = (raw: string | null) =>
        raw === null
          ? null
          : normalizeNodeString(
              JSON.stringify((parseStored(raw) as string[]).map((s) => JSON.parse(s) as unknown)),
            );
      return { afterColor: norm(afterColor), afterGradient: norm(afterGradient) };
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
      const chooser = page.waitForEvent("filechooser");
      await clickMenu(page, ["File", "Import", "Add Fonts..."]);
      const fc = await chooser;
      const accept = await page.evaluate(
        () => document.getElementById("file-input")?.getAttribute("accept") ?? null,
      );
      await fc.setFiles(SAMPLE_FONT);
      await page.waitForFunction(
        async () => {
          const dbs = await indexedDB.databases();
          if (!dbs.some((d) => d.name === "gravitFontsDB")) return false;
          const db = await new Promise<IDBDatabase>((resolve) => {
            const r = indexedDB.open("gravitFontsDB");
            r.onsuccess = () => resolve(r.result);
          });
          const list = await new Promise<unknown>((resolve) => {
            const r = db
              .transaction("gravitFonts")
              .objectStore("gravitFonts")
              .get("_gravit_font_list_");
            r.onsuccess = () => resolve(r.result);
            r.onerror = () => resolve(undefined);
          });
          db.close();
          return Array.isArray(list) && list.length > 0;
        },
        null,
        { timeout: 20_000, polling: 200 },
      );
      await settle(page, 500);
      const content = await page.evaluate(async () => {
        const db = await new Promise<IDBDatabase>((resolve) => {
          const r = indexedDB.open("gravitFontsDB");
          r.onsuccess = () => resolve(r.result);
        });
        const store = db.transaction("gravitFonts").objectStore("gravitFonts");
        const keys = await new Promise<IDBValidKey[]>((resolve) => {
          const r = store.getAllKeys();
          r.onsuccess = () => resolve(r.result);
        });
        const out: Record<string, unknown> = {};
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
            out[String(key)] = {
              type: Object.prototype.toString.call(value),
              byteLength: view.byteLength,
              sha256: [...new Uint8Array(digest)]
                .map((b) => b.toString(16).padStart(2, "0"))
                .join(""),
            };
          } else {
            out[String(key)] = value;
          }
        }
        const version = db.version;
        db.close();
        return { version, stores: [...db.objectStoreNames], entries: out };
      });
      return { accept, database: content, summary: await indexedDbSummary(page) };
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
    // Old-style "designer.settings" with non-default values (and a key the
    // app doesn't know) written before load: every value must come back
    // through app.setting, the theme must be applied, and the stored object
    // keeps the unknown key and gains the missing defaults.
    driver: async ({ page, kind }) => {
      await waitForStartupWrites(page);
      await seedAndReload(page, kind, false);
      await waitForStartupWrites(page);
      return {
        settings: await readSettings(page, [...SETTING_KEYS, "a_key_from_the_future"]),
        stylesheet: await themeStylesheet(page),
        rulersVisible: await page.locator(".g-ruler, .rulers, .g-rulers").count(),
        stored: sortKeys(await storedSettings(page)),
      };
    },
  },
  {
    id: "platform/storage/migration-swatches-flags",
    covers: ["UI-STORAGE-003", "UI-STORAGE-006", "FMT-STORAGE-014"],
    kind: "json",
    // Seeded "swatches" (serialized swatches and a bare pattern string)
    // and UI flags: what the colour chooser shows and what stays stored.
    driver: async ({ page, kind }) => {
      await waitForStartupWrites(page);
      await seedAndReload(page, kind, false);
      const shown = await shownGlobalSwatches(page);
      const entries = await localStorageEntries(page);
      const flags: Record<string, unknown> = {};
      for (const key of Object.keys(SEEDED_FLAGS)) flags[key] = entries[key] ?? null;
      return { shown, flags, swatchesStored: parseStored(entries.swatches ?? null) };
    },
  },
  {
    id: "platform/storage/migration-fonts",
    covers: ["UI-STORAGE-012", "FMT-STORAGE-014", "FMT-GVD-012"],
    kind: "json",
    // A font imported by the old app (seeded in IndexedDB) resolves after
    // load; a family that was never imported does not.
    driver: async ({ page, kind }) => {
      await waitForStartupWrites(page);
      await seedAndReload(page, kind, true);
      return page.evaluate(async (family) => {
        const { app } = (
          window as unknown as {
            __parity: {
              app: {
                platform: {
                  resolveFont(f: string, s: string, w: number, t?: number): Promise<string>;
                };
              };
            };
          }
        ).__parity;
        return {
          imported: await app.platform.resolveFont(family, "N", 400),
          neverImported: await app.platform.resolveFont("No Such Font Family", "N", 400, 5000),
        };
      }, FONT_FAMILY);
    },
  },
]);

paritySuite("platform storage", scenarios, { newApp: false });

// The desktop app (Electron): the old electron-main.js, and once it is
// enabled the new dist-electron/main.js, started by launcher.ts in a temp
// profile. Records what the main process sets up (window, menu, embedded
// server on 127.0.0.1:47823, single-instance lock, port conflict, quit)
// and what a user's profile carries across launches. Run them on their
// own: every scenario binds the fixed port.
//
//   GD_RUN=electron npx playwright test parity/scenarios/electron --project parity --workers 1
//
// The new app is started from next/ (`electron .`, package.json "main" is
// dist-electron/main.js); build it first with
// `npx vite build && npx vite build --config vite.electron.config.ts`.
import fs from "node:fs";
import path from "node:path";
import { expect, test, type ElectronApplication, type Page } from "@playwright/test";
import { EXPECTED_ROOT, NEXT_ROOT, RECORDING } from "../../support/env.ts";
import { portedScenarioIds } from "../../support/suite.ts";
import {
  clickMenu,
  installFsaStub,
  menuState,
  migrationFontFile,
  openSettingsDialog,
  saveSettingsDialog,
  sortKeys,
  themeStylesheet,
} from "../platform/lib.ts";
import {
  closeDesktop,
  createSandbox,
  DESKTOP_ORIGIN,
  launchDesktop,
  occupyPort,
  portTaken,
  readEvents,
  spawnDesktop,
  waitForClient,
  type Launched,
  type Sandbox,
} from "./launcher.ts";
import { desktopSuite, type DesktopScenario } from "./suite.ts";

/** A .gvdesign passed on the command line (the old app ignores it). */
const SAMPLE_FILE = path.join(NEXT_ROOT, "parity", "corpus", "files", "shapes-rectangles.gvdesign");

/**
 * What the old desktop app leaves in its profile after settings-persist's
 * first launch: localStorage and IndexedDB leveldb folders, copied as they
 * are. migration-old-userdata starts the app under test on a copy of them.
 * Captured once while recording (delete the folder to capture again; the
 * leveldb files differ on every capture even when their content doesn't).
 */
const OLD_USERDATA = path.join(EXPECTED_ROOT, "electron", "old-userdata");
const PROFILE_DIRS = ["Local Storage", "IndexedDB"];

/** Lock and log files leveldb rewrites on every open; not part of the data. */
const NOT_DATA = /^(LOCK|LOG|LOG\.old)$/;

function copyProfile(from: string, to: string): void {
  for (const dir of PROFILE_DIRS) {
    const source = path.join(from, dir);
    if (!fs.existsSync(source)) continue;
    fs.cpSync(source, path.join(to, dir), {
      recursive: true,
      filter: (src) => !NOT_DATA.test(path.basename(src)),
    });
  }
}

/** The main window of a launched app, as Electron's BrowserWindow reports it. */
async function windowInfo(launched: Launched): Promise<Record<string, unknown>> {
  const bw = await launched.app.browserWindow(launched.page);
  return bw.evaluate((w) => {
    const wc = w.webContents as unknown as {
      getLastWebPreferences?: () => Record<string, unknown>;
    };
    const prefs = wc.getLastWebPreferences?.() ?? null;
    return {
      size: w.getSize(),
      contentSize: w.getContentSize(),
      minimumSize: w.getMinimumSize(),
      title: w.getTitle(),
      menuBarAutoHide: w.isMenuBarAutoHide(),
      menuBarVisible: w.isMenuBarVisible(),
      resizable: w.isResizable(),
      webPreferences: prefs
        ? {
            nodeIntegration: prefs.nodeIntegration ?? null,
            contextIsolation: prefs.contextIsolation ?? null,
            sandbox: prefs.sandbox ?? null,
          }
        : null,
    };
  });
}

async function mainProcessInfo(app: ElectronApplication): Promise<Record<string, unknown>> {
  return app.evaluate(({ app: a, BrowserWindow, Menu }) => ({
    // userData is the temp profile here; without --user-data-dir it is
    // <appData>/<name>, so the name decides where a user's data lives.
    name: a.getName(),
    applicationMenu: Menu.getApplicationMenu() === null ? null : "set",
    windows: BrowserWindow.getAllWindows().length,
  }));
}

/** Clicks "Create!" in the welcome dialog (an empty infinite document) and waits for it to close. */
async function closeWelcome(page: Page): Promise<void> {
  const dialog = page.locator(".g-new-document-dialog-container.visible");
  if ((await dialog.count()) === 0) return;
  await page.click(".g-new-document-dialog .cloud-button");
  await page.locator(".g-new-document-dialog-container").waitFor({ state: "hidden" });
  await page.locator("#header .tabs .tab").first().waitFor();
}

async function tabTitles(page: Page): Promise<string[]> {
  return page.locator("#header .tabs .tab .title .cover").allTextContents();
}

/** localStorage "designer.settings" parsed, keys sorted. */
async function storedSettings(page: Page): Promise<Record<string, unknown> | null> {
  const raw = await page.evaluate(() => localStorage.getItem("designer.settings"));
  return raw === null ? null : (sortKeys(JSON.parse(raw)) as Record<string, unknown>);
}

/** IndexedDB gravitFontsDB: the font list and the stored keys. */
async function fontDatabase(page: Page): Promise<unknown> {
  return page.evaluate(async () => {
    const dbs = await indexedDB.databases();
    if (!dbs.some((d) => d.name === "gravitFontsDB")) return null;
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("gravitFontsDB");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error ?? new Error("open failed"));
    });
    const store = () => db.transaction("gravitFonts").objectStore("gravitFonts");
    const keys = await new Promise<IDBValidKey[]>((resolve) => {
      const r = store().getAllKeys();
      r.onsuccess = () => resolve(r.result);
    });
    const list = await new Promise<unknown>((resolve) => {
      const r = store().get("_gravit_font_list_");
      r.onsuccess = () => resolve(r.result);
    });
    db.close();
    return { keys: keys.map(String).sort(), list };
  });
}

interface HttpRecord {
  request: string;
  status: number;
  contentType: string | null;
  cacheControl: string | null;
  body?: unknown;
}

/** One request to the embedded server, from Node. */
async function http(
  method: string,
  urlPath: string,
  options: { json?: unknown; body?: "text" | "json" | "none" } = {},
): Promise<HttpRecord> {
  const response = await fetch(DESKTOP_ORIGIN + urlPath, {
    method,
    redirect: "manual",
    ...(options.json !== undefined
      ? { body: JSON.stringify(options.json), headers: { "content-type": "application/json" } }
      : {}),
  });
  const out: HttpRecord = {
    request: `${method} ${urlPath}`,
    status: response.status,
    contentType: response.headers.get("content-type"),
    cacheControl: response.headers.get("cache-control"),
  };
  const mode = options.body ?? "text";
  if (method === "HEAD" || mode === "none") return out;
  const text = await response.text();
  out.body = mode === "json" ? (JSON.parse(text) as unknown) : text;
  return out;
}

/** The profile GET /user answers; its dates are the server's start time. */
function normalizeProfile(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const out = { ...(value as Record<string, unknown>) };
  for (const key of ["last_seen", "last_update"]) {
    if (typeof out[key] === "string" && !Number.isNaN(Date.parse(out[key]))) {
      out[key] = "<server start>";
    }
  }
  return out;
}

/** Routes of the old embedded server that only serve the license and cloud code. */
const DROPPED_ROUTES = [
  "/license",
  "/subscription/test",
  "/file",
  "/user?lang=1",
  "/user/settings",
];

/** The old embedded server's JSON stubs and locale route, gone in the new one. */
const DROPPED_STUBS: readonly [string, string, unknown?][] = [
  ["GET", "/maintenance/status"],
  ["GET", "/i18n-url/en-US/designer?lang=1"],
  ["GET", "/null"],
  ["PUT", "/user", { locale: 1 }],
  ["PUT", "/user", { locale: "de-DE" }],
];

/** Opens the license WebSocket from Node: its greeting, or how it was refused. */
async function licenseSocket(): Promise<unknown> {
  const ws = new WebSocket(`ws://127.0.0.1:47823/license/license?lang=1`);
  return new Promise((resolve) => {
    let opened = false;
    const timer = setTimeout(() => {
      ws.close();
      resolve({ opened, greeting: null });
    }, 5000);
    ws.addEventListener("open", () => {
      opened = true;
    });
    ws.addEventListener("message", (e) => {
      clearTimeout(timer);
      ws.close();
      resolve({ opened: true, greeting: String(e.data) });
    });
    // A refused handshake: Node's WebSocket reports the error, but its
    // close event can wait until the server drops the connection.
    ws.addEventListener("error", () => {
      if (opened) return;
      clearTimeout(timer);
      resolve({ opened: false, code: 1006 });
    });
    ws.addEventListener("close", (e) => {
      clearTimeout(timer);
      resolve({ opened: false, code: e.code });
    });
  });
}

/** Runs `body` with the app launched in `sandbox`, then quits it. */
async function withApp<T>(
  context: { kind: "old" | "new" },
  sandbox: Sandbox,
  body: (launched: Launched) => Promise<T>,
  extraArgs: readonly string[] = [],
): Promise<T> {
  const launched = await launchDesktop(context.kind, sandbox, extraArgs);
  try {
    return await body(launched);
  } finally {
    await closeDesktop(launched);
  }
}

const scenarios: DesktopScenario[] = [
  {
    id: "electron/window",
    covers: [
      "FMT-ELECTRON-002",
      "FMT-ELECTRON-004",
      "FMT-ELECTRON-005",
      "FMT-ELECTRON-006",
      "ACT-MENU-010",
    ],
    kind: "json",
    // The window the app opens and what runs in it: size and minimum size,
    // title, the hidden menu bar and no application menu at all, the
    // client loaded from http://127.0.0.1:47823 as a plain web page (no
    // Node in the page). Sizes are in device-independent pixels; they were
    // recorded at 100 % display scaling.
    run: (context) =>
      withApp(context, context.sandbox, async (launched) => {
        await closeWelcome(launched.page);
        const page = await launched.page.evaluate(() => ({
          origin: location.origin,
          path: location.pathname,
          nodeInPage: typeof (window as unknown as { require?: unknown }).require !== "undefined",
          processInPage:
            typeof (window as unknown as { process?: unknown }).process !== "undefined",
          userAgentSaysElectron: /\bElectron\//.test(navigator.userAgent),
        }));
        return {
          main: await mainProcessInfo(launched.app),
          window: await windowInfo(launched),
          page,
        };
      }),
  },
  {
    id: "electron/app-menu",
    covers: ["FMT-ELECTRON-005", "FMT-ELECTRON-010"],
    kind: "json",
    // The in-app File menu is the only menu, and it is the browser's: the
    // client never takes its Electron branches (recent documents, linked
    // images), since getRuntime() never says Electron.
    run: (context) =>
      withApp(context, context.sandbox, async (launched) => {
        await closeWelcome(launched.page);
        return {
          file: await menuState(launched.page, ["File"]),
          openRecent: await menuState(launched.page, ["File", "Open Recent"]),
        };
      }),
  },
  {
    id: "electron/embedded-server",
    covers: ["FMT-ELECTRON-001", "FMT-SERVER-004"],
    kind: "json",
    // The routes the main process serves on 127.0.0.1:47823 that the
    // rewrite keeps: the online probe, the client and the user guide.
    // (The JSON stubs and PUT /user served dropped code only; they are
    // checked in electron/embedded-server-dropped.)
    run: (context) =>
      withApp(context, context.sandbox, async () => [
        await http("GET", "/connection/test"),
        await http("HEAD", "/connection/test"),
        await http("GET", "/", { body: "none" }),
        await http("GET", "/index.html", { body: "none" }),
        await http("GET", "/docs/index.html", { body: "none" }),
        await http("GET", "/does-not-exist.js", { body: "none" }),
      ]),
  },
  {
    id: "electron/embedded-server-dropped",
    covers: ["FMT-ELECTRON-001"],
    kind: "json",
    // The license, subscription, cloud file and profile routes and the
    // license WebSocket of the old embedded server (its /license answers
    // differently from server.js), and /quota, which it lacks.
    run: (context) =>
      withApp(context, context.sandbox, async () => {
        const routes: unknown[] = [];
        for (const route of [...DROPPED_ROUTES, "/quota"]) {
          const r = await http("GET", route);
          const json = /json/.test(r.contentType ?? "");
          routes.push({
            ...r,
            body: json ? normalizeProfile(JSON.parse(String(r.body)) as unknown) : r.body,
          });
        }
        return { routes, websocket: await licenseSocket() };
      }),
    removedInNewApp: (context) =>
      withApp(context, context.sandbox, async () => {
        const left: string[] = [];
        for (const route of DROPPED_ROUTES) {
          const r = await http("GET", route, { body: "none" });
          if (r.status !== 404) left.push(`${route} answered ${r.status}`);
        }
        // The stubs that served only dropped code: the cloud maintenance
        // check, translation downloads, a request for "/null" and the
        // account locale.
        for (const [method, route, json] of DROPPED_STUBS) {
          const r = await http(method, route, { body: "none", ...(json ? { json } : {}) });
          if (r.status !== 404) left.push(`${method} ${route} answered ${r.status}`);
        }
        const ws = (await licenseSocket()) as { opened: boolean };
        if (ws.opened) left.push("the license WebSocket accepted the upgrade");
        if (left.length > 0) throw new Error(left.join("\n"));
      }),
  },
  {
    id: "electron/single-instance",
    covers: ["FMT-ELECTRON-003", "FMT-ELECTRON-008"],
    kind: "json",
    // A second launch on the same profile (with a file argument) quits at
    // once; the first instance gets "second-instance", restores its
    // minimized window and ignores the file.
    run: (context) =>
      withApp(context, context.sandbox, async (launched) => {
        await closeWelcome(launched.page);
        const bw = await launched.app.browserWindow(launched.page);
        const isMinimized = () => bw.evaluate((w) => w.isMinimized());
        await bw.evaluate((w) => w.minimize());
        await expect.poll(isMinimized, { timeout: 10_000 }).toBe(true);
        const minimized = await isMinimized();
        const secondLog = path.join(context.sandbox.root, "second-events.jsonl");
        const second = await spawnDesktop(
          context.kind,
          context.sandbox,
          [SAMPLE_FILE],
          secondLog,
        ).exited(30_000);
        // The first instance restores its window when it hears of the second.
        await expect.poll(isMinimized, { timeout: 10_000 }).toBe(false);
        return {
          minimizedBefore: minimized,
          second: { code: second.code, timedOut: second.timedOut, events: second.events },
          first: {
            events: readEvents(context.sandbox.log).filter(
              (e) => (e as { event: string }).event === "second-instance",
            ),
            minimizedAfter: await isMinimized(),
            windows: (await mainProcessInfo(launched.app)).windows,
            tabs: await tabTitles(launched.page),
          },
        };
      }),
  },
  {
    id: "electron/port-in-use",
    covers: ["FMT-ELECTRON-002"],
    kind: "json",
    // Another program holds 127.0.0.1:47823: the app shows an error box
    // (recorded by main-hook.cjs instead of a real modal), opens no window
    // and quits, rather than moving to another port (which would lose the
    // settings, see #6).
    run: async (context) => {
      const blocker = await occupyPort();
      try {
        // The old app never quits here (see the recording), so the deadline
        // ends it; 15 s is far longer than a start takes.
        const run = await spawnDesktop(context.kind, context.sandbox).exited(15_000);
        return { code: run.code, timedOut: run.timedOut, events: run.events };
      } finally {
        await new Promise<void>((resolve) => blocker.close(() => resolve()));
      }
    },
  },
  {
    id: "electron/settings-persist",
    covers: ["FMT-ELECTRON-002", "FMT-ELECTRON-006", "FMT-ELECTRON-007"],
    kind: "json",
    // First launch: dark theme in the settings dialog, rulers on, a font
    // imported; quit. Second launch on the same profile: all of it is
    // back, because the origin (fixed port) is the same.
    run: async (context) => {
      const first = await withApp(context, context.sandbox, async ({ page }) => {
        await closeWelcome(page);
        await openSettingsDialog(page);
        await page.locator(".g-settings-dialog .g-theme-selector").click();
        await page.locator(".g-overlay.theme-selector .g-theme-row", { hasText: "Dark" }).click();
        await saveSettingsDialog(page);
        await clickMenu(page, ["View", "Canvas", "Show Rulers"]);
        // Chromium in Electron has the File System Access API, so Add Fonts
        // opens a native picker; a stand-in hands it the font instead.
        await installFsaStub(page);
        await page.reload();
        await waitForClient(page);
        await closeWelcome(page);
        await page.evaluate((b64) => {
          (window as unknown as { __fsaOpen: unknown[] }).__fsaOpen = [
            { name: "MigFonts-ExtraBold.ttf", base64: b64 },
          ];
        }, migrationFontFile().bytes.toString("base64"));
        await clickMenu(page, ["File", "Import", "Add Fonts..."]);
        // Add Fonts stores the font file under "<family>_<weight>_<style>"
        // and then, in a separate transaction, the font list
        // ("_gravit_font_list_"). Both run after the menu click returns, so
        // wait for the list (written last) before quitting; otherwise the
        // second launch sees the font or not depending on timing.
        await expect
          .poll(
            async () => {
              const db = (await fontDatabase(page)) as { list?: unknown } | null;
              return Array.isArray(db?.list) ? db.list.length : 0;
            },
            { timeout: 20_000, intervals: [200] },
          )
          .toBe(1);
        await page.waitForFunction(() =>
          localStorage.getItem("designer.settings")?.includes('"rulers_visible":true'),
        );
        const stored = await storedSettings(page);
        return {
          theme: stored?.theme ?? null,
          rulers: stored?.rulers_visible ?? null,
          fonts: await fontDatabase(page),
        };
      });
      if (RECORDING && context.kind === "old" && !fs.existsSync(OLD_USERDATA)) {
        copyProfile(context.sandbox.userData, OLD_USERDATA);
      }
      const second = await withApp(context, context.sandbox, async ({ page }) => {
        const stored = await storedSettings(page);
        return {
          origin: await page.evaluate(() => location.origin),
          theme: stored?.theme ?? null,
          rulers: stored?.rulers_visible ?? null,
          stylesheet: await themeStylesheet(page),
          fonts: await fontDatabase(page),
        };
      });
      return { first, second };
    },
  },
  {
    id: "electron/migration-old-userdata",
    covers: ["FMT-ELECTRON-002", "UI-STORAGE-002", "UI-STORAGE-012"],
    kind: "json",
    // First launch on a profile the old desktop app left behind (copied
    // from expected/electron/old-userdata): the settings, theme, rulers and
    // the imported font must all be read back.
    run: async (context) => {
      if (!fs.existsSync(OLD_USERDATA)) {
        throw new Error(`${OLD_USERDATA} is missing: record electron/settings-persist first`);
      }
      copyProfile(OLD_USERDATA, context.sandbox.userData);
      return withApp(context, context.sandbox, async ({ page }) => {
        await closeWelcome(page);
        return {
          settings: await storedSettings(page),
          stylesheet: await themeStylesheet(page),
          rulerWidgets: await page.locator(".g-ruler-widget:visible").count(),
          canvasMenu: await menuState(page, ["View", "Canvas"]),
          fonts: await fontDatabase(page),
        };
      });
    },
  },
  {
    id: "electron/file-argument",
    covers: ["FMT-ELECTRON-008"],
    kind: "json",
    // A .gvdesign on the command line of the first launch: ignored, the
    // welcome dialog shows and no document opens.
    run: (context) =>
      withApp(
        context,
        context.sandbox,
        async ({ page }) => ({
          welcome: await page.locator(".g-new-document-dialog-container.visible").count(),
          tabs: await tabTitles(page),
        }),
        [SAMPLE_FILE],
      ),
  },
  {
    id: "electron/lifecycle",
    covers: ["FMT-ELECTRON-007"],
    kind: "json",
    // Closing the only window quits the app (on every platform) and stops
    // the embedded server.
    run: async (context) => {
      const launched = await launchDesktop(context.kind, context.sandbox);
      await waitForClient(launched.page);
      const exited = new Promise<number | null>((resolve) =>
        launched.app.process().once("exit", (code) => resolve(code)),
      );
      const before = await portTaken();
      await launched.app.evaluate(({ BrowserWindow }) => {
        for (const w of BrowserWindow.getAllWindows()) w.close();
      });
      const code = await exited;
      return {
        portTakenWhileRunning: before,
        exitCode: code,
        portTakenAfterQuit: await portTaken(),
        events: readEvents(context.sandbox.log),
      };
    },
  },
];

desktopSuite("electron desktop", scenarios, { newApp: false });

/**
 * A profile of the released old desktop app (1.0, which served the page
 * from a random port, so each launch had its own origin): launch 1 set the
 * dark theme and imported a font, launch 2 (newer) turned the rulers on.
 * Made with the release build in a temp profile; see
 * src/app/migration/plan.ts.
 */
const RELEASE_PROFILE = path.join(
  NEXT_ROOT,
  "src",
  "app",
  "migration",
  "fixtures",
  "old-release-profile",
);

/** Window creations main-hook.cjs logged. */
function windowsCreated(log: string): number {
  return readEvents(log).filter((e) => (e as { event: string }).event === "browser-window-created")
    .length;
}

// Not a parity comparison: the old app never read the data of its earlier
// origins, so there is no old output to match. Runs with the new desktop
// scenarios (in this file, since every desktop test binds port 47823).
const newDesktopEnabled = [...portedScenarioIds()].some((id) => id.startsWith("electron/"));
if (!RECORDING && newDesktopEnabled) {
  test.describe("new desktop app: first start after the released old app", () => {
    test("takes over the newest session's settings and every imported font, once", async () => {
      test.setTimeout(240_000);
      const sandbox = createSandbox("migration");
      try {
        copyProfile(RELEASE_PROFILE, sandbox.userData);
        const first = await withApp({ kind: "new" }, sandbox, async ({ page }) => ({
          settings: await storedSettings(page),
          keys: await page.evaluate(() => Object.keys(localStorage).sort()),
          fonts: await fontDatabase(page),
          stylesheet: await themeStylesheet(page),
        }));
        // Launch 2 of the old app is the newest: light theme, rulers on.
        expect(first.settings).toMatchObject({ theme: "light", rulers_visible: true });
        expect(first.stylesheet).toEqual(["/designer.browser.light.css"]);
        // The licence, update check and analytics keys stay behind.
        expect(first.keys).not.toContain("offline_cache");
        expect(first.keys).not.toContain("gtm:clientid");
        // The font imported in launch 1.
        expect(first.fonts).toEqual({
          keys: ["Mig Fonts Extrabold_400_N", "_gravit_font_list_"],
          list: [
            {
              style: "N",
              weight: "400",
              family: "Mig Fonts Extrabold",
              subfamily: "Extrabold",
              displayname: "Mig Fonts",
            },
          ],
        });
        const marker = path.join(sandbox.userData, "gravit-migration.json");
        const report = JSON.parse(fs.readFileSync(marker, "utf8")) as Record<string, unknown>;
        expect(report).toMatchObject({
          localStorage: { "designer.settings": "http://127.0.0.1:64009" },
          fonts: ["Mig Fonts Extrabold_400_N"],
          origins: ["http://127.0.0.1:54572", "http://127.0.0.1:64009"],
          errors: [],
        });
        // The hidden migration window and the main window.
        expect(windowsCreated(sandbox.log)).toBe(2);

        // A second start doesn't migrate again: the dark theme chosen now
        // stays, and only the main window opens.
        await withApp({ kind: "new" }, sandbox, async ({ page }) => {
          await page.evaluate(() => {
            const s = JSON.parse(localStorage.getItem("designer.settings") ?? "{}") as object;
            localStorage.setItem("designer.settings", JSON.stringify({ ...s, theme: "dark" }));
          });
        });
        fs.rmSync(sandbox.log, { force: true });
        const second = await withApp({ kind: "new" }, sandbox, async ({ page }) => ({
          settings: await storedSettings(page),
          fonts: await fontDatabase(page),
        }));
        expect(second.settings).toMatchObject({ theme: "dark", rulers_visible: true });
        expect(second.fonts).toEqual(first.fonts);
        expect(windowsCreated(sandbox.log)).toBe(1);
        expect(JSON.parse(fs.readFileSync(marker, "utf8"))).toEqual(report);
      } finally {
        await removeSandbox(sandbox);
      }
    });
  });
}

/**
 * Removes a sandbox once Electron's helper processes have let go of their
 * cache files (they can outlive the main process by a moment on Windows).
 */
async function removeSandbox(sandbox: Sandbox): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      sandbox.remove();
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "EBUSY" && code !== "EPERM") throw error;
      if (attempt >= 60) {
        // Only a temp folder; don't fail the test for it.
        console.warn(`could not remove ${sandbox.root}: ${String(error)}`);
        return;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

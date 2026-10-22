import fs from "node:fs";
import path from "node:path";
import type { BrowserContext, Page } from "@playwright/test";
import { NEW_URL, OLD_URL, NEXT_ROOT } from "./env.ts";
import { activeMutationPatch } from "./mutations.ts";

export type AppKind = "old" | "new";

export interface OpenOptions {
  /** "light" (default) or "dark". Written to the settings before load. */
  theme?: "light" | "dark";
  /** Language code stored in the settings before load. */
  language?: string;
  /**
   * Keep the File System Access API. By default it is hidden so both apps
   * fall back to the file input and Blob downloads, which Playwright can
   * drive.
   */
  fileSystemAccess?: boolean;
  /** Extra settings merged into localStorage "designer.settings". */
  settings?: Record<string, unknown>;
  /**
   * Open the page in a touch-enabled context (`"ontouchstart" in window`),
   * for the touch-only code paths. Applied when the harness creates the
   * context (scenario `open`); it can't be switched on an existing page.
   */
  hasTouch?: boolean;
  /** Create an empty infinite-canvas document and close the welcome dialog. */
  newDocument?: boolean;
}

const oldHarness = fs.readFileSync(
  path.join(NEXT_ROOT, "parity", "support", "old-harness.js"),
  "utf8",
);

/** Per-area hooks for the old app: parity/scenarios/<area>/old-hooks.js. */
function oldAreaHooks(): string[] {
  const dir = path.join(NEXT_ROOT, "parity", "scenarios");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(dir, e.name, "old-hooks.js")))
    .map((e) => fs.readFileSync(path.join(dir, e.name, "old-hooks.js"), "utf8"));
}

/**
 * Browser context settings every parity page uses, so recordings don't
 * depend on the machine: the old engine picks its strings from
 * navigator.language, and dates and number formats follow the locale and
 * time zone. Spread these into every browser.newContext() call.
 */
export const PARITY_CONTEXT = {
  locale: "en-US",
  timezoneId: "UTC",
  deviceScaleFactor: 1,
  colorScheme: "light",
} as const;

export function appUrl(kind: AppKind): string {
  return kind === "old" ? OLD_URL : NEW_URL;
}

/**
 * Blocks every request that leaves the machine. The old app calls
 * analytics and a CDN for library icons; neither may influence a test.
 */
export async function isolateNetwork(context: BrowserContext): Promise<void> {
  await context.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, (route) => route.abort());
}

async function prepareContext(page: Page, options: OpenOptions): Promise<void> {
  const settings: Record<string, unknown> = { ...options.settings };
  if (options.theme) settings.theme = options.theme;
  if (options.language) settings.language = options.language;
  await page.addInitScript(
    ({ settings: s, hideFileSystemAccess }) => {
      if (hideFileSystemAccess) {
        const w = window as unknown as Record<string, unknown>;
        w.showOpenFilePicker = undefined;
        w.showSaveFilePicker = undefined;
        w.chooseFileSystemEntries = undefined;
      }
      if (Object.keys(s).length > 0 && !sessionStorage.getItem("__parity_settings_done")) {
        sessionStorage.setItem("__parity_settings_done", "1");
        const current = JSON.parse(localStorage.getItem("designer.settings") ?? "{}") as Record<
          string,
          unknown
        >;
        localStorage.setItem("designer.settings", JSON.stringify({ ...current, ...s }));
      }
    },
    { settings, hideFileSystemAccess: options.fileSystemAccess !== true },
  );
}

async function waitUntilBooted(page: Page, kind: AppKind): Promise<void> {
  if (kind === "old") {
    await page.waitForFunction(
      () => {
        const d = (window as unknown as { gDesigner?: { isReady?: () => boolean } }).gDesigner;
        return !!d && typeof d.isReady === "function" && d.isReady();
      },
      null,
      { timeout: 60_000 },
    );
  } else {
    await page.waitForFunction(
      () => !!(window as unknown as { __parity?: unknown }).__parity,
      null,
      { timeout: 60_000 },
    );
  }
}

/** Opens one of the two apps and waits until window.__parity is usable. */
export async function openApp(page: Page, kind: AppKind, options: OpenOptions = {}): Promise<void> {
  await prepareContext(page, options);
  // Under heavy parallel load an app boot occasionally stalls or the
  // navigation is aborted (ERR_NO_BUFFER_SPACE, chrome-error redirects:
  // Windows runs short of sockets). Booting is not what the tests compare,
  // so a failed boot is retried up to three times with a pause in between.
  const attempts = 3;
  for (let attempt = 1; ; attempt++) {
    try {
      await page.goto(appUrl(kind));
      await waitUntilBooted(page, kind);
      break;
    } catch (error) {
      if (attempt >= attempts) {
        throw new Error(
          `the ${kind} app did not boot ${attempts} times in a row: ${String(error)}`,
          {
            cause: error,
          },
        );
      }
      console.warn(
        `[parity] ${kind} app did not boot (attempt ${attempt}), retrying: ${String(error)}`,
      );
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
  }
  if (kind === "old") {
    await page.evaluate(oldHarness);
    for (const hooks of oldAreaHooks()) await page.evaluate(hooks);
  }
  const mutation = activeMutationPatch(kind);
  if (mutation) await page.evaluate(mutation);
  if (options.newDocument) {
    await page.evaluate(() => {
      (window as unknown as ParityWindow).__parity.app.newInfiniteDocument();
    });
  }
}

/** Shape of window.__parity in both apps, as far as Node code needs it. */
export interface ParityWindow {
  __parity: {
    G: Record<string, unknown>;
    app: { kind: AppKind; newInfiniteDocument(): void } & Record<string, unknown>;
  };
}

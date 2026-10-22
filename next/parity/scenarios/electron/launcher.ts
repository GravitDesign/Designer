// Starts either desktop app (the old electron-main.js or the new
// dist-electron/main.js) in a throw-away profile, so the user's real
// Gravit Designer profile is never touched:
// - Chromium's --user-data-dir points at a temp folder, which Electron uses
//   as app.getPath("userData") (and for its single-instance lock);
// - APPDATA, LOCALAPPDATA, HOME and XDG_CONFIG_HOME point into the same
//   temp folder, so even a build that ignored the switch would write there;
// - main-hook.cjs runs before the app's own main script and exits at once
//   (code 97) if userData is anywhere else.
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { _electron, type ElectronApplication, type Page } from "@playwright/test";
import type { AppKind } from "../../support/apps.ts";
import { LEGACY_ROOT, NEXT_ROOT, RECORDING } from "../../support/env.ts";
import { loadMutations } from "../../support/mutations.ts";

/** The port both desktop apps serve the client from (FMT-ELECTRON-002). */
export const DESKTOP_PORT = 47823;
export const DESKTOP_ORIGIN = `http://127.0.0.1:${DESKTOP_PORT}`;

interface DesktopApp {
  /** The Electron executable from that app's own node_modules. */
  electron: string;
  /** Folder whose package.json "main" is the app (what `electron .` runs). */
  appDir: string;
  /** Files that must exist before the app can start, with how to make them. */
  needs: { file: string; build: string }[];
}

function electronBinary(root: string): string {
  // The electron package's index.js exports the path of its executable.
  const req = createRequire(path.join(root, "package.json"));
  return req("electron") as string;
}

export function desktopApp(kind: AppKind): DesktopApp {
  if (kind === "old") {
    return {
      electron: electronBinary(LEGACY_ROOT),
      appDir: LEGACY_ROOT,
      needs: [{ file: path.join(LEGACY_ROOT, "electron-main.js"), build: "(part of the old app)" }],
    };
  }
  return {
    electron: electronBinary(NEXT_ROOT),
    appDir: NEXT_ROOT,
    needs: [
      {
        file: path.join(NEXT_ROOT, "dist-electron", "main.js"),
        build: "npx vite build --config vite.electron.config.ts",
      },
      { file: path.join(NEXT_ROOT, "dist", "index.html"), build: "npx vite build" },
    ],
  };
}

const HOOK = path.join(NEXT_ROOT, "parity", "scenarios", "electron", "main-hook.cjs");
const PLAYWRIGHT_LOADER = path.join(
  path.dirname(createRequire(import.meta.url).resolve("playwright-core/package.json")),
  "lib",
  "server",
  "electron",
  "loader.js",
);

/** A temp folder holding one test's profile (userData) and fake home folders. */
export interface Sandbox {
  root: string;
  userData: string;
  /** Where main-hook.cjs appends one JSON line per native dialog and event. */
  log: string;
  remove(): void;
}

export function createSandbox(label: string): Sandbox {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `gd-electron-${label}-`));
  const userData = path.join(root, "userData");
  fs.mkdirSync(userData);
  return {
    root,
    userData,
    log: path.join(root, "main-events.jsonl"),
    remove: () => fs.rmSync(root, { recursive: true, force: true, maxRetries: 5 }),
  };
}

/**
 * The main-process patch of the active mutation (GD_MUTATION), if it is one
 * for the desktop app: mutations with `"target": "electron-main"` hold
 * main-process JavaScript in patch.old / patch.new, which main-hook.cjs
 * runs before the app's main script (`app` and `require` in scope).
 */
function mainProcessPatch(kind: AppKind): string | undefined {
  const id = process.env.GD_MUTATION;
  if (!id) return undefined;
  if (RECORDING) throw new Error("never record with a mutation active");
  const mutation = loadMutations().find((m) => m.id === id) as
    (ReturnType<typeof loadMutations>[number] & { target?: string }) | undefined;
  if (!mutation) throw new Error(`GD_MUTATION=${id} is not in parity/mutations/`);
  return mutation.target === "electron-main" ? mutation.patch[kind] : undefined;
}

function sandboxEnv(
  kind: AppKind,
  sandbox: Sandbox,
  logFile = sandbox.log,
): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    // VS Code and some agents export ELECTRON_RUN_AS_NODE=1, which turns
    // electron.exe into plain Node and makes it reject Chromium switches.
    if (key === "ELECTRON_RUN_AS_NODE" || key === "NODE_OPTIONS") continue;
    if (value !== undefined) env[key] = value;
  }
  const home = path.join(sandbox.root, "home");
  for (const dir of ["Roaming", "Local", "home", "config"]) {
    fs.mkdirSync(path.join(sandbox.root, dir), { recursive: true });
  }
  env.APPDATA = path.join(sandbox.root, "Roaming");
  env.LOCALAPPDATA = path.join(sandbox.root, "Local");
  env.HOME = home;
  env.USERPROFILE = home;
  env.XDG_CONFIG_HOME = path.join(sandbox.root, "config");
  env.GD_ELECTRON_SANDBOX = sandbox.root;
  env.GD_ELECTRON_LOG = logFile;
  const patch = mainProcessPatch(kind);
  if (patch) env.GD_ELECTRON_MAIN_PATCH = patch;
  return env;
}

function checkBuilt(app: DesktopApp): void {
  for (const need of app.needs) {
    if (!fs.existsSync(need.file)) {
      throw new Error(`${need.file} is missing; build it first: ${need.build}`);
    }
  }
}

/** Resolves once nothing listens on the desktop port (the previous app has quit). */
export async function waitForFreePort(timeoutMs = 20_000): Promise<void> {
  const end = Date.now() + timeoutMs;
  for (;;) {
    if (!(await portTaken())) return;
    if (Date.now() > end) {
      throw new Error(
        `port ${DESKTOP_PORT} is in use. Close any running Gravit Designer desktop app ` +
          "(or whatever else listens there) before running the electron suite.",
      );
    }
    await new Promise((r) => setTimeout(r, 200));
  }
}

export function portTaken(): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port: DESKTOP_PORT });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

/** Arguments after the app folder: the profile switch and any extra ones (files). */
function appArgs(app: DesktopApp, sandbox: Sandbox, extra: readonly string[]): string[] {
  return ["-r", HOOK, app.appDir, `--user-data-dir=${sandbox.userData}`, ...extra];
}

export interface Launched {
  app: ElectronApplication;
  /** The main window, once the client has booted. */
  page: Page;
}

/**
 * Starts the app under Playwright control and waits for its first window
 * to show the booted client (menu bar present, startup settings written).
 */
export async function launchDesktop(
  kind: AppKind,
  sandbox: Sandbox,
  extraArgs: readonly string[] = [],
): Promise<Launched> {
  const desktop = desktopApp(kind);
  checkBuilt(desktop);
  await waitForFreePort();
  const app = await _electron.launch({
    executablePath: desktop.electron,
    // An explicit executablePath makes Playwright skip its loader, which
    // holds back the "ready" event until Playwright is attached; add it.
    args: ["-r", PLAYWRIGHT_LOADER, ...appArgs(desktop, sandbox, extraArgs)],
    env: sandboxEnv(kind, sandbox),
    cwd: desktop.appDir,
    timeout: 60_000,
  });
  const page = await app.firstWindow({ timeout: 60_000 });
  await waitForClient(page);
  return { app, page };
}

/** Waits until the client in a desktop window has booted. */
export async function waitForClient(page: Page): Promise<void> {
  await page.waitForLoadState("load");
  await page.locator("nav.g-menu-bar").waitFor({ timeout: 60_000 });
  // The app writes the merged settings once its startup checks ran; later
  // reads then start from a settled state.
  await page.waitForFunction(() => localStorage.getItem("designer.settings") !== null, null, {
    timeout: 60_000,
  });
  await page.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  );
}

/** Quits the app the way closing its window does, and waits for the port to be released. */
export async function closeDesktop(launched: Launched): Promise<void> {
  await launched.app.close();
  await waitForFreePort();
}

export interface Exited {
  code: number | null;
  signal: string | null;
  /** True when the process was still running at the deadline and was killed. */
  timedOut: boolean;
  /** What main-hook.cjs logged (native dialogs, windows created, quit). */
  events: unknown[];
}

/**
 * Starts the app as a plain process (no Playwright), for launches that are
 * expected to end by themselves: a second instance, a taken port.
 */
export function spawnDesktop(
  kind: AppKind,
  sandbox: Sandbox,
  extraArgs: readonly string[] = [],
  /** Log file for this process's main-hook events (default: the sandbox log). */
  logFile = sandbox.log,
): { child: ChildProcess; exited: (timeoutMs?: number) => Promise<Exited> } {
  const desktop = desktopApp(kind);
  checkBuilt(desktop);
  const child = spawn(desktop.electron, appArgs(desktop, sandbox, extraArgs), {
    env: sandboxEnv(kind, sandbox, logFile),
    cwd: desktop.appDir,
    stdio: "ignore",
  });
  const done = new Promise<{ code: number | null; signal: string | null }>((resolve) =>
    child.once("exit", (code, signal) => resolve({ code, signal })),
  );
  return {
    child,
    exited: async (timeoutMs = 30_000) => {
      let timer: NodeJS.Timeout | undefined;
      const deadline = new Promise<"timeout">((resolve) => {
        timer = setTimeout(() => resolve("timeout"), timeoutMs);
      });
      const first = await Promise.race([done, deadline]);
      clearTimeout(timer);
      let timedOut = false;
      let result: { code: number | null; signal: string | null };
      if (first === "timeout") {
        timedOut = true;
        child.kill();
        result = await done;
      } else {
        result = first;
      }
      return { ...result, timedOut, events: readEvents(logFile) };
    },
  };
}

/** The JSON lines main-hook.cjs wrote so far to `file`. */
export function readEvents(file: string): unknown[] {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as unknown);
}

/** Occupies the desktop port, as another program would. */
export async function occupyPort(): Promise<net.Server> {
  await waitForFreePort();
  const server = net.createServer((socket) => socket.destroy());
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(DESKTOP_PORT, "127.0.0.1", () => resolve());
  });
  return server;
}

// Old: electron-main.js (the desktop app's main process).
/**
 * The desktop app: an embedded HTTP server (server/app.ts) on
 * 127.0.0.1:47823 and one window that loads the client from it, as a
 * plain web page (no Node in the page, no application menu). One instance
 * only. Added for the rewrite: the first-start migration from the old
 * releases' profile (migration.ts) and the software update channel to
 * electron-updater (updater.ts, preload.cjs).
 */
import type http from "node:http";
import path from "node:path";
import { app, BrowserWindow, Menu, dialog } from "electron";
import { createServer } from "../server/app.ts";
import { ASSETS_ROOT } from "../server/paths.ts";
import { migrateLegacyProfile } from "./migration.ts";
import { installUpdater } from "./updater.ts";

/**
 * Fixed port, so the page origin (http://127.0.0.1:47823) stays the same
 * across launches. localStorage and IndexedDB, where the settings and
 * imported fonts live, are partitioned by origin; a random port would
 * start every launch empty (#6). The old app used the same port since #6,
 * so its users keep their data.
 */
export const FIXED_PORT = 47823;
export const ORIGIN = `http://127.0.0.1:${FIXED_PORT}`;

let mainWindow: BrowserWindow | null = null;
let server: http.Server | null = null;
/** True while the first-start migration runs; its hidden window closing must not quit the app. */
let migrating = false;

function startServer(): Promise<number> {
  return new Promise((resolve) => {
    server = createServer();
    // The old app attached its license WebSocket server (routes/ws.js)
    // before its own error handler. The ws server re-emitted the listen
    // error on itself, which had no listener, so the error became an
    // uncaught exception in the main process: Electron's "A JavaScript
    // error occurred in the main process" box, no window, the process
    // kept running and held the single-instance lock. The handler below
    // it never ran. Kept as it was (parity electron/port-in-use); see the
    // BUGS-FIXED candidate "Port in use: the friendly error box never
    // shows".
    server.on("error", (err) => {
      throw err;
    });
    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        // A random port would change the origin and reset the settings, so
        // report the conflict instead.
        dialog.showErrorBox(
          "Gravit Designer",
          `Port ${FIXED_PORT} is already in use. Another instance may be ` +
            `running, or another program is using the port. Close it and ` +
            `relaunch Gravit Designer.`,
        );
      } else {
        dialog.showErrorBox("Gravit Designer", `Server error: ${err.message}`);
      }
      app.quit();
    });
    server.listen(FIXED_PORT, "127.0.0.1", () => {
      console.log(`Embedded server on ${ORIGIN}`);
      resolve(FIXED_PORT);
    });
  });
}

function createWindow(port: number): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: "Gravit Designer",
    icon: path.join(ASSETS_ROOT, "prerendered", "icon512.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // Exposes only the update channel (window.gravitDesktop.updates).
      preload: path.join(import.meta.dirname, "..", "electron", "preload.cjs"),
    },
    autoHideMenuBar: true,
  });
  Menu.setApplicationMenu(null);
  void mainWindow.loadURL(`http://127.0.0.1:${port}`);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// One instance only, so the fixed port is reliably ours. A second launch
// focuses the existing window (and, as before, ignores its arguments).
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });
  app.on("ready", async () => {
    installUpdater(() => mainWindow);
    const port = await startServer();
    migrating = true;
    try {
      await migrateLegacyProfile(app.getPath("userData"), ORIGIN);
    } finally {
      migrating = false;
    }
    createWindow(port);
  });
}

app.on("window-all-closed", () => {
  if (migrating) return;
  server?.close();
  app.quit();
});

app.on("activate", () => {
  if (mainWindow === null) {
    if (server) createWindow(FIXED_PORT);
    else void startServer().then(createWindow);
  }
});

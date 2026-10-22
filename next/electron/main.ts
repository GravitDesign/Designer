import http from "node:http";
import path from "node:path";
import { app, BrowserWindow, Menu, dialog } from "electron";
import { createApp } from "../server/app.ts";

/**
 * Fixed port, so the page origin (http://127.0.0.1:47823) stays the same
 * across launches. localStorage, where the settings live, is partitioned by
 * origin; a random port would start every launch with empty settings. The
 * old app used the same port, so its users keep their settings.
 */
export const FIXED_PORT = 47823;

let mainWindow: BrowserWindow | null = null;
let server: http.Server | null = null;

function appRoot(): string {
  // Packaged: resources/app; development: next/.
  return app.isPackaged ? app.getAppPath() : path.resolve(import.meta.dirname, "..");
}

function startServer(): Promise<number> {
  return new Promise((resolve) => {
    const root = appRoot();
    server = http.createServer(
      createApp({
        clientRoot: path.join(root, "dist"),
      }),
    );
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
    server.listen(FIXED_PORT, "127.0.0.1", () => resolve(FIXED_PORT));
  });
}

function createWindow(port: number): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: "Gravit Designer",
    icon: path.join(appRoot(), "public", "assets", "prerendered", "icon512.png"),
    webPreferences: { nodeIntegration: false, contextIsolation: true },
    autoHideMenuBar: true,
  });
  Menu.setApplicationMenu(null);
  void mainWindow.loadURL(`http://127.0.0.1:${port}`);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// One instance only, so the fixed port is reliably ours. A second launch
// focuses the existing window.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });
  app.on("ready", () => {
    void startServer().then(createWindow);
  });
}

app.on("window-all-closed", () => {
  server?.close();
  app.quit();
});

app.on("activate", () => {
  if (mainWindow === null) {
    if (server) createWindow(FIXED_PORT);
    else void startServer().then(createWindow);
  }
});

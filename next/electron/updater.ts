/**
 * Software updates for the desktop app: electron-updater, checking the
 * GitHub releases of GravitDesign/designer (the "publish" entry of the
 * electron-builder config, which writes resources/app-update.yml).
 *
 * The client drives it: its update manager (src/app/dialogs/
 * software-update-manager.ts, through electron-update-client.ts) sends
 * the commands "check-for-updates", "donwload-update" (the old spelling)
 * and "install-update" over the preload's channel (preload.cjs), and gets
 * electron-updater's events back under the old channel names
 * (update-event-names.ts). Nothing downloads without the user asking.
 */
import { app, ipcMain, type BrowserWindow } from "electron";
import { autoUpdater } from "electron-updater";
import { UpdateEventNames } from "../src/app/dialogs/update-event-names.ts";

/** Why updates can't run in this build, or null when they can. */
export function updatesUnavailableReason(): string | null {
  if (!app.isPackaged) return "Updates are only available in the installed app.";
  // electron-updater can't replace the portable .exe (it updates the NSIS install).
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    return "The portable version can't update itself. Download the new version from the releases page.";
  }
  if (!autoUpdater) return "The update module is not part of this build.";
  return null;
}

/** JSON-safe copy of an updater event's data (it crosses IPC and the context bridge). */
function plain(data: unknown): unknown {
  if (data instanceof Error) return { message: data.message };
  if (data === undefined) return undefined;
  try {
    return JSON.parse(JSON.stringify(data)) as unknown;
  } catch {
    return String(data);
  }
}

export function installUpdater(mainWindow: () => BrowserWindow | null): void {
  const send = (channel: string, data?: unknown): void => {
    const win = mainWindow();
    if (win && !win.isDestroyed()) win.webContents.send(channel, plain(data));
  };
  const unavailable = updatesUnavailableReason();

  if (autoUpdater && !unavailable) {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;
    for (const channel of [
      UpdateEventNames.CheckingForUpdate,
      UpdateEventNames.UpdateAvailable,
      UpdateEventNames.UpdateNotAvailable,
      UpdateEventNames.DownloadProgress,
      UpdateEventNames.UpdateDownloaded,
      UpdateEventNames.Error,
    ]) {
      autoUpdater.on(channel, (data?: unknown) => send(channel, data));
    }
  }

  ipcMain.on(UpdateEventNames.CommandCheckForUpdates, () => {
    if (unavailable || !autoUpdater) {
      send(UpdateEventNames.Error, { message: unavailable });
      return;
    }
    // The "error" event reports failures; the promise rejects as well.
    autoUpdater.checkForUpdates().catch(() => {});
  });
  ipcMain.on(UpdateEventNames.CommandDownloadUpdate, () => {
    if (unavailable || !autoUpdater) return;
    autoUpdater.downloadUpdate().catch(() => {});
  });
  ipcMain.on(UpdateEventNames.CommandInstallUpdate, () => {
    if (unavailable || !autoUpdater) return;
    autoUpdater.quitAndInstall();
  });
}

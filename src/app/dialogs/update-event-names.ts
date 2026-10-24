// Old: designer.browser.dev.js module 1349 (the Electron updater message names).
/**
 * The IPC channel names between the app and the Electron updater.
 * "donwload-update" is the old spelling; the main process listened for it.
 */
export const UpdateEventNames = {
  CheckingForUpdate: "checking-for-update",
  UpdateAvailable: "update-available",
  UpdateNotAvailable: "update-not-available",
  Error: "error",
  DownloadProgress: "download-progress",
  UpdateDownloaded: "update-downloaded",
  CommandInstallUpdate: "install-update",
  CommandDownloadUpdate: "donwload-update",
  CommandCheckForUpdates: "check-for-updates",
} as const;

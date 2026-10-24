/* global require, process */
/* eslint-disable @typescript-eslint/no-require-imports -- a sandboxed preload is a CommonJS script */
// Preload of the main window (sandboxed, context isolation on). It gives
// the page one thing: the software update channel to the main process
// (updater.ts), as window.gravitDesktop.updates with the two methods of
// ipcRenderer the client uses (src/app/dialogs/electron-update-client.ts
// UpdateTransport). Only the update channel names pass; the page gets no
// other access to Electron or Node. With GD_BRANDING set for the main
// process (electron/branding.ts), it also gives the page the look as
// window.__gdBranding, before the page's own scripts run.
const { contextBridge, ipcRenderer } = require("electron");

const BRANDING_SWITCH = "--gd-branding=";
const branding = process.argv
  .filter((arg) => arg.startsWith(BRANDING_SWITCH))
  .map((arg) => arg.slice(BRANDING_SWITCH.length))
  .find((value) => value === "classic" || value === "next");
if (branding) contextBridge.exposeInMainWorld("__gdBranding", branding);

// src/app/dialogs/update-event-names.ts ("donwload-update" is the old spelling).
const COMMANDS = ["check-for-updates", "donwload-update", "install-update"];
const EVENTS = [
  "checking-for-update",
  "update-available",
  "update-not-available",
  "error",
  "download-progress",
  "update-downloaded",
];

contextBridge.exposeInMainWorld("gravitDesktop", {
  updates: {
    send(channel) {
      if (COMMANDS.includes(channel)) ipcRenderer.send(channel);
    },
    on(channel, listener) {
      if (!EVENTS.includes(channel) || typeof listener !== "function") return;
      // The IPC event object can't cross the context bridge; the client
      // ignores it anyway.
      ipcRenderer.on(channel, (_event, data) => listener(null, data));
    },
  },
});

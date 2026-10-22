/* global require, process */
/* eslint-disable @typescript-eslint/no-require-imports -- Electron's -r loads this file with require, so it has to be CommonJS */
// Preloaded into the desktop app's main process (`electron -r main-hook.cjs
// <app>`) by launcher.ts, before the app's own main script runs. Plain
// CommonJS on purpose: Electron loads it with require for both apps.
//
// 1. Safety: refuses to run unless userData is inside the test's temp
//    folder (GD_ELECTRON_SANDBOX), so a test can never write to the user's
//    real profile.
// 2. Records what the main process does that a test can't see from the
//    window: native error boxes (replaced by a log entry, since a real one
//    is a modal that blocks until someone clicks it), windows created,
//    second-instance events and quitting. Each is one JSON line appended to
//    GD_ELECTRON_LOG.
const fs = require("node:fs");
const path = require("node:path");
const { app, dialog } = require("electron");

const sandbox = process.env.GD_ELECTRON_SANDBOX;
const userData = app.getPath("userData");
const inside = (dir, root) => {
  const rel = path.relative(path.resolve(root), path.resolve(dir));
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
};
if (!sandbox || !inside(userData, sandbox)) {
  process.stderr.write(
    `main-hook: userData ${userData} is outside the test sandbox ${sandbox}; refusing to start\n`,
  );
  process.exit(97);
}

const logFile = process.env.GD_ELECTRON_LOG;
const log = (entry) => {
  if (logFile) fs.appendFileSync(logFile, JSON.stringify(entry) + "\n");
};

dialog.showErrorBox = (title, content) => {
  log({ event: "showErrorBox", title: String(title), content: String(content) });
};

app.on("browser-window-created", () => log({ event: "browser-window-created" }));
app.on("second-instance", (_event, argv) => {
  // Only the file-like arguments: the rest are Chromium switches and paths
  // that differ per machine.
  log({
    event: "second-instance",
    files: argv.filter((a) => /\.gvdesign$/i.test(a)).map((a) => path.basename(a)),
  });
});
app.on("will-quit", () => log({ event: "will-quit" }));

// A mutation (parity/mutations/*.json, "target": "electron-main") that
// breaks one main-process feature, to prove the scenarios notice.
if (process.env.GD_ELECTRON_MAIN_PATCH) {
  new Function("app", "require", process.env.GD_ELECTRON_MAIN_PATCH)(app, require);
}

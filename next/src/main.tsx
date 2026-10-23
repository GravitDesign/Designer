/**
 * The app's entry: one React root on #root, the shell connected to it,
 * then the old start sequence (src/app/shell/pwa-boot.ts, bootstrap.ts).
 * The parity bridge (window.__parity) is installed once the app is ready,
 * so the harness never sees a half-booted app.
 */
import { createRoot } from "react-dom/client";
import { BrowserContainer } from "./app/shell/browser-container.ts";
import { boot } from "./app/shell/bootstrap.ts";
import { installShell } from "./app/shell/mount.tsx";
import { startApp } from "./app/shell/pwa-boot.ts";
import { installParityBridge } from "./parity/bridge.ts";

const container = document.getElementById("root");
if (!container) throw new Error("missing #root");

installShell(createRoot(container));

startApp(() => new BrowserContainer(), boot).then(
  () => installParityBridge(),
  (error: unknown) => console.error("[boot] the app did not start", error),
);

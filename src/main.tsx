/**
 * The app's entry: the shell connected to the designer (its React root is
 * #mainframe, created in Designer.init), then the old start sequence (src/app/shell/pwa-boot.ts, bootstrap.ts).
 * The look (GravitDesign Next or classic, src/app/brand/branding.ts) is
 * taken over first; the introduction opens once the app is ready.
 * The parity bridge (window.__parity) is installed once the app is ready,
 * so the harness never sees a half-booted app.
 */
import { afterAppStarted, startBranding } from "./app/brand/start.ts";
import { BrowserContainer } from "./app/shell/browser-container.ts";
import { boot } from "./app/shell/bootstrap.ts";
import { installShell } from "./app/shell/mount.tsx";
import { startApp } from "./app/shell/pwa-boot.ts";
import { installParityBridge } from "./parity/bridge.ts";

startBranding();
installShell();

startApp(() => new BrowserContainer(), boot).then(
  () => {
    afterAppStarted();
    installParityBridge();
  },
  (error: unknown) => console.error("[boot] the app did not start", error),
);

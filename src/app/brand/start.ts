/**
 * The two moments main.tsx hands to the brand: before the app starts
 * (take over the look index.html picked, keep the accent stylesheet on
 * the theme) and once it is ready (the introduction on the first start,
 * and the theme following the device while none is chosen).
 */
import { designer } from "../shell/globals.ts";
import { setTheme } from "../themes/theme.ts";
import { initBranding, isNextBranding } from "./branding.ts";
import { followDeviceTheme, watchBrandTheme } from "./brand-theme.ts";
import { IntroDialog } from "./intro-dialog.ts";

export function startBranding(): void {
  initBranding();
  if (isNextBranding()) watchBrandTheme();
}

export function afterAppStarted(): void {
  if (isNextBranding())
    followDeviceTheme(
      () => designer().getSetting("theme"),
      () => setTheme("default", designer().getWindows(), () => designer().relayout()),
    );
  IntroDialog.showOnFirstStart();
}

/**
 * The desktop app's side of the two looks (src/app/brand/branding.ts).
 *
 * GD_BRANDING=classic|next picks the page's look: main.ts passes it to
 * the window as a command line switch and the preload hands it to the
 * page as window.__gdBranding. The parity suite starts the app with
 * "classic" (parity/scenarios/electron/launcher.ts), so it compares
 * against the old app. Unset, the page decides (GravitDesign Next unless
 * the user chose otherwise).
 */
export const BRANDING_SWITCH = "--gd-branding=";

export function brandingArgument(env: NodeJS.ProcessEnv = process.env): string[] {
  const value = env.GD_BRANDING;
  return value === "classic" || value === "next" ? [BRANDING_SWITCH + value] : [];
}

/** The name in the native dialogs and the first window title: the old one in the classic look. */
export function productName(env: NodeJS.ProcessEnv = process.env): string {
  return env.GD_BRANDING === "classic" ? "Gravit Designer" : "GravitDesign Next";
}

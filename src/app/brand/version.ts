/**
 * The version GravitDesign Next shows: the release version of the new app
 * (package.json, the one electron-builder and the updater use), not the
 * old app's internal "3.15.0" / "i015.3" that the classic look keeps.
 */
import { version } from "../../../package.json";
import { brandString } from "./brand-strings.ts";
import { PRODUCT_NAME } from "./branding.ts";

export const APP_VERSION: string = version;

/** "GravitDesign Next 2.0.0". */
export function brandVersionLine(): string {
  return brandString("version.line")
    .replace("%name", PRODUCT_NAME.next)
    .replace("%version", APP_VERSION);
}

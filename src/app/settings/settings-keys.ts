// Old: designer.browser.dev.js module 1278 (the scrubbing setting).
import { designer } from "../shell/globals.ts";

/**
 * The setting that switches scrubbing (changing numbers by dragging in
 * input boxes) on or off. On unless the setting is false; the settings
 * dialog shows it inverted ("Disable changing values ... with dragging").
 */
export const ScrubbingSetting = {
  getSetting(): "scrubbing_flag" {
    return "scrubbing_flag";
  },

  isEnabled(): boolean {
    return !!designer().getSetting(ScrubbingSetting.getSetting(), true);
  },
};

// Old: designer.browser.dev.js module 1487 (the welcome screen setting).
import { designer } from "../shell/globals.ts";

/** Whether the welcome screen opens at startup: yes unless the setting is false. */
export const ShowWelcomeSetting = {
  getSetting(): "show_welcome_screen" {
    return "show_welcome_screen";
  },

  isEnabled(): boolean {
    const value: unknown = designer().getSetting("show_welcome_screen");
    return typeof value !== "boolean" || value;
  },
};

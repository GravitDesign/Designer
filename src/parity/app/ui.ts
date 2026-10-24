/**
 * The ui area's hooks (parity/scenarios/ui/contract.ts) over the app.
 */
import { designer } from "../../app/shell/globals.ts";

export const uiHooks = {
  ui: {
    /** A plain message in the notification panel, as the app reports errors. */
    notify(message: string): void {
      designer().addNotification({ message });
    },
  },
};

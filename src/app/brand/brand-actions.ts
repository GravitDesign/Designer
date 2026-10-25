/**
 * The actions the "next" look adds to the old action table (none in the
 * classic look). bootstrap.ts appends them to gravit.actions before the
 * designer builds its menus.
 */
import type { Action } from "../actions/action.ts";
import { isNextBranding } from "./branding.ts";
import { OpenLegacyAction } from "./open-legacy-action.ts";
import { ShowIntroAction } from "./show-intro-action.ts";

export function brandActions(): Action[] {
  return isNextBranding() ? [new ShowIntroAction(), new OpenLegacyAction()] : [];
}

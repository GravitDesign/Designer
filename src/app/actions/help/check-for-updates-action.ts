// Old: designer.browser.dev.js module 1625 (GCheckForUpdatesAction).
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Action } from "../action.ts";
import { Category } from "../category.ts";
import { viewDesigner } from "../view/view-host.ts";

/**
 * Help > Check for Updates. The old bootstrap imported it but never
 * registered it, so it is not in the registration table either.
 */
export class CheckForUpdatesAction extends Action {
  static ID = "check-for-updates";
  static TITLE = new LocaleKey("GCheckForUpdatesAction", "title");

  override getId(): string {
    return CheckForUpdatesAction.ID;
  }

  override getTitle(): LocaleKey {
    return CheckForUpdatesAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_HELP;
  }

  override getGroup(): string {
    return "help";
  }

  override isEnabled(): boolean {
    return true;
  }

  override execute(): void {
    const manager = viewDesigner().getSoftwareUpdateManager();
    if (manager) manager.checkForUpdates();
  }

  override toString(): string {
    return "[Object GCheckForUpdatesAction]";
  }
}

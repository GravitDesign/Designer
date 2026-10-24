// Old: designer.browser.dev.js module 1336 (GOpenQuickHelpScreenAction).
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { quickHelp } from "../../touch/quick-help.ts";
import { Action } from "../action.ts";
import { Category } from "../category.ts";
import { viewDesigner } from "../view/view-host.ts";

/** Help > Quick Help: the touch layout's overlay naming the buttons. Only shown in touch mode. */
export class OpenQuickHelpScreenAction extends Action {
  static ID = "help.open-quick-help";
  static TITLE = new LocaleKey("GOpenQuickHelpScreenAction", "title");

  override getId(): string {
    return OpenQuickHelpScreenAction.ID;
  }

  override getTitle(): LocaleKey {
    return OpenQuickHelpScreenAction.TITLE;
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

  override isVisible(): boolean {
    return viewDesigner().isTouchEnabled();
  }

  override execute(): void {
    quickHelp.open();
  }

  override toString(): string {
    return "[Object GOpenQuickHelpScreenAction]";
  }
}

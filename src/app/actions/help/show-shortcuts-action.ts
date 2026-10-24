// Old: designer.browser.dev.js module 1643 (GShowShortcutsAction).
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { lateExport } from "../../shell/late.ts";
import { Action } from "../action.ts";
import { Category } from "../category.ts";

/** Help > Keyboard Shortcuts: opens the shortcuts dialog (module 1644, app-dialogs-notify). */
export class ShowShortcutsAction extends Action {
  static ID = "help.shortcuts";
  static TITLE = new LocaleKey("GShowShortcutsAction", "title");

  override getId(): string {
    return ShowShortcutsAction.ID;
  }

  override getTitle(): LocaleKey {
    return ShowShortcutsAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_HELP_LEARN;
  }

  override getGroup(): string {
    return "help/learn";
  }

  override execute(): void {
    const ShortcutsDialog = lateExport<new () => { open(): void }>(
      "dialogs/shortcuts-dialog.ts",
      "ShortcutsDialog",
    );
    if (!ShortcutsDialog) throw new Error("dialogs/shortcuts-dialog.ts is not ported yet");
    new ShortcutsDialog().open();
  }

  override toString(): string {
    return "[Object GShowShortcutsAction]";
  }
}

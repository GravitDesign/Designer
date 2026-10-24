// Old: designer.browser.dev.js module 843 (GOpenRecentAction).
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Action } from "../action.ts";
import { Category } from "../category.ts";

/**
 * File > Open Recent: only a placeholder entry for the submenu, always
 * disabled; the menu fills the submenu with the recent documents.
 */
export class OpenRecentAction extends Action {
  static ID = "file.open-recent";
  static TITLE = new LocaleKey("GOpenRecentAction", "title");

  override getId(): string {
    return OpenRecentAction.ID;
  }

  override getTitle(): LocaleKey {
    return OpenRecentAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_FILE_OPEN_RECENT;
  }

  override getGroup(): string {
    return "file-open/open-recent";
  }

  override isEnabled(): boolean {
    return false;
  }

  override execute(): void {}

  override toString(): string {
    return "[Object GOpenRecentAction]";
  }
}

// Old: designer.browser.dev.js module 1612 (GSaveAllAction).
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Action } from "../action.ts";
import { Category } from "../category.ts";
import { gDesigner } from "../host.ts";

/** Save All: registered but never available or enabled in the old app. */
export class SaveAllAction extends Action {
  static ID = "file.save-all";
  static TITLE = new LocaleKey("GSaveAllAction", "title");

  override getId(): string {
    return SaveAllAction.ID;
  }

  override getTitle(): LocaleKey {
    return SaveAllAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_FILE;
  }

  override getGroup(): string {
    return "file";
  }

  override isAvailable(): boolean {
    return false;
  }

  override isEnabled(): boolean {
    return false;
  }

  override execute(): void {
    for (const document of gDesigner().getDocuments()) {
      if (document.isModified()) document.save();
    }
  }

  override toString(): string {
    return "[Object GSaveAllAction]";
  }
}

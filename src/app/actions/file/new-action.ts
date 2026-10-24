// Old: designer.browser.dev.js module 1601 (GNewAction).
import { Key } from "../../../engine/core/key.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { applicationManager, gContainer, gDesigner } from "../host.ts";

/** File > New: the new-document dialog, closable, on its start page. */
export class NewAction extends Action {
  static ID = "file.new";
  static TITLE = new LocaleKey("GNewAction", "title");

  override getId(): string {
    return NewAction.ID;
  }

  override isEnabled(): boolean {
    return applicationManager().isCreatingNewDocumentEnabled();
  }

  override getTitle(): LocaleKey {
    return NewAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_FILE;
  }

  override getGroup(): string {
    return "document";
  }

  override getShortcut(): Shortcut {
    return [Key.Constant.OPTION, "N"];
  }

  override getAdditionalShortcuts(): Shortcut[] {
    return [[Key.Constant.META, "N"]];
  }

  override execute(): void {
    gContainer().newDocumentActionPerformed();
    gDesigner().openNewDocumentDialog({ closable: true, defaultOption: "start-option" });
  }

  override toString(): string {
    return "[Object GNewAction]";
  }
}

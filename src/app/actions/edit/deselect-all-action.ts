// Old: designer.browser.dev.js module 1334 (GDeselectAllAction).
import { Key } from "../../../engine/core/key.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { isEditable } from "../focus.ts";
import { activeDocument, gDesigner } from "../host.ts";
import { isSelectAllInTextField } from "./select-all-action.ts";

export class DeselectAllAction extends Action {
  static ID = "edit.deselect-all";
  static TITLE = new LocaleKey("GDeselectAllAction", "title");

  override getId(): string {
    return DeselectAllAction.ID;
  }

  override getTitle(): LocaleKey {
    return DeselectAllAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_EDIT;
  }

  override getGroup(): string {
    return "select";
  }

  override getShortcut(): Shortcut {
    return [Key.Constant.SHIFT, Key.Constant.META, "A"];
  }

  override isEnabled(): boolean {
    if (document.activeElement && isEditable(document.activeElement)) return true;
    const designerDocument = gDesigner().getActiveDocument();
    if (designerDocument) {
      const selection = designerDocument.getEditor().getSelection();
      if (selection && selection.length) return true;
    }
    return false;
  }

  // In a text field this selects all of its text, like Select All (the old
  // code ran execCommand("selectAll") here too).
  override execute(): void {
    if (isSelectAllInTextField()) document.execCommand("selectAll");
    else activeDocument().getEditor().clearSelection();
  }

  override toString(): string {
    return "[Object GDeselectAllAction]";
  }
}

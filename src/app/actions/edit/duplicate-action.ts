// Old: designer.browser.dev.js module 1315 (GDuplicateAction).
import { Key } from "../../../engine/core/key.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { ElementAction } from "../element-action.ts";
import { activeDocument, gDesigner } from "../host.ts";

export class DuplicateAction extends ElementAction {
  static ID = "edit.duplicate";
  static TITLE = new LocaleKey("GDuplicateAction", "title");

  override getId(): string {
    return DuplicateAction.ID;
  }

  override getTitle(): LocaleKey {
    return DuplicateAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_EDIT;
  }

  override getGroup(): string {
    return "ccp";
  }

  override getShortcut(): Shortcut {
    return [Key.Constant.META, "D"];
  }

  override getIcon(): string | null {
    return gDesigner().isTouchEnabled() ? "gravit-icon-duplicate" : null;
  }

  override getAdditionalShortcuts(): Shortcut[] {
    return [[Key.Constant.SHIFT, Key.Constant.META, "D"]];
  }

  override isEnabled(): boolean {
    if (!super.isEnabled()) return false;
    const designerDocument = gDesigner().getActiveDocument();
    return !!designerDocument && null != designerDocument.getEditor().getSelection();
  }

  override execute(): void {
    const editor = activeDocument().getEditor();
    editor.beginTransaction();
    try {
      editor.cloneSelection(false, true);
    } finally {
      editor.commitTransaction(Locale.get(this.getTitle()) as string);
    }
  }

  override toString(): string {
    return "[Object GDuplicateAction]";
  }
}

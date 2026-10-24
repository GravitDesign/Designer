// Old: designer.browser.dev.js module 874 (GDetachSymbolAction).
import { Key } from "../../../engine/core/key.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Node } from "../../../engine/scene/node.ts";
import { Symbol } from "../../../engine/scene/symbol.ts";
import { type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { ElementAction } from "../element-action.ts";
import { activeDocument, gDesigner } from "../host.ts";

/** Modify > Symbol > Detach (Shift+Cmd+F8): turns instances into plain groups. */
export class DetachSymbolAction extends ElementAction {
  static ID = "modify.detachsymbol";
  static TITLE = new LocaleKey("GDetachSymbolAction", "title");

  override getId(): string {
    return DetachSymbolAction.ID;
  }

  override getTitle(): LocaleKey {
    return DetachSymbolAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_MODIFY_SYMBOL;
  }

  override getGroup(): string {
    return "structure/modify";
  }

  override getIcon(): string | null {
    return gDesigner().isTouchEnabled() ? "gravit-icon-detach-symbol" : null;
  }

  override getShortcut(): Shortcut {
    return [Key.Constant.SHIFT, Key.Constant.META, Key.Constant.F8];
  }

  override isEnabled(): boolean {
    if (!super.isEnabled()) return false;
    const designerDocument = gDesigner().getActiveDocument();
    if (designerDocument) {
      const selection = designerDocument.getEditor().getIndividualSelection() as Node[] | null;
      if (selection && selection.length) {
        for (let i = selection.length - 1; i >= 0; --i) {
          const node = selection[i];
          if (node instanceof Symbol && !node.isMaster() && node.getMasterSymbol()) return true;
        }
      }
    }
    return false;
  }

  override execute(): void {
    const editor = activeDocument().getEditor();
    const nodes = Node.order(
      (editor.getIndividualSelection() as unknown as Node[]).slice(),
    ) as Node[];
    if (nodes.length && (nodes[0] as Node as unknown as { getScene(): unknown }).getScene()) {
      editor.beginTransaction();
      let detached = 0;
      try {
        for (let i = 0; i < nodes.length; ++i) {
          const node = nodes[i];
          if (node instanceof Symbol && node.detach()) detached++;
        }
      } finally {
        editor.commitTransaction(
          (
            Locale.get(new LocaleKey("GDetachSymbolAction", "text.number-detached")) as string
          ).replace("%number", detached > 1 ? "s" : ""),
        );
      }
    }
  }

  override toString(): string {
    return "[Object GDetachSymbolAction]";
  }
}

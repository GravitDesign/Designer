// Old: designer.browser.dev.js module 1177 (GResetInstanceAction).
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Node } from "../../../engine/scene/node.ts";
import { Symbol } from "../../../engine/scene/symbol.ts";
import { Category } from "../category.ts";
import { ElementAction } from "../element-action.ts";
import { activeDocument, gDesigner } from "../host.ts";

const isSymbolNode = (node: unknown): boolean => node instanceof Symbol;

/** The symbol instance (or master) `node` sits in, or null. */
function ownerSymbol(node: Node): Symbol | null {
  return node.findParent(isSymbolNode) as unknown as Symbol | null;
}

/**
 * Modify > Symbol > Reset Instance: drops the overrides of selected
 * instances, or of selected elements inside an instance.
 */
export class ResetInstanceAction extends ElementAction {
  static ID = "modify.resetinstance";
  static TITLE = new LocaleKey("GResetInstanceAction", "title");

  override getId(): string {
    return ResetInstanceAction.ID;
  }

  override getTitle(): LocaleKey {
    return ResetInstanceAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_MODIFY_SYMBOL;
  }

  override getGroup(): string {
    return "structure/modify";
  }

  override getIcon(): string | null {
    return gDesigner().isTouchEnabled() ? "gravit-icon-reset-instance" : null;
  }

  override isEnabled(): boolean {
    if (!super.isEnabled()) return false;
    const designerDocument = gDesigner().getActiveDocument();
    if (designerDocument) {
      const selection = designerDocument.getEditor().getIndividualSelection() as Node[] | null;
      if (selection && selection.length) {
        for (let i = selection.length - 1; i >= 0; --i) {
          const node = selection[i] as Node;
          if (!node.isLocked()) {
            if (node instanceof Symbol && !node.isLocked() && !node.inSync()) return true;
            const owner = ownerSymbol(node);
            if (owner && !owner.inSync(node, true)) return true;
          }
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
    editor.beginTransaction();
    try {
      for (let i = 0; i < nodes.length; ++i) {
        const node = nodes[i] as Node;
        if (node instanceof Symbol && !node.isLocked() && !node.inSync()) node.synchronize();
        if (!(node instanceof Symbol)) {
          const owner = ownerSymbol(node);
          if (owner && !owner.inSync(node, true)) owner.synchronize(node);
        }
      }
    } finally {
      editor.commitTransaction(Locale.get(ResetInstanceAction.TITLE) as string);
    }
  }

  override toString(): string {
    return "[Object GResetInstanceAction]";
  }
}

// Old: designer.browser.dev.js module 1316 (GCreateNestedCompoundAction).
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { CompoundShape } from "../../../engine/scene/compound-shape.ts";
import { Node } from "../../../engine/scene/node.ts";
import type { ContainerNode } from "../../../engine/scene/node-container.ts";
import { blockChanges, releaseChanges } from "../../util/designer-util.ts";
import { Category } from "../category.ts";
import { ElementAction } from "../element-action.ts";
import { activeDocument, gDesigner } from "../host.ts";

type Updatable = { beginUpdate(): void; endUpdate(): void };

/**
 * Modify > Create Nested Compound (no shortcut): the first selected
 * compound shape takes the other selected compound shapes as children.
 */
export class CreateNestedCompoundAction extends ElementAction {
  static ID = "modify.createnestedcompound";
  static TITLE = new LocaleKey("GCreateNestedCompoundAction", "title");

  override getId(): string {
    return CreateNestedCompoundAction.ID;
  }

  override getTitle(): LocaleKey {
    return CreateNestedCompoundAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_MODIFY;
  }

  override getGroup(): string {
    return "structure-boolean";
  }

  // Old: Cmd+Alt+M, the keys of Clip Selection, which always won; the
  // menu showed a shortcut that never ran this action (BUG-147).
  override getShortcut(): null {
    return null;
  }

  override getIcon(): string {
    return gDesigner().isTouchEnabled() ? "gravit-icon-nested-compound" : "";
  }

  override isEnabled(): boolean {
    if (!super.isEnabled()) return false;
    const designerDocument = gDesigner().getActiveDocument();
    if (designerDocument) {
      const selection = designerDocument.getEditor().getSelection();
      let count = 0;
      if (selection && selection.length) {
        for (let i = 0; i < selection.length; ++i) {
          if (selection[i] instanceof CompoundShape) count++;
          if (count >= 2) return true;
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
      let target: CompoundShape | undefined;
      const moved: CompoundShape[] = [];
      const parents = new Set<ContainerNode>();
      for (let i = 0; i < nodes.length; ++i) {
        const node = nodes[i];
        if (node instanceof CompoundShape) {
          if (target) {
            moved.push(node);
            parents.add(node.getParent() as ContainerNode);
          } else target = node;
        }
      }
      if (moved.length > 0) {
        const target2 = target as CompoundShape;
        const blocked = [...parents] as unknown as Updatable[];
        try {
          blockChanges(editor, blocked, null, target2 as unknown as Updatable);
          for (let i = 0; i < moved.length; ++i) {
            const node = moved[i] as CompoundShape;
            (node.getParent() as ContainerNode).removeChild(node);
            target2.appendChild(node);
          }
        } finally {
          releaseChanges(editor, blocked, null, target2 as unknown as Updatable);
        }
        editor.updateSelection(false, [target2]);
      }
    } finally {
      // The old transaction name is not localized.
      editor.commitTransaction("Create nested compound");
    }
  }

  override toString(): string {
    return "[Object GCreateNestedCompoundAction]";
  }
}

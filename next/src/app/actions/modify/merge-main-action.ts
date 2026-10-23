// Old: designer.browser.dev.js module 812 (GMergeMainAction).
import { Key } from "../../../engine/core/key.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { VertexSource } from "../../../engine/geometry/vertex-source.ts";
import { CompoundShape } from "../../../engine/scene/compound-shape.ts";
import { Group } from "../../../engine/scene/group.ts";
import type { Node } from "../../../engine/scene/node.ts";
import { Action, type Shortcut, type ShortcutHintOptions } from "../action.ts";
import { Category } from "../category.ts";
import { gDesigner } from "../host.ts";
import { MainAction } from "../main-action.ts";

/**
 * Modify > Combine (Shift+Cmd+Y, shortcut only): the main action of the
 * boolean operations. Within the sub key delay U, S, I or X picks Union,
 * Subtract, Intersect or Difference (merge-sub-action.ts); without a sub
 * key it runs Union.
 */
export class MergeMainAction extends MainAction {
  static ID = "modify.merge";
  static TITLE = new LocaleKey("GMergeMainAction", "title");

  static getActionSubId(type: string): string {
    return "".concat(MergeMainAction.ID, ".").concat(type);
  }

  /**
   * The shapes a boolean operation can take from `node`: the vertex
   * sources inside groups and compound shapes (recursively), or the node
   * itself.
   */
  static getValidItems(node: Node): Node[] {
    let items: Node[] = [];
    if (node instanceof Group || node instanceof CompoundShape) {
      for (let child = node.getFirstChild(); null !== child; child = child.getNext()) {
        const childItems = MergeMainAction.getValidItems(child);
        items = items.concat(childItems);
      }
    } else if (node.hasMixin(VertexSource) && node.validateInsertion(new CompoundShape())) {
      items.push(node);
    }
    return items;
  }

  override getId(): string {
    return MergeMainAction.ID;
  }

  override getTitle(): LocaleKey {
    return MergeMainAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_MODIFY;
  }

  override getGroup(): string {
    return "structure-group";
  }

  override isVisible(): boolean {
    return false;
  }

  override getShortcut(): Shortcut {
    return [Key.Constant.SHIFT, Key.Constant.META, Key.Constant.Y];
  }

  override getIcon(): string | null {
    return super.getIcon();
  }

  override isEnabled(): boolean {
    const designerDocument = gDesigner().getActiveDocument();
    const editor = designerDocument && designerDocument.getEditor();
    const selection = editor && (editor.getIndividualSelection() as Node[] | null);
    if (!selection || !selection.length) return false;
    let items: Node[] = [];
    for (let i = 0; i < selection.length; ++i) {
      const node = selection[i] as Node;
      items = items.concat(MergeMainAction.getValidItems(node));
      if (items.length > 1) return true;
    }
    if (1 === items.length) {
      const item = items[0] as Node;
      return item instanceof CompoundShape || item.getParent() instanceof CompoundShape;
    }
    return false;
  }

  // The main action shows its own shortcut, unlike other main actions.
  override getShortcutHint(options?: ShortcutHintOptions): string | null {
    return Action.prototype.getShortcutHint.call(this, options);
  }

  override execute(): unknown {
    const id = MergeMainAction.getActionSubId(this.Type.Union as string);
    gDesigner().executeAction(id);
    return undefined;
  }

  override toString(): string {
    return "[Object GMergeMainAction]";
  }
}

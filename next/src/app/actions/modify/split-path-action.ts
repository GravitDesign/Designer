// Old: designer.browser.dev.js module 873 (GSplitPathAction).
import { Key } from "../../../engine/core/key.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { CompoundPath } from "../../../engine/scene/compound-path.ts";
import { Element } from "../../../engine/scene/element.ts";
import type { Node } from "../../../engine/scene/node.ts";
import { Rectangle } from "../../../engine/scene/rectangle.ts";
import { type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { ElementAction } from "../element-action.ts";
import { activeDocument, gDesigner } from "../host.ts";

/**
 * Modify > Path > Split Path (Shift+Cmd+J): each selected compound path
 * becomes its paths, each with the compound path's element properties.
 */
export class SplitPathAction extends ElementAction {
  static ID = "modify.split-path";
  static TITLE = new LocaleKey("GSplitPathAction", "title");

  override getId(): string {
    return SplitPathAction.ID;
  }

  override getTitle(): LocaleKey {
    return SplitPathAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_MODIFY_PATH;
  }

  override getGroup(): string {
    return "structure/path";
  }

  override getShortcut(): Shortcut {
    return [Key.Constant.SHIFT, Key.Constant.META, "J"];
  }

  override getIcon(): string | null {
    return gDesigner().isTouchEnabled() ? "gravit-icon-split-path" : null;
  }

  // Unlike the other element actions the review-mode check is in execute,
  // so the menu shows Split Path enabled in review mode, where it does
  // nothing. See "Split Path is enabled in review mode" in QUESTIONS.md.
  override isEnabled(): boolean {
    const designerDocument = gDesigner().getActiveDocument();
    if (designerDocument) {
      const selection = designerDocument.getEditor().getSelection();
      if (selection) {
        for (let i = 0; i < selection.length; ++i) {
          if (selection[i] instanceof CompoundPath) return true;
        }
      }
    }
    return false;
  }

  override execute(): boolean | undefined {
    if (!ElementAction.prototype.isEnabled.call(this)) return false;
    const editor = activeDocument().getEditor();
    const selection = (editor.getSelection() as Node[]).slice();
    if (selection && selection.length) {
      editor.beginTransaction();
      try {
        const paths: Node[] = [];
        for (let i = 0; i < selection.length; ++i) {
          const node = selection[i];
          if (node instanceof CompoundPath) {
            const properties = new Rectangle();
            Element.prototype.assignFrom.call(properties, node);
            const split = editor.splitCompoundPath(node) as unknown as Node[] | null;
            if (split && split.length) {
              for (let j = 0; j < split.length; ++j) {
                const path = split[j] as Node;
                Element.prototype.assignFrom.call(path, properties);
                paths.push(path);
              }
            }
          }
        }
        if (paths.length) editor.updateSelection(false, paths);
      } finally {
        editor.commitTransaction(Locale.get(this.getTitle()) as string);
      }
    }
    return undefined;
  }

  override toString(): string {
    return "[Object GSplitPathAction]";
  }
}

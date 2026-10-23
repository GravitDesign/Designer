// Old: designer.browser.dev.js module 1180 (GSelectByFontTypeAction).
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Node } from "../../../engine/scene/node.ts";
import { Text } from "../../../engine/text/text.ts";
import { ElementEditor } from "../../../editor/element-editors/element-editor.ts";
import { Category } from "../category.ts";
import { ElementAction } from "../element-action.ts";
import { activeDocument, gDesigner } from "../host.ts";

/** What the actions read of the workspace font manager. */
export interface FontManagerLike {
  getDefaultFont(): { getFamily(): string } | null;
}

/** The family of the workspace's default font, or undefined. */
function defaultFamily(): string | undefined {
  const font = (gDesigner().getWorkspace()?.getFontManager() as FontManagerLike).getDefaultFont();
  return font ? font.getFamily() : undefined;
}

/** Select Same > Font: every text in the family all selected texts share. */
export class SelectByFontTypeAction extends ElementAction {
  static ID = "edit.selectbyfonttype";
  static TITLE = new LocaleKey("GSelectByFontTypeAction", "title");

  override getId(): string {
    return SelectByFontTypeAction.ID;
  }

  override getTitle(): LocaleKey {
    return SelectByFontTypeAction.TITLE;
  }

  override getGroup(): string {
    return "edit/select-by-font";
  }

  override getCategory(): Category {
    return Category.CATEGORY_EDIT_SELECT_SAME;
  }

  override isEnabled(): boolean {
    if (!super.isEnabled()) return false;
    const designerDocument = gDesigner().getActiveDocument();
    if (
      designerDocument &&
      designerDocument.getEditor() &&
      designerDocument.getEditor().getSelection()
    ) {
      const family = this._getFontFamily();
      return !(!family || !family.length);
    }
    return false;
  }

  // Clears the Selected flag of every node directly (not through the
  // editor) before selecting the texts, as the old code did.
  override execute(): void {
    const designerDocument = activeDocument();
    const family = this._getFontFamily();
    const fallback = defaultFamily();
    const texts: Node[] = [];
    designerDocument.getScene().acceptChildren((node: Node) => {
      node.removeFlag(Node.Flag.Selected as number);
      if (node instanceof Text && ((node.getProperty("_tff") as string) || fallback) === family) {
        texts.push(node);
      }
    });
    designerDocument.getEditor().updateSelection(true, texts);
  }

  override getIcon(): string {
    return gDesigner().isTouchEnabled() ? "gravit-icon-select-by-font" : "";
  }

  override toString(): string {
    return "[Object GSelectByFontTypeAction]";
  }

  /**
   * The family all selected texts share (an open text editor's value
   * first), "" when they differ, undefined without a text.
   */
  private _getFontFamily(): string | undefined {
    let family: string | undefined;
    const selection = activeDocument().getEditor().getSelection() as Node[];
    const fallback = defaultFamily();
    for (let i = 0; i < selection.length; i++) {
      const node = selection[i];
      if (node instanceof Text) {
        const source = (ElementEditor.getEditor(node) || node) as {
          getProperty(name: string): unknown;
        };
        let textFamily = source.getProperty("_tff") as string | undefined;
        if (!textFamily) textFamily = fallback;
        if (family) {
          if (family !== textFamily) {
            family = "";
            break;
          }
        } else family = textFamily;
      }
    }
    return family;
  }
}

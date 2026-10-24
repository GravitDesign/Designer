// Old: designer.browser.dev.js module 875 (GPasteStyleAction).
import { Key } from "../../../engine/core/key.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Node } from "../../../engine/scene/node.ts";
import { Stylable, type StylableNode } from "../../../engine/style/stylable.ts";
import { Text } from "../../../engine/text/text.ts";
import type { Page } from "../../../engine/scene/page.ts";
import { type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { ElementAction } from "../element-action.ts";
import { activeDocument, gDesigner } from "../host.ts";

/** A node whose style can be replaced from another (assignStyleFrom). */
type StyleTarget = Node & { assignStyleFrom(source: StylableNode): void };

/** Edit > Paste Style: the style of the first stylable copied node onto the selection. */
export class PasteStyleAction extends ElementAction {
  static ID = "edit.paste.style";
  static TITLE = new LocaleKey("GPasteStyleAction", "title");

  override getId(): string {
    return PasteStyleAction.ID;
  }

  override getTitle(): LocaleKey {
    return PasteStyleAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_EDIT_PASTE;
  }

  override getGroup(): string {
    return "ccp/paste";
  }

  override getIcon(): string | null {
    return gDesigner().isTouchEnabled() ? "gravit-icon-paste-style" : null;
  }

  override getShortcut(): Shortcut {
    return [Key.Constant.F4];
  }

  override isEnabled(): boolean {
    if (!super.isEnabled()) return false;
    const designer = gDesigner();
    const mimeTypes = designer.getClipboardMimeTypes();
    if (mimeTypes && mimeTypes.indexOf(Node.MIME_TYPE) >= 0) {
      const designerDocument = designer.getActiveDocument();
      if (designerDocument) {
        const selection = designerDocument.getEditor().getIndividualSelection();
        if (selection) {
          for (let i = 0; i < selection.length; ++i) {
            if ((selection[i] as unknown as Node).hasMixin(Stylable)) return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * A copied text is put on the page while its style is read (its style
   * properties resolve through the scene) and removed again afterwards.
   */
  override execute(): void {
    const designer = gDesigner();
    let nodes = Node.deserialize(designer.getClipboardContent(Node.MIME_TYPE) as string) as
      Node[] | null;
    nodes = activeDocument().filterUnrestrictedCommercialFileElements(nodes as Node[]);
    if (nodes && nodes.length > 0) {
      let source: Node | null = null;
      for (let i = 0; i < nodes.length; ++i) {
        if ((nodes[i] as Node).hasMixin(Stylable)) {
          source = nodes[i] as Node;
          break;
        }
      }
      if (!source) return;
      const editor = activeDocument().getEditor();
      const selection = editor.getIndividualSelection() as unknown as Node[];
      if (source instanceof Text)
        (activeDocument().getScene().getActivePage() as Page).appendChild(source);
      editor.beginTransaction();
      try {
        for (let i = 0; i < selection.length; ++i) {
          const target = selection[i] as Node;
          if (target.hasMixin(Stylable)) {
            (target as StyleTarget).assignStyleFrom(source as unknown as StylableNode);
          }
        }
      } finally {
        editor.commitTransaction(Locale.get(this.getTitle()) as string);
        if (source instanceof Text) {
          (activeDocument().getScene().getActivePage() as Page).removeChild(source);
        }
      }
    }
  }

  override toString(): string {
    return "[Object GPasteStyleAction]";
  }
}

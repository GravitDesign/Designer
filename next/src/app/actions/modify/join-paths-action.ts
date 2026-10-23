// Old: designer.browser.dev.js module 1179 (GJoinPathsAction).
import { Key } from "../../../engine/core/key.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { VertexSource } from "../../../engine/geometry/vertex-source.ts";
import { Element } from "../../../engine/scene/element.ts";
import { Image } from "../../../engine/scene/image.ts";
import type { Node } from "../../../engine/scene/node.ts";
import { PathBase } from "../../../engine/scene/path-base.ts";
import { Rectangle } from "../../../engine/scene/rectangle.ts";
import { type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { ElementAction } from "../element-action.ts";
import { activeDocument, gDesigner } from "../host.ts";

/**
 * Modify > Path > Join Paths (Cmd+J): converts the selection to paths and
 * joins them into one compound path, which gets the element properties
 * (name, opacity, ...) of the first selected element.
 */
export class JoinPathsAction extends ElementAction {
  static ID = "modify.join-paths";
  static TITLE = new LocaleKey("GJoinPathsAction", "title");

  override getId(): string {
    return JoinPathsAction.ID;
  }

  override getTitle(): LocaleKey {
    return JoinPathsAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_MODIFY_PATH;
  }

  override getGroup(): string {
    return "structure/path";
  }

  override getIcon(): string | null {
    return gDesigner().isTouchEnabled() ? "gravit-icon-join-paths" : null;
  }

  override getShortcut(): Shortcut {
    return [Key.Constant.META, "J"];
  }

  override isEnabled(): boolean {
    if (!super.isEnabled()) return false;
    const designerDocument = gDesigner().getActiveDocument();
    if (designerDocument) {
      const selection = designerDocument.getEditor().getSelection();
      if (selection && selection.length > 1) {
        let count = 0;
        for (let i = 0; i < selection.length; ++i) {
          const node = selection[i] as Node;
          if (!(node instanceof Image)) {
            if (node instanceof PathBase || node.hasMixin(VertexSource)) count++;
            if (2 === count) return true;
          }
        }
      }
    }
    return false;
  }

  override execute(): void {
    const editor = activeDocument().getEditor();
    const selection = editor.getSelection();
    if (selection && selection.length) {
      editor.beginTransaction();
      try {
        // A scratch element keeps the first element's properties across the conversion.
        const properties = new Rectangle();
        Element.prototype.assignFrom.call(properties, selection[0] as Node);
        editor.convertSelectionToPaths(true);
        const joined = editor.joinPaths() as unknown as Node | null;
        if (joined) {
          Element.prototype.assignFrom.call(joined, properties);
          editor.updateSelection(false, [joined]);
        }
      } finally {
        editor.commitTransaction(Locale.get(this.getTitle()) as string);
      }
    }
  }

  override toString(): string {
    return "[Object GJoinPathsAction]";
  }
}

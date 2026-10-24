// Old: designer.browser.dev.js module 1178 (GDetachFromPathAction).
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import type { Node } from "../../../engine/scene/node.ts";
import { PathBase } from "../../../engine/scene/path-base.ts";
import { Text } from "../../../engine/text/text.ts";
import { Category } from "../category.ts";
import { ElementAction } from "../element-action.ts";
import { gDesigner, type ActionDocument } from "../host.ts";
import type { Editor } from "../../../editor/editor.ts";

/** Modify > Path > Detach Text from Path: unlinks selected texts from their paths. */
export class DetachFromPathAction extends ElementAction {
  static ID = "modify.detachFromPath";
  static TITLE = new LocaleKey("GDetachFromPathAction", "title");

  override getId(): string {
    return DetachFromPathAction.ID;
  }

  override getTitle(): LocaleKey {
    return DetachFromPathAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_MODIFY_PATH;
  }

  override getGroup(): string {
    return "structure/modify";
  }

  override getIcon(): string | null {
    return gDesigner().isTouchEnabled() ? "gravit-icon-detach-from-path" : null;
  }

  override isEnabled(): boolean {
    if (!super.isEnabled()) return false;
    const designerDocument = gDesigner().getActiveDocument();
    const selection = designerDocument
      ? (designerDocument.getEditor().getSelection() as Node[] | null)
      : null;
    if (selection) {
      for (let i = 0; i < selection.length; ++i) {
        const node = selection[i];
        if (node instanceof Text && node.hasPathAttached()) return true;
      }
    }
    return false;
  }

  override execute(): void {
    const designerDocument = gDesigner().getActiveDocument();
    const editor = designerDocument ? designerDocument.getEditor() : null;
    const selection = editor ? (editor.getIndividualSelection() as unknown as Node[] | null) : null;
    const texts: Text[] = [];
    if (selection) {
      for (let i = 0; i < selection.length; ++i) {
        const node = selection[i];
        if (node instanceof Text && node.hasPathAttached()) texts.push(node);
      }
    }
    // isEnabled made sure there is a document and an editor.
    (editor as Editor).beginTransaction();
    try {
      const scene = (designerDocument as ActionDocument).getScene();
      texts.forEach((text) => {
        scene.visitLinks(text, (linked) => {
          if (linked instanceof PathBase) scene.unlink(text, linked);
        });
      });
    } finally {
      (editor as Editor).commitTransaction(Locale.get(this.getTitle()) as string);
    }
  }

  override toString(): string {
    return "[Object GDetachFromPathAction]";
  }
}

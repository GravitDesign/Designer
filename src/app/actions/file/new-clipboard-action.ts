// Old: designer.browser.dev.js module 1602 (GNewClipboardAction).
import { Key } from "../../../engine/core/key.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { RGBColor } from "../../../engine/color/rgb-color.ts";
import { Item } from "../../../engine/scene/item.ts";
import { Layer } from "../../../engine/scene/layer.ts";
import { Node } from "../../../engine/scene/node.ts";
import type { Page } from "../../../engine/scene/page.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { Document } from "../../document/document.ts";
import {
  activeDocument,
  applicationManager,
  gDesigner,
  type ActionDocument,
  type ActionWindow,
} from "../host.ts";

/**
 * File > New from Clipboard: a new infinite-canvas document holding the
 * internal clipboard's items, zoomed to fit. Empties the internal
 * clipboard afterwards.
 */
export class NewClipboardAction extends Action {
  static ID = "file.new.clipboard";
  static TITLE = new LocaleKey("GNewClipboardAction", "title");

  override getId(): string {
    return NewClipboardAction.ID;
  }

  override getTitle(): LocaleKey {
    return NewClipboardAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_FILE;
  }

  override getGroup(): string {
    return "document";
  }

  override getShortcut(): Shortcut {
    return [Key.Constant.SHIFT, Key.Constant.CONTROL, Key.Constant.OPTION, "N"];
  }

  override isEnabled(): boolean {
    const designer = gDesigner();
    return (
      !!applicationManager().isCopyPasteEnabled() &&
      !!designer.getActiveDocument() &&
      !!designer.getClipboardContent(Node.MIME_TYPE)
    );
  }

  override execute(): void {
    const designer = gDesigner();
    const nodes = Node.deserialize(designer.getClipboardContent(Node.MIME_TYPE) as string) as
      Node[] | null;
    if (nodes && nodes.length > 0) {
      const items = nodes.filter(function (node) {
        return node instanceof Item || node instanceof Layer;
      });
      if (items.length > 0) {
        const scene = designer.createScene();
        (scene.getActivePage() as Page).setProperties(["bck", "w", "h"], [RGBColor.WHITE, 0, 0]);
        designer.addDocument(new Document(scene) as unknown as ActionDocument);
        const editor = activeDocument().getEditor();
        editor.beginTransaction();
        try {
          editor.insertElements(items, true, true, true);
        } finally {
          // The old code named the undo step with a literal "Paste".
          editor.commitTransaction("Paste");
          designer.setClipboardContent(Node.MIME_TYPE, null);
        }
        (activeDocument().getActiveWindow() as ActionWindow).centerAndZoom();
      }
    }
  }

  override toString(): string {
    return "[Object GNewClipboardAction]";
  }
}

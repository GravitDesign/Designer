// Old: designer.browser.dev.js module 1184 (GPasteInsideAction).
import { Key } from "../../../engine/core/key.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import type { Rect } from "../../../engine/math/rect.ts";
import { Element as GElement } from "../../../engine/scene/element.ts";
import { Node } from "../../../engine/scene/node.ts";
import { type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { ElementAction } from "../element-action.ts";
import { activeDocument, gDesigner } from "../host.ts";
import type { PastedElement } from "./paste-and-replace-action.ts";
import {
  moveTo,
  pastedElements,
  prepareEmptyTexts,
  unitedGeometryBBox,
} from "./paste-in-place-action.ts";

/**
 * Edit > Paste Inside: a copy of the clipboard content goes into every
 * selected unlocked container (a group, or a shape as its clip content),
 * moved to the container's top-left corner.
 */
export class PasteInsideAction extends ElementAction {
  static ID = "edit.paste.inside";
  static TITLE = new LocaleKey("GPasteInsideAction", "title");

  override getId(): string {
    return PasteInsideAction.ID;
  }

  override getTitle(): LocaleKey {
    return PasteInsideAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_EDIT_PASTE;
  }

  override getGroup(): string {
    return "ccp/paste";
  }

  override getIcon(): string | null {
    return gDesigner().isTouchEnabled() ? "gravit-icon-paste-inside" : null;
  }

  override getShortcut(): Shortcut {
    return [Key.Constant.OPTION, Key.Constant.SHIFT, Key.Constant.META, "V"];
  }

  override isEnabled(): boolean {
    if (!super.isEnabled()) return false;
    const designer = gDesigner();
    const designerDocument = designer.getActiveDocument();
    if (designerDocument) {
      const selection = designerDocument.getEditor().getSelection();
      if (selection) {
        if (document.queryCommandSupported("paste")) return true;
        const mimeTypes = designer.getClipboardMimeTypes();
        if (mimeTypes && mimeTypes.indexOf(Node.MIME_TYPE) >= 0) {
          for (let i = 0; i < selection.length; ++i) {
            if ((selection[i] as Node).hasMixin(Node.Container)) return true;
          }
        }
      }
    }
    return false;
  }

  override execute(): void {
    const designer = gDesigner();
    designer.getPaste().assignCallback(this._paste.bind(this));
    if (!(!designer.isTouchDevice() && document.execCommand("paste"))) {
      designer.getPaste().assignCallback(null);
      this._paste(
        Node.deserialize(designer.getClipboardContent(Node.MIME_TYPE) as string) as Node[] | null,
      );
    }
  }

  private _paste(nodes: Node[] | null, isText?: boolean): void {
    if (nodes && nodes.length > 0) {
      const elements = pastedElements(nodes);
      if (elements.length > 0) {
        const editor = activeDocument().getEditor();
        const targets = [...(editor.getSelection() as Node[])];
        prepareEmptyTexts(editor, elements);
        editor.beginTransaction();
        try {
          for (let i = 0; i < targets.length; ++i) {
            const target = targets[i] as Node;
            if (target.hasMixin(Node.Container) && !target.isLocked()) {
              const copies: PastedElement[] = [];
              for (let c = 0; c < elements.length; ++c) {
                const element = elements[c] as PastedElement;
                if (element.validateInsertion(target as never)) copies.push(element.clone());
              }
              editor.insertElements(copies, !isText, true, false, true, target as never);
              const targetBox =
                target instanceof GElement
                  ? ((target as unknown as PastedElement).getGeometryBBox() as Rect | null)
                  : null;
              if (targetBox) {
                const pastedBox = unitedGeometryBBox(copies);
                const move = moveTo(
                  targetBox.getX(),
                  targetBox.getY(),
                  pastedBox ? pastedBox.getX() : null,
                  pastedBox ? pastedBox.getY() : null,
                );
                if (move) {
                  for (let c = 0; c < copies.length; ++c) {
                    const copy = copies[c] as PastedElement;
                    if (copy.hasMixin(GElement.Transform)) copy.transform(move, true);
                  }
                }
              }
            }
          }
        } finally {
          editor.commitTransaction(Locale.get(this.getTitle()) as string);
        }
      }
    }
  }

  override toString(): string {
    return "[Object GPasteInsideAction]";
  }
}

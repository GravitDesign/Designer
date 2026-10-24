// Old: designer.browser.dev.js module 876 (GPasteAndReplaceAction).
import { Key } from "../../../engine/core/key.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import type { Rect } from "../../../engine/math/rect.ts";
import { Transform } from "../../../engine/math/transform.ts";
import { Element as GElement } from "../../../engine/scene/element.ts";
import { Node } from "../../../engine/scene/node.ts";
import { Text } from "../../../engine/text/text.ts";
import { type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { ElementAction } from "../element-action.ts";
import { gDesigner, parentOf } from "../host.ts";

/** What the paste variants call on the pasted elements. */
export type PastedElement = Node & {
  getGeometryBBox(): Rect | null;
  transform(transform: Transform, noUndo?: boolean): void;
  clone(): PastedElement;
};

/**
 * Edit > Paste and Replace: every selected element is replaced by a copy
 * of the clipboard content, placed at its top-left corner.
 */
export class PasteAndReplaceAction extends ElementAction {
  static ID = "edit.paste.replace";
  static TITLE = new LocaleKey("GPasteAndReplaceAction", "title");

  override getId(): string {
    return PasteAndReplaceAction.ID;
  }

  override getTitle(): LocaleKey {
    return PasteAndReplaceAction.TITLE;
  }

  override getIcon(): string | null {
    return gDesigner().isTouchEnabled() ? "gravit-icon-paste-and-replace" : null;
  }

  override getCategory(): Category {
    return Category.CATEGORY_EDIT_PASTE;
  }

  override getGroup(): string {
    return "ccp/paste";
  }

  override getShortcut(): Shortcut {
    return [Key.Constant.OPTION, Key.Constant.COMMAND, "V"];
  }

  override isEnabled(): boolean {
    if (!super.isEnabled()) return false;
    const designer = gDesigner();
    const designerDocument = designer.getActiveDocument();
    const editor = designerDocument && designerDocument.getEditor();
    const selection = editor && editor.getSelection();
    if (selection && selection.length > 0) {
      if (document.queryCommandSupported("paste")) return true;
      const mimeTypes = designer.getClipboardMimeTypes();
      if (mimeTypes && mimeTypes.indexOf(Node.MIME_TYPE) >= 0) return true;
    }
    return false;
  }

  /**
   * Tries the browser's paste command first (the clipboard bridge hands the
   * result to _paste); when the browser refuses, pastes the internal
   * clipboard.
   */
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

  private _paste(nodes: Node[] | null): void {
    if (nodes && nodes.length > 0) {
      const designerDocument = gDesigner().getActiveDocument();
      if (!designerDocument) return;
      const editor = designerDocument && designerDocument.getEditor();
      if (!editor || !editor.hasSelection()) return;
      const elements = designerDocument.filterUnrestrictedCommercialFileElements(
        nodes.filter((node) => node instanceof GElement),
      ) as PastedElement[];
      if (elements.length > 0) {
        editor.beginTransaction();
        try {
          let inserted: PastedElement[] = [];
          const selection = (editor.getSelection() as Node[]).slice() as PastedElement[];
          this._fixTexts(elements);
          selection.forEach((target) => {
            const replacements = this._replace(target, elements);
            if (replacements && replacements.length > 0) {
              inserted = inserted.concat(replacements);
            }
          });
          editor.insertElements(inserted, true, true, false, true);
        } finally {
          editor.commitTransaction(Locale.get(this.getTitle()) as string);
        }
      }
    }
  }

  /**
   * Inserts and removes every element that holds a text once, so the texts
   * are laid out (they have a size) before the boxes are measured.
   */
  private _fixTexts(elements: PastedElement[]): void {
    const designerDocument = gDesigner().getActiveDocument();
    const editor = designerDocument && designerDocument.getEditor();
    if (editor) {
      elements.forEach((element) => {
        element.accept((node: Node) => {
          if (node instanceof Text) {
            editor.insertElements([element], true, true, false);
            parentOf(element).removeChild(element);
            return false;
          }
          return undefined;
        });
      });
    }
  }

  private _replace(target: PastedElement, elements: PastedElement[]): PastedElement[] | undefined {
    const box = this._getBoundingBox(elements);
    if (!box) return;
    const targetBox = target.getGeometryBBox() as Rect;
    const move = new Transform(
      1,
      0,
      0,
      1,
      targetBox.getX() - box.getX(),
      targetBox.getY() - box.getY(),
    );
    const copies = this._clone(elements);
    copies.forEach((copy) => {
      if (copy.hasMixin(GElement.Transform)) copy.transform(move, true);
    });
    parentOf(target).removeChild(target);
    return copies;
  }

  private _clone(elements: PastedElement[]): PastedElement[] {
    return elements.map((element) => element.clone());
  }

  private _getBoundingBox(elements: PastedElement[]): Rect | undefined {
    let box: Rect | undefined;
    elements.forEach((element) => {
      const elementBox = element.getGeometryBBox();
      if (elementBox && !elementBox.isEmpty()) box = box ? box.united(elementBox) : elementBox;
    });
    return box;
  }

  override toString(): string {
    return "[Object GPasteAndReplaceAction]";
  }
}

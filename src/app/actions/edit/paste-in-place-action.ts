// Old: designer.browser.dev.js module 1183 (GPasteInPlaceAction).
import { Key } from "../../../engine/core/key.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { GMath } from "../../../engine/math/math.ts";
import type { Rect } from "../../../engine/math/rect.ts";
import { Transform } from "../../../engine/math/transform.ts";
import { Element as GElement } from "../../../engine/scene/element.ts";
import { Node } from "../../../engine/scene/node.ts";
import { Text } from "../../../engine/text/text.ts";
import type { Editor } from "../../../editor/editor.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { ElementAction } from "../element-action.ts";
import { activeDocument, gDesigner, parentOf } from "../host.ts";
import type { PastedElement } from "./paste-and-replace-action.ts";

/**
 * The elements of a paste the paste variants accept, after the commercial
 * file filter.
 */
export function pastedElements(nodes: readonly Node[]): PastedElement[] {
  const elements: Node[] = [];
  for (let i = 0; i < nodes.length; ++i) {
    if (nodes[i] instanceof GElement) elements.push(nodes[i] as Node);
  }
  return activeDocument().filterUnrestrictedCommercialFileElements(elements) as PastedElement[];
}

/**
 * Texts without content get inserted and removed once, outside the undo
 * transaction, as the old paste variants did before pasting.
 */
export function prepareEmptyTexts(editor: Editor, elements: readonly PastedElement[]): void {
  elements.forEach((element) => {
    if (element instanceof Text && !element.getProperty("content")) {
      editor.insertElements([element], false, true, true);
      parentOf(element).removeChild(element);
    }
  });
}

/** The union of the elements' geometry boxes, or null. */
export function unitedGeometryBBox(elements: readonly PastedElement[]): Rect | null {
  let box: Rect | null = null;
  elements.forEach((element) => {
    const elementBox = element.getGeometryBBox();
    if (elementBox) box = box ? box.united(elementBox) : elementBox;
  });
  return box;
}

/**
 * The move that puts the pasted box's top-left corner at (x, y), or null
 * when either is missing or they already match.
 */
export function moveTo(
  x: number | null,
  y: number | null,
  pastedX: number | null,
  pastedY: number | null,
): Transform | null {
  let move: Transform | null = null;
  if (!(
    null === x ||
    null === pastedX ||
    (GMath.isEqualEps(x, pastedX) && GMath.isEqualEps(y as number, pastedY as number))
  )) {
    move = new Transform(1, 0, 0, 1, x - pastedX, (y as number) - (pastedY as number));
  }
  return move;
}

/** Edit > Paste In Place: pasted at the selection's position. */
export class PasteInPlaceAction extends Action {
  static ID = "edit.paste.in-place";
  static TITLE = new LocaleKey("GPasteInPlaceAction", "title");

  override getId(): string {
    return PasteInPlaceAction.ID;
  }

  override getTitle(): LocaleKey {
    return PasteInPlaceAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_EDIT_PASTE;
  }

  override getGroup(): string {
    return "ccp/paste";
  }

  override getShortcut(): Shortcut {
    return [Key.Constant.SHIFT, Key.Constant.META, "V"];
  }

  // Extends GAction but checks GElementAction's condition, as the old one did.
  override isEnabled(): boolean {
    if (!ElementAction.prototype.isEnabled.call(this)) return false;
    const designer = gDesigner();
    const designerDocument = designer.getActiveDocument();
    if (designerDocument && designerDocument.getEditor().getSelection()) {
      if (document.queryCommandSupported("paste")) return true;
      const mimeTypes = designer.getClipboardMimeTypes();
      if (mimeTypes && mimeTypes.indexOf(Node.MIME_TYPE) >= 0) {
        return !!designer.getActiveDocument();
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
        prepareEmptyTexts(editor, elements);
        let x: number | null = null;
        let y: number | null = null;
        const selectionBox = editor.getSelectionBBox(true);
        if (selectionBox) {
          x = selectionBox.getX();
          y = selectionBox.getY();
        }
        editor.beginTransaction();
        try {
          editor.insertElements(elements, !isText, true, true, true);
          const pastedBox = unitedGeometryBBox(elements);
          const move = moveTo(
            x,
            y,
            pastedBox ? pastedBox.getX() : null,
            pastedBox ? pastedBox.getY() : null,
          );
          if (move) {
            for (let i = 0; i < elements.length; ++i) {
              const element = elements[i] as PastedElement;
              if (element.hasMixin(GElement.Transform)) element.transform(move, true);
            }
          }
        } finally {
          editor.commitTransaction(Locale.get(this.getTitle()) as string);
        }
      }
    }
  }

  override toString(): string {
    return "[Object GPasteInPlaceAction]";
  }
}

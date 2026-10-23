// Old: designer.browser.dev.js module 1182 (GPasteHereAction).
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import type { Point } from "../../../engine/math/point.ts";
import { Element as GElement } from "../../../engine/scene/element.ts";
import { Node } from "../../../engine/scene/node.ts";
import { Action, type Shortcut } from "../action.ts";
import type { Category } from "../category.ts";
import { activeDocument, activeWindow, gDesigner, type ActionWindow } from "../host.ts";
import type { PastedElement } from "./paste-and-replace-action.ts";
import {
  moveTo,
  pastedElements,
  prepareEmptyTexts,
  unitedGeometryBBox,
} from "./paste-in-place-action.ts";

/**
 * Paste Here (canvas context menu only): pasted with its top-left corner
 * where the context menu was opened (setPosition).
 */
export class PasteHereAction extends Action {
  static ID = "edit.paste.here";
  static TITLE = new LocaleKey("GPasteHereAction", "title");

  private _targetPosition: Point | null = null;

  override getId(): string {
    return PasteHereAction.ID;
  }

  override getTitle(): LocaleKey {
    return PasteHereAction.TITLE;
  }

  override getCategory(): Category | null {
    return null;
  }

  override getGroup(): string | null {
    return null;
  }

  // The old class defined getIcon twice; the second definition (this one) won.
  override getIcon(): string | null {
    return gDesigner().isTouchEnabled() ? "gravit-icon-paste-here" : null;
  }

  override getShortcut(): Shortcut | null {
    return null;
  }

  override isAvailable(context?: string): boolean {
    return !!context && "context.menu" == context;
  }

  override isEnabled(): boolean {
    if (document.queryCommandSupported("paste")) return true;
    const designer = gDesigner();
    const mimeTypes = designer.getClipboardMimeTypes();
    return (
      !!(mimeTypes && mimeTypes.indexOf(Node.MIME_TYPE) >= 0) && !!designer.getActiveDocument()
    );
  }

  override execute(): void {
    const designer = gDesigner();
    designer.getPaste().assignCallback(this._paste.bind(this));
    if (!document.execCommand("paste")) {
      designer.getPaste().assignCallback(null);
      this._paste(
        Node.deserialize(designer.getClipboardContent(Node.MIME_TYPE) as string) as Node[] | null,
      );
    }
  }

  /** The view position (client coordinates of the view) to paste at. */
  setPosition(position: Point): void {
    this._targetPosition = (activeWindow() as ActionWindow)
      .getView()
      .getViewTransform(activeDocument().getScene().getActivePage())
      .mapPoint(position);
  }

  private _paste(nodes: Node[] | null, isText?: boolean): void {
    if (nodes && nodes.length > 0) {
      const elements = pastedElements(nodes);
      if (elements.length > 0) {
        const editor = activeDocument().getEditor();
        prepareEmptyTexts(editor, elements);
        editor.beginTransaction();
        try {
          editor.insertElements(elements, !isText, true, true, true);
          const pastedBox = unitedGeometryBBox(elements);
          const pastedX = pastedBox ? pastedBox.getX() : null;
          const pastedY = pastedBox ? pastedBox.getY() : null;
          const target = this._targetPosition;
          const move = target ? moveTo(target.getX(), target.getY(), pastedX, pastedY) : null;
          if (move) {
            for (let i = 0; i < elements.length; ++i) {
              const element = elements[i] as PastedElement;
              if (element.hasMixin(GElement.Transform)) element.transform(move, true);
            }
          }
        } finally {
          editor.commitTransaction(Locale.get(new LocaleKey("GPaste", "action.paste")) as string);
        }
      }
    }
  }

  override toString(): string {
    return "[Object GPasteHereAction]";
  }
}

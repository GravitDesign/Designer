// Old: designer.browser.dev.js module 877 (GPasteAction).
import { Key } from "../../../engine/core/key.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Node } from "../../../engine/scene/node.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { isEditable } from "../focus.ts";
import { gDesigner } from "../host.ts";

/**
 * Edit > Paste. The shortcut lets the browser's paste event through (the
 * clipboard bridge handles it), focusing the hidden paste area first where
 * there is one; the menu reads the system clipboard with the async
 * Clipboard API and falls back to the app's internal clipboard.
 */
export class PasteAction extends Action {
  // The odd id (not "edit.paste") is the old one; menus and stats use it.
  static ID = "paste.paste";
  static TITLE = new LocaleKey("GPasteAction", "title");

  override getId(): string {
    return PasteAction.ID;
  }

  override getTitle(): LocaleKey {
    return PasteAction.TITLE;
  }

  override getIcon(): string {
    return "gravit-icon-paste";
  }

  override getCategory(): Category {
    return Category.CATEGORY_EDIT_PASTE;
  }

  override getGroup(): string {
    return "ccp/paste";
  }

  override getShortcut(): Shortcut {
    return [Key.Constant.META, "V"];
  }

  override isEnabled(): boolean {
    return !!gDesigner().getActiveDocument();
  }

  /** Returns false so the key goes on to the browser, which fires paste. */
  override executeFromShortcut(): boolean {
    const designer = gDesigner();
    const paste = designer.getPaste();
    let area: HTMLElement | null = null;
    if (paste) {
      paste.assignCallback(null);
      area = paste.getArea();
    }
    if (
      !(
        document.activeElement &&
        isEditable(document.activeElement) &&
        !designer.isGravitIME(document.activeElement)
      ) &&
      area
    ) {
      paste.setAllowFocus(true);
      area.focus();
    }
    return false;
  }

  override execute(): void {
    gDesigner()
      .getPaste()
      .pasteFromClipboard()
      .catch(() => {
        this._pasteFromInternalClipboard();
      });
  }

  private _pasteFromInternalClipboard(): void {
    const designer = gDesigner();
    if (designer.getClipboardContent(Node.MIME_TYPE)) {
      designer.getPaste().assignCallback(null);
      designer.getPaste().handlePasteData({
        [Node.MIME_TYPE]: designer.getClipboardContent(Node.MIME_TYPE) as string,
      });
    }
  }

  override toString(): string {
    return "[Object GPasteAction]";
  }
}

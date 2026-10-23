// Old: designer.browser.dev.js module 1646 (GShowSelectionHandlesAction).
import { Key } from "../../../engine/core/key.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import type { Node } from "../../../engine/scene/node.ts";
import type { Editor } from "../../../editor/editor.ts";
import { BaseEditor } from "../../../editor/element-editors/base-editor.ts";
import { ElementEditor } from "../../../editor/element-editors/element-editor.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { viewDesigner, known } from "./view-host.ts";

/**
 * View > Show Selection Handles (Shift+Ctrl+X): hides or shows the
 * handles of the selected elements. Checked while any selected element
 * shows its editor; without a selection it keeps the last answer.
 */
export class ShowSelectionHandlesAction extends Action {
  static ID = "view.canvas.show-selection-handles";
  static TITLE = new LocaleKey("GShowSelectionHandlesAction", "title");

  private _lastIsCheckedValue = true;

  override getId(): string {
    return ShowSelectionHandlesAction.ID;
  }

  override getTitle(): LocaleKey {
    return ShowSelectionHandlesAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_VIEW_CANVAS;
  }

  override isCheckable(): boolean {
    return true;
  }

  override isEnabled(): boolean {
    return !!this._getSelection();
  }

  override isChecked(): boolean {
    const selection = this._getSelection();
    if (!selection) return this._lastIsCheckedValue;
    const checked = !!selection.find(
      (element) =>
        !known(ElementEditor.getEditor<BaseEditor>(element)).hasFlag(BaseEditor.Flag.HideEditor),
    );
    this._lastIsCheckedValue = checked;
    return checked;
  }

  override getShortcut(): Shortcut {
    return [Key.Constant.SHIFT, Key.Constant.META, "X"];
  }

  override execute(): void {
    const editor = this._getEditor();
    if (editor) {
      if (this.isChecked()) editor.hideSelection();
      else editor.resetHideSelection();
    }
  }

  _getEditor(): Editor | null {
    const document = viewDesigner().getActiveDocument();
    return document && document.getEditor();
  }

  _getSelection(): Node[] | null {
    const editor = this._getEditor();
    const selection = editor && (editor.getSelection() as Node[] | null);
    return selection && selection.length > 0 ? selection : null;
  }

  override toString(): string {
    return "[Object GShowSelectionHandlesAction]";
  }
}

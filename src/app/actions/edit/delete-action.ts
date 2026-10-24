// Old: designer.browser.dev.js module 1332 (GDeleteAction).
import { Key } from "../../../engine/core/key.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { OperatingSystem, System } from "../../../engine/core/system.ts";
import { Item } from "../../../engine/scene/item.ts";
import { Layer } from "../../../engine/scene/layer.ts";
import type { Node } from "../../../engine/scene/node.ts";
import { Editor } from "../../../editor/editor.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { iterateEqualStyleLayers, PanelIds } from "../deps.ts";
import { activeDocument, gDesigner, parentOf } from "../host.ts";

/**
 * Deletes the selection, or, while the mouse is over the fill, border or
 * effect panel, the hovered style layer (and the equal layers of the other
 * selected elements).
 *
 * The old action also removed review annotations when the annotations
 * sidebar was active, after a confirm dialog. That sidebar needs the cloud
 * and is dropped, so the branch can't be reached and is left out; the
 * confirm flag that disabled the action meanwhile stays false.
 */
export class DeleteAction extends Action {
  static ID = "edit.delete";
  static TITLE = new LocaleKey("GDeleteAction", "title");

  private _isConfirmWindowDisplaying = false;

  override getId(): string {
    return DeleteAction.ID;
  }

  override getTitle(): LocaleKey {
    return DeleteAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_EDIT;
  }

  override getGroup(): string {
    return "ccp";
  }

  override getShortcut(): Shortcut {
    return [Key.Constant.REMOVE];
  }

  /** Delete on a Mac (REMOVE is Backspace there), Backspace elsewhere. */
  override getAdditionalShortcuts(): Shortcut[] {
    const shortcuts: Shortcut[] = [];
    if (System.operatingSystem === OperatingSystem.OSX_IOS) shortcuts.push([Key.Constant.DELETE]);
    else shortcuts.push([Key.Constant.BACKSPACE]);
    return shortcuts;
  }

  override isEnabled(): boolean {
    const designerDocument = gDesigner().getActiveDocument();
    if (this._isConfirmWindowDisplaying) return false;
    if (designerDocument) {
      const selection = designerDocument.getEditor().getSelection();
      if (selection) {
        for (let i = 0; i < selection.length; ++i) {
          if (selection[i] instanceof Item || selection[i] instanceof Layer) return true;
        }
      }
    }
    return false;
  }

  override execute(): void {
    const designerDocument = activeDocument();
    const editor = designerDocument.getEditor();
    const styles = designerDocument.getActiveStylesList();
    const mouseOver = gDesigner().getMouseOverContext();
    if (mouseOver.context && (styles.Fill || styles.Border || styles.Effect)) {
      let layer: unknown = null;
      let kind: "fill" | "border" | "effect" | null = null;
      const selection = editor.getSelection() as Node[];
      if (mouseOver.context === PanelIds.FillPropertiesPanel) {
        layer = styles.Fill;
        kind = "fill";
      } else if (mouseOver.context === PanelIds.BorderPropertiesPanel) {
        layer = styles.Border;
        kind = "border";
      } else {
        if (mouseOver.context !== PanelIds.EffectPropertiesPanel) {
          editor.deleteSelection();
          return;
        }
        layer = styles.Effect;
        kind = "effect";
      }
      Editor.tryRunTransaction(
        designerDocument.getScene(),
        () => {
          iterateEqualStyleLayers(kind, layer, selection, (equal: Node) => {
            parentOf(equal).removeChild(equal);
          });
        },
        Locale.get(DeleteAction.TITLE) as string,
      );
    } else editor.deleteSelection();
  }

  override getIcon(): string {
    return gDesigner().isTouchEnabled() ? "gravit-icon-delete" : "";
  }

  override toString(): string {
    return "[Object GDeleteAction]";
  }
}

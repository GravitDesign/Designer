// Old: designer.browser.dev.js module 1340 (GRenameLayerAction).
import { Key } from "../../../engine/core/key.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { leftSidebars, outlineLayerPanel } from "./modify-deps.ts";

/**
 * Alt+R (shortcut only): opens the title editor of the focused row in the
 * layers panel, when the outline sidebar is the active left sidebar.
 */
export class RenameLayerAction extends Action {
  static ID = "edit.rename-layer";
  static TITLE = new LocaleKey("GRenameLayerAction", "title");

  override getId(): string {
    return RenameLayerAction.ID;
  }

  override getTitle(): LocaleKey {
    return RenameLayerAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_EDIT;
  }

  override getShortcut(): Shortcut {
    return [Key.Constant.OPTION, "R"];
  }

  override isVisible(): boolean {
    return false;
  }

  override execute(): void {
    const activeSidebar = leftSidebars()?.getActiveSidebar();
    const outline = outlineLayerPanel();
    if (!outline) return;
    const { currentFocus } = outline.panel.data();
    if (currentFocus && activeSidebar === outline.sidebar.getId()) {
      outline.panel.getTitleOfLayer(currentFocus.row).openAutoEdit();
    }
  }

  override toString(): string {
    return "[Object GRenameLayerAction]";
  }
}

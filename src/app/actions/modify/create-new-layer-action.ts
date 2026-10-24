// Old: designer.browser.dev.js module 1653 (GCreateNewLayerAction).
import { Key } from "../../../engine/core/key.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { SidebarsIds } from "../../shell/sidebar-ids.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { applicationManager, gDesigner } from "../host.ts";
import { outlineSidebar } from "./modify-deps.ts";

/** GToggleSidebarAction.ID (module 1170, actions/view/toggle-sidebar-action.ts). */
const TOGGLE_SIDEBAR_ID = "view.toggle-sidebar";

/**
 * Cmd+M (shortcut only): shows the outline sidebar and inserts a new layer
 * there.
 */
export class CreateNewLayerAction extends Action {
  static ID = "modify.create-new-layer";
  static TITLE = new LocaleKey("GCreateNewLayerAction", "title");

  override getId(): string {
    return CreateNewLayerAction.ID;
  }

  override getTitle(): LocaleKey {
    return CreateNewLayerAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_MODIFY;
  }

  override isVisible(): boolean {
    return false;
  }

  override getShortcut(): Shortcut {
    return [Key.Constant.META, Key.Constant.M];
  }

  override isEnabled(): boolean {
    return applicationManager().isEditingEnabled();
  }

  override execute(): void {
    this._showOutlineSidebar();
    const sidebar = outlineSidebar();
    // The shell's stand-in for the outline sidebar (until the sidebars
    // cluster ports it) has no insertLayer.
    if (sidebar && sidebar.insertLayer) sidebar.insertLayer();
  }

  _showOutlineSidebar(): void {
    const action = gDesigner().getAction(
      "".concat(TOGGLE_SIDEBAR_ID, ".").concat(SidebarsIds.GOutlineSidebar),
    );
    if (!action) return;
    if (!action.isChecked()) action.execute();
  }

  override toString(): string {
    return "[Object GCreateNewLayerAction]";
  }
}

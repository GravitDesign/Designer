// Old: designer.browser.dev.js module 1345 (GChangeAnchorPointsJointTypeMainAction).
import { Key } from "../../../engine/core/key.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { SidebarsIds } from "../../shell/sidebar-ids.ts";
import { type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { gDesigner } from "../host.ts";
import { MainAction } from "../main-action.ts";

/**
 * Cmd+Alt+A (shortcut only), then S, M, D, C or A: changes the joint type
 * of the selected anchor points (change-anchor-points-joint-type-sub-action.ts).
 * Enabled while the inspector is the active right sidebar.
 */
export class ChangeAnchorPointsJointTypeMainAction extends MainAction {
  static ID = "modify.change-anchor-points-joint-type";
  static TITLE = new LocaleKey("GChangeAnchorPointsJointTypeMainAction", "title");

  override getId(): string {
    return ChangeAnchorPointsJointTypeMainAction.ID;
  }

  override getTitle(): LocaleKey {
    return ChangeAnchorPointsJointTypeMainAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_MODIFY;
  }

  override isVisible(): boolean {
    return false;
  }

  override getShortcut(): Shortcut {
    return [Key.Constant.META, Key.Constant.OPTION, Key.Constant.A];
  }

  override isEnabled(): boolean {
    return gDesigner().getRightSidebars().getActiveSidebar() === SidebarsIds.GInspectorSidebar;
  }

  override toString(): string {
    return "[Object GChangeAnchorPointsJointTypeMainAction]";
  }
}

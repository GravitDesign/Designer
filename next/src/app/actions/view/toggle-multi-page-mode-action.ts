// Old: designer.browser.dev.js module 1650 (GToggleMultiPageModeAction).
import { Key } from "../../../engine/core/key.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { SidebarsIds } from "../../shell/sidebar-ids.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { viewDesigner } from "./view-host.ts";

/** The part of the outline (pages and layers) sidebar this action uses. */
interface MultiPageSidebar {
  toggleMultiPageMode?(): void;
}

/**
 * F6 (shortcut only): switches the multi-page view on or off. The outline
 * sidebar owns the switch (its pages panel shows the state), so without
 * that sidebar nothing happens.
 */
export class ToggleMultiPageModeAction extends Action {
  static ID = "view.toggle-multi-page-mode";
  static TITLE = new LocaleKey("GToggleMultiPageModeAction", "title");

  override getId(): string {
    return ToggleMultiPageModeAction.ID;
  }

  override getTitle(): LocaleKey {
    return ToggleMultiPageModeAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_VIEW;
  }

  override getShortcut(): Shortcut {
    return [Key.Constant.F6];
  }

  override isVisible(): boolean {
    return false;
  }

  override execute(): void {
    const sidebars = viewDesigner().getLeftSidebars();
    const sidebar =
      sidebars && (sidebars.getSidebar(SidebarsIds.GOutlineSidebar) as MultiPageSidebar | null);
    // The stand-in of a sidebar that isn't ported yet has no toggle.
    if (sidebar && sidebar.toggleMultiPageMode) sidebar.toggleMultiPageMode();
  }

  override toString(): string {
    return "[Object GToggleMultiPageModeAction]";
  }
}

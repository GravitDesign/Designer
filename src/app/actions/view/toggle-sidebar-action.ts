// Old: designer.browser.dev.js module 1170 (GToggleSidebarAction).
import { Key } from "../../../engine/core/key.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Sidebars, type SidebarLike, type SidebarOrientation } from "../../shell/layout.ts";
import { SidebarsIds } from "../../shell/sidebar-ids.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { viewDesigner, known } from "./view-host.ts";

/**
 * View > <sidebar>: one action per sidebar, created by the designer and
 * spliced in before View > New Window. Shows the sidebar on its side (and
 * the side), or hides the side when the sidebar is the active one, and
 * remembers the side's state in the sidebars_<side>_active setting.
 *
 * The old action also refreshed the toolbar's comment toggle for the
 * annotations sidebar, which is dropped with the cloud.
 */
export class ToggleSidebarAction extends Action {
  static ID = "view.toggle-sidebar";
  static TITLE = new LocaleKey("GToggleSidebarAction", "title");

  private readonly _sidebar: SidebarLike;

  constructor(sidebar: SidebarLike) {
    super();
    this._sidebar = sidebar;
  }

  override getId(): string {
    return ToggleSidebarAction.ID + "." + this._sidebar.getId();
  }

  override getTitle(): string {
    return (Locale.get(ToggleSidebarAction.TITLE) as string).replace(
      "%s",
      Locale.get(this._sidebar.getTitle()) as string,
    );
  }

  override getCategory(): Category {
    return Category.CATEGORY_VIEW;
  }

  override getGroup(): string {
    return "view-sidebars";
  }

  override isCheckable(): boolean {
    return true;
  }

  override isChecked(): boolean {
    return this._sidebar.getId() === known(this._getSidebars()).getActiveSidebar();
  }

  override getShortcut(): Shortcut | null {
    switch (this._sidebar.getId()) {
      case SidebarsIds.GOutlineSidebar:
        return [Key.Constant.OPTION, "1"];
      case SidebarsIds.GInspectorSidebar:
        return [Key.Constant.OPTION, "2"];
      default:
        return null;
    }
  }

  override execute(): void {
    const designer = viewDesigner();
    const sidebars = known(this._getSidebars());
    if (this.isChecked()) {
      sidebars.setActiveSidebar(null);
      designer.setPartVisible(sidebars.getSidebarsPart(), false);
    } else {
      sidebars.setActiveSidebar(this._sidebar.getId());
      designer.setPartVisible(sidebars.getSidebarsPart(), true);
    }
    Sidebars.setOrientationStateInSetting(
      this._sidebar.getOrientation() as SidebarOrientation,
      this.isChecked(),
    );
  }

  _getSidebars(): Sidebars | undefined {
    switch (this._sidebar.getOrientation()) {
      case Sidebars.Orientation.Left:
        return viewDesigner().getLeftSidebars();
      case Sidebars.Orientation.Right:
        return viewDesigner().getRightSidebars();
    }
    return undefined;
  }

  override isVisible(): boolean {
    return this._sidebar.isVisible();
  }

  override toString(): string {
    return "[Object GToggleSidebarAction]";
  }
}

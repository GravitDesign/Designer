// Old: designer.browser.dev.js module 1169 (GShowGuideLinesAction).
import { Key } from "../../../engine/core/key.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { activeWindow, activeWindowView, viewDesigner, known } from "./view-host.ts";

/** View > Show Guide Lines: the active view's guide lines, remembered as a setting. */
export class ShowGuideLinesAction extends Action {
  static ID = "view.canvas.show-guide-lines";
  static TITLE = new LocaleKey("GShowGuideLinesAction", "title");

  override getId(): string {
    return ShowGuideLinesAction.ID;
  }

  override getTitle(): LocaleKey {
    return ShowGuideLinesAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_VIEW_CANVAS;
  }

  override getGroup(): string {
    return "show/canvas";
  }

  override getShortcut(): Shortcut {
    return [Key.Constant.META, ","];
  }

  override isEnabled(): boolean {
    return !!activeWindow();
  }

  override isCheckable(): boolean {
    return true;
  }

  override isChecked(): boolean {
    const window = activeWindow();
    if (window) {
      const configuration = known(window.getView()).getViewConfiguration();
      return !!configuration && true === configuration.guideLinesVisible;
    }
    return false;
  }

  override execute(): void {
    const view = activeWindowView();
    view.getViewConfiguration().guideLinesVisible = !view.getViewConfiguration().guideLinesVisible;
    view.invalidate();
    viewDesigner().setSetting("guide_lines_visible", view.getViewConfiguration().guideLinesVisible);
  }

  override toString(): string {
    return "[Object GShowGuideLinesAction]";
  }
}

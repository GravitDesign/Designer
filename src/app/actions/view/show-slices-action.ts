// Old: designer.browser.dev.js module 1615 (GShowSlicesAction).
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Action } from "../action.ts";
import { Category } from "../category.ts";
import { activeWindow, activeWindowView, known } from "./view-host.ts";

/** View > Show Slices: the active view's slices (not remembered). */
export class ShowSlicesAction extends Action {
  static ID = "view.canvas.show-slices";
  static TITLE = new LocaleKey("GShowSlicesAction", "title");

  override getId(): string {
    return ShowSlicesAction.ID;
  }

  override getTitle(): LocaleKey {
    return ShowSlicesAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_VIEW_CANVAS;
  }

  override getGroup(): string {
    return "show/canvas";
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
      return !!configuration && true === configuration.slices;
    }
    return false;
  }

  override execute(): void {
    const view = activeWindowView();
    view.getViewConfiguration().slices = !view.getViewConfiguration().slices;
    view.invalidateAndResetCache(null);
  }

  override toString(): string {
    return "[Object GShowSlicesAction]";
  }
}

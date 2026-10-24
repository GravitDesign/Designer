// Old: designer.browser.dev.js module 1286 (GShowSymbolLabelsAction).
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Action } from "../action.ts";
import { Category } from "../category.ts";
import { activeWindow, activeWindowView, viewDesigner, known } from "./view-host.ts";

/** View > Show Symbol Labels: the active view's symbol labels, remembered as a setting. */
export class ShowSymbolLabelsAction extends Action {
  static ID = "view.canvas.show-symbol-labels";
  static TITLE = new LocaleKey("GShowSymbolLabelsAction", "title");

  override getId(): string {
    return ShowSymbolLabelsAction.ID;
  }

  override getTitle(): LocaleKey {
    return ShowSymbolLabelsAction.TITLE;
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
      return !!configuration && !!configuration.symbolLabelsVisible;
    }
    return false;
  }

  override execute(): void {
    const view = activeWindowView();
    view.getViewConfiguration().symbolLabelsVisible =
      !view.getViewConfiguration().symbolLabelsVisible;
    view.invalidate();
    viewDesigner().setSetting(
      "symbol_labels_visible",
      view.getViewConfiguration().symbolLabelsVisible,
    );
  }

  override toString(): string {
    return "[Object GShowSymbolLabelsAction]";
  }
}

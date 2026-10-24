// Old: designer.browser.dev.js module 1614 (GShowRulersAction).
import { Key } from "../../../engine/core/key.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { ShowGuideLinesAction } from "./show-guide-lines-action.ts";
import { activeWindow, activeWindowView, viewDesigner, known } from "./view-host.ts";

/**
 * View > Show Rulers: the active view's rulers, the `rulers` class on
 * #mainframe and the rulers_visible setting. Showing the rulers also
 * shows the guide lines when they are hidden.
 */
export class ShowRulersAction extends Action {
  static ID = "view.canvas.show-rulers";
  static TITLE = new LocaleKey("GShowRulersAction", "title");

  override getId(): string {
    return ShowRulersAction.ID;
  }

  override getTitle(): LocaleKey {
    return ShowRulersAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_VIEW_CANVAS;
  }

  override getGroup(): string {
    return "show/canvas";
  }

  override getShortcut(): Shortcut {
    return [Key.Constant.META, Key.Constant.OPTION, "R"];
  }

  override isEnabled(): boolean {
    const window = activeWindow();
    return !(!window || !window.getView());
  }

  override isCheckable(): boolean {
    return true;
  }

  override isChecked(): boolean {
    const window = activeWindow();
    const view = window && window.getView();
    return !!view && view.hasRulers();
  }

  override execute(): void {
    const view = activeWindowView();
    const visible = !view.hasRulers();
    const designer = viewDesigner();
    const guideLines = known(designer.getAction(ShowGuideLinesAction.ID));
    if (visible && !guideLines.isChecked())
      designer.executeAction(ShowGuideLinesAction.ID, undefined, undefined, true);
    view.setRulers(visible);
    const mainframe = document.getElementById("mainframe");
    if (mainframe) mainframe.classList.toggle("rulers", visible);
    designer.setSetting("rulers_visible", visible);
  }

  override toString(): string {
    return "[Object GShowRulersAction]";
  }
}

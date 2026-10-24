// Old: designer.browser.dev.js module 1619 (GShowEffectsAction).
import { Key } from "../../../engine/core/key.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { activeWindow, known } from "./view-host.ts";

/** View > Show Effects: whether the active view paints effects (not remembered). */
export class ShowEffectsAction extends Action {
  static ID = "view.canvas.show-effects";
  static TITLE = new LocaleKey("GShowEffectsAction", "title");

  override getId(): string {
    return ShowEffectsAction.ID;
  }

  override getTitle(): LocaleKey {
    return ShowEffectsAction.TITLE;
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

  override getShortcut(): Shortcut {
    return [Key.Constant.META, "E"];
  }

  override isChecked(): boolean {
    const window = activeWindow();
    return !!window && !known(window.getView()).getViewConfiguration().ignoreEffects;
  }

  override execute(): boolean | undefined {
    const window = activeWindow();
    if (!window) return false;
    const view = known(window.getView());
    view.getViewConfiguration().ignoreEffects = !view.getViewConfiguration().ignoreEffects;
    view.invalidateAndResetCache(null);
  }

  override toString(): string {
    return "[Object GShowEffectsAction]";
  }
}

// Old: designer.browser.dev.js module 1296 (GNewWindowAction).
import { Key } from "../../../engine/core/key.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import type { Window } from "../../shell/window.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { activeWindow, viewDesigner } from "./view-host.ts";

/** View > New Window (clone view): another window on the active document, same scroll and zoom. */
export class NewWindowAction extends Action {
  static ID = "view.clone";
  static TITLE = new LocaleKey("GNewWindowAction", "title");

  override getId(): string {
    return NewWindowAction.ID;
  }

  override getTitle(): LocaleKey {
    return NewWindowAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_VIEW;
  }

  override getGroup(): string {
    return "view";
  }

  override getShortcut(): Shortcut {
    return [Key.Constant.META, Key.Constant.OPTION, "N"];
  }

  override isEnabled(): boolean {
    return !!activeWindow();
  }

  override execute(): void {
    viewDesigner()
      .getWindows()
      .addWindow(activeWindow() as Window);
  }

  override toString(): string {
    return "[Object GNewWindowAction]";
  }
}

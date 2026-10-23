// Old: designer.browser.dev.js module 1649 (GCloseActiveWindowAction).
import { Key } from "../../../engine/core/key.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import type { Window } from "../../shell/window.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { viewDesigner } from "./view-host.ts";

/**
 * Alt+Q (shortcut only): closes the active document's active window. The
 * windows ask to save first when it is the last window of a modified
 * document.
 */
export class CloseActiveWindowAction extends Action {
  static ID = "file.close-active-window";
  static TITLE = new LocaleKey("GCloseActiveWindowAction", "title");

  override getId(): string {
    return CloseActiveWindowAction.ID;
  }

  override getTitle(): LocaleKey {
    return CloseActiveWindowAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_FILE;
  }

  override isVisible(): boolean {
    return false;
  }

  override getShortcut(): Shortcut {
    return [Key.Constant.OPTION, Key.Constant.Q];
  }

  override isEnabled(): boolean {
    const document = viewDesigner().getActiveDocument();
    const window = document && document.getActiveWindow();
    const windows = viewDesigner().getWindows();
    return !(!window || !windows);
  }

  override execute(): void {
    const document = viewDesigner().getActiveDocument();
    const window = document && document.getActiveWindow();
    viewDesigner()
      .getWindows()
      .removeWindow(window as Window);
  }

  override toString(): string {
    return "[Object GCloseActiveWindowAction]";
  }
}

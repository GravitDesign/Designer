// Old: designer.browser.dev.js module 1632 (GQuitAction).
import { Key } from "../../../engine/core/key.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Runtime } from "../../shell/container.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { gContainer } from "../host.ts";

/** Whether the app runs outside a browser tab (Electron). */
function isDesktopRuntime(): boolean {
  return gContainer().getRuntime() !== Runtime.Browser && gContainer().getRuntime() !== Runtime.PWA;
}

/** File > Quit: only outside the browser, where it closes the app. */
export class QuitAction extends Action {
  static ID = "file.quit";
  static TITLE = new LocaleKey("GQuitAction", "title");

  override getId(): string {
    return QuitAction.ID;
  }

  override getTitle(): LocaleKey {
    return QuitAction.TITLE;
  }

  override getCategory(): Category {
    return Category.CATEGORY_FILE;
  }

  override getGroup(): string {
    return "file-quit";
  }

  override isEnabled(): boolean {
    return isDesktopRuntime();
  }

  override getShortcut(): Shortcut {
    return [Key.Constant.META, "Q"];
  }

  override isAvailable(): boolean {
    return isDesktopRuntime();
  }

  override execute(): void {
    gContainer().triggerClose();
  }

  override toString(): string {
    return "[Object GQuitAction]";
  }
}

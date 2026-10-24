// Old: designer.browser.dev.js module 1299 (GOpenAction for Safari).
import { Key } from "../../../engine/core/key.ts";
import { Platform, WebBrowser } from "../../../engine/core/platform.ts";
import type { Shortcut } from "../action.ts";
import { OpenAction } from "./open-action.ts";

/** File > Open in Safari, which keeps Ctrl+O for itself: Ctrl+Alt+O. */
export class OpenSafariAction extends OpenAction {
  static override ID = "".concat(OpenAction.ID, ".safari");

  override getId(): string {
    return OpenSafariAction.ID;
  }

  override getShortcut(): Shortcut {
    return [Key.Constant.META, Key.Constant.ALT_LEFT, "O"];
  }

  override isAvailable(): boolean {
    return Platform.webBrowser === WebBrowser.Safari;
  }
}

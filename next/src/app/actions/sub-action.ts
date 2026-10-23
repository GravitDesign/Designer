// Old: designer.browser.dev.js module 1168 (GSubAction).
import { Locale } from "../../engine/core/locale/locale.ts";
import { Action, type ActionTitle, type ShortcutHintOptions } from "./action.ts";
import { gDesigner } from "./host.ts";

/**
 * One variant of a main action (main-action.ts), registered as
 * "<main id>.<type>". It is hidden from the menus; its shortcut is the
 * main action's shortcut followed by its own sub key.
 */
export class SubAction extends Action {
  /** The type values of the subclass (Type.Straight, ...). */
  static Type: Readonly<Record<string, string>> = {};

  static getSubActionId(mainActionId: string, type: string): string {
    return "".concat(mainActionId, ".").concat(type);
  }

  protected _type: string;
  protected _title: ActionTitle;

  constructor(type: string) {
    super();
    this._type = type;
    this._title = null;
  }

  override getId(): string {
    return SubAction.getSubActionId(this._getMainActionId(), this._type);
  }

  protected _getMainActionId(): string {
    throw new Error("Not implemented.");
  }

  override getTitle(): ActionTitle {
    return this._title;
  }

  getMainAction(): Action {
    return gDesigner().getAction(this._getMainActionId()) as Action;
  }

  override isVisible(): boolean {
    return false;
  }

  override isEnabled(): boolean {
    return this.getMainAction().isEnabled();
  }

  /** The key pressed after the main shortcut, e.g. "1". */
  getShortcutSubKey(): string | null {
    return null;
  }

  override getShortcutHint(options?: ShortcutHintOptions): string | null {
    const mainShortcut = this.getMainAction().getShortcut();
    const subKey = this.getShortcutSubKey();
    const mainHint = Action.getActionShortcutHint(mainShortcut, options);
    return mainHint && subKey
      ? (Locale.getValue("GSubAction", "shortcut-hint-template") as string)
          .replace("%mainShortcutHint", mainHint)
          .replace("%shortcutSubKeyHint", subKey)
      : null;
  }

  override toString(): string {
    return "[Object GSubAction]";
  }
}

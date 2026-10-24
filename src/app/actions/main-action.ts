// Old: designer.browser.dev.js module 1281 (GMainAction).
import { Key } from "../../engine/core/key.ts";
import { Action } from "./action.ts";
import { gDesigner } from "./host.ts";
import { SubAction } from "./sub-action.ts";

/**
 * An action with sub-actions picked by a second key: its shortcut starts
 * listening, a sub key pressed within SHORTCUT_DELAY runs that sub-action,
 * otherwise the main action runs (execute, a no-op unless overridden).
 */
export class MainAction extends Action {
  readonly Type: Readonly<Record<string, string>>;
  private readonly _subActionIds: string[] | null;
  private _timeoutId: ReturnType<typeof setTimeout> | null;
  private readonly _shortcutSubKeyHandlerBind: (event: KeyboardEvent) => void;

  /** `subActionClass` is the SubAction subclass whose Type lists the variants. */
  constructor(subActionClass: { Type: Readonly<Record<string, string>> }) {
    super();
    this.Type = subActionClass.Type;
    const types = Object.values(this.Type);
    this._subActionIds = types.map((type) => SubAction.getSubActionId(this.getId(), type));
    this._timeoutId = null;
    this._shortcutSubKeyHandlerBind = this._shortcutSubKeyHandler.bind(this);
  }

  override executeFromShortcut(): unknown {
    this._setShortcutSubKeyListener();
    return undefined;
  }

  override execute(): unknown {
    return undefined;
  }

  getSubActions(): SubAction[] | null {
    return this._subActionIds
      ? this._subActionIds.map((id) => gDesigner().getAction(id) as SubAction)
      : null;
  }

  getShortcutSubKeys(): string[] | null {
    const subActions = this.getSubActions();
    return subActions
      ? (subActions.map((action) => action.getShortcutSubKey()).filter((key) => key) as string[])
      : null;
  }

  override getShortcutHint(): string | null {
    return null;
  }

  private _setShortcutSubKeyListener(): void {
    this._resetShortcutSubKeyListener();
    document.addEventListener("keydown", this._shortcutSubKeyHandlerBind, true);
    this._timeoutId = setTimeout(() => {
      this._resetShortcutSubKeyListener();
      this.execute();
    }, Action.SHORTCUT_DELAY);
  }

  private _executeFromShortcutSubKey(key: string): void {
    const subActions = this.getSubActions();
    if (!subActions) return;
    const subAction = subActions.find((action) => action.getShortcutSubKey() === key);
    if (subAction) subAction.execute();
  }

  private _shortcutSubKeyHandler(event: KeyboardEvent): void {
    const key = Key.translateCode(event.code);
    const subKeys = this.getShortcutSubKeys();
    this._resetShortcutSubKeyListener();
    if (key && subKeys && subKeys.includes(key as string)) {
      event.preventDefault();
      event.stopPropagation();
      this._executeFromShortcutSubKey(key as string);
    }
  }

  private _resetShortcutSubKeyListener(): void {
    if (this._timeoutId) {
      document.removeEventListener("keydown", this._shortcutSubKeyHandlerBind, true);
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
  }

  override toString(): string {
    return "[Object GMainAction]";
  }
}

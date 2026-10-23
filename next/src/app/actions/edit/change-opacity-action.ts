// Old: designer.browser.dev.js module 1647 (GChangeOpacityAction).
import { Key } from "../../../engine/core/key.ts";
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { parseNumber } from "../../../engine/core/util.ts";
import type { Node } from "../../../engine/scene/node.ts";
import { Stylable } from "../../../engine/style/stylable.ts";
import { Editor } from "../../../editor/editor.ts";
import { Action, type ShortcutHintOptions, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { gDesigner, props } from "../host.ts";

/**
 * Shift+digit sets the opacity of the selection: one digit is tens of
 * percent (Shift+5 = 50%, Shift+0 = 100%), a second digit typed within
 * SHORTCUT_DELAY makes it percent (Shift+2, Shift+5 = 25%), and a leading
 * 0 makes the rest a fraction (0, 5 = 0.5 → 5%).
 */
export class ChangeOpacityAction extends Action {
  static ID = "edit.change-opacity";
  static TITLE = new LocaleKey("GChangeOpacityAction", "title");

  private _opacityLevel: number | null = null;
  private _timeoutId: ReturnType<typeof setTimeout> | null = null;
  private _currentValue = "";

  override getId(): string {
    return ChangeOpacityAction.ID;
  }

  override getTitle(): LocaleKey {
    return ChangeOpacityAction.TITLE;
  }

  override getFullTitle(): string {
    return (Locale.getValue("GChangeOpacityAction", "full-title") as string).replace(
      "%value",
      "100% (10%, 20%, 25%, 26%, 30%, 40%, ... 90%)",
    );
  }

  override getCategory(): Category {
    return Category.CATEGORY_EDIT;
  }

  override isVisible(): boolean {
    return false;
  }

  override getAdditionalShortcuts(): Shortcut[] {
    return [
      Key.Constant.Digit0,
      Key.Constant.Digit1,
      Key.Constant.Digit2,
      Key.Constant.Digit3,
      Key.Constant.Digit4,
      Key.Constant.Digit5,
      Key.Constant.Digit6,
      Key.Constant.Digit7,
      Key.Constant.Digit8,
      Key.Constant.Digit9,
    ].map((digit) => [Key.Constant.SHIFT, digit]);
  }

  override execute(): void {
    const designerDocument = gDesigner().getActiveDocument();
    const editor = designerDocument && designerDocument.getEditor();
    const scene = designerDocument && designerDocument.getScene();
    const selection = editor && (editor.getSelection() as Node[] | null);
    if (scene && selection) {
      Editor.tryRunTransaction(
        scene,
        () => {
          selection.forEach((node) => {
            if (node.hasMixin(Stylable)) props(node).setProperty("_stop", this._opacityLevel);
          });
        },
        Locale.get(ChangeOpacityAction.TITLE) as string,
      );
      this._setOpacityLevel();
    }
  }

  override executeFromShortcut(event: KeyboardEvent): void {
    const key = Key.translateCode(event.code) as string;
    const previous = this._currentValue;
    this._setCurrentValue(key);
    if (previous) this._processDefinedCurrentValue();
    else {
      this._timeoutId = setTimeout(() => {
        this._processDefinedCurrentValue();
      }, Action.SHORTCUT_DELAY);
    }
  }

  override isKeyBoardEventRequiredToExecute(): boolean {
    return true;
  }

  override getShortcutHint(options?: ShortcutHintOptions): string | null {
    const shortcut = [Key.Constant.SHIFT, "0 (1, 2, 25, 26, 3, 4, ... 9)"];
    return Action.getActionShortcutHint(shortcut, options);
  }

  private _processDefinedCurrentValue(): void {
    this._clearTimeout();
    if (this._currentValue.length > 1 && "0" === this._currentValue[0]) {
      this._currentValue = this._currentValue.replace("0", ".");
    }
    const value = parseNumber(this._currentValue);
    if ("number" == typeof value && !isNaN(value)) {
      const level = this._getOpacityLevel(value);
      this._setOpacityLevel(level);
      this.execute();
    }
    this._setCurrentValue();
  }

  private _getOpacityLevel(value: number): number {
    return 0 === value ? 1 : value < 10 ? value / 10 : value < 100 ? value / 100 : 1;
  }

  private _setCurrentValue(key?: string): void {
    if (key) this._currentValue += key;
    else this._currentValue = "";
  }

  private _setOpacityLevel(level: number | null = null): void {
    this._opacityLevel = level;
  }

  private _clearTimeout(): void {
    if (this._timeoutId) clearTimeout(this._timeoutId);
  }

  override toString(): string {
    return "[Object GChangeOpacityAction]";
  }
}

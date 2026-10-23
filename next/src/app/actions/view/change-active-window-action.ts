// Old: designer.browser.dev.js module 1651 (GChangeActiveWindowAction).
import { Key, type KeyValue } from "../../../engine/core/key.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import type { Window } from "../../shell/window.ts";
import type { Windows } from "../../shell/windows.ts";
import { Action, type Shortcut } from "../action.ts";
import { Category } from "../category.ts";
import { viewDesigner } from "./view-host.ts";

const Type = { Next: "next", Previous: "previous" } as const;
type WindowStep = (typeof Type)[keyof typeof Type];

/** Alt+. and Alt+, (shortcut only): activates the next or previous window, wrapping around. */
export class ChangeActiveWindowAction extends Action {
  static ID = "view.change-active-window";
  static Type = Type;

  private readonly _type: WindowStep;
  private readonly _title: LocaleKey;

  constructor(type: WindowStep) {
    super();
    this._type = type;
    this._title = new LocaleKey("GChangeActiveWindowAction", "title.".concat(this._type));
  }

  override getId(): string {
    return "".concat(ChangeActiveWindowAction.ID, ".").concat(this._type);
  }

  override getTitle(): LocaleKey {
    return this._title;
  }

  override getCategory(): Category {
    return Category.CATEGORY_VIEW;
  }

  override isVisible(): boolean {
    return false;
  }

  override getShortcut(): Shortcut | null {
    const shortcut: KeyValue[] = [Key.Constant.OPTION];
    switch (this._type) {
      case Type.Next:
        return shortcut.concat(Key.Constant.PERIOD);
      case Type.Previous:
        return shortcut.concat(Key.Constant.COMMA);
      default:
        return null;
    }
  }

  override isEnabled(): boolean {
    const windows = viewDesigner().getWindows();
    const list = windows && windows.getWindows();
    return !!list && list.length > 1;
  }

  override execute(): void {
    if (this.isEnabled()) {
      const windows = viewDesigner().getWindows();
      const window = this._getNextWindowAccordingToType(windows);
      windows.activateWindow(window);
    }
  }

  _getNextWindowAccordingToType(windows: Windows): Window | null {
    const list = windows.getWindows();
    const active = windows && windows.getActiveWindow();
    const index = list.findIndex((window) => window === active);
    switch (this._type) {
      case Type.Next:
        return (index === list.length - 1 ? list[0] : list[index + 1]) as Window;
      case Type.Previous:
        return (0 === index ? list[list.length - 1] : list[index - 1]) as Window;
      default:
        return null;
    }
  }

  override toString(): string {
    return "[Object GChangeActiveWindowAction]";
  }
}

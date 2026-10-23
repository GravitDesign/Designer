/**
 * Where Designer.registerShortcut binds its key combos: Mousetrap in the
 * old app (designer.browser.dev.js modules 1595/1596, `bind` and
 * `bindGlobal`). The app-actions-file-edit cluster ports Mousetrap and
 * installs it with setShortcutBinder before boot binds anything; until
 * then the default binder below handles what the tools need: single
 * characters without modifiers, on keydown and keyup.
 */
import { Key, type KeyValue } from "../../engine/core/key.ts";

/** A Mousetrap callback: false stops the event (Mousetrap's convention). */
export type ShortcutCallback = (event: KeyboardEvent) => boolean | undefined;

export type ShortcutPhase = "keydown" | "keyup" | "keypress";

export interface ShortcutBinder {
  /** Mousetrap.bind: skipped while typing in a form field. */
  bind(combo: string, callback: ShortcutCallback, phase?: ShortcutPhase): void;
  /** Mousetrap.bindGlobal: also in form fields. */
  bindGlobal(combo: string, callback: ShortcutCallback, phase?: ShortcutPhase): void;
  /** Forgets every binding (app reset in tests). */
  reset?(): void;
}

/** GDesigner._shortcutToMouseTrapShortcut: key constants to Mousetrap names. */
export function shortcutToMousetrap(keys: readonly KeyValue[]): string {
  let out = "";
  for (let i = 0; i < keys.length; ++i) {
    if (i > 0) out += "+";
    let key = keys[i] as KeyValue;
    if ("number" == typeof key) {
      key = Key.transformKey(key);
      switch (key) {
        case Key.Constant.SPACE:
          out += "space";
          break;
        case Key.Constant.ENTER:
          out += "enter";
          break;
        case Key.Constant.TAB:
          out += "tab";
          break;
        case Key.Constant.BACKSPACE:
          out += "backspace";
          break;
        case Key.Constant.CONTROL:
          out += "ctrl";
          break;
        case Key.Constant.SHIFT:
          out += "shift";
          break;
        case Key.Constant.ALT_LEFT:
        case Key.Constant.ALT_RIGHT:
          out += "alt";
          break;
        case Key.Constant.LEFT:
          out += "left";
          break;
        case Key.Constant.UP:
          out += "up";
          break;
        case Key.Constant.RIGHT:
          out += "right";
          break;
        case Key.Constant.DOWN:
          out += "down";
          break;
        case Key.Constant.PAGE_UP:
          out += "pageup";
          break;
        case Key.Constant.PAGE_DOWN:
          out += "pagedown";
          break;
        case Key.Constant.HOME:
          out += "home";
          break;
        case Key.Constant.END:
          out += "end";
          break;
        case Key.Constant.INSERT:
          out += "ins";
          break;
        case Key.Constant.DELETE:
          out += "del";
          break;
        case Key.Constant.COMMAND:
          out += "meta";
          break;
        case Key.Constant.F1:
          out += "f1";
          break;
        case Key.Constant.F2:
          out += "f2";
          break;
        case Key.Constant.F3:
          out += "f3";
          break;
        case Key.Constant.F4:
          out += "f4";
          break;
        case Key.Constant.F5:
          out += "f5";
          break;
        case Key.Constant.F6:
          out += "f6";
          break;
        case Key.Constant.F7:
          out += "f7";
          break;
        case Key.Constant.F8:
          out += "f8";
          break;
        case Key.Constant.F9:
          out += "f9";
          break;
        case Key.Constant.F10:
          out += "f10";
          break;
        case Key.Constant.F11:
          out += "f11";
          break;
        case Key.Constant.F12:
          out += "f12";
          break;
        default:
          throw new Error("Unknown key code");
      }
    } else out += key.toLowerCase();
  }
  return out;
}

/**
 * Mousetrap's stopCallback: no shortcut while typing into a form field or
 * an editable element, unless it has the "mousetrap" class.
 */
export function stoppedByTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element || !element.tagName) return false;
  if ((" " + element.className + " ").indexOf(" mousetrap ") > -1) return false;
  return (
    "INPUT" == element.tagName ||
    "SELECT" == element.tagName ||
    "TEXTAREA" == element.tagName ||
    element.isContentEditable
  );
}

interface Binding {
  callback: ShortcutCallback;
  global: boolean;
}

/** The character of a key event without modifiers, as Mousetrap matched letters. */
function eventCharacter(event: KeyboardEvent): string | null {
  if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return null;
  const code = event.which || event.keyCode;
  if (!code) return null;
  return String.fromCharCode(code).toLowerCase();
}

/**
 * Single characters only (the tool keys and Q); other combos are kept in
 * `unsupported` so a test can see what waits for the real binder.
 */
export class SingleKeyBinder implements ShortcutBinder {
  readonly unsupported: string[] = [];
  private readonly _down = new Map<string, Binding>();
  private readonly _up = new Map<string, Binding>();
  private _listening = false;

  bind(combo: string, callback: ShortcutCallback, phase: ShortcutPhase = "keypress"): void {
    this._add(combo, callback, phase, false);
  }

  bindGlobal(combo: string, callback: ShortcutCallback, phase: ShortcutPhase = "keypress"): void {
    this._add(combo, callback, phase, true);
  }

  reset(): void {
    this._down.clear();
    this._up.clear();
    this.unsupported.length = 0;
  }

  private _add(
    combo: string,
    callback: ShortcutCallback,
    phase: ShortcutPhase,
    global: boolean,
  ): void {
    if (combo.length !== 1 || phase === "keypress") {
      this.unsupported.push(combo);
      return;
    }
    (phase === "keydown" ? this._down : this._up).set(combo.toLowerCase(), { callback, global });
    this._listen();
  }

  private _listen(): void {
    if (this._listening || typeof document !== "object") return;
    this._listening = true;
    document.addEventListener("keydown", (event) => this._handle(event, this._down));
    document.addEventListener("keyup", (event) => this._handle(event, this._up));
  }

  private _handle(event: KeyboardEvent, bindings: Map<string, Binding>): void {
    const character = eventCharacter(event);
    if (!character) return;
    const binding = bindings.get(character);
    if (!binding) return;
    if (!binding.global && stoppedByTarget(event.target)) return;
    if (false === binding.callback(event)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
}

let binder: ShortcutBinder = new SingleKeyBinder();

export function shortcutBinder(): ShortcutBinder {
  return binder;
}

/** Installs the real (Mousetrap) binder; call before boot. */
export function setShortcutBinder(value: ShortcutBinder): void {
  binder = value;
}

// Old: chunk.vendor.js module 164 (GKey).
/**
 * Key constants, the mapping from DOM key events to them, and the
 * localized names and symbols the menus and tooltips show for shortcuts.
 *
 * Shortcuts are arrays of Key.Constant values and characters
 * (`[Key.Constant.META, "S"]`). META, OPTION and REMOVE are platform
 * neutral and `transformKey` turns them into Command/Ctrl, Alt and
 * Backspace/Delete for the current system (system.ts).
 */
import { Locale } from "./locale/locale.ts";
import { GObject, registerClass } from "./object.ts";
import { Hardware, OperatingSystem, System } from "./system.ts";

const Constant = {
  CHARACTER: 0,
  SPACE: 1,
  ENTER: 2,
  TAB: 3,
  BACKSPACE: 4,
  CONTROL: 5,
  SHIFT: 6,
  ALT_LEFT: 7,
  LEFT: 8,
  UP: 9,
  RIGHT: 10,
  DOWN: 11,
  PAGE_UP: 12,
  PAGE_DOWN: 13,
  HOME: 14,
  END: 15,
  INSERT: 16,
  DELETE: 17,
  COMMAND: 19,
  ALT_RIGHT: 20,
  ESC: 21,
  F1: 30,
  F2: 31,
  F3: 32,
  F4: 33,
  F5: 34,
  F6: 35,
  F7: 36,
  F8: 37,
  F9: 38,
  F10: 39,
  F11: 40,
  F12: 41,
  A: "A",
  B: "B",
  C: "C",
  D: "D",
  E: "E",
  F: "F",
  G: "G",
  H: "H",
  I: "I",
  J: "J",
  K: "K",
  L: "L",
  M: "M",
  N: "N",
  O: "O",
  P: "P",
  Q: "Q",
  R: "R",
  S: "S",
  T: "T",
  U: "U",
  V: "V",
  W: "W",
  X: "X",
  Y: "Y",
  Z: "Z",
  Digit0: "0",
  Digit1: "1",
  Digit2: "2",
  Digit3: "3",
  Digit4: "4",
  Digit5: "5",
  Digit6: "6",
  Digit7: "7",
  Digit8: "8",
  Digit9: "9",
  COMMA: ",",
  PERIOD: ".",
  META: 100,
  OPTION: 101,
  REMOVE: 102,
} as const;

/** A key constant or a character. */
export type KeyValue = (typeof Constant)[keyof typeof Constant] | string;

/**
 * KeyboardEvent.code to constant. "AltLeft" mapped to the old
 * `Constant.ALT`, which doesn't exist, so it gives undefined (kept).
 */
const CODES: Readonly<Record<string, KeyValue | undefined>> = {
  Space: Constant.SPACE,
  Escape: Constant.ESC,
  Enter: Constant.ENTER,
  Tab: Constant.TAB,
  Backspace: Constant.BACKSPACE,
  ShiftLeft: Constant.SHIFT,
  ShiftRight: Constant.SHIFT,
  ControlLeft: Constant.CONTROL,
  ControlRight: Constant.CONTROL,
  AltRight: Constant.ALT_RIGHT,
  AltLeft: undefined,
  ArrowLeft: Constant.LEFT,
  ArrowUp: Constant.UP,
  ArrowRight: Constant.RIGHT,
  ArrowDown: Constant.DOWN,
  PageUp: Constant.PAGE_UP,
  PageDown: Constant.PAGE_DOWN,
  Home: Constant.HOME,
  End: Constant.END,
  Insert: Constant.INSERT,
  Delete: Constant.DELETE,
  F1: Constant.F1,
  F2: Constant.F2,
  F3: Constant.F3,
  F4: Constant.F4,
  F5: Constant.F5,
  F6: Constant.F6,
  F7: Constant.F7,
  F8: Constant.F8,
  F9: Constant.F9,
  F10: Constant.F10,
  F11: Constant.F11,
  F12: Constant.F12,
  ...Object.fromEntries("ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((c) => ["Key" + c, c])),
  ...Object.fromEntries("0123456789".split("").map((d) => ["Digit" + d, d])),
  Comma: Constant.COMMA,
  Period: Constant.PERIOD,
};

/** keyCode to constant; other key codes become their character. */
const KEY_CODES: Readonly<Record<number, KeyValue>> = {
  32: Constant.SPACE,
  27: Constant.ESC,
  13: Constant.ENTER,
  9: Constant.TAB,
  8: Constant.BACKSPACE,
  16: Constant.SHIFT,
  17: Constant.CONTROL,
  37: Constant.LEFT,
  38: Constant.UP,
  39: Constant.RIGHT,
  40: Constant.DOWN,
  33: Constant.PAGE_UP,
  34: Constant.PAGE_DOWN,
  36: Constant.HOME,
  35: Constant.END,
  45: Constant.INSERT,
  46: Constant.DELETE,
  112: Constant.F1,
  113: Constant.F2,
  114: Constant.F3,
  115: Constant.F4,
  116: Constant.F5,
  117: Constant.F6,
  118: Constant.F7,
  119: Constant.F8,
  120: Constant.F9,
  121: Constant.F10,
  122: Constant.F11,
  123: Constant.F12,
};

function isMacDesktop(): boolean {
  return System.operatingSystem === OperatingSystem.OSX_IOS && System.hardware === Hardware.Desktop;
}

/** Constant for a KeyboardEvent.code, or null for codes without one. */
function translateCode(code: string): KeyValue | null | undefined {
  return Object.hasOwn(CODES, code) ? CODES[code] : null;
}

/**
 * Constant for a keyCode. `location` 2 makes Alt the right Alt; the left
 * Alt gives undefined, as `Constant.ALT` didn't exist in the old code.
 * Other codes become `String.fromCharCode(keyCode)`.
 */
function translateKey(keyCode: number, location?: number): KeyValue | undefined {
  if (keyCode === 18) return 2 === location ? Constant.ALT_RIGHT : undefined;
  if (Object.hasOwn(KEY_CODES, keyCode)) return KEY_CODES[keyCode];
  return String.fromCharCode(keyCode);
}

/** META/COMMAND, OPTION and REMOVE for the current system. */
function transformKey(key: KeyValue): KeyValue {
  if (key === Constant.META || key === Constant.COMMAND) {
    return isMacDesktop() ? Constant.COMMAND : Constant.CONTROL;
  }
  if (key === Constant.OPTION) return Constant.ALT_LEFT;
  if (key === Constant.REMOVE) {
    return System.operatingSystem === OperatingSystem.OSX_IOS
      ? Constant.BACKSPACE
      : Constant.DELETE;
  }
  return key;
}

function toLocalizedName(key: KeyValue): string | undefined {
  const transformed = transformKey(key);
  return Locale.getValue("GKey", "key." + transformed.toString());
}

/**
 * The short label of a key: a symbol on a Mac desktop (unless
 * `noSymbols`), else the "key.<k>.short" string or the "key.<k>" name.
 */
function toLocalizedShort(key: KeyValue, noSymbols?: boolean): string | undefined {
  if (!noSymbols && isMacDesktop()) {
    if (key === Constant.TAB) return "⇥";
    if (key === Constant.OPTION || key === Constant.ALT_LEFT || key === Constant.ALT_RIGHT) {
      return "⌥";
    }
    if (key === Constant.META || key === Constant.COMMAND) return "⌘";
    if (key === Constant.SHIFT) return "⇧";
    if (key === Constant.CONTROL) return "⌃";
    if (key === Constant.SPACE) return "␣";
    if (key === Constant.ENTER) return "⏎";
    if (key === Constant.REMOVE) return "⌫";
    if (key === Constant.UP) return "↑";
    if (key === Constant.DOWN) return "↓";
    if (key === Constant.LEFT) return "←";
    if (key === Constant.RIGHT) return "→";
  }
  const transformed = transformKey(key);
  // The old code passed null as the default to skip the missing-value
  // log; "" does the same here and is just as falsy.
  const short = Locale.getValue("GKey", "key." + transformed.toString() + ".short", "");
  return short || Locale.getValue("GKey", "key." + transformed.toString());
}

/** A character key as shown in shortcuts. */
function toSystemShortcut(key: string): string {
  if (isMacDesktop()) {
    if ("-" === key) return "−";
    if ("+" === key) return "+";
  }
  return key.toUpperCase();
}

/**
 * A shortcut as text: "Ctrl+Shift+S" on Windows and Linux, "⌘⇧S" on a
 * Mac. `isWordMode` separates keys with " + " (" " on a Mac).
 */
function shortcutToString(
  shortcut: readonly KeyValue[],
  options: { isWordMode?: boolean } = {},
): string {
  const wordMode = options.isWordMode;
  let text = "";
  for (let i = 0; i < shortcut.length; ++i) {
    if (i > 0) {
      if (wordMode) text += System.operatingSystem === OperatingSystem.OSX_IOS ? " " : " + ";
      else if (System.operatingSystem !== OperatingSystem.OSX_IOS) text += "+";
    }
    const key = shortcut[i] as KeyValue;
    text += typeof key === "number" ? toLocalizedShort(key) : toSystemShortcut(key);
  }
  return text;
}

/**
 * The old GKey. It was a GObject subclass with only static members; the
 * class keeps its type id and the members live on it as statics.
 */
export class Key extends GObject {
  static {
    registerClass(this, "GKey");
  }

  static readonly Constant = Constant;
  static translateCode = translateCode;
  static translateKey = translateKey;
  static transformKey = transformKey;
  static toLocalizedName = toLocalizedName;
  static toLocalizedShort = toLocalizedShort;
  static toSystemShortcut = toSystemShortcut;
  static shortcutToString = shortcutToString;
}

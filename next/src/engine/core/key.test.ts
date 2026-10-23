import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Key } from "./key.ts";
import { Hardware, OperatingSystem, System } from "./system.ts";

const C = Key.Constant;
const saved = { os: System.operatingSystem, hw: System.hardware };

function useSystem(os: OperatingSystem, hw: Hardware = Hardware.Desktop): void {
  System.operatingSystem = os;
  System.hardware = hw;
}

beforeEach(() => useSystem(OperatingSystem.Windows));
afterEach(() => {
  System.operatingSystem = saved.os;
  System.hardware = saved.hw;
});

describe("translateCode and translateKey", () => {
  it("maps codes, with the old undefined for the left Alt", () => {
    expect(Key.translateCode("Space")).toBe(C.SPACE);
    expect(Key.translateCode("ControlRight")).toBe(C.CONTROL);
    expect(Key.translateCode("AltRight")).toBe(C.ALT_RIGHT);
    expect(Key.translateCode("AltLeft")).toBeUndefined();
    expect(Key.translateCode("KeyQ")).toBe("Q");
    expect(Key.translateCode("Digit7")).toBe("7");
    expect(Key.translateCode("F12")).toBe(C.F12);
    expect(Key.translateCode("Period")).toBe(".");
    expect(Key.translateCode("Minus")).toBeNull();
    expect(Key.translateCode("toString")).toBeNull();
  });

  it("maps key codes and falls back to the character", () => {
    expect(Key.translateKey(27)).toBe(C.ESC);
    expect(Key.translateKey(46)).toBe(C.DELETE);
    expect(Key.translateKey(18, 2)).toBe(C.ALT_RIGHT);
    expect(Key.translateKey(18, 1)).toBeUndefined();
    expect(Key.translateKey(123)).toBe(C.F12);
    expect(Key.translateKey(65)).toBe("A");
    expect(Key.translateKey(187)).toBe(String.fromCharCode(187));
  });
});

describe("transformKey", () => {
  it("turns neutral keys into Windows keys", () => {
    expect(Key.transformKey(C.META)).toBe(C.CONTROL);
    expect(Key.transformKey(C.COMMAND)).toBe(C.CONTROL);
    expect(Key.transformKey(C.OPTION)).toBe(C.ALT_LEFT);
    expect(Key.transformKey(C.REMOVE)).toBe(C.DELETE);
    expect(Key.transformKey("S")).toBe("S");
  });

  it("turns neutral keys into Mac keys, Command only on the desktop", () => {
    useSystem(OperatingSystem.OSX_IOS);
    expect(Key.transformKey(C.META)).toBe(C.COMMAND);
    expect(Key.transformKey(C.REMOVE)).toBe(C.BACKSPACE);
    useSystem(OperatingSystem.OSX_IOS, Hardware.Tablet);
    expect(Key.transformKey(C.META)).toBe(C.CONTROL);
    expect(Key.transformKey(C.REMOVE)).toBe(C.BACKSPACE);
  });
});

describe("shortcut text", () => {
  it("uses short names and + on Windows", () => {
    expect(Key.shortcutToString([C.META, C.SHIFT, "s"])).toBe("Ctrl+Shift+S");
    expect(Key.shortcutToString([C.REMOVE])).toBe("Del");
    expect(Key.shortcutToString([C.OPTION, "-"], { isWordMode: true })).toBe("Alt + -");
    expect(Key.toLocalizedName(C.META)).toBe("Control");
    expect(Key.toLocalizedShort(C.DELETE)).toBe("Del");
    // Quirk kept: ESC is 21 but the strings are under key.18, so the old
    // app had no name for it.
    expect(Key.toLocalizedShort(C.ESC)).toBeUndefined();
  });

  it("uses symbols without separators on a Mac", () => {
    useSystem(OperatingSystem.OSX_IOS);
    expect(Key.shortcutToString([C.META, C.SHIFT, "s"])).toBe("⌘⇧S");
    expect(Key.shortcutToString([C.META, "-"])).toBe("⌘−");
    expect(Key.shortcutToString([C.META, "S"], { isWordMode: true })).toBe("⌘ S");
    expect(Key.toLocalizedShort(C.META, true)).toBe("Cmd");
  });
});

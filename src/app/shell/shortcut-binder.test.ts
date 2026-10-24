import { describe, expect, it } from "vitest";
import { Key } from "../../engine/core/key.ts";
import { SingleKeyBinder, shortcutToMousetrap, stoppedByTarget } from "./shortcut-binder.ts";

describe("shortcutToMousetrap", () => {
  it("joins named keys and lower-cased characters with +", () => {
    expect(shortcutToMousetrap([Key.Constant.SHIFT, "A"])).toBe("shift+a");
    expect(shortcutToMousetrap([Key.Constant.ALT_LEFT, Key.Constant.F10])).toBe("alt+f10");
    expect(shortcutToMousetrap([Key.Constant.DELETE])).toBe("del");
    expect(shortcutToMousetrap([Key.Constant.PAGE_DOWN, Key.Constant.INSERT])).toBe("pagedown+ins");
  });

  it("maps META to ctrl or meta for the system, and OPTION to alt", () => {
    const meta = shortcutToMousetrap([Key.Constant.META, "S"]);
    expect(["ctrl+s", "meta+s"]).toContain(meta);
    expect(shortcutToMousetrap([Key.Constant.OPTION, "1"])).toBe("alt+1");
  });

  it("throws for a key it has no name for, like the old code", () => {
    expect(() => shortcutToMousetrap([Key.Constant.ESC])).toThrow("Unknown key code");
  });
});

describe("stoppedByTarget", () => {
  it("stops in form fields unless they have the mousetrap class", () => {
    expect(stoppedByTarget({ tagName: "INPUT", className: "" } as unknown as EventTarget)).toBe(
      true,
    );
    expect(
      stoppedByTarget({ tagName: "INPUT", className: "a mousetrap" } as unknown as EventTarget),
    ).toBe(false);
    expect(
      stoppedByTarget({
        tagName: "DIV",
        className: "",
        isContentEditable: false,
      } as unknown as EventTarget),
    ).toBe(false);
  });
});

describe("SingleKeyBinder", () => {
  it("keeps combos it can't handle in `unsupported`", () => {
    const binder = new SingleKeyBinder();
    binder.bind("ctrl+s", () => undefined, "keydown");
    binder.bind("v", () => undefined);
    expect(binder.unsupported).toEqual(["ctrl+s", "v"]);
  });
});

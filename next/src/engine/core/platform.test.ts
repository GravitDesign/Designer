import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Key } from "./key.ts";
import { ModifiersChangedEvent } from "./modifiers-changed-event.ts";
import { MouseEvent } from "./mouse-event.ts";
import { Platform, PlatformType, WebBrowser, detectWebBrowser } from "./platform.ts";
import { Hardware, OperatingSystem, System } from "./system.ts";

const saved = { os: System.operatingSystem, hw: System.hardware };
afterEach(() => {
  System.operatingSystem = saved.os;
  System.hardware = saved.hw;
});

describe("detectWebBrowser", () => {
  it("checks the user agent in the old order", () => {
    const chrome =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
    expect(detectWebBrowser(chrome)).toBe(WebBrowser.Chrome);
    expect(detectWebBrowser(chrome + " Edg/120.0")).toBe(WebBrowser.Edge);
    expect(detectWebBrowser(chrome + " Edge/18.0")).toBe(WebBrowser.Edge_OLD);
    expect(detectWebBrowser(chrome + " OPR/100")).toBe(WebBrowser.Opera);
    expect(detectWebBrowser("Mozilla/5.0 (X11; Linux) Gecko/20100101 Firefox/120.0")).toBe(
      WebBrowser.Firefox,
    );
    expect(detectWebBrowser("Mozilla/5.0 (Macintosh) Version/17 Safari/605")).toBe(
      WebBrowser.Safari,
    );
    expect(detectWebBrowser("Mozilla/5.0 (Windows NT 6.1; Trident/7.0)")).toBe(WebBrowser.MSIE);
    expect(detectWebBrowser("curl/8")).toBe(WebBrowser.Unknown);
    expect(detectWebBrowser(null)).toBe(WebBrowser.Unknown);
  });
});

describe("limits", () => {
  it("computes the canvas limits per browser on a Windows desktop", () => {
    System.operatingSystem = OperatingSystem.Windows;
    System.hardware = Hardware.Desktop;
    const platform = new PlatformType();
    platform.setWebBrowser(WebBrowser.Chrome);
    expect(platform.absoluteMaxImgLinearDimension).toBe(32767);
    expect(platform.maxImgLinearDimension).toBe(16383);
    expect(platform.absoluteMaxImgAreaDots).toBe(268435455);
    expect(platform.maxImgAreaDots).toBe(67108863);
    // min(3 * area, 2^31 - 1)
    expect(platform.maxPngDataSize).toBe(3 * 268435455);
    expect(platform.maxImgDataUrlLength).toBe(Math.floor(((3 * 268435455) / 3) * 4) + 22);
    platform.setWebBrowser(WebBrowser.Firefox);
    expect(platform.absoluteMaxImgAreaDots).toBe(124992399);
    expect(platform.maxPngDataSize).toBe(124992399 - 1);
    platform.setWebBrowser(WebBrowser.Safari);
    expect(platform.absoluteMaxImgLinearDimension).toBe(4194303);
    expect(platform.maxPngDataSize).toBe(3 * 268435455);
    expect(PlatformType.webBrowser).toBe(WebBrowser.Safari);
    expect(Platform.constructor).toBe(PlatformType);
    expect((Platform.constructor as typeof PlatformType).WebBrowser).toBe(WebBrowser);
  });

  it("uses the Unix limits and the 4294967295 data url cap on Linux", () => {
    System.operatingSystem = OperatingSystem.Unix;
    System.hardware = Hardware.Desktop;
    const platform = new PlatformType();
    platform.setWebBrowser(WebBrowser.Chrome);
    expect(platform.absoluteMaxImgLinearDimension).toBe(65535);
    expect(platform.absoluteMaxImgAreaDots).toBe(4294967295);
    // The Hardware.Unix quirk: Chrome on a Linux desktop still gets 2^31.
    expect(platform.maxPngDataSize).toBe(2147483647);
  });

  it("uses the mobile limits off the desktop", () => {
    System.operatingSystem = OperatingSystem.OSX_IOS;
    System.hardware = Hardware.Tablet;
    const platform = new PlatformType();
    platform.setWebBrowser(WebBrowser.Chrome);
    expect(platform.absoluteMaxImgLinearDimension).toBe(32767);
    expect(platform.absoluteMaxImgAreaDots).toBe(117418895);
    expect(platform.maxPngDataSize).toBe(3 * 117418895);
    platform.setWebBrowser(WebBrowser.Edge);
    expect(platform.absoluteMaxImgAreaDots).toBe(16777215);
    expect(platform.maxPngDataSize).toBe(3 * 16777215);
  });
});

describe("modifiers", () => {
  let platform: PlatformType;
  let changes: ModifiersChangedEvent[];

  beforeEach(() => {
    System.operatingSystem = OperatingSystem.Windows;
    System.hardware = Hardware.Desktop;
    platform = new PlatformType();
    changes = [];
    platform.addEventListener(ModifiersChangedEvent, (e) => changes.push(e));
  });

  it("tracks ctrl as meta off the Mac and reports what changed", () => {
    platform._updateModifiers({ type: "keydown", ctrlKey: true, keyCode: 17 });
    expect(platform.modifiers.metaKey).toBe(true);
    expect(platform.modifiers.ctrlKey).toBe(true);
    expect(changes.length).toBe(1);
    expect(changes[0]?.changed.metaKey).toBe(true);
    expect(changes[0]?.changed.ctrlKey).toBe(true);
    expect(changes[0]?.changed.shiftKey).toBe(false);
    platform._updateModifiers({ type: "keyup", keyCode: 17 });
    expect(platform.modifiers.metaKey).toBe(false);
    expect(changes.length).toBe(2);
  });

  it("uses the meta key on a Mac desktop", () => {
    System.operatingSystem = OperatingSystem.OSX_IOS;
    platform._updateModifiers({ type: "keydown", ctrlKey: true, metaKey: false });
    expect(platform.modifiers.metaKey).toBe(false);
    expect(platform.modifiers.ctrlKey).toBe(true);
    platform._updateModifiers({ type: "keydown", metaKey: true, ctrlKey: false });
    expect(platform.modifiers.metaKey).toBe(true);
  });

  it("tracks space, tab, escape, plus and minus", () => {
    platform._updateModifiers({ type: "keydown", keyCode: 32 });
    expect(platform.modifiers.spaceKey).toBe(true);
    platform._updateModifiers({ type: "mousemove" });
    expect(platform.modifiers.spaceKey).toBe(true);
    platform._updateModifiers({ type: "keyup", keyCode: 32 });
    expect(platform.modifiers.spaceKey).toBe(false);
    platform._updateModifiers({ type: "keydown", keyCode: 187 });
    expect(platform.modifiers.plusKey).toBe(true);
    platform._updateModifiers({ type: "keydown", keyCode: 109 });
    expect(platform.modifiers.minusKey).toBe(true);
    platform._updateModifiers({ type: "keydown", keyCode: 27 });
    expect(platform.modifiers.escapeKey).toBe(true);
    expect(changes.at(-1)?.changed.escapeKey).toBe(true);
  });

  it("doesn't report a z release as a change (old quirk)", () => {
    platform._updateModifiers({ type: "keydown", keyCode: 90 });
    expect(platform.modifiers.zKey).toBe(true);
    const count = changes.length;
    platform._updateModifiers({ type: "keyup", keyCode: 90 });
    expect(platform.modifiers.zKey).toBe(false);
    expect(changes.length).toBe(count);
  });

  it("tracks the middle button", () => {
    platform._updateModifiers({ type: "mousedown", button: MouseEvent.BUTTON_MIDDLE });
    expect(platform.modifiers.middleButton).toBe(true);
    platform._updateModifiers({ type: "mouseup", button: MouseEvent.BUTTON_MIDDLE });
    expect(platform.modifiers.middleButton).toBe(false);
    expect(changes.length).toBe(2);
  });

  it("blocks ctrl after AltGr on Windows", () => {
    platform._updateModifiers({ type: "keydown", ctrlKey: true, keyCode: 17, location: 1 });
    platform._updateModifiers({
      type: "keydown",
      ctrlKey: true,
      altKey: true,
      keyCode: 18,
      location: 2,
    });
    expect(platform.modifiers.metaKey).toBe(false);
    expect(platform.modifiers.optionKey).toBe(true);
    platform._updateModifiers({ type: "keyup", ctrlKey: false, altKey: false, keyCode: 18 });
    platform._updateModifiers({ type: "keydown", ctrlKey: true, keyCode: 17 });
    expect(platform.modifiers.metaKey).toBe(true);
  });

  it("emulates held keys", () => {
    platform.holdKey(Key.Constant.SHIFT);
    expect(platform.isHoldingKey(Key.Constant.SHIFT)).toBe(true);
    platform._updateModifiers({ type: "mousemove" });
    expect(platform.modifiers.shiftKey).toBe(true);
    platform.releaseKey(Key.Constant.SHIFT);
    platform._updateModifiers({ type: "mousemove" });
    expect(platform.modifiers.shiftKey).toBe(false);
    expect(platform.isHoldingKey(Key.Constant.ENTER)).toBe(false);
  });

  it("doesn't trigger without listeners", () => {
    const quiet = new PlatformType();
    quiet._updateModifiers({ type: "keydown", keyCode: 32 });
    expect(quiet.modifiers.spaceKey).toBe(true);
    expect(changes.length).toBe(0);
  });
});

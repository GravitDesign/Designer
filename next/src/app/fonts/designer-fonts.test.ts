import { afterEach, describe, expect, it, vi } from "vitest";
import { FontManager } from "../../engine/text/fonts/font-manager.ts";
import { OpenTypeFont } from "../../engine/text/fonts/open-type-font.ts";
import type { Font } from "../../engine/text/fonts/font.ts";
import { FontsProviderManager } from "./font-manager.ts";
import { NotoFontsProvider } from "./noto-fonts-provider.ts";
import { ImportedFontsProvider } from "./imported-fonts-provider.ts";
import { WebFontsProvider } from "./web-fonts-provider.ts";
import { LocalFontsProvider } from "./local-font-list.ts";
import { FakeRequest, installFakeXhr, requestedUrls } from "./fake-xhr.testing.ts";
import { initDesignerFonts, registerBrowserFontProviders } from "./designer-fonts.ts";

/** What the browser container and GDesigner.init do at boot. */
function installAppFonts(fontManager: FontManager): void {
  registerBrowserFontProviders();
  initDesignerFonts(fontManager);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the boot font setup (registerBrowserFontProviders, initDesignerFonts)", () => {
  it("registers the providers in order and resolves Open Sans as the default font", () => {
    installFakeXhr();
    const resolvedFont = {
      isResolved: () => true,
      getFamily: () => "Open Sans",
      getStyle: () => "N",
      getWeight: () => 400,
    } as unknown as Font;
    const create = vi.spyOn(OpenTypeFont, "create").mockReturnValue(resolvedFont as OpenTypeFont);
    const fontManager = new FontManager();
    installAppFonts(fontManager);

    expect(FontsProviderManager.getProviders().map((provider) => provider.constructor)).toEqual([
      NotoFontsProvider,
      ImportedFontsProvider,
      WebFontsProvider,
      LocalFontsProvider,
    ]);
    // The default font is asked for at once and waits for its download.
    expect(requestedUrls()).toEqual(["assets/font/OpenSans-Regular.ttf"]);
    expect(fontManager.getDefaultFont()?.isResolved()).toBe(false);
    expect(fontManager.getDefaultFontStyles()).toEqual(["N", "I"]);
    expect(fontManager.getDefaultFontWeights()).toEqual([300, 400, 600, 700, 800]);
    expect(fontManager.hasPendingFonts()).toBe(true);

    const bytes = new ArrayBuffer(8);
    (FakeRequest.sent[0] as FakeRequest).respond(200, bytes);
    expect(create).toHaveBeenCalledWith("Open Sans", "N", 400, bytes);
    expect(fontManager.getDefaultFont()).toBe(resolvedFont);
    expect(fontManager.hasPendingFonts()).toBe(false);

    // A second install changes nothing.
    installAppFonts(new FontManager());
    expect(FontsProviderManager.getProviders()).toHaveLength(4);
  });
});

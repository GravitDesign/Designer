import { afterEach, describe, expect, it, vi } from "vitest";
import { setActiveBranding } from "../brand/branding.ts";
import { themeHref, themeName } from "./theme.ts";

/** A window whose device is set to dark or light. */
function device(dark: boolean): void {
  vi.stubGlobal("window", {
    matchMedia: (query: string) => ({ matches: dark && query === "(prefers-color-scheme: dark)" }),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  setActiveBranding("classic");
});
import { toolbarShadow } from "./theme-scroll.ts";

describe("theme", () => {
  it("puts the theme in the third dot-separated part of the href", () => {
    expect(themeHref("/designer.browser.light.css", "dark")).toBe("/designer.browser.dark.css");
    expect(themeHref("designer.browser.dark.css", "light")).toBe("designer.browser.light.css");
  });

  it("reads default and empty as light in the classic look, whatever the device", () => {
    device(true);
    expect(themeName("default")).toBe("light");
    expect(themeName(undefined)).toBe("light");
    expect(themeName("dark")).toBe("dark");
  });

  it("reads default and empty as the device's theme in the next look", () => {
    setActiveBranding("next");
    device(true);
    expect(themeName("default")).toBe("dark");
    expect(themeName(undefined)).toBe("dark");
    expect(themeName("light")).toBe("light");
    device(false);
    expect(themeName("default")).toBe("light");
    expect(themeName("dark")).toBe("dark");
  });
});

describe("toolbarShadow", () => {
  it("follows the scroll position up to 20px, only in the touch layout", () => {
    expect(toolbarShadow(5, true, "light")).toBe("0 5px 20px -5px #DFDFDF");
    expect(toolbarShadow(50, true, "dark")).toBe("0 20px 20px -5px #2E2E2E");
    expect(toolbarShadow(5, false, "light")).toBeNull();
  });
});

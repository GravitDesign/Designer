import { describe, expect, it } from "vitest";
import { themeHref, themeName } from "./theme.ts";
import { toolbarShadow } from "./theme-scroll.ts";

describe("theme", () => {
  it("puts the theme in the third dot-separated part of the href", () => {
    expect(themeHref("/designer.browser.light.css", "dark")).toBe("/designer.browser.dark.css");
    expect(themeHref("designer.browser.dark.css", "light")).toBe("designer.browser.light.css");
  });

  it("reads default and empty as light", () => {
    expect(themeName("default")).toBe("light");
    expect(themeName(undefined)).toBe("light");
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

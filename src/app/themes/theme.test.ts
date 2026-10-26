import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setActiveBranding } from "../brand/branding.ts";
import { EditorOptions } from "../../editor/editor-options.ts";
import { setTheme, themeHref, themeName, type ThemedWindows } from "./theme.ts";

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

/** The theme link in head: its href, whether it has a sheet, and its listeners. */
class FakeLink {
  href = "designer.browser.light.css";
  sheet: object | null = {};
  readonly listeners = new Map<string, (() => void)[]>();
  getAttribute(): string {
    return this.href;
  }
  setAttribute(_name: string, value: string): void {
    this.href = value;
  }
  addEventListener(type: string, listener: () => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  fire(type: string): void {
    for (const listener of this.listeners.get(type) ?? []) listener();
  }
}

describe("setTheme", () => {
  let link: FakeLink;
  const guideLineColor = EditorOptions.guideLineColor;
  const guideLineHintColor = EditorOptions.guideLineHintColor;
  beforeEach(() => {
    link = new FakeLink();
    vi.stubGlobal("document", { querySelector: () => link });
    vi.stubGlobal("fetch", () => Promise.resolve({ text: () => Promise.resolve("css") }));
  });
  afterEach(() => {
    EditorOptions.guideLineColor = guideLineColor;
    EditorOptions.guideLineHintColor = guideLineHintColor;
  });

  const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

  /** Windows with one view that counts its ruler toggles; no active window. */
  function windows() {
    const toggles: boolean[] = [];
    let rulers = true;
    const view = {
      hasRulers: () => rulers,
      setRulers: (visible: boolean) => {
        rulers = visible;
        toggles.push(visible);
      },
      invalidate: () => {},
    };
    const themed = {
      getWindows: () => [{ getView: () => view }],
      getActiveWindow: () => null,
      getHtmlElement: () => null,
    } as unknown as ThemedWindows;
    return { themed, toggles };
  }

  it("recreates the rulers only once the new stylesheet has loaded, not when the fetch is done (BUG-170)", async () => {
    const { themed, toggles } = windows();
    const relayout = vi.fn();
    setTheme("dark", themed, relayout);
    expect(link.href).toBe("designer.browser.dark.css");
    await settle();
    // The fetch is done, the link still has the light sheet.
    expect(toggles).toEqual([]);
    expect(relayout).not.toHaveBeenCalled();
    link.fire("load");
    await settle();
    expect(toggles).toEqual([false, true]);
    expect(relayout).toHaveBeenCalledTimes(1);
    expect(EditorOptions.guideLineHintColor).toBe("#F790B6");
  });

  it("goes on when the stylesheet fails to load, and doesn't wait for an unchanged one", async () => {
    const failed = windows();
    setTheme("dark", failed.themed, () => {});
    link.fire("error");
    await settle();
    expect(failed.toggles).toEqual([false, true]);
    const same = windows();
    setTheme("dark", same.themed, () => {});
    await settle();
    expect(same.toggles).toEqual([false, true]);
  });
});

describe("toolbarShadow", () => {
  it("follows the scroll position up to 20px, only in the touch layout", () => {
    expect(toolbarShadow(5, true, "light")).toBe("0 5px 20px -5px #DFDFDF");
    expect(toolbarShadow(50, true, "dark")).toBe("0 20px 20px -5px #2E2E2E");
    expect(toolbarShadow(5, false, "light")).toBeNull();
  });
});

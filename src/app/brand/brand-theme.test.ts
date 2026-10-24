import { afterEach, describe, expect, it, vi } from "vitest";
import { EditorPaintConfiguration } from "../../editor/editor-paint-configuration.ts";
import {
  ACCENT_LINK_ID,
  THEME_ATTRIBUTE,
  accentHref,
  currentPageShadowColor,
  themeOfHref,
  watchBrandTheme,
} from "./brand-theme.ts";

const decoration = EditorPaintConfiguration.prototype.pageDecoration;
const classicShadow = decoration.shadowBackground;

class FakeLink {
  private readonly attributes = new Map<string, string>();
  constructor(href: string) {
    this.attributes.set("href", href);
  }
  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }
  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
    for (const observer of observers) if (observer.target === this) observer.callback();
  }
}

const observers: { target: unknown; callback: () => void }[] = [];

class FakeMutationObserver {
  private readonly callback: () => void;
  constructor(callback: () => void) {
    this.callback = callback;
  }
  observe(target: unknown): void {
    observers.push({ target, callback: this.callback });
  }
  disconnect(): void {
    observers.splice(0);
  }
}

function fakeDocument(themeHref: string) {
  const theme = new FakeLink(themeHref);
  const accent = new FakeLink("/brand/accent.light.css");
  const root = new FakeLink("");
  const doc = {
    querySelector: (selector: string) => (selector === 'head > link[href$=".css"]' ? theme : null),
    getElementById: (id: string) => (id === ACCENT_LINK_ID ? accent : null),
    documentElement: root,
  };
  vi.stubGlobal("document", doc);
  vi.stubGlobal("MutationObserver", FakeMutationObserver);
  return { doc: doc as unknown as Document, theme, accent, root };
}

afterEach(() => {
  observers.splice(0);
  vi.unstubAllGlobals();
  decoration.shadowBackground = classicShadow;
});

describe("brand theme", () => {
  it("reads the theme from the theme stylesheet's href", () => {
    expect(themeOfHref("/designer.browser.dark.css")).toBe("dark");
    expect(themeOfHref("/designer.browser.light.css")).toBe("light");
    expect(accentHref("dark")).toBe("/brand/accent.dark.css");
  });

  it("switches the accent stylesheet and the theme attribute with the theme", () => {
    const { doc, theme, accent, root } = fakeDocument("/designer.browser.dark.css");
    const stop = watchBrandTheme(doc);
    // index.html's script guessed light; the theme link says dark.
    expect(accent.getAttribute("href")).toBe("/brand/accent.dark.css");
    expect(root.getAttribute(THEME_ATTRIBUTE)).toBe("dark");
    theme.setAttribute("href", "/designer.browser.light.css");
    expect(accent.getAttribute("href")).toBe("/brand/accent.light.css");
    expect(root.getAttribute(THEME_ATTRIBUTE)).toBe("light");
    stop();
    theme.setAttribute("href", "/designer.browser.dark.css");
    expect(accent.getAttribute("href")).toBe("/brand/accent.light.css");
  });

  it("does nothing without the accent link (the classic look)", () => {
    const { doc, theme } = fakeDocument("/designer.browser.light.css");
    (doc as unknown as { getElementById: () => null }).getElementById = () => null;
    watchBrandTheme(doc);
    theme.setAttribute("href", "/designer.browser.dark.css");
    expect(observers).toEqual([]);
    expect(decoration.shadowBackground).toBe(classicShadow);
  });

  it("tints the page shadow on the canvas with the theme", () => {
    const { doc, theme, root } = fakeDocument("/designer.browser.dark.css");
    const stop = watchBrandTheme(doc);
    expect(decoration.shadowBackground).toBe("rgba(0,0,0,0.5)");
    expect(currentPageShadowColor(doc)).toBe("rgba(0,0,0,0.5)");
    theme.setAttribute("href", "/designer.browser.light.css");
    expect(decoration.shadowBackground).toBe("rgba(27,27,36,0.25)");
    stop();
    // What designer.ts reads at boot, before any switch: the attribute index.html set.
    root.setAttribute(THEME_ATTRIBUTE, "dark");
    expect(currentPageShadowColor(doc)).toBe("rgba(0,0,0,0.5)");
  });
});

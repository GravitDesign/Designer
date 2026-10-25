import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  BRANDING_ATTRIBUTE,
  BRANDING_STORAGE_KEY,
  activeBranding,
  initBranding,
  isNextBranding,
  productName,
  resolveBranding,
  setActiveBranding,
  type Branding,
} from "./branding.ts";

afterEach(() => setActiveBranding("classic"));

describe("resolveBranding", () => {
  it("is GravitDesign Next by default", () => {
    expect(resolveBranding({ search: "", override: undefined, stored: null })).toEqual({
      branding: "next",
      store: null,
    });
  });

  it("takes the query first and stores its choice", () => {
    expect(
      resolveBranding({ search: "?branding=classic", override: "next", stored: '"next"' }),
    ).toEqual({ branding: "classic", store: "classic" });
    expect(
      resolveBranding({ search: "?a=1&branding=next", override: "classic", stored: null }),
    ).toEqual({ branding: "next", store: "next" });
  });

  it("then the page override (parity harness, desktop preload), which is never stored", () => {
    expect(resolveBranding({ search: "", override: "classic", stored: '"next"' })).toEqual({
      branding: "classic",
      store: null,
    });
  });

  it("then the stored choice", () => {
    expect(resolveBranding({ search: "", override: undefined, stored: '"classic"' })).toEqual({
      branding: "classic",
      store: null,
    });
  });

  it("ignores values that name no look", () => {
    expect(
      resolveBranding({ search: "?branding=old", override: "retro", stored: "not json" }).branding,
    ).toBe("next");
    expect(resolveBranding({ search: "", override: 1, stored: '"blue"' }).branding).toBe("next");
  });
});

describe("the active look", () => {
  function fakePage(attribute: string | null, win: Partial<Window> = {}) {
    const doc = {
      documentElement: {
        getAttribute: (name: string) => (name === BRANDING_ATTRIBUTE ? attribute : null),
      },
    } as unknown as Document;
    const store = new Map<string, string>();
    const window = {
      location: { search: "" },
      localStorage: { getItem: (k: string) => store.get(k) ?? null },
      ...win,
    } as unknown as Window;
    return { doc, window, store };
  }

  it("is classic until initBranding ran, so code outside the page keeps the old behaviour", () => {
    expect(activeBranding()).toBe("classic");
    expect(isNextBranding()).toBe(false);
    expect(productName()).toBe("Gravit Designer");
  });

  it("takes over what index.html's script decided", () => {
    const { doc, window } = fakePage("next");
    expect(initBranding(doc, window)).toBe("next");
    expect(isNextBranding()).toBe(true);
    expect(productName()).toBe("GravitDesign Next");
  });

  it("decides by the same rules when the attribute is missing", () => {
    const page = fakePage(null);
    expect(initBranding(page.doc, page.window)).toBe("next");
    page.store.set(BRANDING_STORAGE_KEY, '"classic"');
    expect(initBranding(page.doc, page.window)).toBe("classic");
    const harness = fakePage(null, { __gdBranding: "classic" } as unknown as Partial<Window>);
    expect(initBranding(harness.doc, harness.window)).toBe("classic");
  });
});

// ---------------------------------------------------------------------------
// index.html's script makes the same decision before the first paint.

const indexHtml = fs.readFileSync(path.resolve(import.meta.dirname, "../../../index.html"), "utf8");

function indexScript(): string {
  const match = /<script>([\s\S]*?)<\/script>/.exec(indexHtml);
  if (!match) throw new Error("index.html has no inline script");
  return match[1] as string;
}

interface ScriptRun {
  attributes: Record<string, string>;
  links: { rel: string; href: string; id: string }[];
  manifest: string;
  themeSheet: string;
  title: string;
  stored: Map<string, string>;
}

function runIndexScript(
  search: string,
  override: unknown,
  storage: Record<string, string>,
  deviceDark = false,
): ScriptRun {
  const attributes: Record<string, string> = {};
  const links: { rel: string; href: string; id: string }[] = [];
  const manifest = {
    href: "/manifest.json",
    setAttribute(name: string, value: string) {
      if (name === "href") this.href = value;
    },
  };
  const themeSheet = {
    href: "/designer.browser.light.css",
    setAttribute(name: string, value: string) {
      if (name === "href") this.href = value;
    },
  };
  const doc = {
    title: "Gravit Designer",
    documentElement: {
      setAttribute: (name: string, value: string) => (attributes[name] = value),
    },
    head: { appendChild: (link: { rel: string; href: string; id: string }) => links.push(link) },
    createElement: () => ({ rel: "", href: "", id: "" }),
    querySelector: (selector: string) =>
      selector === 'link[rel="manifest"]'
        ? manifest
        : selector === "#theme-stylesheet"
          ? themeSheet
          : null,
  };
  const stored = new Map(Object.entries(storage));
  const win = {
    location: { search },
    __gdBranding: override,
    matchMedia: (query: string) => ({
      matches: deviceDark && query === "(prefers-color-scheme: dark)",
    }),
    localStorage: {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
    },
  };
  new Function("window", "document", "URLSearchParams", indexScript())(win, doc, URLSearchParams);
  return {
    attributes,
    links,
    manifest: manifest.href,
    themeSheet: themeSheet.href,
    title: doc.title,
    stored,
  };
}

describe("index.html's script", () => {
  it("decides like resolveBranding for every combination", () => {
    const searches = ["", "?branding=next", "?branding=classic", "?branding=other"];
    const overrides: unknown[] = [undefined, "next", "classic", "nope"];
    const stores: (string | null)[] = [null, '"next"', '"classic"', "{bad", '"blue"'];
    for (const search of searches)
      for (const override of overrides)
        for (const stored of stores) {
          const storage: Record<string, string> =
            stored === null ? {} : { [BRANDING_STORAGE_KEY]: stored };
          const run = runIndexScript(search, override, storage);
          const expected = resolveBranding({ search, override, stored });
          const label = JSON.stringify({ search, override, stored });
          const branding: Branding = (run.attributes[BRANDING_ATTRIBUTE] as Branding) ?? "classic";
          expect(branding, label).toBe(expected.branding);
          expect(run.stored.get(BRANDING_STORAGE_KEY) ?? null, label).toBe(
            expected.store ? JSON.stringify(expected.store) : (stored ?? null),
          );
        }
  });

  it("loads the brand stylesheets after the theme, the favicon and the manifest in the next look", () => {
    const run = runIndexScript("", undefined, { "designer.settings": '{"theme":"dark"}' });
    expect(run.attributes).toEqual({ "data-branding": "next", "data-gd-theme": "dark" });
    expect(run.links.map((l) => [l.rel, l.href, l.id])).toEqual([
      ["stylesheet", "/brand/accent.dark.css", "brand-accent"],
      ["stylesheet", "/brand/next.css", ""],
      ["stylesheet", "/brand/editor.css", ""],
      ["icon", "/brand/icons/favicon.ico", ""],
    ]);
    expect(run.manifest).toBe("/brand/manifest.json");
    expect(run.title).toBe("GravitDesign Next");
    expect(runIndexScript("", undefined, {}).links[0]?.href).toBe("/brand/accent.light.css");
  });

  it("links the stored theme's stylesheet before the first paint in the next look", () => {
    const dark = { "designer.settings": '{"theme":"dark"}' };
    expect(runIndexScript("", undefined, dark).themeSheet).toBe("/designer.browser.dark.css");
    expect(runIndexScript("", undefined, {}).themeSheet).toBe("/designer.browser.light.css");
    expect(runIndexScript("", "classic", dark).themeSheet).toBe("/designer.browser.light.css");
  });

  it("takes the device's theme when none is chosen in the next look", () => {
    const stores: Record<string, string>[] = [{}, { "designer.settings": '{"theme":"default"}' }];
    for (const storage of stores) {
      const run = runIndexScript("", undefined, storage, true);
      expect(run.attributes["data-gd-theme"]).toBe("dark");
      expect(run.themeSheet).toBe("/designer.browser.dark.css");
      expect(run.links[0]?.href).toBe("/brand/accent.dark.css");
    }
    const light = { "designer.settings": '{"theme":"light"}' };
    expect(runIndexScript("", undefined, light, true).themeSheet).toBe(
      "/designer.browser.light.css",
    );
    expect(runIndexScript("", "classic", {}, true).themeSheet).toBe("/designer.browser.light.css");
  });

  it("leaves the page as the old app had it in the classic look", () => {
    const run = runIndexScript("", "classic", { "designer.settings": '{"theme":"dark"}' });
    expect(run.attributes).toEqual({});
    expect(run.links).toEqual([]);
    expect(run.manifest).toBe("/manifest.json");
    expect(run.title).toBe("Gravit Designer");
  });

  it("keeps the theme stylesheet the first stylesheet link in head, which the theme switch rewrites", () => {
    const head = /<head>([\s\S]*?)<\/head>/.exec(indexHtml)?.[1] ?? "";
    const firstCss = /<link[^>]*href="[^"]*\.css"[^>]*>/.exec(head)?.[0];
    expect(firstCss).toContain('id="theme-stylesheet"');
    // The brand links are appended to head by the script, after it.
    expect(head.indexOf("theme-stylesheet")).toBeLessThan(head.indexOf("<script>"));
  });
});

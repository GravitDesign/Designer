/* eslint-disable @typescript-eslint/no-explicit-any -- in-page code drives the untyped engine through the G namespace */
import {
  NAME_ONLY_FONTS,
  OPTION_SETS,
  PROBE_EXTRA_FONTS,
  probeFonts,
  type ProbeLists,
} from "../../../src/engine/text/fonts/font-probe.ts";
import { openApp } from "../../support/apps.ts";
import { defineScenarios, type ParityHandle, type Scenario } from "../../support/scenario.ts";
import { paritySuite } from "../../support/suite.ts";

// The font stack and the locale bootstrap as they run in the browser: the
// font files come through fetch, HarfBuzz is the old asm.js build or the
// new .wasm loaded through fetch, and the locale follows navigator.language.
// The Node unit tests (text/fonts, core/locale) cover the same code against
// recordings of the old bundle; these scenarios check the running apps.

/** A smaller run of the Node font probe (font-probe.ts) over the scripts that shape differently. */
const BROWSER_PROBE: ProbeLists = {
  probeFonts: [
    "OpenSans-Regular.ttf",
    "noto/NotoSansArabic-Regular.ttf",
    "noto/NotoSansDevanagari-Regular.ttf",
    "noto/NotoSansThai-Regular.ttf",
  ],
  nameOnlyFonts: ["Lato-Regular.woff2", "gravit-designer.woff", ...NAME_ONLY_FONTS.slice(-3)],
  texts: [
    ["OpenSans-Regular.ttf", ["office flow", "1/2 3/4", "AVATAR To"]],
    ["noto/NotoSansArabic-Regular.ttf", ["مرحبا بالعالم", "لا"]],
    ["noto/NotoSansDevanagari-Regular.ttf", ["नमस्ते दुनिया"]],
    ["noto/NotoSansThai-Regular.ttf", ["สวัสดีชาวโลก"]],
  ],
  optionSets: OPTION_SETS,
};

interface ProbeArgs {
  files: string[];
  lists: ProbeLists;
}

/**
 * Fetches the probe's fonts, then runs probeFonts in the page. probeFonts
 * uses nothing outside its body, so its source text runs in both apps.
 */
function inPageProbe(): (p: ParityHandle, args: ProbeArgs) => unknown {
  const source =
    `async (p, a) => {` +
    `const bytes = {};` +
    `for (const name of a.files) {` +
    `const response = await fetch("/assets/font/" + name);` +
    `if (!response.ok) throw new Error("cannot fetch " + name);` +
    `bytes[name] = await response.arrayBuffer();` +
    `}` +
    `const api = { GOpenTypeFont: p.G.GOpenTypeFont, GOpenTypeUtil: p.G.GOpenTypeUtil, readFont: (n) => bytes[n] };` +
    `return (${probeFonts.toString()})(api, a.lists);` +
    `}`;
  const wrapper = (): never => {
    throw new Error("in-page scenario functions only run in the page");
  };
  wrapper.toString = () => source;
  return wrapper;
}

/** The font manager's resolve flow with a resolver that answers later. */
async function fontManagerFlow(p: ParityHandle): Promise<unknown> {
  const G = p.G;
  const response = await fetch("/assets/font/OpenSans-Regular.ttf");
  const bytes = await response.arrayBuffer();
  const manager = new G.GFontManager();
  const log: unknown[] = [];
  const pending: (() => void)[] = [];
  // The class shows as "opentype" or "entry": the old toString names are minified.
  const describe = (f: any) =>
    f
      ? [
          f instanceof G.GOpenTypeFont ? "opentype" : "entry",
          f.getFamily(),
          f.getStyle(),
          f.getWeight(),
          f.isResolved(),
          f.isFailed(),
        ]
      : f;
  const state = () => [manager.hasUnresolvedFonts(), manager.hasPendingFonts()];
  const flush = () => {
    for (const fn of pending.splice(0)) fn();
  };
  const out: Record<string, unknown> = {};
  out.withoutResolver = describe(manager.getFont("Open Sans", "N", 400));
  manager.addEventListener(G.GFontManager.ResolveFontEvent, (e: any) => {
    log.push(["resolve", e.family, e.style, e.weight, e.tryToResolveMissingFont]);
    if (e.family === "Open Sans") {
      pending.push(() => e.resolved(G.GOpenTypeFont.create(e.family, e.style, e.weight, bytes)));
    } else {
      pending.push(() => e.failed());
    }
  });
  manager.addEventListener(G.GFontManager.FontAvailableEvent, (e: any) =>
    log.push(["available", describe(e.font)]),
  );
  manager.addEventListener(G.GFontManager.FontUnavailableEvent, (e: any) =>
    log.push(["unavailable", describe(e.font)]),
  );
  out.first = describe(manager.getFont("Open Sans", "N", 400));
  out.missing = describe(manager.getFont("No Such Font", "I", 700, false));
  out.beforeResolve = state();
  flush();
  out.afterResolve = state();
  out.again = describe(manager.getFont("Open Sans", "N", 400));
  out.missingAgain = describe(manager.getFont("No Such Font", "I", 700));
  out.pendingAgain = state();
  flush();
  manager.removeFont("Open Sans");
  out.afterRemove = [describe(manager.getFont("Open Sans", "N", 400)), state()];
  flush();
  out.fonts = manager.getFonts().map(describe);
  out.queryWithoutListener = manager.queryFontFamily("Open Sans");
  manager.addEventListener(G.GFontManager.QueryFontFamilyEvent, (e: any) =>
    e.callback([e.family, "listed"]),
  );
  out.query = manager.queryFontFamily("Open Sans");
  const font = G.GOpenTypeFont.create("Open Sans", "N", 400, bytes);
  const src = font.toFontFaceSrc();
  out.fontFace = [src.length, src.slice(0, 80), src.slice(-60)];
  out.css = font.toCssProperties();
  out.log = log;
  return out;
}

/** Locales whose engine tables differ: German, traditional Chinese, Brazilian Portuguese, Japanese, plain French. */
const LOCALES = ["de-DE", "zh-TW", "pt-BR", "ja-JP", "fr"];

function localeScenario(locale: string): Scenario<{ locale: string }> {
  return {
    id: `engine-model/locale/browser-${locale}`,
    covers: ["UI-I18N-002", "UI-I18N-003", "UI-I18N-004"],
    kind: "json",
    args: { locale },
    driver: async ({ page, kind }, args) => {
      await page.addInitScript((lang) => {
        Object.defineProperty(Navigator.prototype, "language", { get: () => lang });
        Object.defineProperty(Navigator.prototype, "languages", { get: () => [lang] });
      }, args.locale);
      await openApp(page, kind, { newDocument: true });
      return page.evaluate(() => {
        const L = (window as unknown as { __parity: ParityHandle }).__parity.G.GLocale;
        const attempt = (fn: () => unknown) => {
          try {
            return fn();
          } catch (e) {
            return "<throws " + String(e) + ">";
          }
        };
        const language = L.getLanguage();
        return {
          navigator: navigator.language,
          language,
          tag: attempt(() => L.getLocaleLanguageTag()),
          tagFallback: attempt(() => L.getLocaleLanguageTag("xx")),
          lookup: attempt(() => L.lookupLocale(language)),
          available: attempt(() => L.getAvailableLanguages()),
          values: [
            ["GCommonNames", "text.library-load-more"],
            ["GLength", "unit.km"],
            ["GLength", "unit.mi.short"],
            ["GLength", "unit.ft"],
          ].map(([clazz, key]) => attempt(() => L.getValue(clazz, key, "<default>"))),
          english: attempt(() => L.getValue("GCommonNames", "text.library-load-more", null, 0)),
          currency: attempt(() => L.toLocaleCurrency(1234.5, "EUR")),
          date: attempt(() => L.toLocaleDate(Date.UTC(2020, 1, 3, 4, 5, 6))),
        };
      });
    },
  };
}

const scenarios = defineScenarios<any>([
  {
    id: "engine-model/fonts/browser-probe",
    covers: [
      "ENG-FONT-001",
      "ENG-FONT-004",
      "ENG-TEXT-008",
      "ENG-TEXT-018",
      "ENG-TEXT-019",
      "FMT-LIB-004",
    ],
    kind: "json",
    timeout: 120_000,
    args: {
      files: [
        ...new Set([
          ...BROWSER_PROBE.probeFonts,
          ...BROWSER_PROBE.nameOnlyFonts,
          ...PROBE_EXTRA_FONTS,
        ]),
      ],
      lists: BROWSER_PROBE,
    },
    inPage: inPageProbe(),
  },
  {
    id: "engine-model/fonts/font-manager",
    covers: ["ENG-FONT-002", "ENG-FONT-001"],
    kind: "json",
    inPage: fontManagerFlow,
  },
  ...LOCALES.map(localeScenario),
]);

paritySuite("engine-model fonts and locale", scenarios, { newApp: false });

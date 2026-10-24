import { afterEach, describe, expect, it, vi } from "vitest";
import { readBrowserLanguage } from "./browser-language.ts";
import { createLanguageTable } from "./locale-language.ts";
import { LocaleKey } from "./locale-key.ts";
import type { LocaleEnvironment } from "./locale-runtime.ts";
import { Projects } from "./projects.ts";
import { bootstrapLocale, createProjectLocale } from "./translation.ts";
import { TranslationEventTarget } from "./translation-event-target.ts";
import { Translation } from "./translation-loader.ts";

function environment(tag: string): LocaleEnvironment {
  return {
    browser: readBrowserLanguage({ language: tag }),
    languages: createLanguageTable(),
    translation: new Translation(),
    events: new TranslationEventTarget(),
  };
}

function designerLocale(tag: string) {
  return createProjectLocale(bootstrapLocale(environment(tag)), Projects.Designer);
}

const LOAD_MORE = new LocaleKey("GCommonNames", "text.library-load-more");

afterEach(() => {
  vi.restoreAllMocks();
});

describe("language from the browser (UI-I18N-003, UI-I18N-004)", () => {
  it.each([
    ["en-US", 0, "Load more..."],
    ["de-DE", 1, "Mehr laden..."],
    ["zh-CN", 2, "装载更多..."],
    ["ja-JP", 12, "もっと読み込む..."],
  ])("%s selects language %i", (tag, language, loadMore) => {
    const locale = designerLocale(tag);
    expect(locale.getLanguage()).toBe(language);
    expect(locale.get(LOAD_MORE)).toBe(loadMore);
  });

  it("matches a two-letter tag against the start of the table's tags", () => {
    expect(designerLocale("de").getLanguage()).toBe(1);
    expect(designerLocale("pt").getLanguage()).toBe(3);
  });

  it("prefers a table entry over the two-letter switch", () => {
    // The two-letter switch alone would give Chinese (2).
    expect(designerLocale("zh-TW").getLanguage()).toBe(10);
  });

  it("falls back to the two-letter switch when no table has the tag", () => {
    // No table has fr-CA or zh-Hant-TW, so only the constructor's lookup applies.
    expect(designerLocale("fr-CA").getLanguage()).toBe(5);
    expect(designerLocale("zh-Hant-TW").getLanguage()).toBe(2);
    expect(designerLocale("xx-YY").getLanguage()).toBe(0);
  });

  it("uses English without a browser language", () => {
    const env = environment("");
    env.browser = readBrowserLanguage({});
    expect(env.browser).toEqual({ language: "", fullLanguage: null });
    expect(createProjectLocale(bootstrapLocale(env), Projects.Designer).getLanguage()).toBe(0);
  });
});

describe("loading the tables", () => {
  it("adds the language names only the WebTrial table uses", () => {
    const env = environment("en-US");
    bootstrapLocale(env);
    expect(env.languages.ChineseSimplified).toBe(2);
    expect(env.languages.ChineseTraditional).toBe(10);
    expect(Object.keys(env.languages)).toHaveLength(18);
  });

  it("offers all 15 languages of the Designer table", () => {
    expect(designerLocale("en-US").getAvailableLanguages()).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
    ]);
  });

  it("falls back to English for keys a language lacks", () => {
    const german = designerLocale("de-DE");
    expect(german.getValue("GLength", "unit.ft")).toBe("Füße");
    expect(german.getValue("GLength", "unit.pt")).toBe(
      german.getValue("GLength", "unit.pt", undefined, 0),
    );
    expect(german.getValue("GLength", "unit.pt")).toBeTruthy();
  });

  it("keeps app strings English in every language (Q-001)", () => {
    const english = designerLocale("en-US");
    const german = designerLocale("de-DE");
    expect(german.getValue("GCommonNames", "text.cancel")).toBe(
      english.getValue("GCommonNames", "text.cancel"),
    );
  });

  it("shares loaded values between project locales of one base", () => {
    const base = bootstrapLocale(environment("en-US"));
    const one = createProjectLocale(base, Projects.Designer);
    const two = createProjectLocale(base, Projects.Designer);
    one.setValues("GTestClass", 0, ["key"], ["value"]);
    expect(two.getValue("GTestClass", "key")).toBe("value");
  });

  it("keeps project locales apart", () => {
    const base = bootstrapLocale(environment("en-US"));
    const webTrial = createProjectLocale(base, Projects.WebTrial);
    expect(webTrial.getValue("WelcomeScreen", "text.get-started")).toBe("Get Started");
    const designer = createProjectLocale(base, Projects.Designer);
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(designer.getValue("WelcomeScreen", "text.get-started")).toBeUndefined();
  });
});

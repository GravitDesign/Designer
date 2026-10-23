import { afterEach, describe, expect, it, vi } from "vitest";
import { readBrowserLanguage } from "./browser-language.ts";
import { ClassReference } from "./class-reference.ts";
import { createLanguageTable } from "./locale-language.ts";
import { LocaleKey } from "./locale-key.ts";
import { LocaleRuntime, type LocaleEnvironment } from "./locale-runtime.ts";
import { Projects } from "./projects.ts";
import { TranslationEventTarget } from "./translation-event-target.ts";
import { Translation } from "./translation-loader.ts";
import { TranslationNotificationEvent } from "./translation-notification-event.ts";

function environment(tag = "en-US"): LocaleEnvironment {
  return {
    browser: readBrowserLanguage({ language: tag }),
    languages: createLanguageTable(),
    translation: new Translation(),
    events: new TranslationEventTarget(),
  };
}

/** A Designer locale with a few strings of its own. */
function locale(tag = "en-US"): LocaleRuntime {
  const result = new LocaleRuntime(environment(tag));
  result.setProject(Projects.Designer);
  result.setValues("GDialog", 0, ["title", "empty"], ["Title", ""]);
  result.setValues("GDialog", 1, ["title"], ["Titel"]);
  return result;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("lookup (UI-I18N-003)", () => {
  it("reads the current language and falls back to English", () => {
    const l = locale();
    l.setValues("GDialog", 0, ["only-english"], ["English only"]);
    l.setLanguage(1);
    expect(l.getValue("GDialog", "title")).toBe("Titel");
    expect(l.getValue("GDialog", "only-english")).toBe("English only");
    expect(l.getValue("GDialog", "title", undefined, 0)).toBe("Title");
  });

  it("returns the default for a missing or empty value without logging", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const l = locale();
    expect(l.getValue("GDialog", "missing", "fallback")).toBe("fallback");
    expect(l.getValue("GDialog", "empty", "")).toBe("");
    expect(error).not.toHaveBeenCalled();
  });

  it("logs a missing value, or throws in strict mode", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const l = locale();
    expect(l.getValue("GDialog", "missing")).toBeUndefined();
    expect(error).toHaveBeenCalledWith("No value found for GDialog and key missing");
    l.setStrict(true);
    expect(() => l.getValue("GDialog", "missing")).toThrow(
      "No value found for GDialog and key missing",
    );
  });

  it("looks up keys with get and passes anything else through", () => {
    const l = locale();
    expect(l.get(new LocaleKey("GDialog", "title"))).toBe("Title");
    expect(l.get("plain")).toBe("plain");
    expect(l.get(null)).toBeNull();
  });

  it("prefers extended strings once the extension is enabled", () => {
    const l = locale();
    l.setValues("GDialog", 0, ["title"], ["Extended"], true, true);
    expect(l.getValue("GDialog", "title")).toBe("Title");
    l.enableExtension();
    expect(l.getValue("GDialog", "title")).toBe("Extended");
  });

  it("warns about duplicates only when not overriding", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const l = locale();
    l.setValues("GDialog", 0, ["title"], ["Again"], false);
    expect(error).toHaveBeenCalledWith("Duplicate value for key: title");
    expect(l.getValue("GDialog", "title")).toBe("Again");
  });

  it("sends a warning when a class object is used instead of a name", () => {
    const env = environment();
    const l = new LocaleRuntime(env);
    l.setProject(Projects.Designer);
    const events: TranslationNotificationEvent[] = [];
    env.events.addEventListener(TranslationNotificationEvent, (e) => events.push(e));
    class GSample {
      readonly kind = "sample";
    }
    l.setValues(GSample, 0, ["k"], ["v"]);
    l.setValues(new ClassReference("GSample"), 0, ["k2"], ["v2"]);
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("Warning");
    expect(events[0]?.project).toBe("Designer");
    expect(events[0]?.content?.startsWith("Using class instead of string for:")).toBe(true);
    expect(l.getValue("GSample", "k")).toBe("v");
    expect(l.getValue("GSample", "k2")).toBe("v2");
  });

  it("lists the keys and strings of a class", () => {
    const l = locale();
    expect(l.getAvailableKeys("GDialog")).toEqual(["title", "empty"]);
    expect(l.getAvailableKeys("GNothing")).toBeUndefined();
    l.setLanguage(1);
    expect(l.getClassTranslations("GDialog")).toEqual({ title: "Titel" });
  });

  it("rejects unknown projects", () => {
    expect(() => locale().setProject("Nope")).toThrow("Project 'Nope' doesn't exist!");
  });
});

describe("languages (UI-I18N-004)", () => {
  it("maps tags to ids through the project table, then the browser language", () => {
    const l = locale("en-US");
    expect(l.lookupLanguage("de-DE")).toBe(1);
    expect(l.lookupLanguage("JA-jp")).toBe(12);
    expect(l.lookupLanguage("zh-Hant")).toBe(2);
    // No table entry: the browser language decides, not the tag.
    expect(l.lookupLanguage("xx")).toBe(0);
    expect(locale("so-SO").lookupLanguage("xx")).toBe(2);
    expect(l.lookupLanguage("")).toBe(0);
  });

  it("maps ids to tags", () => {
    const l = locale();
    expect(l.lookupLocale(0)).toBe("en");
    expect(l.lookupLocale(1)).toBe("de-de");
    expect(l.lookupLocale(10)).toBe("zh-tw");
    expect(l.lookupLocale(99)).toBeUndefined();
  });

  it("gives the language tag and its ISO 639-1 code", () => {
    const l = locale();
    expect(l.getLocaleLanguageTag()).toBe("en-US");
    expect(l.getLocaleTagISO6391()).toBe("en");
    l.setLanguage(10);
    expect(l.getLocaleTagISO6391()).toBe("zh-TW");
    l.setLanguage(99);
    expect(l.getLocaleLanguageTag()).toBe("en-US");
    expect(l.getLocaleLanguageTag("fr-FR")).toBe("fr-FR");
  });

  it("adds unknown names to the language table, and also English (old quirk)", () => {
    const env = environment();
    const l = new LocaleRuntime(env);
    expect(l.getLocaleLanguage("German")).toBe(1);
    expect(l.getLocaleLanguage("Klingon")).toBe(15);
    expect(env.languages.Klingon).toBe(15);
    expect(l.getLocaleLanguage("English")).toBe(16);
    expect(env.languages.English).toBe(16);
  });

  it("formats dates and money for the current language", () => {
    const l = locale();
    const date = new Date(2026, 9, 22);
    expect(l.toLocaleDate(date)).toBe("October 22, 2026");
    l.setLanguage(1);
    expect(l.toLocaleDate(date)).toBe("22. Oktober 2026");
    expect(l.toLocaleDate(date, { year: "numeric" })).toBe("2026");
    expect(l.toLocaleCurrency("1.5", "EUR")).toBe("1,50 €");
    expect(() => l.toLocaleCurrency("abc", "EUR")).toThrow(
      "You must provid a valid number and currency!",
    );
  });

  it("keeps functions per language with English as fallback", () => {
    const l = locale();
    const english = () => "en";
    l.setFunction(0, "plural", english);
    l.setLanguage(1);
    expect(l.getFunction("plural")).toBe(english);
    const german = () => "de";
    l.setFunction(1, "plural", german);
    expect(l.getFunction("plural")).toBe(german);
    expect(l.getFunction("none")).toBeNull();
  });

  it("replaces a language's strings", () => {
    const l = locale();
    l.replaceValues(Projects.Designer, 1, { GDialog: { title: "Neu" } });
    l.setLanguage(1);
    expect(l.getValue("GDialog", "title")).toBe("Neu");
  });

  it("has the old string form and supported locales", () => {
    const l = locale();
    expect(String(l)).toBe("[Object GLocale]");
    expect(l.getSupportedLocales()).toHaveLength(13);
    expect(l.getSupportedLocales()).not.toContain("sv");
  });
});

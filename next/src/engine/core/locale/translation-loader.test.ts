import { describe, expect, it } from "vitest";
import { Projects } from "./projects.ts";
import { Translation, mapProjects } from "./translation-loader.ts";
import type { LanguageEntry, ProjectSource } from "./translation-table.ts";

function entry(keyValue: number, isDefault: boolean, extra: Partial<LanguageEntry>): LanguageEntry {
  return {
    language: `L${keyValue}`,
    keyValue,
    abbreviation: `l${keyValue}-XX`,
    isDefault,
    isAvailable: keyValue !== 2,
    realName: `L${keyValue}`,
    translations: {},
    translationsExtended: {},
    ...extra,
  };
}

function source(): ProjectSource {
  const translations = [
    entry(0, true, {
      translations: { GA: { a: "A" } },
      translationsExtended: { GA: { x: "X" }, GB: { b: "B" } },
    }),
    entry(1, false, { translations: { GA: { a: "Ä" } } }),
  ];
  const temporary = [entry(1, false, { translations: { GA: { a: "tmp" } } })];
  return { project: "Designer", translations, temporary, importStack: [temporary, translations] };
}

describe("mapProjects", () => {
  it("merges the default language's extended strings and pads every language", () => {
    const [mapped] = mapProjects([source()]);
    const [english, german] = mapped?.translations ?? [];
    expect(english?.translations).toEqual({ GA: { a: "A", x: "X" }, GB: { b: "B" } });
    expect(english?.translationsExtended).toEqual({ GA: { x: "X", a: "" }, GB: { b: "B" } });
    expect(german?.translations).toEqual({ GA: { a: "Ä", x: "" }, GB: { b: "" } });
    expect(german?.translationsExtended).toEqual({ GA: { x: "", a: "" }, GB: { b: "" } });
  });

  it("copies each language's overrides into translationsTemporary", () => {
    const [mapped] = mapProjects([source()]);
    const german = mapped?.translations[1];
    expect(german?.translationsTemporary).toEqual({ GA: { a: "tmp" } });
    expect(german?.translationsExtendedTemporary).toEqual({});
    expect(mapped?.translations[0]?.translationsTemporary).toBeUndefined();
  });

  it("leaves a project without a default language alone", () => {
    const plain = source();
    plain.translations = plain.translations.filter((e) => !e.isDefault);
    const [mapped] = mapProjects([plain]);
    expect(mapped?.translations[0]?.translations).toEqual({ GA: { a: "Ä" } });
  });
});

describe("Translation", () => {
  it("finds tables and available languages by project", () => {
    const translation = new Translation(mapProjects([source()]));
    expect(translation.getByProject("Designer")).toHaveLength(2);
    expect(translation.getByProject("Cloud")).toBeUndefined();
    expect(translation.getProjectAvailableLanguages("Designer")).toEqual([0, 1]);
  });

  it("maps the bundled tables (UI-I18N-001)", () => {
    const translation = new Translation();
    const designer = translation.getByProject(Projects.Designer) ?? [];
    expect(designer.map((e) => e.abbreviation)).toEqual([
      "en-US",
      "de-DE",
      "zh-CN",
      "pt-BR",
      "es-ES",
      "fr-FR",
      "pl-PL",
      "ru-RU",
      "tr-TR",
      "cs-CZ",
      "zh-TW",
      "it-IT",
      "ja-JP",
      "nl-NL",
      "sv-SE",
    ]);
    const german = designer[1];
    // Every English key exists in German, empty, after mapping.
    expect(german?.translations.GCommonNames?.["text.cancel"]).toBe("");
    expect(german?.translationsTemporary?.GCommonNames?.["text.library-load-more"]).toBe(
      "Mehr laden...",
    );
    expect(translation.getMapped().map((p) => p.project)).toEqual([
      "Designer",
      "Cloud",
      "Analytics",
      "WebTrial",
    ]);
  });

  it("returns the diff tables of Designer and Cloud", () => {
    const translation = new Translation();
    const designer = translation.getDiffByProject(Projects.Designer);
    expect(designer?.[0]?.translations.GSubAction?.["shortcut-hint-template"]).toBe(
      "%mainShortcutHint then %shortcutSubKeyHint",
    );
    expect(translation.getDiffByProject(Projects.Cloud)?.[0]?.translations).toHaveProperty(
      "GServerTranslations",
    );
    expect(translation.getDiffByProject(Projects.WebTrial)).toBeUndefined();
  });
});

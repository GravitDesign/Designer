import { describe, expect, it } from "vitest";
import { LocaleLanguage } from "../../engine/core/locale/locale-language.ts";
import { Language } from "./language.ts";
import { TranslationManager } from "./translation-manager.ts";

async function manager(): Promise<TranslationManager> {
  const result = new TranslationManager();
  await result.init();
  return result;
}

describe("translation manager (UI-I18N-008)", () => {
  it("loads the Designer project with English as the class list", async () => {
    const m = await manager();
    expect(m.getActiveProject()).toBe("Designer");
    expect(m._classesMap).toContain("GCommonNames");
    expect(m.getProjectsDescription()).toEqual(["Designer", "Cloud", "Analytics", "WebTrial"]);
    expect(() => m.loadProjectTranslations("Nope")).toThrow("invalid project");
  });

  it("exports a language as separator-joined rows", async () => {
    const m = await manager();
    const csv = (await m.export("CSV", LocaleLanguage.English)) as string;
    const row = csv
      .split("\r\n")
      .find((line) => line.startsWith("English|||GCommonNames|||text.cancel|||"));
    expect(row).toBe("English|||GCommonNames|||text.cancel|||Cancel|||");
  });

  it("imports rows into the table and rejects unknown classes", async () => {
    const m = await manager();
    // Into a copy: the tables are the bundled JSON, shared with the locale.
    const tables =
      (await m.import("English|||GCommonNames|||text.cancel|||Abort", "CSV", false)) ?? [];
    const cancel = (table: (typeof tables)[number] | undefined) =>
      (table?.translations.GCommonNames as unknown as Record<string, string>)["text.cancel"];
    expect(cancel(tables.find((t) => t.keyValue === LocaleLanguage.English))).toBe("Abort");
    expect(cancel(m.getTranslationByKey(LocaleLanguage.English))).toBe("Cancel");
    await expect(m.import("English|||NoSuchClass|||x|||y")).rejects.toContain("Reference to UI");
    await expect(m.import("Klingon|||GCommonNames|||x|||y")).rejects.toContain(
      "Language not available",
    );
    await expect(m.import("only|||three")).rejects.toContain("Invalid number of columns on row 1");
  });

  it("makes a new language from an empty template", async () => {
    const m = await manager();
    // A copy, so the shared language table stays as it is for other tests.
    m._localeLanguage = { ...LocaleLanguage };
    const entry = await m.createNewLanguage("Elvish", "Elvish", "el-VI");
    expect(entry.keyValue).toBeGreaterThan(14);
    expect(
      (entry.translations.GCommonNames as unknown as Record<string, string>)["text.cancel"],
    ).toBe("");
    expect(m.getTranslationRealName(entry.keyValue)).toBe("Elvish");
  });
});

describe("language switch (UI-I18N-005)", () => {
  it("resolves without changing anything, as the failed fetch did", async () => {
    await expect(Language.setLanguage(LocaleLanguage.German)).resolves.toBeUndefined();
    expect(Language._isEtagsEqual('W/"abc"', "abc")).toBe(true);
    expect(Language._isEtagsEqual("abc", "abd")).toBe(false);
  });
});

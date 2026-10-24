// Old: chunk.vendor.js module 224 (loads every project's tables into one
// locale and picks the language from the browser; Factory).
import { ClassReference } from "./class-reference.ts";
import { extend } from "./extend.ts";
import { LocaleRuntime, type LocaleEnvironment } from "./locale-runtime.ts";
import type { LanguageEntry } from "./translation-table.ts";

/** A copy without the empty strings, keys in the same order. */
function withoutEmpty(strings: Record<string, unknown> | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(strings ?? {})) {
    if (strings?.[key]) out[key] = strings[key];
  }
  return out;
}

function hasStrings(table: LanguageEntry[]): boolean {
  return table.some(
    (entry) =>
      Object.prototype.hasOwnProperty.call(entry, "translations") &&
      Object.keys(entry.translations).length > 0,
  );
}

/**
 * Builds the base locale: loads the non-empty strings of every project's
 * tables (in import-stack order, so later tables win), adds unknown
 * language names to the language table, and sets the language from the
 * browser. Each project whose table has an entry for the browser language
 * sets it, so the last such project wins:
 * - a five-character tag ("de-de") must equal an entry's tag;
 * - any other tag must occur in an entry's tag, case-sensitively ("de"
 *   matches "de-DE", "zh-hant-tw" matches nothing).
 */
export function bootstrapLocale(environment: LocaleEnvironment): LocaleRuntime {
  const locale = new LocaleRuntime(environment);
  const languages = environment.languages;
  const browser = environment.browser;
  for (const mapped of environment.translation.getMapped()) {
    locale.setProject(mapped.project);
    for (const table of mapped.importStack) {
      if (!hasStrings(table)) continue;
      if (table.filter((entry) => entry.isDefault).length > 1) {
        throw new Error("Only one default language can exist!");
      }
      for (const entry of table) {
        if (!entry.translations) continue;
        if (!Object.prototype.hasOwnProperty.call(languages, entry.language)) {
          languages[entry.language] = entry.keyValue;
        }
        const language = languages[entry.language] as number;
        for (const className of Object.keys(entry.translations)) {
          const strings = withoutEmpty(entry.translations[className]);
          locale.setValues(
            new ClassReference(className),
            language,
            Object.keys(strings),
            Object.values(strings),
            true,
          );
          const extended = entry.translationsExtended && entry.translationsExtended[className];
          if (extended) {
            const merged = withoutEmpty(extend({}, strings, extended));
            locale.setValues(
              new ClassReference(className),
              language,
              Object.keys(merged),
              Object.values(merged),
              true,
              true,
            );
          }
        }
      }
    }
    const match = mapped.translations.find((entry) => {
      const full = browser.fullLanguage;
      return (
        !!browser.language &&
        full != null &&
        ((5 === full.length && entry.abbreviation.toLowerCase() === full) ||
          (5 !== full.length && entry.abbreviation.indexOf(full) >= 0))
      );
    });
    if (match) locale.setLanguage(match.keyValue);
  }
  return locale;
}

/**
 * A locale for one project that shares the base locale's loaded values and
 * starts with its language (the old Factory).
 */
export function createProjectLocale(base: LocaleRuntime, project: string): LocaleRuntime {
  const locale = new LocaleRuntime(base.environment);
  locale.adoptState(base);
  locale.setProject(project);
  return locale;
}

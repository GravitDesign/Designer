// Old: designer.browser.dev.js module 1037.
/**
 * Switching the app language at runtime. The old code fetched the
 * Designer and Cloud tables of the language from the translations CDN
 * (gApi.fetchTranslationsURL), swapped them into the locale and set the
 * language in the locale, the locale factory and the API.
 *
 * The local build has no translations service: gApi.fetchTranslationsURL
 * didn't exist, the fetch failed, and the whole switch ended in the
 * method's catch with nothing changed. Only English app strings are
 * bundled (QUESTIONS.md Q-001) and the language menu is gone (the switch
 * action is dropped), so setLanguage keeps that outcome: it looks the
 * language up and changes nothing.
 */
import { Locale } from "../../engine/core/locale/locale.ts";
import type { LanguageEntry } from "../../engine/core/locale/translation-table.ts";

export const Language = {
  /** The table entry of a language id, as setLanguage looked it up. */
  findTranslation(language: number): LanguageEntry | undefined {
    const translations = Locale.getTranslations() || [];
    return translations.find((entry) => entry.keyValue === language);
  },

  /**
   * Resolves once the switch is over. The old fetch always failed in the
   * local build, so the language stays as it is.
   */
  setLanguage(language: number): Promise<void> {
    try {
      Language.findTranslation(language);
    } catch {
      // The old method swallowed every error.
    }
    return Promise.resolve();
  },

  /** Whether a stored etag matches a response's ("W/" weak tags unwrapped). */
  _isEtagsEqual(etag: string, stored: string | undefined): boolean {
    if (etag.startsWith("W/")) etag = etag.substring(3, etag.length - 1);
    return etag === stored;
  },
};

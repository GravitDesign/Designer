// Old: chunk.vendor.js module 633 (language and fullLanguage only; the OS
// and hardware sniffing in that module duplicate GSystem and are dropped).

/** The browser language as the translation library reads it at startup. */
export interface BrowserLanguage {
  /** First part of the language tag in lower case ("de" for "de-DE"); "" when the tag is empty. */
  language: string | null;
  /** The whole tag in lower case ("de-de"), or null when the browser has none. */
  fullLanguage: string | null;
}

interface LegacyNavigator {
  language?: string;
  browserLanguage?: string;
  systemLanguage?: string;
  userLanguage?: string;
}

export function readBrowserLanguage(
  nav: LegacyNavigator | undefined = typeof navigator === "undefined" ? undefined : navigator,
): BrowserLanguage {
  if (!nav) return { language: null, fullLanguage: null };
  const tag = nav.language || nav.browserLanguage || nav.systemLanguage || nav.userLanguage || "";
  return {
    // The old check (`2 == parts.length || parts`) is always true, so this
    // is the first part even for tags like "zh-Hant-TW".
    language: (tag.split("-")[0] ?? "").toLowerCase(),
    fullLanguage: tag ? tag.toLowerCase() : null,
  };
}

// The shape of the translation tables (the JSON files under data/ and
// src/app/locale/data/), as the old bundles store them.

/** Key → string for one class. */
export type ClassStrings = Record<string, string>;

/** Class id (old class name, "GLength") → its strings. */
export type ClassTable = Record<string, ClassStrings>;

/** One language of a project's table. */
export interface LanguageEntry {
  /** Name in LocaleLanguage ("German"); unknown names are added to it on load. */
  language: string;
  keyValue: number;
  /** BCP 47 tag, "de-DE". */
  abbreviation: string;
  isDefault: boolean;
  isAvailable: boolean;
  realName: string;
  translations: ClassTable;
  translationsExtended: ClassTable;
  translationsTemporary?: ClassTable;
  translationsExtendedTemporary?: ClassTable;
  etag?: string;
}

/** A project's table plus its overrides. */
export interface ProjectSource {
  project: string;
  translations: LanguageEntry[];
  /** Overrides per language, copied into translationsTemporary when mapped. */
  temporary: LanguageEntry[];
  /** Tables loaded into the locale in this order; later values win. */
  importStack: LanguageEntry[][];
}

// Old: chunk.vendor.js module 636 (the language table), re-exported as
// GLocaleLanguage by module 457.

/** The fixed languages plus any names added at runtime. */
export interface LanguageTable {
  English: number;
  German: number;
  Chinese: number;
  Portuguese: number;
  Spanish: number;
  French: number;
  Polish: number;
  Russian: number;
  Turkish: number;
  Czech: number;
  ChineseTaiwan: number;
  Italian: number;
  Japanese: number;
  Dutch: number;
  Swedish: number;
  Default: number;
  [name: string]: number;
}

/** A fresh copy of the table as it is before any translations load. */
export function createLanguageTable(): LanguageTable {
  return {
    English: 0,
    German: 1,
    Chinese: 2,
    Portuguese: 3,
    Spanish: 4,
    French: 5,
    Polish: 6,
    Russian: 7,
    Turkish: 8,
    Czech: 9,
    ChineseTaiwan: 10,
    Italian: 11,
    Japanese: 12,
    Dutch: 13,
    Swedish: 14,
    Default: 0,
  };
}

/**
 * Language ids. The values are what settings and the translation tables
 * store, so they must not change.
 *
 * The object is mutable on purpose: loading the tables adds every language
 * name a table uses that is not listed here (the WebTrial table adds
 * "ChineseSimplified" and "ChineseTraditional"), and
 * LocaleRuntime.getLocaleLanguage adds unknown names too.
 */
export const LocaleLanguage: LanguageTable = createLanguageTable();

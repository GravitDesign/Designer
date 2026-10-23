// Old: designer.browser.dev.js module 1343 (the translation manager).
/**
 * Reads, patches and exports the string tables of one project. The old
 * translation tool (dropped) used it to export a language as CSV
 * ("language|||class|||key|||value|||extended" per line) and to import
 * corrections back.
 */
import { LocaleLanguage, type LanguageTable } from "../../engine/core/locale/locale-language.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { Translation } from "../../engine/core/locale/translation-loader.ts";
import type { ClassTable, LanguageEntry } from "../../engine/core/locale/translation-table.ts";
import { extend } from "../../engine/core/util.ts";
import { baseConfig } from "../file-formats.ts";

/** A patch for one language: strings by class and key. */
export interface TranslationPatch {
  language: string;
  translations: Record<string, Record<string, string>>;
  translationsExtended?: Record<string, Record<string, string>>;
  [field: string]: unknown;
}

type Strings = Record<string, unknown>;
type Entry = LanguageEntry;

function strings(table: ClassTable, clazz: string): Strings {
  return table[clazz] as unknown as Strings;
}

export class TranslationManager {
  static readonly _CSV_SEPARATOR = "|||";
  static readonly FormatTypes = { CSV: "CSV" } as const;

  _translationBase: Translation | null = null;
  _translations: Entry[] = [];
  _project: string | null = null;
  _classesMap: string[] = [];
  _localeLanguage: LanguageTable = LocaleLanguage;

  getProjectsDescription(): string[] {
    return (this._translationBase as Translation).getMapped().map((source) => source.project);
  }

  loadProjectTranslations(project: string): void {
    if (!Object.prototype.hasOwnProperty.call(Translation.Projects, project))
      throw Error("Can't load translations, invalid project!");
    this._project = project;
    this._translations = (this._translationBase as Translation).getByProject(project) || [];
    const english = this._translations.find((entry) => entry.keyValue === LocaleLanguage.English);
    this._classesMap = Object.keys((english as Entry).translations);
  }

  getActiveProject(): string | null {
    return this._project;
  }

  init(): Promise<void> {
    this._translationBase = new Translation();
    this.loadProjectTranslations(Translation.Projects.Designer);
    this._localeLanguage = LocaleLanguage;
    if (this.isConsideringExtension()) Locale.enableExtension();
    return Promise.resolve();
  }

  getTranslationByKey(language: number): Entry | undefined {
    return this._translations.find((entry) => entry.keyValue === language);
  }

  _clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  getTranslationCopy(language: number): Entry {
    return this._clone(this.getTranslationByKey(language) as Entry);
  }

  import(
    text: string,
    format: string = TranslationManager.FormatTypes.CSV,
    inPlace = true,
  ): Promise<Entry[]> | undefined {
    switch (format) {
      case TranslationManager.FormatTypes.CSV:
        return this._handleCSVImport(text).then((patches) =>
          this.applyTranslationPatch(patches, inPlace),
        );
    }
    return undefined;
  }

  /** Writes the patches into the tables (or into a copy when `inPlace` is false). */
  applyTranslationPatch(patches: TranslationPatch[], inPlace = true): Promise<Entry[]> {
    const tables = inPlace ? this._translations : this._clone(this._translations);
    patches.forEach((patch) => {
      const target = tables.find((entry) => entry.language === patch.language) as Entry;
      const values = patch.translations;
      Object.keys(values).forEach((clazz) => {
        Object.keys(values[clazz] as Strings).forEach((key) => {
          strings(target.translations, clazz)[key] = (values[clazz] as Strings)[key];
        });
      });
      const extended = patch.translationsExtended;
      if (extended)
        Object.keys(extended).forEach((clazz) => {
          const list = extended[clazz] as Strings;
          if (0 === Object.keys(list).length)
            Reflect.deleteProperty(target.translationsExtended, clazz);
          else {
            if (!target.translationsExtended) target.translationsExtended = {};
            if (!target.translationsExtended[clazz])
              (target.translationsExtended as Record<string, unknown>)[clazz] = {};
            Object.keys(list).forEach((key) => {
              strings(target.translationsExtended, clazz)[key] = list[key];
            });
          }
        });
      if (target.translationsExtended && 0 === Object.keys(target.translationsExtended).length)
        delete (target as Partial<Entry>).translationsExtended;
      const rest = this._clone(patch) as Partial<TranslationPatch>;
      delete rest.translations;
      delete rest.translationsExtended;
      extend(target, rest);
    });
    return Promise.resolve(tables);
  }

  export(
    format: string = TranslationManager.FormatTypes.CSV,
    language: number | null = null,
    onlyEmpty = false,
  ): Promise<string> | undefined {
    switch (format) {
      case TranslationManager.FormatTypes.CSV:
        return this._exportAsCSV({ language, onlyEmpty });
    }
    return undefined;
  }

  getMetaData(): Promise<string> {
    return Promise.resolve(JSON.stringify(this._translations, null, 4));
  }

  _exportAsCSV({
    language = null,
    onlyEmpty = false,
  }: {
    language?: number | null;
    onlyEmpty?: boolean;
  }): Promise<string> {
    const flat = (value: unknown): string =>
      ((value as string | undefined) && (value as string).replace(/\r?\n|\r/g, "")) || "";
    const all = this._translations;
    const selected =
      (null != language &&
        !isNaN(language) &&
        all.filter((entry) => entry.keyValue === language)) ||
      all;
    const rows: string[] = [];
    const defaults = all.find((entry) => entry.isDefault) as Entry;
    selected.forEach((entry) => {
      Object.keys(entry.translations).forEach((clazz) => {
        Object.keys(strings(entry.translations, clazz)).forEach((key) => {
          let extendedValue: unknown;
          if (this.isConsideringExtension())
            extendedValue =
              entry.translationsExtended &&
              entry.translationsExtended[clazz] &&
              strings(entry.translationsExtended, clazz)[key];
          const value = strings(entry.translations, clazz)[key] as string;
          if (!onlyEmpty || "" === value.trim())
            rows.push(
              [
                entry.language,
                clazz,
                key,
                flat(onlyEmpty ? strings(defaults.translations, clazz)[key] : value),
                flat(extendedValue),
              ].join(TranslationManager._CSV_SEPARATOR),
            );
        });
      });
    });
    return Promise.resolve(rows.join("\r\n"));
  }

  _handleCSVImport(text: string): Promise<TranslationPatch[]> {
    const enoughColumns = (columns: string[]) => columns.length >= 4;
    const patches: TranslationPatch[] = [];
    return new Promise((resolve, reject) => {
      if (text) {
        const lines = text.split(/\r?\n/);
        if (lines.length < 1) return reject("No rows were found!");
        for (let index = 0; index < lines.length; index++) {
          const line = lines[index] as string;
          const columns = line.split(TranslationManager._CSV_SEPARATOR);
          if (!enoughColumns(columns))
            return reject(
              "Invalid number of columns on row " +
                (index + 1) +
                (line.trim().length ? ", content '" + line.substr(0, 30) + "...'" : ", is empty"),
            );
          const [language, clazz, key, value, extendedValue] = columns as [
            string,
            string,
            string,
            string,
            string | undefined,
          ];
          if (!Object.prototype.hasOwnProperty.call(LocaleLanguage, language))
            return reject(`Language not available ('${language}'), row ${index + 1}!`);
          if (!this._classesMap.find((name) => name === clazz))
            return reject(`Reference to UI not available ('${clazz}')!, row ${index + 1}`);
          const table = this._translations.find((entry) => entry.language === language.trim());
          if (table) {
            let patch = patches.find((candidate) => candidate.language === language);
            if (!patch) {
              patch = { language, translations: {} };
              patches.push(patch);
            }
            if (table.translations[clazz]) {
              if (!patch.translations[clazz]) patch.translations[clazz] = {};
              if (Object.prototype.hasOwnProperty.call(table.translations[clazz], key)) {
                (patch.translations[clazz] as Record<string, string>)[key] = value;
                if (extendedValue && this.isConsideringExtension()) {
                  if (!patch.translationsExtended) patch.translationsExtended = {};
                  if (!patch.translationsExtended[clazz]) patch.translationsExtended[clazz] = {};
                  (patch.translationsExtended[clazz] as Record<string, string>)[key] =
                    extendedValue;
                }
              }
            }
          }
        }
        return resolve(patches);
      }
    });
  }

  getTranslationRealName(language: number): string | null {
    const entry = this._translations.find((candidate) => candidate.keyValue === language);
    return entry ? entry.realName : null;
  }

  async createNewLanguage(
    language: string,
    realName: string,
    abbreviation: string,
  ): Promise<Entry> {
    return new Promise((resolve) => {
      const entry = this.getTranslationTemplate();
      entry.language = language;
      entry.realName = realName;
      entry.abbreviation = abbreviation;
      entry.keyValue = Object.prototype.hasOwnProperty.call(this._localeLanguage, language)
        ? (this._localeLanguage[language] as number)
        : Math.max(...Object.values(this._localeLanguage)) + 1;
      this._translations.push(entry);
      if (!Object.prototype.hasOwnProperty.call(this._localeLanguage, language))
        this._localeLanguage[language] = entry.keyValue;
      resolve(entry);
    });
  }

  /**
   * A copy of the default language with every string emptied; keyValue,
   * language and abbreviation are null until createNewLanguage sets them.
   */
  getTranslationTemplate(): Entry {
    const entry = this.getTranslationCopy(this._localeLanguage.Default);
    const blank = entry as unknown as Record<string, unknown>;
    blank.keyValue = null;
    blank.language = null;
    entry.isDefault = false;
    entry.isAvailable = true;
    blank.abbreviation = null;
    Object.keys(entry.translations).forEach((clazz) => {
      Object.keys(strings(entry.translations, clazz)).forEach((key) => {
        strings(entry.translations, clazz)[key] = "";
      });
    });
    if (entry.translationsExtended)
      Object.keys(entry.translationsExtended).forEach((clazz) => {
        Object.keys(strings(entry.translationsExtended, clazz)).forEach((key) => {
          strings(entry.translationsExtended, clazz)[key] = "";
        });
      });
    return entry;
  }

  isConsideringExtension(): boolean {
    return !!baseConfig.TRANSLATION_MANAGER.CONSIDER_EXTENSION;
  }
}

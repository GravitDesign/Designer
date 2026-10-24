// Old: chunk.vendor.js module 889 (the GLocale class; the instance the app
// uses is made in locale.ts).
import { readBrowserLanguage, type BrowserLanguage } from "./browser-language.ts";
import { className } from "./class-name.ts";
import { ClassReference } from "./class-reference.ts";
import { formatDate } from "./date-format.ts";
import { bcp47ToISO6391 } from "./extend.ts";
import { LocaleKey } from "./locale-key.ts";
import { LocaleLanguage, type LanguageTable } from "./locale-language.ts";
import { Projects } from "./projects.ts";
import { Translation } from "./translation-loader.ts";
import { TranslationEvents } from "./translation-events.ts";
import { TranslationNotificationEvent } from "./translation-notification-event.ts";
import type { LanguageEntry } from "./translation-table.ts";
import type { TranslationEventTarget } from "./translation-event-target.ts";

/** Class id (old class name) → key → string. */
type LanguageValues = Record<string, Record<string, unknown>>;

interface ProjectValues {
  /** Language id → class id → key → string. */
  values: Record<number, LanguageValues>;
  /** Extended strings, used first when the extension is enabled. */
  extension: Record<number, LanguageValues>;
}

/** What a locale reads from outside; tests pass their own. */
export interface LocaleEnvironment {
  browser: BrowserLanguage;
  languages: LanguageTable;
  translation: Translation;
  events: TranslationEventTarget;
}

export function defaultLocaleEnvironment(): LocaleEnvironment {
  return {
    browser: readBrowserLanguage(),
    languages: LocaleLanguage,
    translation: new Translation(),
    events: TranslationEvents,
  };
}

/** A class id: the old class name, a ClassReference, or (with a warning) a class. */
export type ClassId = string | ClassReference | object;

/**
 * Translation lookup for one project. All instances made from the same
 * base share its loaded values (see createProjectLocale).
 */
export class LocaleRuntime {
  readonly environment: LocaleEnvironment;
  private _projects: Record<string, ProjectValues> = {};
  private _clazzMap: Record<string, unknown> = {};
  private _functions: Record<number, Record<string, unknown>> = {};
  private _translationInstance: Translation;
  private _language = 0;
  private _project: string | null = null;
  private _extensionEnabled = false;
  private _checkStrict = false;
  private readonly _supportedISO6391Locales = [
    "en",
    "de",
    "zh",
    "pt",
    "es",
    "fr",
    "pl",
    "ru",
    "tr",
    "cs",
    "it",
    "ja",
    "nl",
  ];

  constructor(environment: LocaleEnvironment = defaultLocaleEnvironment()) {
    this.environment = environment;
    this._translationInstance = environment.translation;
    // No project is set yet, so this only looks at the browser language.
    const language = this.lookupLanguage(environment.browser.fullLanguage || "en");
    if (language != null) this.setLanguage(language);
  }

  /**
   * Takes over another locale's state, sharing its loaded values and
   * functions (the old factory used Object.assign).
   */
  adoptState(other: LocaleRuntime): void {
    this._projects = other._projects;
    this._clazzMap = other._clazzMap;
    this._functions = other._functions;
    this._translationInstance = other._translationInstance;
    this._language = other._language;
    this._project = other._project;
    this._extensionEnabled = other._extensionEnabled;
    this._checkStrict = other._checkStrict;
  }

  private get _languages(): LanguageTable {
    return this.environment.languages;
  }

  /** In strict mode a missing value throws instead of logging an error. */
  setStrict(strict: boolean): void {
    this._checkStrict = strict;
  }

  getSupportedLocales(): string[] {
    return this._supportedISO6391Locales;
  }

  setProject(project: string): void {
    if (!Object.prototype.hasOwnProperty.call(Projects, project)) {
      throw Error("Project '" + project + "' doesn't exist!");
    }
    this._project = project;
  }

  enableExtension(): void {
    this._extensionEnabled = true;
  }

  getLanguage(): number {
    return this._language;
  }

  setLanguage(language: number): void {
    if (language != this._language) this._language = language;
  }

  /** Looks up a LocaleKey; any other value is returned unchanged. */
  get(key: LocaleKey, defaultValue?: string, language?: number): string | undefined;
  get<T>(value: T): T;
  get(value: unknown, defaultValue?: string, language?: number): unknown {
    return value != null && value instanceof LocaleKey
      ? this.getValueByKey(value, defaultValue, language)
      : value;
  }

  /**
   * The string for a class and key in the given language (default: the
   * current one), falling back to English. Without a value and without a
   * default it logs "No value found for <class> and key <key>" (throws in
   * strict mode) and returns undefined.
   */
  getValue(
    clazz: ClassId,
    key: string,
    defaultValue?: string,
    language?: number,
  ): string | undefined {
    const id = this._getClassIdentifier(clazz);
    if (language === undefined) language = this._language;
    let value = this._getValue(language, id, key);
    if (!value && language != this._languages.Default) {
      value = this._getValue(this._languages.Default, id, key);
    }
    if (value || defaultValue !== undefined) {
      if (!value) return defaultValue;
    } else {
      const message = "No value found for " + this._nameOf(clazz) + " and key " + key;
      if (this._checkStrict) throw new Error(message);
      console.error(message);
    }
    return value as string | undefined;
  }

  getValueByKey(key: LocaleKey, defaultValue?: string, language?: number): string | undefined {
    return this.getValue(key.getClassReference(), key.getKey(), defaultValue, language);
  }

  private _nameOf(clazz: ClassId): string {
    return clazz instanceof ClassReference ? String(clazz.getReference()) : className(clazz);
  }

  private _sendNotification(type: string, content: string, data: unknown): void {
    const events = this.environment.events;
    if (events.hasEventListeners(TranslationNotificationEvent)) {
      events.trigger(new TranslationNotificationEvent(this._project, type, content, data));
    }
  }

  private _getClassIdentifier(clazz: ClassId): string {
    const isReference = clazz instanceof ClassReference;
    if (
      (isReference && typeof clazz.getReference() !== "string") ||
      (!isReference && typeof clazz !== "string")
    ) {
      this._sendNotification(
        TranslationNotificationEvent.Type.Warning,
        "Using class instead of string for:" + String(isReference ? clazz.getReference() : clazz),
        { clazz },
      );
    }
    return isReference ? String(clazz.getReference()).trim() : className(clazz).trim();
  }

  /**
   * Stores strings for a class in a language of the current project.
   * Without `override` an existing key logs "Duplicate value for key"
   * (and is still replaced). `extension` stores extended strings.
   */
  setValues(
    clazz: ClassId,
    language: number,
    keys: readonly string[],
    values: readonly unknown[],
    override?: boolean | null,
    extension?: boolean,
  ): void {
    override = override == null || override;
    const id = this._getClassIdentifier(clazz);
    if (!id) {
      console.error("Please, make sure the class has a valid ID, before defining translations!");
    }
    const projectKey = String(this._project);
    let project = this._projects[projectKey];
    if (!project) project = this._projects[projectKey] = { values: {}, extension: {} };
    const store = extension ? project.extension : project.values;
    let languageValues = store[language];
    if (!languageValues) languageValues = store[language] = {};
    let classValues = languageValues[id];
    if (!classValues) classValues = languageValues[id] = {};
    for (let index = 0; index < keys.length; ++index) {
      const key = keys[index] as string;
      if (!override && Object.prototype.hasOwnProperty.call(classValues, key)) {
        console.error("Duplicate value for key: " + key);
      }
      classValues[key] = values[index];
    }
  }

  private _currentProject(): ProjectValues {
    const project = this._projects[String(this._project)];
    // The old code failed with a TypeError here too.
    if (!project) throw new TypeError(`No translations loaded for project ${this._project}`);
    return project;
  }

  private _getValue(language: number, id: string, key: string): unknown {
    const project = this._currentProject();
    if (this._extensionEnabled) {
      const extended = project.extension[language]?.[id];
      if (extended && Object.prototype.hasOwnProperty.call(extended, key) && extended[key]) {
        return extended[key];
      }
    }
    const classValues = project.values[language]?.[id];
    // Plain lookup, like the old code (it also finds inherited properties).
    if (classValues) return classValues[key];
    return undefined;
  }

  /** The keys of a class in the current language (plain strings only), or undefined. */
  getAvailableKeys(clazz: ClassId): string[] | undefined {
    const id = this._getClassIdentifier(clazz);
    const project = this._currentProject();
    const languageValues = project.values[this._language || 0];
    if (languageValues) {
      const classValues = languageValues[id];
      if (classValues) return Object.keys(classValues);
    }
    return undefined;
  }

  getClassTranslations(clazz: ClassId, language?: number): Record<string, string | undefined> {
    const keys = this.getAvailableKeys(clazz);
    if (!keys) throw new TypeError(`No keys for ${this._nameOf(clazz)}`);
    const out: Record<string, string | undefined> = {};
    for (const key of keys) out[key] = this.getValue(clazz, key, undefined, language);
    return out;
  }

  getAvailableLanguages(): number[] {
    return this._translationInstance.getProjectAvailableLanguages(String(this._project));
  }

  setFunction(language: number, name: string, fn: unknown): void {
    let functions = this._functions[language];
    if (!functions) functions = this._functions[language] = {};
    functions[name] = fn;
  }

  /** A function stored for the current language, else for English, else null. */
  getFunction(name: string): unknown {
    let functions = this._functions[this._language];
    if (functions && Object.prototype.hasOwnProperty.call(functions, name)) return functions[name];
    if (this._language != this._languages.Default) {
      functions = this._functions[this._languages.Default];
      if (functions && Object.prototype.hasOwnProperty.call(functions, name)) {
        return functions[name];
      }
    }
    return null;
  }

  /**
   * The id of a language name. An unknown name, and also a name whose id
   * is 0 ("English", "Default"), gets the next free id and is added to the
   * language table.
   */
  getLocaleLanguage(name: string): number {
    const known = this._languages[name];
    if (known) return known;
    const id = Object.keys(this._languages).length - 1;
    this._languages[name] = id;
    return id;
  }

  private _entries(): LanguageEntry[] {
    const entries = this._translationInstance.getByProject(String(this._project));
    if (!entries) throw new TypeError(`No translations for project ${this._project}`);
    return entries;
  }

  /**
   * The lower-case tag of a language id ("de-de"), from the project's
   * table; falls back to a two-letter code. English (0) always gives "en".
   */
  lookupLocale(language: number): string | undefined {
    if (language && this._project) {
      const entry = this._entries().find((candidate) => candidate.keyValue == language);
      if (entry && entry.abbreviation) return entry.abbreviation.toLowerCase();
    }
    const L = this._languages;
    switch (language) {
      case L.English:
        return "en";
      case L.German:
        return "de";
      case L.Chinese:
        return "zh";
      case L.Portuguese:
        return "pt";
      case L.Spanish:
        return "es";
      case L.French:
        return "fr";
      case L.Polish:
        return "pl";
      case L.Russian:
        return "ru";
      case L.Turkish:
        return "tr";
      case L.Czech:
        return "cs";
      case L.Italian:
        return "it";
      case L.Japanese:
        return "ja";
      case L.Dutch:
        return "nl";
      case L.Swedish:
        return "sv";
    }
    return undefined;
  }

  /**
   * The language id for a tag: the project's entry with that tag, else the
   * first entry with the same two-letter prefix. Without a match it goes by
   * the browser language, not by the tag (an old quirk), and defaults to
   * English.
   */
  lookupLanguage(tag: string | null | undefined): number {
    const L = this._languages;
    if (tag) {
      if (this._project) {
        const entries = this._entries();
        const exact = entries.find(
          (entry) => entry.abbreviation.toLowerCase() == tag.toLowerCase(),
        );
        if (exact) return exact.keyValue;
        // The old code had a third search identical to this one.
        const prefix = entries.find(
          (entry) => entry.abbreviation.toLowerCase().slice(0, 2) == tag.toLowerCase().slice(0, 2),
        );
        if (prefix) return prefix.keyValue;
      }
      const browser = this.environment.browser.language;
      if ("en" === browser) return L.English;
      if ("de" === browser) return L.German;
      if ("zh" === browser || "so" === browser) return L.Chinese;
      if ("pt" === browser) return L.Portuguese;
      if ("es" === browser) return L.Spanish;
      if ("fr" === browser) return L.French;
      if ("pl" === browser) return L.Polish;
      if ("ru" === browser) return L.Russian;
      if ("tr" === browser) return L.Turkish;
      if ("cs" === browser) return L.Czech;
      if ("it" === browser) return L.Italian;
      if ("ja" === browser) return L.Japanese;
      if ("nl" === browser) return L.Dutch;
      if ("sv" === browser) return L.Swedish;
    }
    return L.English;
  }

  toLocaleCurrency(amount: number | string, currency: string): string {
    const value = (typeof amount === "number" && amount) || parseFloat(String(amount));
    if (isNaN(value) || !currency) {
      throw Error("You must provid a valid number and currency!");
    }
    return value.toLocaleString(this.getLocaleLanguageTag(), { style: "currency", currency });
  }

  /** The current language's BCP 47 tag ("de-DE"), or `fallback` (default "en-US"). */
  getLocaleLanguageTag(fallback?: string): string {
    fallback = fallback || "en-US";
    const language = this._language || this._languages.English;
    const entry = this._entries().find((candidate) => candidate.keyValue === language);
    return (entry && entry.abbreviation) || fallback;
  }

  /** Replaces all strings of a language in a project. */
  replaceValues(project: string, language: number, values: LanguageValues): void {
    const target = this._projects[project];
    if (!target) throw new TypeError(`No translations loaded for project ${project}`);
    target.values[language] = values;
  }

  getLocaleTagISO6391(): string {
    return bcp47ToISO6391(this.getLocaleLanguageTag());
  }

  toLocaleDate(date: Date | string | number, options?: Intl.DateTimeFormatOptions | null): string {
    return formatDate(date, this.getLocaleLanguageTag(), options);
  }

  getTranslations(): LanguageEntry[] | undefined {
    return this._translationInstance.getByProject(String(this._project));
  }

  toString(): string {
    return "[Object GLocale]";
  }
}

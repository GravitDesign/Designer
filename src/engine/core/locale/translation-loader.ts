// Old: chunk.vendor.js module 634 (GTranslation).
import cloudDiff from "./data/cloud-diff.json";
import designerDiff from "./data/designer-diff.json";
import { Projects, createProjectSources } from "./projects.ts";
import type { ClassTable, LanguageEntry, ProjectSource } from "./translation-table.ts";

function emptied(table: ClassTable): ClassTable {
  const copy = JSON.parse(JSON.stringify(table)) as ClassTable;
  for (const className in copy) {
    const strings = copy[className] as Record<string, string>;
    for (const key in strings) strings[key] = "";
  }
  return copy;
}

function own(object: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

/**
 * Fills in the projects' tables so every language has every key, the way
 * the old library did once at load. It changes the given tables in place:
 * - the default language gets the extended strings it lacks, and an empty
 *   extended string for every key that has none;
 * - every other language gets an empty string for each key it lacks, in
 *   both the plain and the extended table;
 * - every language gets copies of its overrides as translationsTemporary
 *   and translationsExtendedTemporary.
 */
export function mapProjects(sources: ProjectSource[]): ProjectSource[] {
  return sources.map((source) => {
    const defaults = source.translations.find((entry) => entry.isDefault);
    const temporary = source.temporary;
    if (!defaults) return source;

    for (const className of Object.keys(defaults.translationsExtended)) {
      const extended = defaults.translationsExtended[className] as Record<string, string>;
      if (own(defaults.translations, className)) {
        const strings = defaults.translations[className] as Record<string, string>;
        for (const key in extended) if (!own(strings, key)) strings[key] = extended[key] as string;
      } else {
        defaults.translations[className] = Object.assign({}, extended);
      }
    }
    for (const className of Object.keys(defaults.translations)) {
      if (!own(defaults.translationsExtended, className)) {
        defaults.translationsExtended[className] = {};
      }
      const extended = defaults.translationsExtended[className] as Record<string, string>;
      for (const key in defaults.translations[className]) {
        if (!own(extended, key)) extended[key] = "";
      }
    }

    const blank = emptied(defaults.translations);
    const blankExtended = defaults.translationsExtended
      ? emptied(defaults.translationsExtended)
      : null;
    source.translations = source.translations.map((entry) => {
      if (!entry.isDefault) {
        for (const className in blank) {
          entry.translations[className] = Object.assign(
            {},
            blank[className],
            own(entry.translations, className) ? entry.translations[className] : {},
          );
        }
        for (const className in blankExtended) {
          entry.translationsExtended[className] = Object.assign(
            {},
            blankExtended[className],
            own(entry.translationsExtended, className) ? entry.translationsExtended[className] : {},
          );
        }
        for (const className in defaults.translations) {
          if (!entry.translationsExtended) continue;
          if (!own(entry.translationsExtended, className)) {
            entry.translationsExtended[className] = {};
          }
          const extended = entry.translationsExtended[className] as Record<string, string>;
          for (const key in defaults.translations[className]) {
            if (!own(extended, key)) extended[key] = "";
          }
        }
      }
      const override = temporary.find((candidate) => candidate.keyValue === entry.keyValue);
      if (override) {
        if (override.translations) {
          entry.translationsTemporary = Object.assign({}, override.translations);
        }
        if (override.translationsExtended) {
          entry.translationsExtendedTemporary = Object.assign({}, override.translationsExtended);
        }
      }
      return entry;
    });
    return source;
  });
}

const MAPPED_PROJECTS = mapProjects(createProjectSources());

/** Access to the translation tables of every project. */
export class Translation {
  static readonly Projects = Projects;

  private readonly _projects: ProjectSource[];

  constructor(projects: ProjectSource[] = MAPPED_PROJECTS) {
    this._projects = projects;
  }

  getMapped(): ProjectSource[] {
    return this._projects;
  }

  getByProject(project: string): LanguageEntry[] | undefined {
    const source = this._projects.find((candidate) => candidate.project === project);
    return source && source.translations;
  }

  /** The strings that exist in the code but not yet in the project's table. */
  getDiffByProject(project: string): LanguageEntry[] | undefined {
    if (project === Projects.Designer) return designerDiff as LanguageEntry[];
    if (project === Projects.Cloud) return cloudDiff as LanguageEntry[];
    return undefined;
  }

  getProjectAvailableLanguages(project: string): number[] {
    const entries = this.getByProject(project);
    if (!entries) throw new TypeError(`No translations for project ${project}`);
    return entries.filter((entry) => entry.isAvailable).map((entry) => entry.keyValue);
  }
}

// Old: chunk.vendor.js module 884 (the project list) and module 455 (the
// project names).
//
// The tables are JSON written by scripts/extract-locales.ts. Dropped
// tables, with what the old app did with them:
// - Cloud (designer.browser.dev.js module 815): login and cloud strings,
//   only read through the Cloud project, which the rewrite removes.
// - Analytics (module 816): empty in the old build.
// - Cloud/Analytics/WebTrial overrides (chunk.vendor.js module 456): every
//   language is empty, so loading them changed nothing.
import designerTable from "../../../app/locale/data/en.json";
import designerTemporary from "./data/designer-temporary.json";
import webTrialTable from "./data/web-trial.json";
import type { LanguageEntry, ProjectSource } from "./translation-table.ts";

export const Projects = {
  Designer: "Designer",
  Cloud: "Cloud",
  Analytics: "Analytics",
  WebTrial: "WebTrial",
} as const;

export type ProjectName = (typeof Projects)[keyof typeof Projects];

function table(data: unknown): LanguageEntry[] {
  return data as LanguageEntry[];
}

/**
 * The projects in load order. The order matters: every project with a
 * table matching the browser language sets the language, so the last one
 * wins.
 */
export function createProjectSources(): ProjectSource[] {
  const designer = table(designerTable);
  const temporary = table(designerTemporary);
  const webTrial = table(webTrialTable);
  return [
    {
      project: Projects.Designer,
      translations: designer,
      temporary,
      importStack: [temporary, designer],
    },
    { project: Projects.Cloud, translations: [], temporary: [], importStack: [[], []] },
    { project: Projects.Analytics, translations: [], temporary: [], importStack: [[], []] },
    {
      project: Projects.WebTrial,
      translations: webTrial,
      temporary: [],
      importStack: [[], webTrial],
    },
  ];
}

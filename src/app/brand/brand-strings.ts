/**
 * The strings of the GravitDesign Next additions (introduction, Help menu
 * entry, version line). They have their own table: the app's string table
 * (src/app/locale/data/en.json) is the old bundle's, byte for byte
 * (scripts/extract-locales.test.ts). Languages without an entry here use
 * English, like the old tables did for missing keys.
 */
import { Locale } from "../../engine/core/locale/locale.ts";

export interface BrandStrings {
  /** Help menu entries. */
  "menu.about": string;
  "menu.legacy": string;
  /** Settings > theme: the device's light or dark. */
  "settings.theme-device": string;
  "intro.title": string;
  "intro.lead": string;
  "intro.local": string;
  "intro.files": string;
  "intro.gone-title": string;
  "intro.gone": readonly string[];
  /** "%link" stands for the issues link ("intro.report-link"). */
  "intro.report": string;
  "intro.report-link": string;
  /** "%link" stands for the old app's link ("intro.legacy-link"). */
  "intro.legacy": string;
  "intro.legacy-link": string;
  "intro.reopen": string;
  /** The box to tick before the first-start introduction can be closed. */
  "intro.confirm": string;
  "intro.ok": string;
  /** "%name %version": the version line of the welcome screen. */
  "version.line": string;
}

export type BrandStringKey = keyof BrandStrings;

const en: BrandStrings = {
  "menu.about": "About GravitDesign Next",
  "menu.legacy": "Open the Old Gravit Designer",
  "settings.theme-device": "Device setting",
  "intro.title": "This is not the Gravit you know",
  "intro.lead":
    "GravitDesign Next is a community rebuild of Gravit Designer. It looks and works " +
    "much like the app you know, but it is a different app, made by different people.",
  "intro.local":
    "It runs on your computer and works offline. There is no account, no cloud " +
    "and no subscription.",
  "intro.files":
    "Your files stay on your computer. A .gvdesign file opens in GravitDesign Next " +
    "and in Gravit Designer.",
  "intro.gone-title": "What's gone:",
  "intro.gone": [
    "cloud sync",
    "sharing and comments",
    "templates from the cloud",
    "Pro (its features are simply part of the app now)",
  ],
  "intro.report":
    "Something broken, or different from what you're used to? Please tell us at %link.",
  "intro.report-link": "github.com/GravitDesign/designer/issues",
  "intro.legacy": "Need the old Gravit Designer? It's still there, at %link.",
  "intro.legacy-link": "legacy.gravitdesign.com",
  "intro.reopen": "You can read this again under Help > About GravitDesign Next.",
  "intro.confirm": "I understand that this is a different app",
  "intro.ok": "Got it",
  "version.line": "%name %version",
};

/** The tables by the engine's language number (GLocale.getLanguage(); 0 is English). */
const TABLES: Partial<Record<number, BrandStrings>> = { 0: en };

function table(): BrandStrings {
  return TABLES[Locale.getLanguage()] ?? en;
}

export function brandString<K extends BrandStringKey>(key: K): BrandStrings[K] {
  return table()[key];
}

// Old: designer.browser.dev.js module 85 (GContainer.getProperty, setProperty,
// removeProperty, getPropertyKeyByIndex, getStorageLength) and the key names
// scattered over the modules listed per key below.
/**
 * Every localStorage key the app uses, with the type of its value, in one
 * place (UI-STORAGE-001 to -014, FMT-STORAGE-014). Users moving from the
 * old app keep their data on the same origin, so the names and the value
 * encodings are the old ones byte for byte (platform/storage migration-*
 * scenarios).
 *
 * Values go through JSON like GContainer did: getProperty resolves to the
 * parsed value or null (an empty string counts as missing; invalid JSON
 * rejects), setProperty stores JSON.stringify(value).
 *
 * DROPPED_LOCAL_STORAGE_KEYS lists what only the dropped cloud, licence,
 * update, analytics and developer-mod code wrote. The new app must not
 * write them (platform/dropped); they are listed so a search for a key
 * name ends here.
 */

/** "designer.settings": every user setting in one object. The setting keys belong to the settings module. */
export type StoredSettings = Record<string, unknown>;

/** The keys the app reads and writes, and what each one holds. */
export interface LocalStorageValues {
  /** All settings, merged with the defaults on load (module 1491). */
  "designer.settings": StoredSettings;
  /**
   * Global swatches: serialized GSwatch nodes as strings, all global-*
   * scopes in one list; older builds also stored bare pattern strings
   * such as "C#[0,255,0]" (module 1491).
   */
  swatches: string[];
  /** Inspector keep-ratio lock (module 1294, GDimensionProperties). */
  "designer.settings.dimension.preserveratio": boolean;
  /** View > Enhanced Tooltips (module 1342; read by the rich tooltip, module 1728). */
  "designer.settings.enhanced-tooltips.enabled": boolean;
  /** View > Outline View (module 1297; read at startup by module 1491). */
  "designer.settings.outline-view.enabled": boolean;
  /** Pages panel multipage switch (module 1260, GOutlineSidebar). */
  "OutlineSidebar/Multipage_Mode": boolean;
  /** Touch virtual key bar, left side expanded (module 1587). */
  "designer.assistant-bar.left-side.expanded": boolean;
  /** "Don't remind me" of the linked-image warning (module 1511). */
  "designer.settings.warn-linked-image-dialog.never-remind": boolean;
  /** One-time startup dialogs, "don't show again" (GSystemDialog.showOneTimeDialog; modules 1483, 1491). */
  "designer.settings.dont_show_unsupported_browser_dialog": boolean;
  "designer.settings.dont_show_unsupported_screen_size_dialog": boolean;
  "designer.settings.dont_show_supported_touch_dialog": boolean;
  /** When the install-PWA dialog was last closed, epoch ms (modules 1562, 1491, 1172). */
  "pwa.closed-install-pwa-dialog-date": number;
  /**
   * The last two times the install dialog was offered, epoch ms. Stored
   * twice encoded: setProperty(key, JSON.stringify(list)), so the value
   * read back is the JSON text of the list (modules 1491, 1172).
   */
  "pwa.show-install-dialog-3-times-a-week": string;
  /** Recent files of the Electron runtime: up to 10 unique ids (module 1491). */
  recent_documents: string[];
  /**
   * New in the rewrite: the look picked with ?branding=next|classic
   * (src/app/brand/branding.ts; index.html's script writes it).
   */
  "designer.branding": "next" | "classic";
  /** New in the rewrite: the GravitDesign Next introduction was closed (src/app/brand/intro-dialog.ts). */
  "designer.next-intro-shown": boolean;
}

export type LocalStorageKey = keyof LocalStorageValues;

/** The key names, for code that wants a constant instead of the string. */
export const LocalStorageKeys = {
  Settings: "designer.settings",
  Swatches: "swatches",
  PreserveRatio: "designer.settings.dimension.preserveratio",
  EnhancedTooltips: "designer.settings.enhanced-tooltips.enabled",
  OutlineView: "designer.settings.outline-view.enabled",
  MultipageMode: "OutlineSidebar/Multipage_Mode",
  AssistantBarLeftExpanded: "designer.assistant-bar.left-side.expanded",
  WarnLinkedImageNeverRemind: "designer.settings.warn-linked-image-dialog.never-remind",
  DontShowUnsupportedBrowserDialog: "designer.settings.dont_show_unsupported_browser_dialog",
  DontShowUnsupportedScreenSizeDialog: "designer.settings.dont_show_unsupported_screen_size_dialog",
  DontShowSupportedTouchDialog: "designer.settings.dont_show_supported_touch_dialog",
  PwaClosedInstallDialogDate: "pwa.closed-install-pwa-dialog-date",
  PwaInstallDialogShownTimes: "pwa.show-install-dialog-3-times-a-week",
  RecentDocuments: "recent_documents",
  Branding: "designer.branding",
  NextIntroShown: "designer.next-intro-shown",
} as const satisfies Record<string, LocalStorageKey>;

/**
 * Keys only dropped code wrote, with where. Fixed names first, then the
 * prefixes of names built at runtime.
 */
export const DROPPED_LOCAL_STORAGE_KEYS: readonly string[] = [
  // Licence, offline login and update check (modules 785, 1491, 1676).
  "offline_cache",
  "enabled_subscriptions",
  "install_update_on_start",
  "last_update_check",
  "old_version",
  // Cloud auto-save prompts (module 1276).
  "designer.settings.auto-save-warn-dialog-shown",
  "designer.settings.auto-save-hide-notification",
  // Beta flow warning (module 1686).
  "designer.betaflow.dismiss-warning-dialog",
  // Cloud files panel (module 1545).
  "GFilesPanel.maximized",
  "GFilesPanel.isFilesListStyle",
  "designer.filespanel.base-drive.current-folder",
  "designer.filespanel.cloud-drive.current-folder",
  "designer.filespanel.google-drive.current-folder",
  "designer.filespanel.cloud-accounts.active",
  // Google Drive, SharePoint and Teams sign-in (modules 1036, 1239, 1242, 1476).
  "googleapi_auth_key",
  "googleapi_auth_email_hint",
  "msteams.authentication.tokens",
  "sp_getToken_data",
  // The engine's cloud API token, kept as a plain property of localStorage (chunk.vendor.js).
  "_token",
  // Developer mods, raw strings (module 1541).
  "enable_mods",
  "designer.custom",
  // Analytics SDKs.
  "gtm:clientid",
  "_gcl_ls",
];

/** Prefixes of dropped keys whose names are built at runtime. */
export const DROPPED_LOCAL_STORAGE_PREFIXES: readonly string[] = [
  // Cloud recent files per user (module 1491).
  "recent_external_",
  // Cloud accounts and SharePoint tokens per account (module 1545).
  "designer.filespanel.cloud-accounts.",
  "designer.filespanel.cloud-account.sharepoint.token.",
  // ADAL cache (module 1476).
  "adal.",
];

/** True for a key only dropped code used. */
export function isDroppedLocalStorageKey(key: string): boolean {
  return (
    DROPPED_LOCAL_STORAGE_KEYS.includes(key) ||
    DROPPED_LOCAL_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))
  );
}

/**
 * GContainer.getProperty: the parsed value, or null when the key is
 * missing or empty. Invalid JSON rejects.
 */
export function getProperty<K extends LocalStorageKey>(
  key: K,
): Promise<LocalStorageValues[K] | null>;
export function getProperty(key: string): Promise<unknown>;
export function getProperty(key: string): Promise<unknown> {
  return new Promise((resolve) => {
    const raw = window.localStorage.getItem(key) || null;
    resolve(raw ? (JSON.parse(raw) as unknown) : null);
  });
}

/** GContainer.setProperty: stores JSON.stringify(value) (undefined removes nothing and stores "undefined"). */
export function setProperty<K extends LocalStorageKey>(key: K, value: LocalStorageValues[K]): void;
export function setProperty(key: string, value: unknown): void;
export function setProperty(key: string, value: unknown): void {
  window.localStorage.setItem(key, JSON.stringify(value) as string);
}

export function removeProperty(key: LocalStorageKey | (string & {})): void {
  window.localStorage.removeItem(key);
}

export function getPropertyKeyByIndex(index: number): string | null {
  return window.localStorage.key(index);
}

export function getStorageLength(): number {
  return window.localStorage.length;
}

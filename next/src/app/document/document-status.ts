// Old: designer.browser.dev.js module 86 (the GDocument status numbers).
/**
 * A document's state. Only Init, Ready and the load and save states are
 * reached in the local app; the sync, download and lock states came from
 * the cloud and are kept so the numbers stay the old ones.
 */
export const DocumentStatus = {
  Init: 0,
  Ready: 1,
  Loading: 10,
  LoadFailed: 11,
  Loaded: 12,
  LoadCancelled: 13,
  Saving: 20,
  SaveFailed: 21,
  Saved: 22,
  Syncing: 30,
  SyncFailed: 31,
  SaveCancelled: 32,
  Downloading: 40,
  DownloadFailed: 41,
  Downloaded: 42,
  DownloadCancelled: 43,
  Locked: 50,
  Unlocked: 51,
} as const;

export type DocumentStatusValue = (typeof DocumentStatus)[keyof typeof DocumentStatus];

/** The status's name ("Loading"), or the number as text for an unknown one. */
export function documentStatusName(status: number): string {
  for (const [name, value] of Object.entries(DocumentStatus)) {
    if (value === status) return name;
  }
  return String(status);
}

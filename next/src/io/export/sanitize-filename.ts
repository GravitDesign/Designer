// Old: designer.browser.dev.js module 1154 (GUtil.sanitizeFilename, ADD-EXPORT-001).
//
// The exporter names files with this. Module 1154 as a whole belongs to
// the app-config-document cluster (next/src/app/util/download.ts); it
// should re-export this function rather than keep a second copy.

const RESERVED_CHARACTERS = /["*/:<>?\\|]/g;
// eslint-disable-next-line no-control-regex -- control characters are what it replaces
const CONTROL_CHARACTERS = /[\0-\x1F\x80-\x9F]/g;
const ONLY_DOTS = /^\.+$/;
// "." didn't match line terminators in the old (Babel-expanded) pattern either.
const WINDOWS_DEVICE_NAMES = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
const TRAILING_SPACES_AND_DOTS = /[ .]+$/;

/**
 * Replaces what file systems reject with `replacement` (default "_"):
 * reserved and control characters, names of only dots, Windows device
 * names (with any extension) and trailing spaces or dots. Then cuts to
 * 255 UTF-16 code units.
 */
export function sanitizeFilename(name: string, replacement?: string): string {
  replacement = replacement || "_";
  return name
    .replace(RESERVED_CHARACTERS, replacement)
    .replace(CONTROL_CHARACTERS, replacement)
    .replace(ONLY_DOTS, replacement)
    .replace(WINDOWS_DEVICE_NAMES, replacement)
    .replace(TRAILING_SPACES_AND_DOTS, replacement)
    .substr(0, 255);
}

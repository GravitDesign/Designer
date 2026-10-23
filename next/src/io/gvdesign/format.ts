// Old: designer.browser.dev.js module 389 (file types), module 119
// (GDocument.unzipData), module 163 (the gzip and preview steps of
// GDocument.store), module 519 (UN_BELIVEVABLE_FEW_BYTES_TO_SAVE).
/**
 * The .gvdesign container: one gzip stream (pako 1.0.11, level 9, no
 * file name, mtime 0) holding the serialized scene as JSON. Files saved
 * with a preview carry it as the first root key, `"_preview"`, a JPEG
 * data URL; the Windows thumbnail handler (native/gvthumb) scans the
 * unpacked bytes for that literal key, so it has to come first. The
 * scene deserializer ignores the key.
 */
import { gzip, ungzip } from "pako";

/** The gvdesign entry of the old file-type table (GDocument.FileTypes). */
export const GVDESIGN_FILE_TYPE = {
  ext: "gvdesign",
  mime: "application/gravit+design",
  category: "gravit",
  load: true,
  store: true,
  import_image: false,
  default: true,
} as const;

/**
 * Below this many bytes a written file is reported as a failed save
 * ("text.saveing-error"); the old constant keeps its typo.
 */
export const UN_BELIVEVABLE_FEW_BYTES_TO_SAVE = 200;

/** The root key the preview is stored under. */
export const PREVIEW_KEY = "_preview";

/**
 * GDocument.unzipData: the file's JSON text. Gzip (or zlib, which pako
 * also detects) is unpacked with pako's own UTF-8 decoder; anything else
 * is read as plain UTF-8, so uncompressed files open too. Null when even
 * that fails.
 */
export function unzipData(bytes: Uint8Array): string | null {
  let text: string | null = null;
  try {
    text = ungzip(bytes, { to: "string" });
  } catch {
    // The old code also had a path for engines without TextDecoder;
    // every supported browser has it.
    try {
      text = new TextDecoder("utf-8").decode(bytes);
    } catch {
      console.warn("Couldn't unzip data. Data corrupted?");
    }
  }
  return text;
}

/** The gzip step of GDocument.store: pako level 9 with default options. */
export function gzipJson(json: string): Uint8Array {
  return new Uint8Array(gzip(json, { level: 9 }).buffer);
}

/**
 * Puts the preview data URL in front of the other root keys. Leaves the
 * JSON as it is when there is no preview or the JSON is not an object.
 */
export function injectPreview(json: string, previewUrl: string | null | undefined): string {
  if (previewUrl && "{" === json.charAt(0)) {
    return "{" + '"' + PREVIEW_KEY + '":' + JSON.stringify(previewUrl) + "," + json.slice(1);
  }
  return json;
}

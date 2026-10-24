// Old: designer.browser.dev.js module 1117 (FileSaver.js 1.3.x saveAs), dropped for this helper.
/**
 * Saves a Blob as a browser download, the way FileSaver.js did it in
 * Chromium (FMT-STORAGE-009): a blob URL, and on the next tick a detached
 * <a> with href and download set gets a synthetic click; the URL is
 * revoked 40 s later. (FileSaver reused one <a> for the page; a fresh one
 * per call downloads the same way.) Text and XML blobs declared
 * as UTF-8 get a byte order mark first unless noAutoBom is set.
 *
 * FileSaver's other branches (IE's msSaveOrOpenBlob, Safari and Chrome on
 * iOS reading the blob into a data URL, browsers without a[download]) are
 * left out: every browser the app supports has a[download].
 */

/** FileSaver's auto BOM check: text/*, application/xml or *+xml with charset=utf-8. */
const UTF8_TEXT_TYPE = /^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i;

/** How long the blob URL stays valid after the click. */
export const REVOKE_DELAY = 40000;

function autoBom(blob: Blob): Blob {
  return UTF8_TEXT_TYPE.test(blob.type)
    ? new Blob([String.fromCharCode(65279), blob], { type: blob.type })
    : blob;
}

/**
 * saveAs(blob, name, noAutoBom): downloads the blob under `name`, else
 * the blob's own name (a File), else "download".
 */
export function saveAs(blob: Blob, name?: string | null, noAutoBom?: boolean): void {
  const fileName = name || (blob as Partial<File>).name || "download";
  const data = noAutoBom ? blob : autoBom(blob);
  const link = document.createElementNS("http://www.w3.org/1999/xhtml", "a") as HTMLAnchorElement;
  const url = URL.createObjectURL(data);
  setTimeout(() => {
    link.href = url;
    link.download = fileName;
    link.dispatchEvent(new MouseEvent("click"));
    setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY);
  });
}

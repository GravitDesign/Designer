// Old: designer.browser.dev.js module 1374 (GBrowserContainer).
/**
 * The container of the browser and the installed PWA: the local file
 * storage (File System Access with the file input fallback), external
 * links in a new tab, the clipboard.
 *
 * Not kept: the service worker registration of /cacher.js (a frozen
 * Workbox precache, dropped in PORT-PLAN) and the start URL parameters,
 * which only named cloud documents, shares and templates (`?d=`,
 * `?token=`, `?storeContent=`, `?directlink=`). openStorageFile is not ported: every branch of it
 * opened a cloud or Electron item.
 */
import { Downloader, type DownloadRequest } from "../storage/downloader.ts";
import { BrowserFileStorage } from "../storage/file-system-access.ts";
import type { Storage } from "../storage/storage.ts";
import { Container, Runtime, type RuntimeName } from "./container.ts";

export class BrowserContainer extends Container {
  protected _storage: Storage = new BrowserFileStorage();

  getRuntime(): RuntimeName {
    return window.matchMedia("(display-mode: standalone)").matches ? Runtime.PWA : Runtime.Browser;
  }

  getStorage(): Storage {
    return this._storage;
  }

  /** Saves a buffer as a file download (the Downloader mixin, module 1482). */
  download(request: DownloadRequest): Promise<void> {
    return new Downloader().download(request);
  }

  override openExternalLink(
    event: { preventDefault(): void } | null | undefined,
    url: string,
  ): void {
    if (event) event.preventDefault();
    window.open(url, "_blank");
  }

  /**
   * The clipboard API when there is one, else a temporary textarea and
   * execCommand("copy"), keeping the page's selection.
   */
  override copyToClipboard(text: string): Promise<void> {
    if (navigator.clipboard) return navigator.clipboard.writeText(text);
    try {
      const selection = window.getSelection();
      const range = selection && selection.rangeCount ? selection.getRangeAt(0) : null;
      const area = document.createElement("textArea") as HTMLTextAreaElement;
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
      if (range && selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
  }

  override toString(): string {
    return "[Object GBrowserContainer]";
  }
}

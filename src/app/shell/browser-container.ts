// Old: designer.browser.dev.js module 1374 (GBrowserContainer).
/**
 * The container of the browser and the installed PWA: the local file
 * storage (File System Access with the file input fallback), external
 * links in a new tab, the clipboard.
 *
 * Not kept: the service worker registration of /cacher.js (a frozen
 * Workbox precache, dropped in PORT-PLAN) and the start URL parameters,
 * which only named cloud documents, shares and templates (`?d=`,
 * `?token=`, `?storeContent=`, `?directlink=`). The deep links are found
 * and taken off the address as before (handleDeepLinking). openStorageFile is not ported: every branch of it
 * opened a cloud or Electron item.
 */
import { Downloader, type DownloadRequest } from "../storage/downloader.ts";
import { BrowserFileStorage } from "../storage/file-system-access.ts";
import type { Storage } from "../storage/storage.ts";
import { Container, DeepLinking, Runtime, type DeepLink, type RuntimeName } from "./container.ts";
import {
  browserSupportsLocalFonts,
  registerBrowserFontProviders,
} from "../fonts/designer-fonts.ts";

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

  /**
   * Also takes the query off the address (history.pushState), except for
   * the links that named a document or a comment: directlink, annot and
   * create_share.
   */
  override handleDeepLinking(url?: string): DeepLink | null {
    const link = super.handleDeepLinking(url);
    const kept: string[] = [
      DeepLinking.DirectLink,
      DeepLinking.FocusAnnot,
      DeepLinking.CreateShare,
    ];
    if (link && !kept.includes(link.link))
      window.history.pushState(null, "", window.location.pathname);
    return link;
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

  override registerFontProviders(): void {
    registerBrowserFontProviders();
  }

  override supportsLocalFonts(): boolean {
    return browserSupportsLocalFonts();
  }

  /** No system fonts in the browser (the Electron container had them). */
  override getSystemFontsProvider(): unknown {
    return null;
  }

  override toString(): string {
    return "[Object GBrowserContainer]";
  }
}

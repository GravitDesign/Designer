// Old: designer.browser.dev.js module 85 (GContainer).
/**
 * The host the designer runs in (browser, PWA, Electron): its runtime,
 * storage, persistent properties and window-level services. The
 * subclass for the browser and the PWA is BrowserContainer.
 *
 * Dropped with the cloud: deep links into cloud documents and purchases,
 * cookies, the Google/SharePoint helpers, OAuth and magic-link sign-in,
 * the client API token update. The recent-documents menu is filled by
 * the open-recent action (app-actions-file-edit) through
 * updateRecentDocumentsAction.
 */
import { EventTarget } from "../../engine/core/event-target.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { baseConfig } from "../file-formats.ts";
import {
  getProperty,
  getPropertyKeyByIndex,
  getStorageLength,
  removeProperty,
  setProperty,
} from "../storage/local-storage.ts";
import type { Storage } from "../storage/storage.ts";
import { designerOrNull } from "./globals.ts";
import { lateExport, systemDialog } from "./late.ts";

/** A storage item with the size its last save measured. */
interface SizedItem {
  documentRealFileSize: number;
}

interface SizedDocument {
  getStorageItem(): SizedItem | null;
}

/** A file the container was asked to open at start (GContainer.OpenFileRequest). */
export class OpenFileRequest {
  static readonly Type = {
    Document: "document",
    Token: "token",
    DocumentOrToken: "documentOrToken",
    StoreContent: "storeContent",
    ExternalAsset: "externalAsset",
    Template: "template",
    Preset: "preset",
    MSTeamsDeepLink: "msteamsdeeplink",
  } as const;

  constructor(
    private readonly _type: string,
    private readonly _content: unknown,
  ) {}

  getType(): string {
    return this._type;
  }

  getContent(): unknown {
    return this._content;
  }
}

/** GContainer.Runtime. */
export const Runtime = {
  Browser: "browser",
  Chrome: "chrome",
  WebWorker: "webworker",
  Phonegap: "phonegap",
  Electron: "electron",
  PWA: "pwa",
  IPad: "ipad",
} as const;

export type RuntimeName = (typeof Runtime)[keyof typeof Runtime];

/** A recent document entry as the menus list it. */
export interface RecentDocument {
  getName(): string | null;
  getExtension(): string | null;
}

export abstract class Container extends EventTarget {
  static readonly OpenFileRequest = OpenFileRequest;
  static readonly Runtime = Runtime;

  /** GContainer.GravitLanguages: every language the engine has a table for. */
  static readonly GravitLanguages: readonly number[] = [...Locale.getAvailableLanguages()];

  protected _recentDocuments: RecentDocument[] | null = null;

  abstract getRuntime(): RuntimeName;

  abstract getStorage(): Storage;

  getRootPath(): string {
    return "";
  }

  /**
   * Registers the font providers of this runtime with the font manager.
   * The interim src/parity/app/fonts.ts still installs them at load
   * (app-fonts-ui moves that here).
   */
  registerFontProviders(): void {}

  getSystemFontsProvider(): unknown {
    return null;
  }

  supportsLocalFonts(): boolean {
    return false;
  }

  /** The stored value (JSON), or null; a promise like the old one. */
  getProperty(key: string): Promise<unknown> {
    return getProperty(key);
  }

  setProperty(key: string, value: unknown): void {
    setProperty(key, value);
  }

  removeProperty(key: string): void {
    removeProperty(key);
  }

  getPropertyKeyByIndex(index: number): string | null {
    return getPropertyKeyByIndex(index);
  }

  getStorageLength(): number {
    return getStorageLength();
  }

  /** Deep links were cloud features (purchase, sign-in, shares); none is handled. */
  handleDeepLinking(): null {
    return null;
  }

  /**
   * GContainer.init: hands itself to the boot function and returns what
   * it returns. The old version also followed the active document for the
   * cloud API token (dropped).
   */
  init<T>(boot: (container: this) => T): T {
    return boot(this);
  }

  /** The file request of the start URL, if any. */
  start(): OpenFileRequest | null {
    return null;
  }

  async preLogin(): Promise<void> {}

  /**
   * Whether the page may unload: no modified and no synchronizing
   * documents. With `async` (the default) the answer comes as a promise.
   */
  canUnload(hasModified: boolean, hasSynchronizing: boolean, async: false): boolean;
  canUnload(hasModified: boolean, hasSynchronizing: boolean, async?: true): Promise<boolean>;
  canUnload(
    hasModified: boolean,
    hasSynchronizing: boolean,
    async = true,
  ): boolean | Promise<boolean> {
    const ok = !hasModified && !hasSynchronizing;
    return async ? Promise.resolve(ok) : ok;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  openExternalLink(_event?: { preventDefault(): void } | null, _url?: string): void {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the old signature
  copyToClipboard(_text: string): Promise<void> {
    return Promise.resolve();
  }

  /**
   * GContainer.initLanguage: reads the stored settings, then calls `done`.
   * The old version first asked the cloud for the user's locale; with the
   * cloud gone it always took the settings branch. The language itself is
   * applied by the locale module (QUESTIONS.md Q-001: the app strings are
   * English only, so a stored language changes nothing in the app).
   */
  initLanguage(done?: () => void): Promise<void> {
    return this.getProperty("designer.settings").then(
      () => {
        if (done) done();
      },
      () => {
        if (done) done();
      },
    );
  }

  newDocumentActionPerformed(done?: () => void): void {
    if (done) done();
  }

  getRecentDocuments(): RecentDocument[] {
    return this._recentDocuments || [];
  }

  /** Keeps the list; the open-recent action builds the menu from it. */
  updateRecentDocumentsAction(documents: RecentDocument[]): void {
    this._recentDocuments = documents;
  }

  triggerClose(): void {}

  isMemoryInfoAvailable(): boolean {
    return false;
  }

  getMemoryInfo(): null {
    return null;
  }

  /** The JS heap limit, or the configured stand-in where the browser doesn't tell. */
  protected _getJsHeapLimitSize(): number {
    const memory = (performance as unknown as { memory?: { jsHeapSizeLimit: number } }).memory;
    return memory ? memory.jsHeapSizeLimit : baseConfig.JS_HEAP_SIZE_LIMIT_POYFILL;
  }

  /**
   * The memory the open documents take. The old expression
   * `e + (t && t.getStorageItem()) ? size : 0` parses as a conditional on
   * the sum, so it gives the last document's size instead of the total
   * (see "Memory estimate counts only the last document" in QUESTIONS.md).
   */
  protected _estimatingMemoryUsage(): number {
    const documents = (designerOrNull()?.getDocuments() ?? []) as unknown as SizedDocument[];
    const size = documents.reduce(
      (sum: number, document) =>
        sum + (document && document.getStorageItem() ? 1 : 0)
          ? (document.getStorageItem() as SizedItem).documentRealFileSize
          : 0,
      0,
    );
    return size * baseConfig.FILE_SIZE_TO_RAM_COEFFCIENT + baseConfig.MIN_JS_HEAP_SIZE;
  }

  /** Warns (message dialog) when saving this document may run out of memory. */
  verifyEnoughMemoryToSave(document: unknown): void {
    try {
      const sized = document as SizedDocument | null;
      const item = sized ? sized.getStorageItem() : null;
      if (!item) return;
      let usage = this._estimatingMemoryUsage();
      usage += item.documentRealFileSize * baseConfig.FILE_SIZE_TO_SAVING_RAM_COEFFCIENT;
      const free = this._getJsHeapLimitSize() - usage;
      if (2 * item.documentRealFileSize > free) {
        const text = Locale.get(new LocaleKey("GContainer", "text.not-memary-enough")) as string;
        const MessageDialog = lateExport<new (text: string) => { open(): void }>(
          "dialogs/message-dialog.ts",
          "MessageDialog",
        );
        if (MessageDialog) new MessageDialog(text).open();
        else systemDialog().alert(text);
      }
    } catch (error) {
      console.error(error);
    }
  }

  minimizeWindow(): void {}

  maximizeWindow(): void {}

  closeWindow(): void {}

  getStorageDestinations(): unknown[] {
    return [];
  }

  override toString(): string {
    return "[Object GContainer]";
  }
}

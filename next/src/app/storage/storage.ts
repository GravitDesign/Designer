// Old: designer.browser.dev.js module 237 (GStorage with GStorage.Directory and GStorage.Item).
/**
 * The storage base classes (FMT-STORAGE-001). A storage opens and saves
 * files somewhere; its items are the files. The only storage the app keeps
 * is the local one (file-system-access.ts); the cloud storages that also
 * derived from these are dropped.
 *
 * The old base reached into the global gDesigner for the settings and the
 * open documents, and opened GMessageDialog (module 219) for its
 * warnings. Boot passes the designer to setStorageHost (StorageHost names
 * the Designer members used) and the dialog to setStorageMessageDialog,
 * as UI.md section 3 describes for structural hosts.
 */
import { System } from "../../engine/core/system.ts";
import type { Scene } from "../../engine/scene/scene.ts";
import {
  documentRealFileSize,
  hasFileShrunk,
  isFileTooSmall,
} from "../../io/gvdesign/save-checks.ts";
import { appString } from "../locale/strings.ts";

/** What the storage needs from a document (GDocument). */
export interface StorageDocument {
  getScene(): Scene;
  getStorageItem(): StorageItem | null;
}

/** The Designer members the storage uses (the old gDesigner). */
export interface StorageHost {
  getSetting(key: string): unknown;
  setSetting(key: string, value: unknown): void;
  getActiveDocument(): StorageDocument | null;
  getDocuments(): readonly StorageDocument[];
}

/** Opens the message dialog with a text: new GMessageDialog(text).open(). */
export type StorageMessageDialog = (text: string) => void;

let host: StorageHost | null = null;
let messageDialog: StorageMessageDialog | null = null;

/** Connects the storage to the designer; boot calls this once the designer exists. */
export function setStorageHost(value: StorageHost | null): void {
  host = value;
}

/** Connects the storage to the message dialog (app-widgets-dialogs). */
export function setStorageMessageDialog(open: StorageMessageDialog | null): void {
  messageDialog = open;
}

function requireHost(): StorageHost {
  if (!host) throw new Error("storage used before setStorageHost");
  return host;
}

function showMessage(text: string): void {
  if (!messageDialog) throw new Error("storage used before setStorageMessageDialog");
  messageDialog(text);
}

/** A file's bytes (or null when there are none yet). */
export type StorageData = Uint8Array | null;

/** Item.read's callbacks: the bytes, a failure, progress. */
export type ReadCallback = (data: StorageData) => void;
export type FailCallback = (error?: unknown) => void;
export type ProgressCallback = (progress: number) => void;

/**
 * The answer of getWritePermission (module 1091, which is otherwise cloud
 * code): authorized or not, with an optional text for the refusal.
 */
export class WritePermission {
  private readonly _status: boolean;
  private readonly _statusText: string | undefined;

  constructor(status = false, statusText?: string) {
    this._status = status;
    this._statusText = statusText;
  }

  isAuthorized(): boolean {
    return !!this._status;
  }

  getStatusText(): string | undefined {
    return this._statusText;
  }

  hasStatusText(): boolean {
    return !!this._statusText;
  }
}

/** GStorage.Directory: a folder files can be written into. */
export class StorageDirectory {
  protected _storage: Storage;

  constructor(storage: Storage) {
    this._storage = storage;
  }

  getStorage(): Storage {
    return this._storage;
  }

  getUniqueId(): string | null {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the subclasses' signature
  async addDirectory(name: string, options?: unknown): Promise<StorageDirectory> {
    throw new Error("Not implemented.");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the subclasses' signature
  async addFile(name: string, options?: unknown): Promise<StorageItem> {
    throw new Error("Not implemented.");
  }
}

/** GStorage.Item: one file of a storage. */
export class StorageItem {
  protected _storage: Storage;
  protected _data: StorageData = null;
  protected _fileFormatVersion: unknown = null;
  protected _fileSizeBeforeSaved = 0;
  protected _fileSizeAfterSaved = 0;
  documentRealFileSize = 0;
  protected _fileLastModifiedDate: unknown = null;
  protected _fileAutoSaveLastModifiedDate: unknown = null;
  protected _isSaveCounterMeasureEnabled = false;

  constructor(storage: Storage) {
    this._storage = storage;
  }

  isRegistrable(): boolean {
    return false;
  }

  release(): void {
    if (this._data) this._data = null;
  }

  getStorage(): Storage {
    return this._storage;
  }

  getUniqueId(): string | null {
    return null;
  }

  getVersionId(): string | null {
    return null;
  }

  getFile(): unknown {
    return null;
  }

  getId(): string | null {
    return null;
  }

  getFullName(): string | null {
    throw new Error("Not implemented.");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the subclasses' signature
  setFileName(name: string): void {
    throw new Error("Not implemented.");
  }

  /** The file name without its extension (after the last dot). */
  getName(): string | null {
    const fullName = this.getFullName();
    if (fullName) {
      const dot = fullName.lastIndexOf(".");
      return dot >= 0 ? fullName.substr(0, dot) : fullName;
    }
    return null;
  }

  /** The extension after the last dot, upper case ("GVDESIGN"), or null. */
  getExtension(): string | null {
    const fullName = this.getFullName();
    if (fullName) {
      const dot = fullName.lastIndexOf(".");
      if (dot >= 0) return fullName.substr(dot + 1).toUpperCase();
    }
    return null;
  }

  async storeFileFormatVersion(version: unknown): Promise<void> {
    this._fileFormatVersion = version;
  }

  getFileFormatVersion(): unknown {
    return this._fileFormatVersion;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the subclasses' signature
  read(done: ReadCallback, fail?: FailCallback, progress?: ProgressCallback): unknown {
    throw new Error("Not implemented.");
  }

  write(
    /* eslint-disable @typescript-eslint/no-unused-vars -- the subclasses' signature */
    data: Uint8Array,
    done?: (() => void) | null,
    fail?: FailCallback | null,
    progress?: ProgressCallback | null,
    document?: StorageDocument | null,
    /* eslint-enable @typescript-eslint/no-unused-vars */
  ): unknown {
    throw new Error("Not implemented.");
  }

  async createOrUpdateFileWithMetadata(): Promise<unknown> {
    throw new Error("Not implemented");
  }

  getToken(): string | null {
    throw new Error("Not implemented");
  }

  supportsShadowFile(): boolean {
    return false;
  }

  isEditingEnabled(): boolean {
    return true;
  }

  supportsSharing(): boolean {
    return false;
  }

  hasVersionControl(): boolean {
    return false;
  }

  supportsExternalSharing(): boolean {
    return false;
  }

  supportsExternalSharingByLink(): boolean {
    return false;
  }

  getPermissionsList(): void {}

  getFileSizeBeforeSaved(): number {
    return this._fileSizeBeforeSaved;
  }

  protected _setFileSizeBeforeSaved(size: number): void {
    this._fileSizeBeforeSaved = size;
  }

  getFileLastModifiedDate(): unknown {
    return this._fileLastModifiedDate;
  }

  setFileLastModifiedDate(date: unknown): void {
    this._fileLastModifiedDate = date;
  }

  getFileAutoSaveLastModifiedDate(): unknown {
    return this._fileAutoSaveLastModifiedDate;
  }

  setFileAutoSaveLastModifiedDate(date: unknown): void {
    this._fileAutoSaveLastModifiedDate = date;
  }

  protected async _setFileSizeAfterSaved(): Promise<void> {
    throw new Error("Not implemented");
  }

  getFileSizeAfterSaved(): number {
    return this._fileSizeAfterSaved;
  }

  isSaveCounterMeasureEnabled(): boolean {
    return this._isSaveCounterMeasureEnabled;
  }

  setSaveCounterMeasureEnabled(enabled: boolean): void {
    this._isSaveCounterMeasureEnabled = enabled;
  }

  /**
   * Before a write: under 200 bytes is reported as a failed save, then the
   * whole scene is serialized and gzipped once more to learn its real size
   * (which stamps the scene's lmd again, like every save serialization).
   * Errors only get logged.
   */
  protected _verifyFileNotTooSmall(byteLength: number, document?: StorageDocument | null): void {
    try {
      if (isFileTooSmall(byteLength, this.isSaveCounterMeasureEnabled())) {
        showMessage(appString("GDocument", "text.saveing-error") as string);
      }
      this.getDocumentRealSizeAfterSave(document);
    } catch (error) {
      console.error(error);
    }
  }

  /** After a write: a file that shrank below half its old size is reported. */
  protected _verifyFileSizeAfterSaved(): void {
    try {
      if (hasFileShrunk(this.getFileSizeBeforeSaved(), this.getFileSizeAfterSaved())) {
        showMessage(appString("GDocument", "text.saveing-error") as string);
      }
    } catch (error) {
      console.error(error);
    }
  }

  notEnoughDiskSpace(): void {
    showMessage(appString("GDocument", "text.save-no-space") as string);
  }

  /**
   * The gzipped size of the document's scene (the active document when
   * none is given). Without any document the old code threw on
   * getScene; that error reaches _verifyFileNotTooSmall's catch, as it
   * did there.
   */
  getDocumentRealSizeAfterSave(document?: StorageDocument | null): number {
    const target = document || requireHost().getActiveDocument();
    if (!target) throw new TypeError("Cannot read properties of null (reading 'getScene')");
    this.documentRealFileSize = documentRealFileSize(target.getScene());
    return this.documentRealFileSize;
  }

  async hasUpdates(): Promise<boolean> {
    throw Error("Not implemented!");
  }
}

/** One entry of the file type list the prompts take (GDocument.FileTypes). */
export interface StorageFileType {
  ext: string;
  mime: string;
}

/** Item callback of openPrompt: the item and how many files were chosen. */
export type OpenCallback = (item: StorageItem, count: number) => void;

export interface OpenPromptOptions {
  /** Use the hidden file input even where showOpenFilePicker exists. */
  disableFileSystemAccessAPI?: boolean;
  /** Prepare the file input without clicking it. */
  silent?: boolean;
}

/** GStorage: what a storage can do; the base can do nothing. */
export class Storage {
  // Typed loosely so each storage can name its own item class with its own constructor.
  static Directory: new (...args: never[]) => StorageDirectory = StorageDirectory;
  static Item: new (...args: never[]) => StorageItem = StorageItem;

  canChooseDirectory(): boolean {
    return false;
  }

  canPromptOpen(): boolean {
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the subclasses' signature
  canPromptSave(fileType?: unknown): boolean {
    return false;
  }

  canSave(): boolean {
    return false;
  }

  canDownload(): boolean {
    return false;
  }

  chooseDirectory(
    /* eslint-disable @typescript-eslint/no-unused-vars -- the subclasses' signature */
    done: (directory: StorageDirectory) => unknown,
    cancel?: (() => void) | null,
    denied?: (() => void) | null,
    /* eslint-enable @typescript-eslint/no-unused-vars */
  ): void {
    throw new Error("Not implemented.");
  }

  openPrompt(
    /* eslint-disable @typescript-eslint/no-unused-vars -- the subclasses' signature */
    fileTypes: readonly StorageFileType[],
    done: OpenCallback,
    multiple?: boolean,
    options?: OpenPromptOptions,
    /* eslint-enable @typescript-eslint/no-unused-vars */
  ): void {
    throw new Error("Not implemented.");
  }

  savePrompt(
    /* eslint-disable @typescript-eslint/no-unused-vars -- the subclasses' signature */
    name: string,
    fileTypes: readonly StorageFileType[],
    done: (item: StorageItem) => unknown,
    cancel?: (() => void) | null,
    /* eslint-enable @typescript-eslint/no-unused-vars */
  ): void {
    throw new Error("Not implemented.");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the subclasses' signature
  download(name: string, done: (item: StorageItem) => unknown): unknown {
    throw new Error("Not implemented.");
  }

  /** Nothing calls this or getLastDirectory; kept with the public API. */
  storeLastDirectory(directory: string): void {
    requireHost().setSetting("lastDirectory", directory);
  }

  /**
   * The "lastDirectory" setting, else the folder of the active (or first)
   * document's item. Local items have no unique id, so that path threw in
   * the old code (null.substring); it does the same here.
   */
  getLastDirectory(): string {
    const app = requireHost();
    const separator = System.operatingSystem === System.OperatingSystem.Windows ? "\\" : "/";
    if (app.getSetting("lastDirectory")) return app.getSetting("lastDirectory") as string;
    const active = app.getActiveDocument();
    if (active && active.getStorageItem()) {
      const id = (active.getStorageItem() as StorageItem).getUniqueId() as string;
      return id.substring(0, id.lastIndexOf(separator));
    }
    for (const document of app.getDocuments()) {
      if (document.getStorageItem()) {
        const id = (document.getStorageItem() as StorageItem).getUniqueId() as string;
        return id.substring(0, id.lastIndexOf(separator));
      }
    }
    return "";
  }

  getPlugins(): unknown[] {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the subclasses' signature
  getPluginPath(plugin: unknown): string | null {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the subclasses' signature
  getPluginSrc(plugin: unknown): string | null {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the subclasses' signature
  async getWritePermission(item?: unknown): Promise<WritePermission> {
    return new WritePermission(true);
  }
}

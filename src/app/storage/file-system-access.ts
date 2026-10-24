// Old: designer.browser.dev.js module 1195 (GBrowserFileStorage). Module 1512 is a
// second, unused copy and is not ported.
/**
 * The local storage (FMT-STORAGE-002 to -008): files the user opens and
 * saves on this computer.
 *
 * - Open: showOpenFilePicker where the File System Access API exists
 *   (not on ChromeOS), else a hidden <input type="file" id="file-input">.
 * - Save: showSaveFilePicker gives a handle that later saves write
 *   through. Without the API the app downloads instead (canSave false).
 * - Items keep the handle but have no unique id, and nothing persists the
 *   handles, so the same file opened twice is two documents and nothing
 *   is remembered across reloads.
 *
 * Directory export (chooseDirectory) uses window.chooseFileSystemEntries,
 * an origin-trial API no browser ships any more, so canChooseDirectory is
 * false everywhere and multi-file exports fall back to a zip. The code is
 * kept as it was.
 */
import { System } from "../../engine/core/system.ts";
import { saveAs } from "./save-as.ts";
import {
  Storage,
  StorageDirectory,
  StorageItem,
  type FailCallback,
  type OpenCallback,
  type OpenPromptOptions,
  type ProgressCallback,
  type ReadCallback,
  type StorageData,
  type StorageDocument,
  type StorageFileType,
} from "./storage.ts";

/** The parts of a file handle the storage uses (some are Chromium-only). */
export interface FileHandleLike {
  readonly name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<WritableLike>;
  queryPermission?(options: { writable: boolean }): Promise<PermissionState>;
  requestPermission?(options: { writable: boolean }): Promise<PermissionState>;
}

/** FileSystemWritableFileStream as the storage uses it. */
export interface WritableLike {
  truncate(size: number): Promise<void>;
  write(data: BlobPart): Promise<void>;
  close(): Promise<void>;
}

/**
 * A directory handle of the old chooseFileSystemEntries API: getDirectory
 * and getFile with { create } instead of today's getDirectoryHandle and
 * getFileHandle.
 */
export interface LegacyDirectoryHandle {
  getDirectory(name: string, options: { create: boolean }): Promise<LegacyDirectoryHandle>;
  getFile(name: string, options: { create: boolean }): Promise<FileHandleLike>;
  queryPermission(options: { writable: boolean }): Promise<PermissionState>;
  requestPermission(options: { writable: boolean }): Promise<PermissionState>;
}

/** The accept map of a picker type: MIME type to one extension or several. */
export type PickerAccept = Record<string, string | string[]>;

export interface PickerType {
  description: string;
  accept: PickerAccept;
}

interface OpenPickerOptions {
  multiple: boolean;
  excludeAcceptAllOption?: boolean;
  types?: PickerType[];
}

interface SavePickerOptions {
  suggestedName?: string;
  excludeAcceptAllOption?: boolean;
  types?: PickerType[];
}

/** The window functions of the File System Access API (not in lib.dom). */
interface FileSystemAccessWindow {
  showOpenFilePicker?: (options: OpenPickerOptions) => Promise<FileHandleLike[] | FileHandleLike>;
  showSaveFilePicker?: (options: SavePickerOptions) => Promise<FileHandleLike>;
  chooseFileSystemEntries?: (options: { type: string }) => Promise<LegacyDirectoryHandle>;
}

function fsaWindow(): FileSystemAccessWindow {
  return window as unknown as FileSystemAccessWindow;
}

/** GRegex.NavigatorUserAgent.IS_CHROME_OS (module 263). */
const IS_CHROME_OS = /CrO[Sſ]/i;

/** chooseDirectory saw a SecurityError once: never offer directories again. */
let directoryAccessDenied = false;
/**
 * Set when showSaveFilePicker failed with a TypeError before a handle was
 * picked. Nothing reads it (the old code kept it for a fallback that was
 * never written).
 */
let savePickerType: string | null = null;
/** The picker type chooseDirectory asks for; "openDirectory" after a TypeError. */
let directoryPickerType: string | null = null;

/** Write access to a handle, asking when it isn't granted yet. */
function ensureWritePermission(handle: {
  queryPermission(options: { writable: boolean }): Promise<PermissionState>;
  requestPermission(options: { writable: boolean }): Promise<PermissionState>;
}): Promise<void> {
  return handle
    .queryPermission({ writable: true })
    .then((state) => ("granted" !== state ? handle.requestPermission({ writable: true }) : state))
    .then((state) => {
      if ("granted" !== state) throw new Error("Cannot get write access");
    });
}

/** GBrowserFileStorage.Directory: a folder picked with chooseDirectory. */
export class BrowserFileDirectory extends StorageDirectory {
  private readonly _dirHandle: LegacyDirectoryHandle;
  protected _id: string | null = null;

  constructor(storage: Storage, dirHandle: LegacyDirectoryHandle) {
    super(storage);
    this._dirHandle = dirHandle;
  }

  override getUniqueId(): string | null {
    return null;
  }

  override async addDirectory(name: string): Promise<StorageDirectory> {
    try {
      const handle = await this._dirHandle.getDirectory(name, { create: true });
      await ensureWritePermission(handle);
      return new BrowserFileDirectory(this._storage, handle);
    } catch {
      throw new Error("Cannot create a directory: " + name);
    }
  }

  override async addFile(name: string): Promise<StorageItem> {
    try {
      const handle = await this._dirHandle.getFile(name, { create: true });
      await ensureWritePermission(
        handle as FileHandleLike &
          Pick<LegacyDirectoryHandle, "queryPermission" | "requestPermission">,
      );
      return new BrowserFileItem(this._storage, null, handle.name, handle);
    } catch {
      throw new Error("Cannot create a file");
    }
  }
}

/** GBrowserFileStorage.Item: a local file, with its handle when it has one. */
export class BrowserFileItem extends StorageItem {
  private _filename: string | null;
  private readonly _fileHandle: FileHandleLike | null;

  constructor(
    storage: Storage,
    data: StorageData,
    filename: string | null,
    fileHandle?: FileHandleLike | null,
  ) {
    super(storage);
    this._data = data;
    this._filename = filename;
    this._fileHandle = fileHandle ?? null;
  }

  /** The handle saves write through (null for an input or download item). */
  getFileHandle(): FileHandleLike | null {
    return this._fileHandle;
  }

  override getFullName(): string | null {
    return this._filename;
  }

  override setFileName(name: string): void {
    this._filename = name;
  }

  /**
   * The bytes: the ones read when the file was opened, else read through
   * the handle once. A failing read never calls back (as before).
   */
  override read(done: ReadCallback): void {
    if (this._data || !this._fileHandle) {
      done(this._data);
      return;
    }
    void this._fileHandle
      .getFile()
      .then((file) => file.arrayBuffer())
      .then((buffer) => {
        this._data = new Uint8Array(buffer);
        done(this._data);
      });
  }

  /**
   * Writes through the handle: truncate to 0, write, close. Running out
   * of disk space shows a message and calls fail (or done without one);
   * any other error, or no handle at all, downloads the bytes instead.
   * An exception thrown by done after a successful write also lands in
   * that catch, so the file is then downloaded too and done runs twice
   * (see "A failing done callback makes a handle write download the file
   * too" in QUESTIONS.md).
   */
  override write(
    data: Uint8Array,
    done?: (() => void) | null,
    fail?: FailCallback | null,
    _progress?: ProgressCallback | null,
    document?: StorageDocument | null,
  ): void {
    this._verifyFileNotTooSmall(data.length, document);
    if (this._fileHandle) {
      let writable: WritableLike | null = null;
      this._fileHandle
        .createWritable()
        .then((stream) => {
          writable = stream;
          return writable.truncate(0);
        })
        .then(() => (writable as WritableLike).write(data as Uint8Array<ArrayBuffer>))
        .then(() => (writable as WritableLike).close())
        .then(() => {
          if (done) done();
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.code === DOMException.QUOTA_EXCEEDED_ERR) {
            this.notEnoughDiskSpace();
            if (fail) fail();
            else if (done) done();
            return;
          }
          saveAs(new Blob([data as Uint8Array<ArrayBuffer>]), this._filename);
          if (done) done();
        });
    } else {
      saveAs(new Blob([data as Uint8Array<ArrayBuffer>]), this._filename);
      if (done) done();
    }
  }
}

/** GBrowserFileStorage: the app's one storage in the browser and the PWA. */
export class BrowserFileStorage extends Storage {
  static override Directory = BrowserFileDirectory;
  static override Item = BrowserFileItem;

  private _fileInput: HTMLInputElement | null = null;
  private _fileInputCallback: OpenCallback | null = null;

  /** showSaveFilePicker exists and this isn't ChromeOS. */
  protected _hasFileAPI(): boolean {
    return "function" == typeof fsaWindow().showSaveFilePicker && !this._isChromeOS();
  }

  protected _isChromeOS(): boolean {
    return IS_CHROME_OS.test(navigator.userAgent || "");
  }

  protected _hasDirectoryWriteAPI(): boolean {
    return "function" == typeof fsaWindow().chooseFileSystemEntries;
  }

  override canChooseDirectory(): boolean {
    return this._hasDirectoryWriteAPI() && !directoryAccessDenied;
  }

  override canPromptOpen(): boolean {
    return true;
  }

  override canPromptSave(): boolean {
    return this._hasFileAPI();
  }

  override canSave(): boolean {
    return this._hasFileAPI();
  }

  override canDownload(): boolean {
    return true;
  }

  /**
   * Lets the user pick a folder and calls done with it. A SecurityError
   * turns directories off for the session and calls denied (or cancel
   * without it); a TypeError before anything was picked switches to the
   * "openDirectory" type for the next try.
   */
  override chooseDirectory(
    done: (directory: StorageDirectory) => unknown,
    cancel?: (() => void) | null,
    denied?: (() => void) | null,
  ): void {
    if (!this._hasFileAPI() || !this.canChooseDirectory()) return;
    const options = { type: directoryPickerType || "open-directory" };
    let handle: LegacyDirectoryHandle | null = null;
    let picked = false;
    const choose = fsaWindow().chooseFileSystemEntries as NonNullable<
      FileSystemAccessWindow["chooseFileSystemEntries"]
    >;
    choose(options)
      .then((h) => {
        handle = h;
        return ensureWritePermission(h);
      })
      .then(() => {
        const result = done(new BrowserFileDirectory(this, handle as LegacyDirectoryHandle));
        picked = true;
        return result;
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && "SecurityError" === error.name) {
          directoryAccessDenied = true;
          if (denied) {
            denied();
            return;
          }
        } else if (!picked && !directoryPickerType && error instanceof TypeError) {
          directoryPickerType = "openDirectory";
        }
        if (cancel) cancel();
      });
  }

  /**
   * Asks for files to open and calls done(item, count) for each. With the
   * API every chosen file is read in parallel and keeps its handle; a
   * cancelled picker is ignored. Otherwise the hidden file input is used:
   * created once (its multiple flag is set only then; see "The file input
   * keeps the multiple flag of its first use" in QUESTIONS.md), the accept list
   * from the file types (none on macOS and iOS), files read one after the
   * other. With silent the input is prepared but not clicked.
   */
  override openPrompt(
    fileTypes: readonly StorageFileType[],
    done: OpenCallback,
    multiple?: boolean,
    options: OpenPromptOptions = {},
  ): void {
    const { disableFileSystemAccessAPI = false, silent = false } = options;
    if (!disableFileSystemAccessAPI && this._hasFileAPI()) {
      const pickerOptions: OpenPickerOptions = { multiple: !!multiple };
      if (fileTypes.length > 0) {
        pickerOptions.excludeAcceptAllOption = true;
        pickerOptions.types = [this._prepareDialogTypes(fileTypes)];
      }
      const show = fsaWindow().showOpenFilePicker as NonNullable<
        FileSystemAccessWindow["showOpenFilePicker"]
      >;
      show(pickerOptions)
        .then((result) => {
          const handles = Array.isArray(result) ? result : [result];
          handles.forEach((handle) => {
            handle
              .getFile()
              .then((file) => file.arrayBuffer())
              .then((buffer) =>
                done(
                  new BrowserFileItem(this, new Uint8Array(buffer), handle.name, handle),
                  handles.length,
                ),
              )
              .catch(() => {
                console.log("ERROR reading file");
              });
          });
        })
        .catch((error: unknown) => {
          if (!(error instanceof DOMException)) console.warn("showOpenFilePicker warning", error);
        });
      this._fileInputCallback = done;
      return;
    }

    const extensions = fileTypes.map((type) => type.ext).flat();
    if (!this._fileInput) {
      const input = document.createElement("input");
      input.setAttribute("type", "file");
      input.setAttribute("id", "file-input");
      input.multiple = !!multiple;
      input.style.opacity = "0";
      input.style.position = "absolute";
      input.style.zIndex = "-1";
      input.style.left = "-9999px";
      input.style.top = "-9999px";
      this._fileInput = input;
      const readFrom = (index: number): void => {
        const files = input.files as FileList;
        const count = files.length;
        if (index >= count) {
          input.value = "";
          return;
        }
        const file = files[index] as File;
        const name = file.name;
        if (file instanceof File || (file as unknown) instanceof Blob) {
          const reader = new FileReader();
          reader.onload = () => {
            (this._fileInputCallback as OpenCallback)(
              new BrowserFileItem(this, new Uint8Array(reader.result as ArrayBuffer), name),
              count,
            );
            readFrom(index + 1);
          };
          reader.readAsArrayBuffer(file);
        } else {
          readFrom(index + 1);
        }
      };
      input.addEventListener("change", () => {
        readFrom(0);
      });
      document.body.appendChild(input);
    }
    const input = this._fileInput;
    if (System.operatingSystem === System.OperatingSystem.OSX_IOS) {
      input.removeAttribute("accept");
    } else if (extensions && extensions.length) {
      input.setAttribute("accept", extensions.map((ext) => "." + ext).join(","));
    } else {
      input.removeAttribute("accept");
    }
    this._fileInputCallback = done;
    input.focus();
    if (!silent) input.click();
  }

  /**
   * Asks where to save `name` and calls done with an item on that handle.
   * Only with the API (without it nothing happens: callers download
   * instead). The suggested name is only passed together with file types
   * (see "Save prompt sends the suggested name only together with file
   * types" in QUESTIONS.md).
   * A failure other than the user's cancel falls back to download(name,
   * done); a cancel calls cancel.
   */
  override savePrompt(
    name: string,
    fileTypes: readonly StorageFileType[],
    done: (item: StorageItem) => unknown,
    cancel?: (() => void) | null,
  ): void {
    if (!this._hasFileAPI()) return;
    const options: SavePickerOptions = {};
    if (fileTypes.length > 0) {
      options.suggestedName = name;
      options.excludeAcceptAllOption = true;
      options.types = [this._prepareDialogTypes(fileTypes, true)];
    }
    let picked = false;
    const show = fsaWindow().showSaveFilePicker as NonNullable<
      FileSystemAccessWindow["showSaveFilePicker"]
    >;
    show(options)
      .then((handle) => {
        picked = true;
        return done(new BrowserFileItem(this, null, handle.name, handle));
      })
      .catch((error: unknown) => {
        if (!picked && !savePickerType && error instanceof TypeError) savePickerType = "saveFile";
        if (!picked && (error as { code?: unknown } | null)?.code !== DOMException.ABORT_ERR) {
          return this.download(name, done);
        }
        if (cancel) cancel();
      });
  }

  /**
   * The picker's types entry: one accept map from MIME type to extension
   * (a list once a MIME type repeats) and a description "*.a, *.b". Saving
   * a JPG uses the MIME type "x-really-an-image/jpeg" (see "Save picker
   * JPG MIME type" in QUESTIONS.md). Types without MIME type or
   * extension are skipped with a warning.
   */
  protected _prepareDialogTypes(
    fileTypes: readonly StorageFileType[],
    forSave = false,
  ): PickerType {
    const accept: PickerAccept = {};
    let description = "";
    for (let i = 0, n = fileTypes.length; i < n; i++) {
      const type = fileTypes[i] as StorageFileType;
      let mime = type.mime;
      const ext = type.ext;
      if (mime && ext) {
        if (forSave && "jpg" === ext) mime = "x-really-an-image/jpeg";
        const dotted = ext.startsWith(".") ? ext : ".".concat(ext);
        const existing = accept[mime];
        if (existing !== undefined) {
          const list = Array.isArray(existing) ? existing : [existing];
          accept[mime] = list;
          list.push(dotted);
        } else {
          accept[mime] = dotted;
        }
        if (description) description += ", ";
        description += "*" + dotted;
      } else {
        console.warn(
          'openPrompt warning: no mime or ext. given mime: "'
            .concat(String(mime), '", given ext: "')
            .concat(String(ext), '"'),
        );
      }
    }
    return { description, accept };
  }

  /** An item without handle: writing it downloads the bytes under `name`. */
  override download(name: string, done: (item: StorageItem) => unknown): unknown {
    return done(new BrowserFileItem(this, null, name));
  }
}

/** Test helper: forget what chooseDirectory and savePrompt learned. */
export function resetBrowserFileStorageState(): void {
  directoryAccessDenied = false;
  savePickerType = null;
  directoryPickerType = null;
}

/** Test helper: the TypeError marker savePrompt keeps (unused by the app). */
export function savePickerFallbackType(): string | null {
  return savePickerType;
}

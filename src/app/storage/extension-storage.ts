// Old: designer.browser.dev.js module 1610.
/**
 * A storage that keeps one file in memory. File > Print renders into an
 * ExtensionStorage.Item("PDF") and reads the bytes back from it.
 */
import { Storage, StorageItem, type StorageData } from "./storage.ts";

export class ExtensionStorageItem extends StorageItem {
  private readonly _extension: string;

  /** Each item gets a storage of its own, as before. */
  constructor(extension: string) {
    super(new ExtensionStorage());
    this._extension = extension;
  }

  /** The extension as given ("PDF"), not derived from a name. */
  override getExtension(): string {
    return this._extension;
  }

  override read(done: (data: StorageData) => void): void {
    done(this._data);
  }

  /** Keeps the bytes; no size checks, unlike the local storage. */
  override write(data: Uint8Array, done?: (() => void) | null): void {
    this._data = data;
    if (done) done();
  }
}

export class ExtensionStorage extends Storage {
  static override Item = ExtensionStorageItem;
}

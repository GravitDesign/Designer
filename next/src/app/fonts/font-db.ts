// Old: designer.browser.dev.js module 1198 (GFontDBClient).
/**
 * The IndexedDB database "gravitFontsDB" (one object store, "gravitFonts")
 * where imported fonts live: every font file under
 * "<family>_<weight>_<style>", and the list of imported fonts under
 * FONT_LIST.
 *
 * The old methods returned jQuery Deferreds; these return Promises with
 * the same values. A request that fails resolves (with false or null)
 * instead of rejecting, as before. The old pushArray, which nothing
 * called, is left out.
 */
const STORE_NAME = "gravitFonts";

type InstanceCallback = (instance: FontDB | null) => void;

/** A stored value and the store it came from (updateItem writes through it). */
export interface StoredItem {
  value: unknown;
  store: IDBObjectStore | undefined;
}

export class FontDB {
  static FONT_LIST = "_gravit_font_list_";
  static NATIVE_FONT_LIST = "_gravit_native_font_list_";
  static NATIVE_FONT_LIST_DATE = "_gravit_native_font_list_date_";
  static NATIVE_FONT_LIST_V = "_gravit_native_font_list_v_";

  private static _instance: FontDB | null = null;
  /** Callers waiting for the database to open. */
  private static _cb: InstanceCallback[] = [];

  private _dataBase: IDBDatabase | null = null;
  private _failedStarting = false;

  constructor() {
    try {
      this._createDB();
    } catch {
      this._failedStarting = true;
      console.log("Cannot createIndexedDB");
      FontDB._removeCallbacks();
    }
  }

  /**
   * The database. With a callback: called with the instance once it is
   * open (now, if it is), or with null when it can't open; returns null
   * while it is opening.
   */
  static getInstance(callback?: InstanceCallback): FontDB | null | undefined {
    const instance = FontDB._instance;
    if (!instance || !instance._dataBase || instance._failedStarting) {
      try {
        if (callback) FontDB._cb.push(callback);
        if (!(FontDB._instance && !FontDB._instance._failedStarting)) {
          FontDB._instance = new FontDB();
        }
        if (callback) return null;
      } catch {
        FontDB._instance = null;
        FontDB._removeCallbacks();
        return undefined;
      }
    }
    if (callback) callback(FontDB._instance);
    return FontDB._instance;
  }

  private static _removeCallbacks(instance?: FontDB | null): void {
    if (FontDB._cb.length) {
      for (const callback of FontDB._cb) callback(instance || null);
      FontDB._cb = [];
    }
  }

  private _createDB(): void {
    if (typeof indexedDB === "undefined" || !indexedDB) {
      FontDB._removeCallbacks();
      return;
    }
    const request = indexedDB.open("gravitFontsDB", 1);
    request.addEventListener("error", () => {
      this._failedStarting = true;
      FontDB._removeCallbacks();
    });
    if ("done" === request.readyState) {
      if (request.error) {
        this._failedStarting = true;
        throw new Error("Failed starting GFontDBClient");
      }
      this._requestSuccess(request);
    } else {
      request.onsuccess = () => this._requestSuccess(request);
      request.onerror = () => {};
    }
    request.onupgradeneeded = () => this._createStore(request);
  }

  private _requestSuccess(request: IDBOpenDBRequest): void {
    if (this._dataBase) {
      FontDB._removeCallbacks(this);
      return;
    }
    this._dataBase = request.result;
    if (this._dataBase) {
      this._dataBase.onerror = () => {};
      // The old code also upgraded through the long-gone setVersion API
      // where a browser still had it.
      FontDB._removeCallbacks(this);
    }
  }

  private _createStore(request: IDBOpenDBRequest): void {
    if (!this._dataBase) this._dataBase = request.result;
    if (this._dataBase) this._dataBase.createObjectStore(STORE_NAME);
  }

  ready(): boolean {
    return !!this._dataBase;
  }

  /** Empties the store; true when it worked (or there is no database). */
  clear(): Promise<boolean> {
    return this._write((store) => store.clear(), true);
  }

  deleteItem(key: string): Promise<boolean> {
    return this._write((store) => store.delete(key), true);
  }

  setItem(key: string, value: unknown): Promise<boolean> {
    return this._write((store) => store.put(value, key), false);
  }

  /**
   * One write in a readwrite transaction. Without a database the old
   * code resolved with `noDatabase` and then failed on the transaction.
   */
  private _write(
    run: (store: IDBObjectStore) => IDBRequest,
    noDatabase: boolean,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this._dataBase) resolve(noDatabase);
      try {
        const transaction = (this._dataBase as IDBDatabase).transaction([STORE_NAME], "readwrite");
        try {
          const request = run(transaction.objectStore(STORE_NAME));
          request.onsuccess = () => resolve(true);
          request.onerror = () => resolve(false);
        } catch {
          resolve(false);
        }
      } catch {
        resolve(false);
      }
    });
  }

  /** Writes `value` under `key` through the store a getItem returned. */
  updateItem(key: string, value: unknown): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this._dataBase) resolve(false);
      void this.getItem(key).then(({ store }) => {
        try {
          const request = (store as IDBObjectStore).put(value, key);
          request.onsuccess = () => resolve(true);
          request.onerror = () => resolve(false);
        } catch {
          resolve(false);
        }
      });
    });
  }

  /** The value under `key` (undefined when there is none, null on errors). */
  getItem(key: string): Promise<StoredItem> {
    return new Promise((resolve) => {
      let store: IDBObjectStore | undefined;
      try {
        if (!this._dataBase) resolve({ value: null, store: undefined });
        store = (this._dataBase as IDBDatabase)
          .transaction([STORE_NAME], "readwrite")
          .objectStore(STORE_NAME);
        const opened = store;
        const request = opened.get(key);
        request.onsuccess = () => resolve({ value: request.result as unknown, store: opened });
        request.onerror = () => resolve({ value: null, store: opened });
      } catch {
        resolve({ value: null, store });
      }
    });
  }
}

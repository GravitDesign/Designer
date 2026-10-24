import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FontDB } from "./font-db.ts";

/** A request that answers on a later task, as IndexedDB does. */
class FakeRequest {
  readyState = "pending";
  result: unknown = undefined;
  error: unknown = null;
  onsuccess: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onupgradeneeded: (() => void) | null = null;
  private readonly _errorListeners: (() => void)[] = [];
  addEventListener(type: string, listener: () => void): void {
    if (type === "error") this._errorListeners.push(listener);
  }
  succeed(result: unknown): void {
    this.readyState = "done";
    this.result = result;
    if (this.onsuccess) this.onsuccess();
  }
  fail(): void {
    this.readyState = "done";
    this.error = new Error("failed");
    for (const listener of this._errorListeners) listener();
    if (this.onerror) this.onerror();
  }
}

const later = (run: () => void) => setTimeout(run, 0);
const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

class FakeStore {
  readonly writes: string[] = [];
  constructor(
    readonly name: string,
    readonly data: Map<string, unknown>,
  ) {}
  private _answer(run: () => unknown): FakeRequest {
    const request = new FakeRequest();
    later(() => request.succeed(run()));
    return request;
  }
  get(key: string): FakeRequest {
    return this._answer(() => this.data.get(key));
  }
  put(value: unknown, key: string): FakeRequest {
    this.writes.push("put " + key);
    return this._answer(() => this.data.set(key, value));
  }
  delete(key: string): FakeRequest {
    this.writes.push("delete " + key);
    return this._answer(() => this.data.delete(key));
  }
  clear(): FakeRequest {
    this.writes.push("clear");
    return this._answer(() => this.data.clear());
  }
}

class FakeDatabase {
  readonly stores = new Map<string, Map<string, unknown>>();
  /** Every store object handed out, in order. */
  readonly opened: FakeStore[] = [];
  readonly transactions: string[] = [];
  onerror: unknown = null;
  createObjectStore(name: string): void {
    this.stores.set(name, new Map());
  }
  transaction(names: string[], mode: string) {
    this.transactions.push(names.join(",") + " " + mode);
    return {
      objectStore: (name: string) => {
        const data = this.stores.get(name);
        if (!data) throw new Error("no store " + name);
        const store = new FakeStore(name, data);
        this.opened.push(store);
        return store;
      },
    };
  }
}

interface FakeIndexedDB {
  opens: string[];
  database: FakeDatabase;
  failOpen: boolean;
  open(name: string, version: number): FakeRequest;
}

function installIndexedDB(): FakeIndexedDB {
  const fake: FakeIndexedDB = {
    opens: [],
    database: new FakeDatabase(),
    failOpen: false,
    open(name, version) {
      this.opens.push(name + "@" + version);
      const request = new FakeRequest();
      later(() => {
        if (this.failOpen) {
          request.fail();
          return;
        }
        request.result = this.database;
        if (!this.database.stores.size && request.onupgradeneeded) request.onupgradeneeded();
        request.succeed(this.database);
      });
      return request;
    },
  };
  (globalThis as Record<string, unknown>).indexedDB = fake;
  return fake;
}

function resetFontDB(): void {
  const statics = FontDB as unknown as { _instance: FontDB | null; _cb: unknown[] };
  statics._instance = null;
  statics._cb = [];
}

let idb: FakeIndexedDB;

beforeEach(() => {
  resetFontDB();
  idb = installIndexedDB();
});

afterEach(() => {
  delete (globalThis as Record<string, unknown>).indexedDB;
  resetFontDB();
});

function open(): Promise<FontDB | null> {
  return new Promise((resolve) => FontDB.getInstance(resolve));
}

describe("FontDB", () => {
  it("opens the database once and calls every waiting callback", async () => {
    const got: (FontDB | null)[] = [];
    expect(FontDB.getInstance((db) => got.push(db))).toBeNull();
    expect(FontDB.getInstance((db) => got.push(db))).toBeNull();
    expect(idb.opens).toEqual(["gravitFontsDB@1"]);
    await tick();
    expect(got).toHaveLength(2);
    expect(got[0]).toBe(got[1]);
    expect(got[0]?.ready()).toBe(true);
    // Created the store on the first open.
    expect([...idb.database.stores.keys()]).toEqual(["gravitFonts"]);
    // Once open, the callback runs right away and the instance comes back.
    const now: (FontDB | null)[] = [];
    expect(FontDB.getInstance((db) => now.push(db))).toBe(got[0]);
    expect(now).toEqual([got[0]]);
    expect(idb.opens).toHaveLength(1);
  });

  it("calls the waiting callbacks with null when the database can't open", async () => {
    idb.failOpen = true;
    const got: (FontDB | null)[] = [];
    FontDB.getInstance((db) => got.push(db));
    await tick();
    expect(got).toEqual([null]);
    // The next call starts over with a new open.
    idb.failOpen = false;
    const db = await open();
    expect(db?.ready()).toBe(true);
    expect(idb.opens).toHaveLength(2);
  });

  it("calls back with null without IndexedDB", () => {
    delete (globalThis as Record<string, unknown>).indexedDB;
    const got: (FontDB | null)[] = [];
    FontDB.getInstance((db) => got.push(db));
    expect(got).toEqual([null]);
  });

  it("stores, reads, deletes and clears values", async () => {
    const db = (await open()) as FontDB;
    expect(await db.setItem("Fam_400_N", "file")).toBe(true);
    expect(await db.getItem("Fam_400_N")).toMatchObject({ value: "file" });
    expect((await db.getItem("Nothing")).value).toBeUndefined();
    expect(await db.deleteItem("Fam_400_N")).toBe(true);
    expect((await db.getItem("Fam_400_N")).value).toBeUndefined();
    await db.setItem("a", 1);
    await db.setItem(FontDB.FONT_LIST, []);
    expect(await db.clear()).toBe(true);
    expect([...(idb.database.stores.get("gravitFonts") as Map<string, unknown>).keys()]).toEqual(
      [],
    );
    // Every request runs in a readwrite transaction on the one store.
    expect(new Set(idb.database.transactions)).toEqual(new Set(["gravitFonts readwrite"]));
  });

  it("updates through the store its getItem opened", async () => {
    const db = (await open()) as FontDB;
    await db.setItem(FontDB.FONT_LIST, [{ family: "Old" }]);
    const before = idb.database.opened.length;
    expect(await db.updateItem(FontDB.FONT_LIST, [{ family: "New" }])).toBe(true);
    const used = idb.database.opened.slice(before);
    // One store: the read and the write share it.
    expect(used).toHaveLength(1);
    expect(used[0]?.writes).toEqual(["put " + FontDB.FONT_LIST]);
    expect((await db.getItem(FontDB.FONT_LIST)).value).toEqual([{ family: "New" }]);
  });

  it("answers false or null when a request throws", async () => {
    const db = (await open()) as FontDB;
    idb.database.stores.clear();
    expect(await db.setItem("a", 1)).toBe(false);
    expect(await db.deleteItem("a")).toBe(false);
    expect(await db.getItem("a")).toEqual({ value: null, store: undefined });
    expect(await db.updateItem("a", 1)).toBe(false);
  });
});

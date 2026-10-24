// Old: chunk.vendor.js module 227 (GDictionary).
import { EventTarget } from "../core/event-target.ts";
import { GObject, registerClass } from "../core/object.ts";
import { uuid } from "../core/util.ts";

/** An entry as saved in a document. */
export interface DictionaryEntryBlob {
  uuid: string | null;
  value: unknown;
  references: number;
}

/** What `serialize` returns and `deserialize` takes. */
export interface DictionaryBlob {
  entries: DictionaryEntryBlob[];
}

/** A value with a uuid and a reference count. */
export class DictionaryEntry extends GObject {
  static {
    registerClass(this, "GDictionary.Entry");
  }

  declare uuid: string | null;
  declare value: unknown;
  declare references: number;
  /** Set by the scene dictionary for image entries. */
  declare cachedCanvas: unknown;

  constructor(value?: unknown, id?: string | null, references?: number) {
    super();
    this.value = value;
    this.uuid = id || uuid();
    this.references = references || 1;
  }

  /** "dictionary://<uuid>", the url patterns store instead of the value. */
  getUrl(): string {
    return Dictionary.PROTOCOL + "://" + String(this.uuid);
  }

  hasReferences(): boolean {
    return this.references > 0;
  }

  serialize(): DictionaryEntryBlob {
    return {
      uuid: this.uuid,
      value: this.value,
      references: this.references,
    };
  }

  deserialize(blob: DictionaryEntryBlob): void {
    this.uuid = blob.uuid;
    this.value = blob.value;
    this.references = blob.references;
  }
}
DictionaryEntry.prototype.uuid = null;
DictionaryEntry.prototype.value = null;
DictionaryEntry.prototype.references = 0;
DictionaryEntry.prototype.cachedCanvas = null;

export type DictionaryEntryClass = new (
  value?: unknown,
  id?: string | null,
  references?: number,
) => DictionaryEntry;

/**
 * Values (image data urls, mostly) that patterns refer to by a
 * "dictionary://<uuid>" url, so a document stores each image once. Entries
 * count their references; `putValueIfAbsent` reuses an entry with the same
 * value.
 */
export class Dictionary extends EventTarget {
  static {
    registerClass(this, "GDictionary");
  }

  declare static Entry: typeof DictionaryEntry;

  static PROTOCOL = "dictionary";
  static CLOUD_PROTOCOL = "cloud";

  static isDictionary(value: unknown): value is string {
    const prefix = Dictionary.PROTOCOL + "://";
    return "string" == typeof value && value.substr(0, prefix.length) === prefix;
  }

  /** The class `putValueIfAbsent` and `deserialize` create entries with. */
  EntryClass: DictionaryEntryClass;
  /** Entries by uuid, in insertion order. */
  _map: Record<string, DictionaryEntry>;

  constructor() {
    super();
    this.EntryClass = DictionaryEntry;
    this._map = {};
  }

  /**
   * Copies the values of `other` into the entries with the same uuid and
   * returns a dictionary with copies of those entries as they were before.
   */
  merge(other: Dictionary): Dictionary {
    const previous = new Dictionary();
    previous.EntryClass = this.EntryClass;
    other.getEntries().forEach((otherEntry) => {
      const entry = this.getEntry(otherEntry.uuid);
      if (entry) {
        const copy = new this.EntryClass();
        copy.deserialize(entry.serialize());
        previous.addEntry(copy);
        entry.value = otherEntry.value;
      }
    });
    return previous;
  }

  getEntries(): DictionaryEntry[] {
    return Object.keys(this._map)
      .map((key) => this._map[key] as DictionaryEntry)
      .slice();
  }

  addEntry(entry: DictionaryEntry): boolean {
    if (String(entry.uuid) in this._map) {
      console.warn("Duplicated entry");
      return false;
    }
    this._map[String(entry.uuid)] = entry;
    return true;
  }

  /**
   * Drops one reference of the entry (an entry or its url or uuid); with
   * `remove` the entry goes once it has no references left.
   */
  removeEntry(entryOrKey: DictionaryEntry | string | null | undefined, remove?: boolean): void {
    let entry: DictionaryEntry | undefined;
    if (entryOrKey instanceof DictionaryEntry) entry = entryOrKey;
    else if (entryOrKey) entry = this.getEntry(entryOrKey);
    if (entry) {
      if (entry.references > 0) entry.references--;
      if (!entry.hasReferences() && remove) Reflect.deleteProperty(this._map, String(entry.uuid));
    }
  }

  /** The entry for a uuid or a "dictionary://" url. */
  getEntry(key: string | null | undefined): DictionaryEntry | undefined {
    if (Dictionary.isDictionary(key)) key = key.substring((Dictionary.PROTOCOL + "://").length);
    return this._map[String(key)];
  }

  getValue(key: string | null | undefined): unknown {
    const entry = this.getEntry(key);
    return entry ? entry.value : null;
  }

  /**
   * The entry holding `value` with one more reference, or a new entry for
   * it. Values are compared with `==`, as in the old code.
   */
  putValueIfAbsent(value: unknown): DictionaryEntry | null {
    if (!value) return null;
    let found: DictionaryEntry | null = null;
    this.getEntries().some((entry) => {
      if (entry.value == value) {
        found = entry;
        return true;
      }
      return false;
    });
    if (found) {
      (found as DictionaryEntry).references++;
      return found;
    }
    const entry = new this.EntryClass(value);
    if (!this.addEntry(entry)) return null;
    return entry;
  }

  serialize(): DictionaryBlob {
    this.sanitize();
    this.flush();
    return {
      entries: this.getEntries().map((entry) => entry.serialize()),
    };
  }

  deserialize(blob: DictionaryBlob | null | undefined): void {
    this._map = {};
    if (blob) {
      for (let i = 0; i < blob.entries.length; i++) {
        const entry = new this.EntryClass();
        entry.deserialize(blob.entries[i] as DictionaryEntryBlob);
        this.addEntry(entry);
      }
    }
  }

  /** Hooks for the scene dictionary. */
  release(): void {}

  flush(): void {}

  sanitize(): void {}

  override toString(): string {
    return "[GDictionary]";
  }
}
Dictionary.Entry = DictionaryEntry;

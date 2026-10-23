// Old: chunk.vendor.js module 1137 (ns/nsarchiver).
import { base64ToBytes } from "./base64-bytes.ts";
import { BPlistParser, type PlistValue } from "./bplist-parser.ts";

/** A keyed archive's object table ($objects) and root ($top.root). */
interface KeyedArchive {
  $top: { root: number };
  $objects: PlistValue[];
}

/** An archived NSDictionary: keys and values as object references. */
export interface ArchivedMap {
  "NS.keys": number[];
  "NS.objects": number[];
}

/** Reads NSKeyedArchiver archives (Sketch 49's attributed strings and text styles). */
export class NSArchiver {
  /**
   * An archive from base64 (only when its length is a multiple of 4) or
   * from bytes; anything else gives null. A broken plist throws.
   */
  static from(source: unknown): NSArchiver | null {
    if ("string" == typeof source && source.length % 4 == 0)
      return NSArchiver.from(base64ToBytes(source));
    if (ArrayBuffer.isView(source))
      return new NSArchiver(new BPlistParser().parse(source) as unknown as KeyedArchive);
    return null;
  }

  /** The numbers in an archived string of floats ("0.1 0.2 0.3 1"), each times 255. */
  static toByte(data: DataView): number[] {
    return String.fromCharCode
      .apply(
        null,
        Array.from(
          new Uint8Array(data.buffer).slice(data.byteOffset, data.byteOffset + data.byteLength),
        ),
      )
      .split(" ")
      .map((part) => 255 * parseFloat(part));
  }

  declare _bplist: KeyedArchive | null;

  constructor(bplist: KeyedArchive) {
    this._bplist = bplist;
  }

  top(): unknown {
    return this.getByRef((this._bplist as KeyedArchive).$top.root);
  }

  getByRef(ref: unknown): unknown {
    return (this._bplist as KeyedArchive).$objects[ref as number];
  }

  /** An archived dictionary as a plain object. */
  toMap(map: unknown): Record<string, unknown> {
    const archived = map as ArchivedMap;
    const keys = archived["NS.keys"].map((ref) => this.getByRef(ref));
    const values = archived["NS.objects"].map((ref) => this.getByRef(ref));
    const out: Record<string, unknown> = {};
    for (let i = 0; i < keys.length; i++) out[keys[i] as string] = values[i];
    return out;
  }
}

NSArchiver.prototype._bplist = null;

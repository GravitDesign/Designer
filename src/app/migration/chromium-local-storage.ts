/**
 * Chromium's localStorage database ("Local Storage/leveldb" in a
 * profile), decoded from its LevelDB entries:
 *
 * - "VERSION": the schema version ("1").
 * - "META:<origin>": a protobuf with the last write time (field 1,
 *   microseconds since 1601-01-01 UTC) and the size (field 2).
 * - "METAACCESS:<origin>": a protobuf with the last access time (field 1).
 * - "_<origin>\0<key>": one item. Keys and values start with a format
 *   byte: 0 for UTF-16LE, 1 for Latin-1.
 *
 * Origins are serialized without a trailing slash
 * ("http://127.0.0.1:47823").
 */
import type { LevelDbEntry } from "./leveldb.ts";

export interface StoredOrigin {
  origin: string;
  /** Last write, in ms since the Unix epoch (null without a META entry). */
  lastModified: number | null;
  /** Last access, in ms since the Unix epoch (null without a METAACCESS entry). */
  lastAccessed: number | null;
  /** The items, in key order. */
  items: Record<string, string>;
}

/** Microseconds between 1601-01-01 and 1970-01-01 (Windows FILETIME epoch). */
const WINDOWS_EPOCH_OFFSET_US = 11644473600000000;

function latin1(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return s;
}

/** A key or value in Chromium's format (format byte, then the text). */
export function decodeStorageString(bytes: Uint8Array): string | null {
  if (bytes.length === 0) return null;
  const format = bytes[0] as number;
  const body = bytes.subarray(1);
  if (format === 1) return latin1(body);
  if (format === 0) {
    if (body.length % 2 !== 0) return null;
    let s = "";
    for (let i = 0; i < body.length; i += 2) {
      s += String.fromCharCode((body[i] as number) | ((body[i + 1] as number) << 8));
    }
    return s;
  }
  return null;
}

/** Field 1 (a varint) of a META / METAACCESS protobuf, as Unix ms. */
function protoTime(bytes: Uint8Array): number | null {
  let pos = 0;
  while (pos < bytes.length) {
    const tag = bytes[pos++] as number;
    const wire = tag & 7;
    if (wire !== 0) return null; // only varint fields are expected
    let value = 0;
    for (let shift = 0; ; shift += 7) {
      if (pos >= bytes.length || shift > 63) return null;
      const byte = bytes[pos++] as number;
      value += (byte & 0x7f) * 2 ** shift;
      if (byte < 0x80) break;
    }
    if (tag >>> 3 === 1) return Math.floor((value - WINDOWS_EPOCH_OFFSET_US) / 1000);
  }
  return null;
}

/** Every origin with items or metadata, in origin order. */
export function decodeLocalStorage(entries: readonly LevelDbEntry[]): StoredOrigin[] {
  const origins = new Map<string, StoredOrigin>();
  const get = (origin: string): StoredOrigin => {
    let o = origins.get(origin);
    if (!o) {
      o = { origin, lastModified: null, lastAccessed: null, items: {} };
      origins.set(origin, o);
    }
    return o;
  };
  for (const { key, value } of entries) {
    const k = latin1(key);
    if (k.startsWith("META:")) {
      get(k.slice(5)).lastModified = protoTime(value);
    } else if (k.startsWith("METAACCESS:")) {
      get(k.slice(11)).lastAccessed = protoTime(value);
    } else if (k.startsWith("_")) {
      const nul = key.indexOf(0);
      if (nul < 0) continue;
      const name = decodeStorageString(key.subarray(nul + 1));
      const text = decodeStorageString(value);
      if (name === null || text === null) continue;
      get(latin1(key.subarray(1, nul))).items[name] = text;
    }
  }
  return [...origins.values()].sort((a, b) => (a.origin < b.origin ? -1 : 1));
}

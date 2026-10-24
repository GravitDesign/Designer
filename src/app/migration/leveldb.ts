/**
 * A read-only LevelDB reader, enough to read what Chromium keeps in a
 * profile's "Local Storage/leveldb" folder without opening it through
 * Chromium: the write-ahead logs (*.log) and the sorted tables (*.ldb,
 * *.sst), merged by sequence number so the newest write of each key wins
 * and deleted keys are gone.
 *
 * Formats (LevelDB 1.x, as Chromium bundles it):
 * - log: 32 KiB blocks of records (crc32 4, length 2, type 1, data); a
 *   record holds a WriteBatch (sequence 8, count 4, then per entry a tag
 *   byte, the key and for puts the value, each with a varint32 length).
 * - table: data blocks of prefix-compressed entries, an index block that
 *   points at them and a 48-byte footer; blocks may be Snappy compressed.
 *
 * Checksums are not verified: a damaged record ends that file's reading
 * (log) or skips the block (table), and the rest still counts.
 */
import { snappyDecompress } from "./snappy.ts";

export interface LevelDbFile {
  name: string;
  bytes: Uint8Array;
}

/** A live key and its value, both raw bytes. */
export interface LevelDbEntry {
  key: Uint8Array;
  value: Uint8Array;
}

const TYPE_DELETION = 0;
const TYPE_VALUE = 1;
const LOG_BLOCK = 32768;
const LOG_HEADER = 7;
const TABLE_MAGIC_LO = 0x8b80fb57;
const TABLE_MAGIC_HI = 0xdb477524;

interface Versioned {
  key: Uint8Array;
  sequence: number;
  type: number;
  value: Uint8Array;
}

class Reader {
  readonly bytes: Uint8Array;
  readonly end: number;
  pos: number;
  constructor(bytes: Uint8Array, start = 0, end = bytes.length) {
    this.bytes = bytes;
    this.end = end;
    this.pos = start;
  }

  varint(): number {
    let result = 0;
    for (let shift = 0; shift <= 63; shift += 7) {
      if (this.pos >= this.end) throw new Error("leveldb: truncated varint");
      const byte = this.bytes[this.pos++] as number;
      result += (byte & 0x7f) * 2 ** shift;
      if (byte < 0x80) return result;
    }
    throw new Error("leveldb: bad varint");
  }

  take(length: number): Uint8Array {
    if (this.pos + length > this.end) throw new Error("leveldb: truncated data");
    const out = this.bytes.subarray(this.pos, this.pos + length);
    this.pos += length;
    return out;
  }

  /** A little-endian integer of `length` bytes (up to 8, as a double). */
  fixed(length: number): number {
    const part = this.take(length);
    let result = 0;
    for (let i = length - 1; i >= 0; i--) result = result * 256 + (part[i] as number);
    return result;
  }

  lengthPrefixed(): Uint8Array {
    return this.take(this.varint());
  }
}

/** The records of one log file, joined from their fragments. */
function logRecords(bytes: Uint8Array): Uint8Array[] {
  const records: Uint8Array[] = [];
  let fragments: Uint8Array[] = [];
  let pos = 0;
  while (pos + LOG_HEADER <= bytes.length) {
    const left = LOG_BLOCK - (pos % LOG_BLOCK);
    if (left < LOG_HEADER) {
      pos += left; // block trailer
      continue;
    }
    const length = (bytes[pos + 4] as number) | ((bytes[pos + 5] as number) << 8);
    const type = bytes[pos + 6] as number;
    const start = pos + LOG_HEADER;
    if (type === 0 && length === 0) {
      // Preallocated zeros: the rest of the block is empty.
      pos += left;
      continue;
    }
    if (start + length > bytes.length || length > left - LOG_HEADER) break;
    const data = bytes.subarray(start, start + length);
    pos = start + length;
    if (type === 1) {
      records.push(data);
      fragments = [];
    } else if (type === 2) fragments = [data];
    else if (type === 3) fragments.push(data);
    else if (type === 4) {
      fragments.push(data);
      const total = fragments.reduce((n, f) => n + f.length, 0);
      const joined = new Uint8Array(total);
      let o = 0;
      for (const f of fragments) {
        joined.set(f, o);
        o += f.length;
      }
      records.push(joined);
      fragments = [];
    } else break;
  }
  return records;
}

function readLog(bytes: Uint8Array, out: Versioned[]): void {
  for (const record of logRecords(bytes)) {
    try {
      const r = new Reader(record);
      const sequence = r.fixed(8);
      const count = r.fixed(4);
      for (let i = 0; i < count; i++) {
        const type = r.take(1)[0] as number;
        const key = r.lengthPrefixed();
        if (type === TYPE_VALUE) {
          out.push({ key, sequence: sequence + i, type, value: r.lengthPrefixed() });
        } else if (type === TYPE_DELETION) {
          out.push({ key, sequence: sequence + i, type, value: new Uint8Array(0) });
        } else break;
      }
    } catch {
      // A damaged batch: skip it.
    }
  }
}

/** The contents of the block a handle points at, decompressed. */
function readBlock(table: Uint8Array, offset: number, size: number): Uint8Array {
  if (offset + size + 5 > table.length) throw new Error("leveldb: block outside the table");
  const raw = table.subarray(offset, offset + size);
  const compression = table[offset + size] as number;
  if (compression === 0) return raw;
  if (compression === 1) return snappyDecompress(raw);
  throw new Error(`leveldb: unknown block compression ${compression}`);
}

/** Every key/value of a block, prefix compression undone. */
function blockEntries(block: Uint8Array): { key: Uint8Array; value: Uint8Array }[] {
  if (block.length < 4) return [];
  const view = new DataView(block.buffer, block.byteOffset, block.byteLength);
  const restarts = view.getUint32(block.length - 4, true);
  const end = block.length - 4 - restarts * 4;
  if (end < 0) throw new Error("leveldb: bad restart array");
  const r = new Reader(block, 0, end);
  const entries: { key: Uint8Array; value: Uint8Array }[] = [];
  let previous = new Uint8Array(0);
  while (r.pos < end) {
    const shared = r.varint();
    const unshared = r.varint();
    const valueLength = r.varint();
    if (shared > previous.length) throw new Error("leveldb: bad shared prefix");
    const key = new Uint8Array(shared + unshared);
    key.set(previous.subarray(0, shared), 0);
    key.set(r.take(unshared), shared);
    entries.push({ key, value: r.take(valueLength) });
    previous = key;
  }
  return entries;
}

function readTable(table: Uint8Array, out: Versioned[]): void {
  if (table.length < 48) return;
  const footer = new Reader(table, table.length - 48);
  footer.varint(); // metaindex offset
  footer.varint(); // metaindex size
  const indexOffset = footer.varint();
  const indexSize = footer.varint();
  const magic = new DataView(table.buffer, table.byteOffset + table.length - 8, 8);
  if (magic.getUint32(0, true) !== TABLE_MAGIC_LO || magic.getUint32(4, true) !== TABLE_MAGIC_HI) {
    throw new Error("leveldb: not a table");
  }
  for (const handle of blockEntries(readBlock(table, indexOffset, indexSize))) {
    try {
      const h = new Reader(handle.value);
      const block = readBlock(table, h.varint(), h.varint());
      for (const entry of blockEntries(block)) {
        const k = entry.key;
        if (k.length < 8) continue;
        // Internal key: user key, then (sequence << 8 | type) as 8 bytes LE.
        const tail = new Reader(k, k.length - 8);
        const type = tail.take(1)[0] as number;
        const sequence = tail.fixed(7);
        out.push({ key: k.subarray(0, k.length - 8), sequence, type, value: entry.value });
      }
    } catch {
      // A damaged data block: skip it.
    }
  }
}

function keyId(key: Uint8Array): string {
  let s = "";
  for (const b of key) s += String.fromCharCode(b);
  return s;
}

/**
 * The live entries of a LevelDB folder's files (pass every file; files
 * that are neither logs nor tables are ignored), sorted by key bytes.
 */
export function readLevelDb(files: readonly LevelDbFile[]): LevelDbEntry[] {
  const all: Versioned[] = [];
  for (const file of files) {
    try {
      if (/\.log$/i.test(file.name)) readLog(file.bytes, all);
      else if (/\.(ldb|sst)$/i.test(file.name)) readTable(file.bytes, all);
    } catch {
      // An unreadable file: the others still count.
    }
  }
  const newest = new Map<string, Versioned>();
  for (const entry of all) {
    const id = keyId(entry.key);
    const known = newest.get(id);
    if (!known || entry.sequence > known.sequence) newest.set(id, entry);
  }
  return [...newest.entries()]
    .filter(([, e]) => e.type === TYPE_VALUE)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, e]) => ({ key: e.key, value: e.value }));
}

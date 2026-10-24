import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { decodeLocalStorage } from "./chromium-local-storage.ts";
import { readLevelDb, type LevelDbFile } from "./leveldb.ts";

const FIXTURES = path.join(import.meta.dirname, "fixtures");

function folder(dir: string): LevelDbFile[] {
  return fs
    .readdirSync(dir)
    .map((name) => ({ name, bytes: new Uint8Array(fs.readFileSync(path.join(dir, name))) }));
}

const latin1 = (bytes: Uint8Array): string => String.fromCharCode(...bytes);
const ascii = (s: string): number[] => [...s].map((c) => c.charCodeAt(0));

function varint(n: number): number[] {
  const out: number[] = [];
  while (n >= 0x80) {
    out.push((n & 0x7f) | 0x80);
    n = Math.floor(n / 128);
  }
  out.push(n);
  return out;
}

/** A WriteBatch: sequence, count, then puts ([key, value]) and deletes ([key]). */
function batch(sequence: number, ops: ([string, string] | [string])[]): number[] {
  const out = [...le(sequence, 8), ...le(ops.length, 4)];
  for (const op of ops) {
    const [key, value] = op;
    out.push(value === undefined ? 0 : 1, ...varint(key.length), ...ascii(key));
    if (value !== undefined) out.push(...varint(value.length), ...ascii(value));
  }
  return out;
}

function le(n: number, bytes: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < bytes; i++) {
    out.push(n % 256);
    n = Math.floor(n / 256);
  }
  return out;
}

/** A log file holding `records`, each split into FULL/FIRST/MIDDLE/LAST fragments at block ends. */
function logFile(records: number[][]): Uint8Array {
  const out: number[] = [];
  const BLOCK = 32768;
  for (const record of records) {
    let pos = 0;
    let first = true;
    do {
      let left = BLOCK - (out.length % BLOCK);
      if (left < 7) {
        out.push(...new Array<number>(left).fill(0));
        left = BLOCK;
      }
      const room = left - 7;
      const chunk = record.slice(pos, pos + room);
      pos += chunk.length;
      const last = pos >= record.length;
      const type = first && last ? 1 : first ? 2 : last ? 4 : 3;
      out.push(0, 0, 0, 0, chunk.length & 0xff, chunk.length >> 8, type, ...chunk);
      first = false;
    } while (pos < record.length);
  }
  return Uint8Array.from(out);
}

describe("readLevelDb", () => {
  it("applies the log's writes in sequence order, deletes included", () => {
    const log = logFile([
      batch(1, [
        ["a", "1"],
        ["b", "2"],
      ]),
      batch(3, [["a", "3"], ["b"]]),
      batch(5, [["c", "4"]]),
    ]);
    const entries = readLevelDb([{ name: "000003.log", bytes: log }]);
    expect(entries.map((e) => [latin1(e.key), latin1(e.value)])).toEqual([
      ["a", "3"],
      ["c", "4"],
    ]);
  });

  it("joins a record that spans several blocks", () => {
    const big = "x".repeat(70_000);
    const log = logFile([batch(1, [["small", "s"]]), batch(2, [["big", big]])]);
    expect(log.length).toBeGreaterThan(2 * 32768);
    const entries = readLevelDb([{ name: "000005.log", bytes: log }]);
    expect(entries.map((e) => [latin1(e.key), e.value.length])).toEqual([
      ["big", 70_000],
      ["small", 1],
    ]);
  });

  it("reads Snappy-compressed tables and lets the newer log win", () => {
    // Made by Chromium: session 1 wrote six large values, the settings, a
    // swatch list and a UTF-16 item, which went into the table on the
    // next open; session 2 deleted the large values and changed the
    // swatches, which stayed in the log.
    const files = folder(path.join(FIXTURES, "compacted-local-storage"));
    expect(files.map((f) => f.name).sort()).toEqual(["000003.ldb", "000004.log"]);
    const [origin, ...others] = decodeLocalStorage(readLevelDb(files));
    expect(others).toEqual([]);
    expect(origin?.origin).toBe("http://127.0.0.1:3290");
    expect(origin?.items).toEqual({
      "designer.settings": '{"theme":"dark","grid_visible":true}',
      swatches: '["C#[255,0,0]"]',
      "unicode-ключ": "значение ✓",
    });
    // The table alone still has the large values and the first swatches.
    const tableOnly = decodeLocalStorage(readLevelDb(files.filter((f) => f.name.endsWith(".ldb"))));
    expect(Object.keys(tableOnly[0]?.items ?? {})).toHaveLength(9);
    expect(tableOnly[0]?.items.swatches).toBe('["C#[0,255,0]"]');
  });

  it("skips files it can't read", () => {
    const log = logFile([batch(1, [["k", "v"]])]);
    const entries = readLevelDb([
      { name: "000007.ldb", bytes: Uint8Array.from([1, 2, 3, 4]) },
      { name: "000008.ldb", bytes: new Uint8Array(4096).fill(0xff) },
      { name: "MANIFEST-000001", bytes: Uint8Array.from([9, 9, 9]) },
      { name: "000009.log", bytes: log },
    ]);
    expect(entries.map((e) => latin1(e.key))).toEqual(["k"]);
  });
});

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { decodeLocalStorage, decodeStorageString } from "./chromium-local-storage.ts";
import { readLevelDb } from "./leveldb.ts";

function profile(dir: string) {
  const files = fs.readdirSync(dir).map((name) => ({
    name,
    bytes: new Uint8Array(fs.readFileSync(path.join(dir, name))),
  }));
  return decodeLocalStorage(readLevelDb(files));
}

const RELEASE = path.join(
  import.meta.dirname,
  "fixtures",
  "old-release-profile",
  "Local Storage",
  "leveldb",
);
/** What the old desktop app on the fixed port (since #6) left after electron/settings-persist. */
const FIXED_PORT = path.join(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "parity",
  "expected",
  "electron",
  "old-userdata",
  "Local Storage",
  "leveldb",
);

describe("decodeStorageString", () => {
  it("reads Latin-1 and UTF-16LE strings by their format byte", () => {
    expect(decodeStorageString(Uint8Array.from([1, 0x61, 0xe9]))).toBe("aé");
    expect(decodeStorageString(Uint8Array.from([0, 0x3a, 0x04, 0x13, 0x27]))).toBe("к✓");
    expect(decodeStorageString(Uint8Array.from([0, 0x3a]))).toBeNull();
    expect(decodeStorageString(Uint8Array.from([7, 0x61]))).toBeNull();
    expect(decodeStorageString(new Uint8Array(0))).toBeNull();
  });
});

describe("decodeLocalStorage", () => {
  it("finds every origin the released old app used, with its last write time", () => {
    const origins = profile(RELEASE);
    expect(origins.map((o) => o.origin)).toEqual([
      "http://127.0.0.1:54572",
      "http://127.0.0.1:64009",
    ]);
    const [first, second] = origins;
    // Launch 1 (54572) came before launch 2 (64009).
    expect(first?.lastModified).toBeLessThan(second?.lastModified ?? 0);
    expect(new Date(second?.lastModified ?? 0).toISOString()).toBe("2026-10-24T01:42:16.448Z");
    expect(JSON.parse(first?.items["designer.settings"] ?? "{}")).toMatchObject({
      theme: "dark",
      rulers_visible: false,
    });
    // Launch 2 wrote its settings at startup and again with the rulers on.
    expect(JSON.parse(second?.items["designer.settings"] ?? "{}")).toMatchObject({
      theme: "light",
      rulers_visible: true,
    });
    expect(Object.keys(second?.items ?? {})).toEqual([
      "_gcl_ls",
      "designer.settings",
      "enabled_subscriptions",
      "gtm:clientid",
      "last_update_check",
      "offline_cache",
      "old_version",
    ]);
  });

  it("reads the fixed-port origin of builds since #6", () => {
    const [origin, ...others] = profile(FIXED_PORT);
    expect(others).toEqual([]);
    expect(origin?.origin).toBe("http://127.0.0.1:47823");
    expect(JSON.parse(origin?.items["designer.settings"] ?? "{}")).toMatchObject({
      theme: "dark",
      rulers_visible: true,
    });
  });
});

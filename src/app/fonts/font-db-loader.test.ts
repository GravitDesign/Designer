import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OpenTypeUtil, type FontFileEntry } from "../../engine/text/fonts/open-type-util.ts";
import { setDesigner } from "../shell/globals.ts";
import type { Designer } from "../shell/designer.ts";
import { FontDB } from "./font-db.ts";
import { FontDBLoader } from "./font-db-loader.ts";
import { FontsProviderManager } from "./font-manager.ts";
import { ImportedFontsProvider, type ImportedFontRecord } from "./imported-fonts-provider.ts";

/** A font database in memory that logs its writes. */
class FakeFontDB {
  items = new Map<string, unknown>();
  writes: string[] = [];
  isReady = true;

  ready(): boolean {
    return this.isReady;
  }

  getItem(key: string): Promise<{ value: unknown; store: undefined }> {
    return Promise.resolve({ value: structuredClone(this.items.get(key)), store: undefined });
  }

  updateItem(key: string, value: unknown): Promise<boolean> {
    this.writes.push(key);
    this.items.set(key, structuredClone(value));
    return Promise.resolve(true);
  }
}

type PickedFile = { data: string; fonts: Partial<FontFileEntry>[] };

interface Harness {
  db: FakeFontDB;
  prompts: unknown[][];
  /** Picks the files in the last prompt, as the storage does. */
  pick(files: PickedFile[]): void;
  getFont: ReturnType<typeof vi.fn>;
  reset: ReturnType<typeof vi.spyOn>;
}

let harness: Harness;

function font(family: string, weight: number, style: string, extra: Partial<FontFileEntry> = {}) {
  return {
    family,
    weight,
    style,
    subfamily: undefined,
    displayname: undefined,
    buffer: new ArrayBuffer(4),
    ...extra,
  };
}

/** Lets the chained database promises run. */
async function flush(): Promise<void> {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

beforeEach(() => {
  const db = new FakeFontDB();
  vi.spyOn(FontDB, "getInstance").mockReturnValue(db as unknown as FontDB);
  const prompts: unknown[][] = [];
  const getFont = vi.fn();
  const fileFonts = new Map<string, Partial<FontFileEntry>[]>();
  vi.spyOn(OpenTypeUtil, "getFont").mockImplementation(
    (_family, _style, _weight, data) =>
      fileFonts.get(new TextDecoder().decode(data as Uint8Array)) as FontFileEntry[],
  );
  setDesigner({
    getDefaultStorage: () => ({
      openPrompt: (...args: unknown[]) => prompts.push(args),
    }),
    getWorkspace: () => ({ getFontManager: () => ({ getFont }) }),
  } as unknown as Designer);
  const reset = vi.spyOn(FontsProviderManager.getInstance(), "reset").mockImplementation(() => {});
  harness = {
    db,
    prompts,
    getFont,
    reset,
    pick(files) {
      const done = prompts[prompts.length - 1]?.[1] as (item: unknown, count: number) => void;
      for (const file of files) {
        fileFonts.set(file.data, file.fonts);
        done(
          {
            read: (callback: (data: Uint8Array) => void) =>
              callback(new TextEncoder().encode(file.data)),
          },
          files.length,
        );
      }
    },
  };
});

afterEach(() => {
  setDesigner(null);
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("FontDBLoader (module 1245)", () => {
  it("asks for several font files and passes the options on", () => {
    const loader = new FontDBLoader();
    expect(loader.import(undefined, { disableFileSystemAccessAPI: true })).toBe(true);
    expect(harness.prompts).toHaveLength(1);
    const [types, , multiple, options] = harness.prompts[0] as unknown[];
    expect(types).toEqual([
      { ext: "ttf", mime: "font/ttf" },
      { ext: "otf", mime: "font/otf" },
      { ext: "ttc", mime: "font/collection" },
      { ext: "dfont", mime: "font/collection" },
    ]);
    expect(multiple).toBe(true);
    expect(options).toEqual({ disableFileSystemAccessAPI: true });
  });

  it("stores every font of a collection and writes the list once at the end", async () => {
    const done = vi.fn();
    new FontDBLoader().import(done);
    harness.pick([
      {
        data: "collection",
        fonts: [
          font("Coll", 400, "N", { subfamily: "Regular", displayname: "Coll" }),
          font("Coll", 700, "I", { subfamily: "Bold Italic" }),
        ],
      },
    ]);
    await flush();
    expect(harness.db.writes).toEqual(["Coll_400_N", "Coll_700_I", FontDB.FONT_LIST]);
    expect(harness.db.items.get(FontDB.FONT_LIST)).toEqual([
      { style: "N", weight: "400", family: "Coll", subfamily: "Regular", displayname: "Coll" },
      {
        style: "I",
        weight: "700",
        family: "Coll",
        subfamily: "Bold Italic",
        displayname: undefined,
      },
    ]);
    // The last font was new: only the imported fonts are reset, forced.
    expect(harness.reset.mock.calls).toEqual([[ImportedFontsProvider, true]]);
    expect(harness.getFont.mock.calls).toEqual([
      ["Coll", "N", 400],
      ["Coll", "I", 700],
    ]);
    expect(done).toHaveBeenCalledOnce();
  });

  it("writes the list once for several picked files", async () => {
    new FontDBLoader().import();
    harness.pick([
      { data: "a", fonts: [font("A", 400, "N")] },
      { data: "b", fonts: [font("B", 400, "N")] },
    ]);
    await flush();
    expect(harness.db.writes).toEqual(["A_400_N", "B_400_N", FontDB.FONT_LIST]);
    expect(harness.reset).toHaveBeenCalledOnce();
  });

  it("fills in a missing subfamily and display name instead of storing a listed font again", async () => {
    const listed: ImportedFontRecord[] = [{ family: "Dup", weight: "400", style: "N" }];
    harness.db.items.set(FontDB.FONT_LIST, listed);
    new FontDBLoader().import();
    harness.pick([
      {
        data: "dup",
        fonts: [font("Dup", 400, "N", { subfamily: "Regular", displayname: "Dup R" })],
      },
    ]);
    await flush();
    expect(harness.db.writes).toEqual([FontDB.FONT_LIST]);
    expect(harness.db.items.get(FontDB.FONT_LIST)).toEqual([
      { family: "Dup", weight: "400", style: "N", subfamily: "Regular", displayname: "Dup R" },
    ]);
    // Nothing new was stored: everything is reset, not forced.
    expect(harness.reset.mock.calls).toEqual([[]]);
  });

  it("keeps a listed display name", async () => {
    harness.db.items.set(FontDB.FONT_LIST, [
      { family: "Dup", weight: "400", style: "N", subfamily: "Regular", displayname: "Old" },
    ]);
    new FontDBLoader().import();
    harness.pick([
      { data: "dup", fonts: [font("Dup", 400, "N", { subfamily: "Regular", displayname: "New" })] },
    ]);
    await flush();
    expect(harness.db.items.get(FontDB.FONT_LIST)).toEqual([
      { family: "Dup", weight: "400", style: "N", subfamily: "Regular", displayname: "Old" },
    ]);
  });

  it("appends the subfamily to the family when the listed font has another one", async () => {
    harness.db.items.set(FontDB.FONT_LIST, [
      { family: "Sans", weight: "400", style: "N", subfamily: "Regular" },
      // Compared again under the longer name, which is listed too.
      { family: "SansCondensed", weight: "400", style: "N", subfamily: "Other" },
    ]);
    new FontDBLoader().import();
    harness.pick([{ data: "c", fonts: [font("Sans", 400, "N", { subfamily: "Condensed" })] }]);
    await flush();
    const list = harness.db.items.get(FontDB.FONT_LIST) as ImportedFontRecord[];
    // The second rename appends the subfamily again.
    expect(list.map((entry) => entry.family)).toEqual([
      "Sans",
      "SansCondensed",
      "SansCondensedCondensed",
    ]);
    // The file is stored under the family the file gave.
    expect(harness.db.writes).toEqual(["Sans_400_N", FontDB.FONT_LIST]);
  });

  it("waits while busy and gives up after about 50 tries", () => {
    vi.useFakeTimers();
    const loader = new FontDBLoader();
    loader._numFiles = 1;
    const done = vi.fn();
    expect(loader.import(done)).toBeUndefined();
    expect(harness.prompts).toHaveLength(0);
    vi.advanceTimersByTime(100 * 49);
    expect(done).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100 * 2);
    expect(done).toHaveBeenCalledOnce();
    expect(harness.prompts).toHaveLength(0);
  });

  it("opens the picker once the earlier batch is done", () => {
    vi.useFakeTimers();
    const loader = new FontDBLoader();
    loader._numFiles = 1;
    loader.import();
    vi.advanceTimersByTime(300);
    loader._numFiles = 0;
    vi.advanceTimersByTime(100);
    expect(harness.prompts).toHaveLength(1);
  });

  it("is busy while the database isn't open", () => {
    harness.db.isReady = false;
    const loader = new FontDBLoader();
    expect(loader.busy()).toBe(true);
    expect(loader.import(undefined, { silent: true })).toBe(true);
  });

  it("reports progress through the batch", () => {
    const loader = new FontDBLoader();
    expect(loader.getProgress()).toBe(1);
    loader._numFiles = 4;
    loader._numLoaded = 1;
    expect(loader.getProgress()).toBe(0.25);
  });
});

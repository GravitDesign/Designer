import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Text } from "../../engine/text/text.ts";
import type { Designer } from "../shell/designer.ts";
import { resetGlobals, setDesigner } from "../shell/globals.ts";
import { setLateModules } from "../shell/late.ts";
import { FontDB } from "./font-db.ts";
import { FontsProviderManager } from "./font-manager.ts";
import { generateFormattedList } from "./font-style-naming.ts";
import type { ListedFamily } from "./fonts-provider.ts";
import { ImportedFontsProvider, type ImportedFontRecord } from "./imported-fonts-provider.ts";

interface Internals {
  _formattedFontList: ListedFamily[] | null;
  _fontList: ImportedFontRecord[] | null;
  _totalFonts: number;
  _confirmDelete(entry: ListedFamily): void;
}

const RECORDS: ImportedFontRecord[] = [
  { family: "Mine", weight: "400", style: "N", subfamily: "Regular", displayname: "Mine" },
  { family: "Other", weight: "400", style: "N" },
  { family: "Mine Bold", weight: "700", style: "I", displayname: "Mine" },
];

interface Harness {
  provider: Internals;
  log: string[];
  answers: boolean[];
  /** Lets the pending database requests answer. */
  flush(): Promise<void>;
  text: Text;
  replaceFonts: ReturnType<typeof vi.fn>;
}

let harness: Harness;

beforeEach(() => {
  const log: string[] = [];
  const answers: boolean[] = [];
  const pending: (() => void)[] = [];
  const answerLater = (value: boolean) =>
    new Promise<boolean>((resolve) => pending.push(() => resolve(value)));
  const db = {
    deleteItem: (key: string) => {
      log.push("delete " + key);
      return answerLater(true);
    },
    updateItem: (key: string, value: unknown) => {
      log.push("update " + key + " " + JSON.stringify(value));
      return answerLater(true);
    },
  } as unknown as FontDB;
  vi.spyOn(FontDB, "getInstance").mockImplementation((callback) => {
    callback?.(db);
    return db;
  });
  setLateModules({
    "dialogs/system-dialog.ts": {
      SystemDialog: {
        confirm: (message: string, done: (ok: boolean) => void) => {
          log.push("confirm " + message);
          done(answers.shift() ?? false);
        },
      },
    },
  });
  const text = new Text();
  const replaceFonts = vi.fn();
  text.replaceFonts = replaceFonts as unknown as Text["replaceFonts"];
  setDesigner({
    getDocuments: () => [
      {
        getScene: () => ({
          acceptChildren: (visit: (node: unknown) => void) => {
            visit({ notText: true });
            visit(text);
          },
        }),
      },
    ],
    getWorkspace: () => ({
      getFontManager: () => ({ removeFont: (family: string) => log.push("removeFont " + family) }),
    }),
  } as unknown as Designer);
  const manager = FontsProviderManager.getInstance();
  vi.spyOn(manager, "reset").mockImplementation(() => log.push("reset"));
  vi.spyOn(manager, "setShowMissingFontsDialog").mockImplementation((show) =>
    log.push("showMissingFontsDialog " + show),
  );
  vi.spyOn(console, "log").mockImplementation(() => {});
  const provider = new ImportedFontsProvider(manager) as unknown as Internals;
  provider._formattedFontList = generateFormattedList(RECORDS) as ListedFamily[];
  provider._fontList = RECORDS.slice();
  provider._totalFonts = 2;
  const flush = async () => {
    for (let i = 0; i < 20; i++) {
      while (pending.length) (pending.shift() as () => void)();
      await Promise.resolve();
    }
  };
  harness = { provider, log, answers, flush, text, replaceFonts };
});

afterEach(() => {
  vi.restoreAllMocks();
  setLateModules({});
  resetGlobals();
});

function family(name: string): ListedFamily {
  return (harness.provider._formattedFontList as ListedFamily[]).find(
    (entry) => entry.family === name,
  ) as ListedFamily;
}

describe("ImportedFontsProvider delete", () => {
  it("deletes nothing when the confirm is cancelled", async () => {
    harness.answers.push(false);
    harness.provider._confirmDelete(family("Mine"));
    await harness.flush();
    expect(harness.log).toEqual(["confirm Are you sure you want to delete this font?"]);
  });

  it("deletes every file of the family, then rewrites the list and replaces the family", async () => {
    harness.answers.push(true);
    const mine = family("Mine");
    expect(mine.families).toEqual(["Mine", "Mine Bold"]);
    harness.provider._confirmDelete(mine);
    await harness.flush();
    expect(harness.log).toEqual([
      "confirm Are you sure you want to delete this font?",
      "showMissingFontsDialog false",
      "delete Mine_400_N",
      "delete Mine Bold_700_I",
      'update _gravit_font_list_ [{"family":"Other","weight":"400","style":"N","subfamily":null,"displayname":null}]',
      "removeFont Mine",
      "removeFont Mine Bold",
      "reset",
      "showMissingFontsDialog true",
    ]);
    expect(harness.replaceFonts).toHaveBeenCalledTimes(1);
    expect(harness.replaceFonts).toHaveBeenCalledWith(
      { Mine: "Open Sans", "Mine Bold": "Open Sans" },
      true,
    );
    expect(harness.provider._totalFonts).toBe(1);
    expect(harness.provider._fontList).toEqual([
      { family: "Other", weight: "400", style: "N", subfamily: null, displayname: null },
    ]);
    expect(harness.provider._formattedFontList?.map((entry) => entry.family)).toEqual(["Other"]);
  });

  it("starts a second delete of the family at once, which stops at the missing family", async () => {
    // Kept from the old code: the queue runs a delete as soon as it is the
    // only one queued, and the first is taken off before it runs, so the
    // queue never waits (see "Deleting an imported font twice runs both
    // deletes at once" in QUESTIONS.md).
    harness.answers.push(true, true);
    const mine = family("Mine");
    harness.provider._confirmDelete(mine);
    harness.provider._confirmDelete(mine);
    await harness.flush();
    const deletes = harness.log.filter((line) => line.startsWith("delete "));
    expect(deletes).toEqual([
      "delete Mine_400_N",
      "delete Mine_400_N",
      "delete Mine Bold_700_I",
      "delete Mine Bold_700_I",
    ]);
    expect(harness.log.filter((line) => line.startsWith("update "))).toHaveLength(1);
    expect(harness.log.filter((line) => line === "reset")).toHaveLength(1);
    expect(harness.provider._totalFonts).toBe(1);
  });
});

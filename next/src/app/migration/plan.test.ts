import { describe, expect, it } from "vitest";
import type { StoredOrigin } from "./chromium-local-storage.ts";
import {
  FONT_LIST_KEY,
  MIGRATED_LOCAL_STORAGE_KEYS,
  mergeFonts,
  originOfIndexedDbFolder,
  planMigration,
  type FontDump,
} from "./plan.ts";

const TARGET = "http://127.0.0.1:47823";

function origin(port: number, time: number | null, items: Record<string, string>): StoredOrigin {
  return { origin: `http://127.0.0.1:${port}`, lastModified: time, lastAccessed: time, items };
}

describe("planMigration", () => {
  it("takes each kept key from the newest old origin that has it", () => {
    const plan = planMigration(
      [
        origin(50001, 1000, { "designer.settings": '{"theme":"dark"}', swatches: '["a"]' }),
        origin(50002, 3000, { "designer.settings": '{"theme":"light"}' }),
        origin(50003, 2000, { "designer.settings.outline-view.enabled": "true" }),
      ],
      [],
      TARGET,
    );
    expect(plan.localStorage).toEqual({
      "designer.settings": '{"theme":"light"}',
      swatches: '["a"]',
      "designer.settings.outline-view.enabled": "true",
    });
    expect(plan.localStorageFrom).toEqual({
      "designer.settings": "http://127.0.0.1:50002",
      swatches: "http://127.0.0.1:50001",
      "designer.settings.outline-view.enabled": "http://127.0.0.1:50003",
    });
  });

  it("leaves the dropped licence, cloud and analytics keys behind", () => {
    const plan = planMigration(
      [
        origin(50001, 1000, {
          "designer.settings": "{}",
          offline_cache: "x",
          "gtm:clientid": "y",
          old_version: "z",
          _gcl_ls: "w",
        }),
      ],
      [],
      TARGET,
    );
    expect(Object.keys(plan.localStorage)).toEqual(["designer.settings"]);
    expect(MIGRATED_LOCAL_STORAGE_KEYS).toContain("swatches");
    expect(MIGRATED_LOCAL_STORAGE_KEYS).not.toContain("offline_cache");
  });

  it("takes no localStorage when the app's origin has settings (builds since #6)", () => {
    const plan = planMigration(
      [
        origin(47823, 500, { "designer.settings": '{"theme":"dark"}' }),
        origin(50001, 9000, { "designer.settings": '{"theme":"light"}', swatches: '["a"]' }),
      ],
      [],
      TARGET,
    );
    expect(plan.localStorage).toEqual({});
  });

  it("fills only the keys the app's origin lacks when it has no settings yet", () => {
    const plan = planMigration(
      [
        origin(47823, 500, { swatches: '["mine"]' }),
        origin(50001, 9000, { "designer.settings": "{}", swatches: '["old"]' }),
      ],
      [],
      TARGET,
    );
    expect(plan.localStorage).toEqual({ "designer.settings": "{}" });
  });

  it("ignores origins that aren't the old app's local server", () => {
    const plan = planMigration(
      [
        {
          origin: "https://example.com",
          lastModified: 1,
          lastAccessed: 1,
          items: { "designer.settings": "{}" },
        },
        origin(50001, null, { swatches: "[]" }),
      ],
      [
        { origin: "https://example.com", modified: 5 },
        { origin: TARGET, modified: 9 },
      ],
      TARGET,
    );
    expect(plan.localStorage).toEqual({ swatches: "[]" });
    expect(plan.fontOrigins).toEqual([]);
  });

  it("reads the font databases newest first, by localStorage time or else folder time", () => {
    const plan = planMigration(
      [origin(50001, 5000, {}), origin(50002, 1000, {})],
      [
        { origin: "http://127.0.0.1:50002", modified: 99999 },
        { origin: "http://127.0.0.1:50003", modified: 3000 },
        { origin: "http://127.0.0.1:50001", modified: 0 },
      ],
      TARGET,
    );
    expect(plan.fontOrigins).toEqual([
      "http://127.0.0.1:50001",
      "http://127.0.0.1:50003",
      "http://127.0.0.1:50002",
    ]);
  });
});

describe("originOfIndexedDbFolder", () => {
  it("maps the folder names Chromium uses", () => {
    expect(originOfIndexedDbFolder("http_127.0.0.1_61805.indexeddb.leveldb")).toBe(
      "http://127.0.0.1:61805",
    );
    expect(originOfIndexedDbFolder("http_127.0.0.1_61805.indexeddb.blob")).toBeNull();
    expect(originOfIndexedDbFolder("https_example.com_0.indexeddb.leveldb")).toBeNull();
  });
});

function font(family: string, weight = "400", style = "N") {
  return { family, weight, style, subfamily: "Regular", displayname: family };
}

function dump(port: number, fonts: ReturnType<typeof font>[], extra: string[] = []): FontDump {
  return {
    origin: `http://127.0.0.1:${port}`,
    entries: [
      ...fonts.map((f) => ({
        key: `${f.family}_${f.weight}_${f.style}`,
        value: {
          kind: "binary" as const,
          type: "ArrayBuffer" as const,
          base64: btoa(`${port}:${f.family}`),
        },
      })),
      ...extra.map((key) => ({ key, value: { kind: "json" as const, json: [1] } })),
      { key: FONT_LIST_KEY, value: { kind: "json" as const, json: fonts } },
    ],
  };
}

describe("mergeFonts", () => {
  it("adds every font the app lacks, newest origin first, and extends the list", () => {
    const writes = mergeFonts(dump(47823, [font("Mine")]), [
      dump(50002, [font("B"), font("A")]),
      dump(50001, [font("A"), font("C", "700", "I")]),
    ]);
    expect(writes.added).toEqual(["B_400_N", "A_400_N", "C_700_I"]);
    // "A" comes from the newer origin.
    expect(writes.put[1]?.value).toMatchObject({ base64: btoa("50002:A") });
    expect(writes.list).toEqual([font("Mine"), font("B"), font("A"), font("C", "700", "I")]);
  });

  it("keeps the app's own fonts and changes nothing when there is nothing new", () => {
    const writes = mergeFonts(dump(47823, [font("A")]), [dump(50001, [font("A")])]);
    expect(writes).toEqual({ put: [], list: null, added: [] });
  });

  it("starts a list when the app has no database yet", () => {
    const writes = mergeFonts(null, [dump(50001, [font("A")])]);
    expect(writes.added).toEqual(["A_400_N"]);
    expect(writes.list).toEqual([font("A")]);
  });

  it("never copies the cached system font list or a list entry without its file", () => {
    const source = dump(
      50001,
      [font("A")],
      ["_gravit_native_font_list_", "_gravit_native_font_list_v_"],
    );
    const list = source.entries.find((e) => e.key === FONT_LIST_KEY);
    if (list?.value.kind === "json") list.value.json = [font("A"), font("Ghost")];
    const writes = mergeFonts(null, [source]);
    expect(writes.added).toEqual(["A_400_N"]);
    expect(writes.list).toEqual([font("A")]);
  });
});

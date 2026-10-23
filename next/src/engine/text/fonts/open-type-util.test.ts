import { describe, expect, it } from "vitest";
import { OpenTypeParser, OpenTypeUtil } from "./open-type-util.ts";
import { nameTable, sfnt, statTable, win, type NameRecord } from "./test-sfnt.ts";

describe("OpenTypeUtil.getOpenTypeInfo on synthetic name tables", () => {
  it("reads English Windows names and derives weight and style from the subfamily", () => {
    const font = sfnt({
      name: nameTable([win(1033, 1, "Probe"), win(1033, 2, "ExtraBold Oblique")]),
    });
    expect(OpenTypeUtil.getOpenTypeInfo(font)).toEqual({
      name: "Probe",
      weight: 800,
      style: "I",
      displayname: undefined,
      subfamily: undefined,
    });
  });

  it("never uses a name id that has no English record, and stops reading there", () => {
    // 1025 is skipped (index 0 of the Windows table); 1031 and unlisted ids
    // land in the "oth" slot, which the old reader threw on.
    for (const language of [1025, 1031, 9999]) {
      expect(OpenTypeUtil.getOpenTypeInfo(sfnt({ name: nameTable([win(language, 1, "X")]) }))).toBe(
        null,
      );
    }
    const font = sfnt({
      name: nameTable([win(1033, 1, "Family"), win(1031, 2, "Fett"), win(1033, 4, "Full")]),
    });
    expect(OpenTypeUtil._getOpenTypeInfo(font, 0)).toEqual([[0, "Family", 0, 0, 0, 0, 0, 0], "_"]);
  });

  it("prefers the English record over another language", () => {
    const font = sfnt({ name: nameTable([win(1031, 1, "Deutsch"), win(1033, 1, "English")]) });
    expect(OpenTypeUtil.getOpenTypeInfo(font)?.name).toBe("English");
  });

  it("decodes Mac Roman names and gives up on encodings it has no table for", () => {
    const roman: NameRecord = {
      platform: 1,
      encoding: 0,
      language: 0,
      nameId: 1,
      bytes: [0x43, 0x61, 0x66, 0x8e],
    };
    expect(OpenTypeUtil.getOpenTypeInfo(sfnt({ name: nameTable([roman]) }))?.name).toBe("Café");
    const japanese = { ...roman, encoding: 1 };
    expect(OpenTypeUtil._getOpenTypeInfo(sfnt({ name: nameTable([japanese]) }), 0)).toBe(undefined);
  });

  it("reads STAT axis values with the old record stepping", () => {
    // Every axis after the first is read at the record before it, so the
    // second axis is taken for wght again (with its own value) and ital is
    // never seen.
    const font = sfnt({
      name: nameTable([win(1033, 1, "Probe")]),
      STAT: statTable([
        ["wght", 700],
        ["ital", 1],
      ]),
    });
    expect((OpenTypeUtil._getOpenTypeInfo(font, 0) as [unknown, string])[1]).toBe("1_");
  });

  it("answers the cmap check from the first encoding record", () => {
    const cmap = (platform: number, encoding: number) => [0, 0, 0, 1, 0, platform, 0, encoding];
    expect(OpenTypeUtil._getOpenTypeInfo(sfnt({ cmap: cmap(3, 1) }), 0, true)).toBe(true);
    expect(OpenTypeUtil._getOpenTypeInfo(sfnt({ cmap: cmap(3, 7) }), 0, true)).toBe(false);
    expect(new OpenTypeParser(sfnt({ cmap: cmap(3, 7) }))._type).toBe(-1);
    expect(new OpenTypeParser(sfnt({ cmap: cmap(0, 3) }))._type).toBe(2);
  });
});

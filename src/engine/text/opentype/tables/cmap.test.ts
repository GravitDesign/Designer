import { describe, expect, it } from "vitest";
import { readFixture } from "../test-fonts.ts";
import { parse } from "./cmap.ts";

// Hand-built cmap tables for the formats and platform choices that the
// bundled fonts don't use, with the old fork's results (Gravit added formats
// 0, 6, 10 and 13, the Macintosh platform, the Unicode fallback and the
// null result).

interface CmapFixture {
  cases: Record<string, number[]>;
  out: Record<string, { result?: unknown; error?: string }>;
}

const fixture = readFixture<CmapFixture>("tables-cmap.json");

describe("cmap.parse", () => {
  for (const [name, bytes] of Object.entries(fixture.cases)) {
    const expected = fixture.out[name] as { result?: unknown; error?: string };
    it(name, () => {
      const data = new DataView(new Uint8Array(bytes).buffer);
      if (expected.error !== undefined) {
        expect(() => parse(data, 0)).toThrow(expected.error);
        return;
      }
      expect(JSON.parse(JSON.stringify(parse(data, 0)))).toEqual(expected.result);
    });
  }

  it("returns null when no sub-table is usable", () => {
    const bytes = fixture.cases.noUsable as number[];
    expect(parse(new DataView(new Uint8Array(bytes).buffer), 0)).toBeNull();
  });
});

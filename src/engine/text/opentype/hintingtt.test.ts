import { afterEach, describe, expect, it, vi } from "vitest";
import type { Font } from "./font.ts";
import type { HintableGlyph } from "./hintingtt.ts";
import { HintingTrueType } from "./hintingtt.ts";
import { parse } from "./opentype.ts";
import { readFixture, readTestFont } from "./test-fonts.ts";

// Reference values come from the old bundle's interpreter (chunk.vendor.js
// module 987), run on the same programs and fonts.

interface ProgramCase {
  name: string;
  unitsPerEm: number;
  fpgm: number[];
  prep: number[];
  cvt: number[];
  glyphs: HintableGlyph[];
  runs: { glyph: number; ppem: number }[];
}

interface ProgramResult {
  name: string;
  runs: ([number, number, number, number, boolean, boolean][] | null)[];
  logs: string[];
  errorState: number;
}

interface FontRun {
  ch: string;
  index: number;
  ppem: number;
  points: number[] | null;
  commands?: unknown[];
}

interface FontResult {
  runs: FontRun[];
  paths: { ch: string; size: number; commands: unknown[] }[];
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("HintingTrueType on hand-written programs", () => {
  const inputs = readFixture<ProgramCase[]>("hinting-programs-input.json");
  const expected = readFixture<ProgramResult[]>("hinting-programs.json");

  for (const [i, input] of inputs.entries()) {
    it(input.name, () => {
      const logs: string[] = [];
      vi.spyOn(console, "log").mockImplementation((message: unknown) => {
        logs.push(String(message));
      });
      const font = {
        unitsPerEm: input.unitsPerEm,
        tables: { fpgm: input.fpgm, prep: input.prep, cvt: input.cvt },
        glyphs: { get: (index: number) => input.glyphs[index] },
      } as unknown as Font;
      const hinting = new HintingTrueType(font);
      const runs = input.runs.map((run) => {
        const points = hinting.exec(input.glyphs[run.glyph] as HintableGlyph, run.ppem);
        return points ? points.map((p) => [p.x, p.y, p.xo, p.yo, p.xTouched, p.yTouched]) : null;
      });
      const want = expected[i] as ProgramResult;
      expect(runs).toEqual(want.runs);
      expect(logs).toEqual(want.logs);
    });
  }

  it("rejects a point size that is not a number", () => {
    const font = { unitsPerEm: 64, tables: {} } as unknown as Font;
    expect(() => new HintingTrueType(font).exec({}, "12" as unknown as number)).toThrow(
      "Point size is not a number!",
    );
  });
});

describe("HintingTrueType on the bundled fonts", () => {
  const expected = readFixture<Record<string, FontResult>>("hinting-points.json");

  for (const [file, result] of Object.entries(expected)) {
    it("hints " + file + " like the old interpreter", () => {
      vi.spyOn(console, "log").mockImplementation(() => {});
      // A fresh font: the hinting state (prep, CVT changes) depends on the call order.
      const font = parse(readTestFont(file));
      const hinting = font.hinting as HintingTrueType;
      for (const run of result.runs) {
        const glyph = font.charToGlyph(run.ch);
        expect(glyph.index).toBe(run.index);
        void glyph.path;
        const points = hinting.exec(glyph, run.ppem);
        const flat: number[] | null = points ? points.flatMap((p) => [p.x, p.y]) : null;
        expect(flat, run.ch + " at " + run.ppem).toEqual(run.points);
        if (run.commands && points) {
          expect(hinting.getCommands(points)).toEqual(run.commands);
        }
      }
      for (const path of result.paths) {
        const glyph = font.charToGlyph(path.ch);
        expect(glyph.getPath(0, 0, path.size, { hinting: true }, font).commands).toEqual(
          path.commands,
        );
      }
    });
  }
});

import { describe, expect, it } from "vitest";
import * as parseUtil from "./parse.ts";
import { Parser } from "./parse.ts";
import { readFixture } from "./test-fonts.ts";

type Attempt<T> = { ok: T } | { error: string };

interface ParseFixture {
  parseHelpers: Record<string, unknown>;
  parser: Record<string, unknown> & {
    coverageError: Attempt<unknown>;
    classDefError: Attempt<unknown>;
  };
}

const fixture = readFixture<ParseFixture>("core.json");

const bytes = new Uint8Array([
  0x00, 0x01, 0x80, 0x00, 0xff, 0xfe, 0x12, 0x34, 0x56, 0x78, 0x41, 0x42, 0x43, 0x44, 0x7f, 0xff,
  0x00, 0x00, 0x00, 0x00, 0xe0, 0x00, 0x00, 0x00,
]);

function view(values: number[]): DataView {
  return new DataView(new Uint8Array(values).buffer);
}

function attempt<T>(fn: () => T): Attempt<T> {
  try {
    return { ok: fn() };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

describe("parse helpers", () => {
  it("read big endian values like the old code", () => {
    const dv = new DataView(bytes.buffer);
    expect({
      fixed: parseUtil.getFixed(dv, 0),
      fixed2: parseUtil.getFixed(dv, 4),
      tag: parseUtil.getTag(dv, 10),
      offset3: parseUtil.getOffset(dv, 4, 3),
      short: parseUtil.getShort(dv, 4),
      ulong: parseUtil.getULong(dv, 6),
      bytes: parseUtil.getBytes(dv, 2, 6),
      str: parseUtil.bytesToString([72, 105]),
    }).toEqual(fixture.parseHelpers);
  });
});

describe("Parser", () => {
  it("reads versions, fixed point numbers and dates and advances", () => {
    const dv = new DataView(bytes.buffer);
    const p = new Parser(dv, 0);
    const result: Record<string, unknown> = {
      version: p.parseVersion(),
      f2dot14: p.parseF2Dot14(),
      char: p.parseChar(),
      byte: p.parseByte(),
      longDate: p.parseLongDateTime(),
      rel: p.relativeOffset,
    };
    result.version1 = new Parser(dv, 2).parseVersion(1);
    const skipper = new Parser(dv, 0);
    skipper.skip("uShort", 3);
    skipper.skip("tag");
    result.skip = skipper.relativeOffset;
    result.valueRecord = new Parser(
      view([0x00, 0xff, 0, 1, 0, 2, 0, 3, 0, 4, 0, 5, 0, 6, 0, 7, 0, 8]),
      0,
    ).parseValueRecord();
    result.valueRecord0 = new Parser(dv, 16).parseValueRecord() === undefined;
    result.coverageError = attempt(() => new Parser(view([0, 0, 0, 3, 0, 9]), 2).parseCoverage());
    result.classDefError = attempt(() => new Parser(view([0, 0, 0, 7]), 2).parseClassDef());
    // The fixture went through JSON: undefined device fields are dropped there.
    expect(JSON.parse(JSON.stringify(result))).toEqual(fixture.parser);
  });

  it("reads records, lists and pointers", () => {
    // count 2, two records of (uShort, tag), then an offset list.
    const p = new Parser(
      view([0, 2, 0, 7, 0x41, 0x42, 0x43, 0x44, 0, 9, 0x5a, 0x5a, 0x5a, 0x5a]),
      0,
    );
    expect(p.parseRecordList({ id: Parser.uShort, tag: Parser.tag })).toEqual([
      { id: 7, tag: "ABCD" },
      { id: 9, tag: "ZZZZ" },
    ]);
    expect(p.relativeOffset).toBe(14);
    // pointer at 0 -> offset 4 -> uShort 0x1234; NULL pointer -> undefined.
    const q = new Parser(view([0, 4, 0, 0, 0x12, 0x34]), 0);
    expect(q.parsePointer(Parser.uShort)).toBe(0x1234);
    expect(q.parsePointer(Parser.uShort)).toBeUndefined();
    const lists = new Parser(view([0, 2, 0, 6, 0, 0, 0, 2, 0, 5, 0, 6]), 0).parseListOfLists();
    expect(lists).toEqual([[5, 6], undefined]);
  });
});

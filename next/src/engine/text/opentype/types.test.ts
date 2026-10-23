import { describe, expect, it } from "vitest";
import { readFixture } from "./test-fonts.ts";
import { decode, encode, sizeOf } from "./types.ts";
import type { DictEntry, TypedValue } from "./types.ts";

interface TypesFixture {
  encoders: Record<string, unknown[]>;
  encodeOut: Record<string, unknown[]>;
  decodeOut: Record<string, string | null>;
}

const fixture = readFixture<TypesFixture>("tables-types.json");

function run(type: string, input: unknown): unknown {
  switch (type) {
    case "NUMBER":
      return encode.NUMBER(input as number);
    case "REAL":
      return encode.REAL(input as number);
    case "SHORT":
      return encode.SHORT(input as number);
    case "LONG":
      return encode.LONG(input as number);
    case "VARDELTAS":
      return encode.VARDELTAS(input as number[]);
    case "MACSTRING": {
      const [str, encoding] = input as [string, string];
      return encode.MACSTRING(str, encoding);
    }
    case "UTF16":
      return encode.UTF16(input as string);
    case "INDEX":
      return encode.INDEX(input as TypedValue[]);
    case "DICT":
      return encode.DICT(input as Record<number, DictEntry>);
  }
  throw new Error("no case for " + type);
}

describe("types encoders match the old fork", () => {
  for (const [type, inputs] of Object.entries(fixture.encoders)) {
    it(type, () => {
      const actual = inputs.map((input) => run(type, input));
      // JSON turns the undefined of an unencodable MACSTRING into null, as in the fixture.
      expect(JSON.parse(JSON.stringify(actual))).toEqual(fixture.encodeOut[type]);
    });
  }
});

describe("types decoders match the old fork", () => {
  const data = new DataView(new Uint8Array([0x47, 0x8e, 0x9a, 0x20, 0xa5, 0x41]).buffer);
  it("decodes Mac, UTF-16 and byte strings", () => {
    expect({
      macintosh: decode.MACSTRING(data, 0, 6, "macintosh"),
      greek: decode.MACSTRING(data, 0, 6, "x-mac-greek"),
      unknown: decode.MACSTRING(data, 0, 6, "nope"),
      utf16: decode.UTF16(data, 0, 6),
      utf8: decode.UTF8(data, 0, 6),
    }).toEqual(fixture.decodeOut);
  });
});

describe("sizeOf", () => {
  it("matches the encoded length", () => {
    expect(sizeOf.NUMBER(1132)).toBe(encode.NUMBER(1132).length);
    expect(sizeOf.MACSTRING("中", "macintosh")).toBe(0);
    expect(sizeOf.UTF16("ab")).toBe(4);
  });

  it("encodes a table with subtables after its fields", () => {
    const sub = { tableName: "sub", fields: [{ name: "x", type: "USHORT", value: 7 }] };
    const table = {
      tableName: "t",
      fields: [
        { name: "a", type: "USHORT", value: 1 },
        { name: "s", type: "TABLE", value: sub },
        { name: "b", type: "SHORT", value: -2 },
      ],
      a: 9,
    };
    expect(encode.TABLE(table)).toEqual([0, 9, 0, 6, 0xff, 0xfe, 0, 7]);
    expect(sizeOf.TABLE(table)).toBe(8);
  });
});

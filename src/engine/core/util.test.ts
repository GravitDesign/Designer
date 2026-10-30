import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Point } from "../math/point.ts";
import { Rect } from "../math/rect.ts";
import { Util, setStringCompression } from "./util.ts";

// Expected values come from the old app (parity/expected/engine-geometry/util).

/** Recorded from the old bundle's GUtil.compressString (vendor module 11 with its pako). */
const oldCompressed = JSON.parse(
  readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), "__fixtures__/old-compress-string.json"),
    "utf8",
  ),
) as { text: string; compressed: string }[];

describe("numbers", () => {
  it("formats with rounding, digits and a separator", () => {
    const cases: [number, string[]][] = [
      [0.5, ["0.5", "1", "0,5", "0.5"]],
      [1.005, ["1.005", "1", "1", "1.005"]],
      [2.675, ["2.675", "3", "2,7", "2.675"]],
      [-2.675, ["-2.675", "-3", "-2,7", "-2.675"]],
      [1234.5678, ["1234.568", "1235", "1234,6", "1234.5678"]],
      [1e21, ["1e+21", "1e+21", "1e+21", "1e+21"]],
      [1e-7, ["0", "0", "0", "0"]],
      [NaN, ["NaN", "NaN", "NaN", "NaN"]],
    ];
    for (const [n, expected] of cases) {
      expect([
        Util.formatNumber(n),
        Util.formatNumber(n, 0),
        Util.formatNumber(n, 1, ","),
        Util.formatNumber(n, 5),
      ]).toEqual(expected);
    }
    expect([0, 0.5, 1, 0.123456].map(Util.formatOpacity)).toEqual(["0", "0.5", "1", "0.1"]);
  });

  it("parses with the last separator as the decimal point", () => {
    const inputs = [
      "",
      null,
      "1",
      "1.5",
      "1,5",
      "1.234,5",
      "1,234.5",
      "-2,5",
      "abc",
      "12px",
      " 3 ",
    ];
    expect(inputs.map((s) => Util.parseNumber(s))).toEqual([
      NaN,
      NaN,
      1,
      1.5,
      1.5,
      1.234,
      1,
      -2.5,
      NaN,
      12,
      3,
    ]);
    expect(Util.parseNumber("1.2.3")).toBe(1.2);
  });

  it("tests numeric strings the old way", () => {
    const inputs = ["1", "1.5", "abc", "", " ", "1e3", "-3", "12px", "0x10"];
    expect(inputs.map(Util.isNumeric)).toEqual([
      true,
      true,
      false,
      false,
      false,
      true,
      true,
      false,
      true,
    ]);
  });

  it("formats six hex digits", () => {
    expect([0, 255, 0xabcdef, 0x1234567, 16].map(Util.numToHexSixDigitsString)).toEqual([
      "000000",
      "0000FF",
      "ABCDEF",
      "123456",
      "000010",
    ]);
  });
});

describe("packing", () => {
  it("packs points as float32", () => {
    expect(Util.packPoint(0.1, 0.2)).toBe("zczMPc3MTD4=");
    expect(Util.packPoint(16777217, 3.4e38)).toBe("AACAS57Jf38=");
    expect(Array.from(Util.unpackPoint("een2QsVARcQ="))).toEqual([
      Math.fround(123.456),
      Math.fround(-789.012),
    ]);
  });

  it("returns the same array from every unpackPoint call", () => {
    const first = Util.unpackPoint("AACAPwAAgL8=");
    const second = Util.unpackPoint("AAAAAAAAAAA=");
    expect(first).toBe(second);
    expect(Array.from(first)).toEqual([0, 0]);
  });

  it("unpacks numbers over the base64 length, with extra entries", () => {
    expect(Util.packNumbers(1)).toBe("AACAPw==");
    expect(Util.unpackNumbers("AACAPw==")).toEqual([1, 0]);
    expect(Util.packNumbers(1, 2, 3)).toBe("AACAPwAAAEAAAEBA");
    expect(Util.unpackNumbers("AACAPwAAAEAAAEBA")).toEqual([1, 2, 3, 0]);
    expect(Util.unpackNumbers(Util.packNumbers(0.1, -0.2, 300.5, 7))).toEqual([
      0.10000000149011612, -0.20000000298023224, 300.5, 7, 0, 0,
    ]);
    expect(Util.packNumbers()).toBe("");
    expect(Util.unpackNumbers("")).toEqual([]);
  });
});

describe("equals", () => {
  it("compares the way the old engine did", () => {
    expect([
      Util.equals(1, 1),
      Util.equals(1, 1 + 1e-15),
      Util.equals(1, 1.1),
      Util.equals(1, 1.05, false, 0.1),
      Util.equals(NaN, NaN),
      Util.equals("a", "a"),
      Util.equals("a", "b"),
      Util.equals(true, true),
      Util.equals([1, [2, 3]], [1, [2, 3]]),
      Util.equals([1, 2], [1, 2, 3]),
      Util.equals({ a: 1 }, { a: 1 }),
      Util.equals({ a: 1 }, { a: 1 }, true),
      Util.equals({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] }, true),
      Util.equals({ a: 1 }, { b: 1 }, true),
      Util.equals(new Date(5), new Date(5)),
      Util.equals(null, null),
      Util.equals(null, undefined),
      Util.equals(0, null),
      Util.equals(new Point(1, 2), new Point(1, 2)),
      Util.equals(new Rect(1, 2, 3, 4), new Rect(1, 2, 3, 4)),
      Util.equals(new Rect(1, 2, 3, 4), new Point(1, 2)),
      Util.equals(1, "1"),
    ]).toEqual([
      true,
      true,
      false,
      true,
      false,
      true,
      false,
      true,
      true,
      false,
      false,
      true,
      true,
      false,
      true,
      true,
      false,
      false,
      true,
      true,
      false,
      false,
    ]);
    expect(Util.indexOfEquals([1, [2], { a: 1 }], [2])).toBe(1);
    expect(Util.indexOfEquals([{ a: 1 }], { a: 1 }, true)).toBe(0);
    expect(Util.indexOfEquals([], 1)).toBe(-1);
  });
});

describe("helpers", () => {
  afterEach(() => vi.restoreAllMocks());

  it("makes ids from Math.random", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.999);
    expect(Util.uuid(3)).toBe("zzz");
    expect(Util.uuid().length).toBe(32);
    expect(Util.uuid(0).length).toBe(32);
  });

  it("escapes and replaces", () => {
    expect(["<b>x</b>", "", null, "a & b", "<<>>"].map((s) => Util.xss(s))).toEqual([
      "&lt;b&gt;x&lt;/b&gt;",
      "",
      null,
      "a & b",
      "&lt;&lt;&gt;&gt;",
    ]);
    expect(Util.escape(`<a href="x">'&'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&#039;&amp;&#039;&lt;/a&gt;",
    );
    expect(Util.unescape("&lt;a&gt; &amp;lt; &quot;&#039;")).toBe("<a> &lt; \"'");
    expect(Util.replaceAll("a.b.c", ".", "/")).toBe("a/b/c");
    expect(Util.replaceMicrosoftLineFeed("a\r\nb\r\n")).toBe("a\nb\n");
    expect(Util.replaceMicrosoftLineFeed(5)).toBe(5);
  });

  it("dedupes and hashes", () => {
    expect(Util.unique([1, 2, 2, "2", 3, 1])).toEqual([1, 2, 3]);
    expect(Util.unique(null)).toBeNull();
    const o = { a: 1 };
    expect(Util.uniqueObj([o, 1, o, 2, 1])).toEqual([o, 1, 2]);
    expect(["", "a", "hello world", "Gravit"].map(Util.hash)).toEqual([
      0, 97, 1794106052, 2140957611,
    ]);
  });

  it("extends shallowly and deeply", () => {
    expect(Util.extend({ a: 1, b: { c: 2 } }, { b: { d: 3 }, e: 4 })).toEqual({
      a: 1,
      b: { d: 3 },
      e: 4,
    });
    const source = { list: [1, { x: 2 }] };
    const copy = Util.extend(true, {}, source) as typeof source;
    expect(copy).toEqual(source);
    expect(copy.list).not.toBe(source.list);
    expect(copy.list[1]).not.toBe(source.list[1]);
    expect(Util.extend(null, { a: 1 })).toEqual({ a: 1 });
  });

  it("searches", () => {
    expect(Util.containsOneOf([1, 2, 3], [5, 3])).toBe(true);
    expect(Util.containsOneOf([1, 2, 3], [5])).toBe(false);
    expect(Util.containsObjectKey(["a", "b"], { c: 1, b: 2 })).toBe(true);
    expect(Util.dictionaryContainsValue({ a: 1, b: 2 }, 2)).toBe(true);
    expect(Util.dictionaryContainsValue({ a: 1 }, "1")).toBe(false);
    expect(Util.find([1, 2, 3], (x) => x > 1)).toBe(2);
    expect(Util.find([1], (x) => x > 1)).toBeNull();
  });

  it("finds the keys a for-in loop would list, on plain tables and others", () => {
    const table = { tp: "R", x: 0, y: 0 };
    expect(Util.containsObjectKey(["hlx", "y"], table)).toBe(true);
    expect(Util.containsObjectKey(["hlx", "toString", "constructor"], table)).toBe(false);
    expect(Util.containsObjectKey([], table)).toBe(false);
    // for-in lists string keys only, so a number never matches "1".
    expect(Util.containsObjectKey([1], { "1": true })).toBe(false);
    expect(Util.containsObjectKey(["1"], { "1": true })).toBe(true);
    // Not enumerated, not found.
    const hidden = { a: 1 };
    Object.defineProperty(hidden, "b", { value: 2, enumerable: false });
    expect(Util.containsObjectKey(["b"], hidden)).toBe(false);
    // Inherited keys count, with a prototype or without one.
    expect(Util.containsObjectKey(["x"], Object.create(table) as object)).toBe(true);
    const bare = Object.create(null) as Record<string, unknown>;
    bare["x"] = 1;
    expect(Util.containsObjectKey(["x"], bare)).toBe(true);
    expect(Util.containsObjectKey(["y"], bare)).toBe(false);
  });

  it("maps and iterates arrays and objects", () => {
    expect(Util.map([1, 2], (v, i) => v * 10 + i)).toEqual([10, 21]);
    expect(Util.map({ a: 1, b: 2 }, (v, k) => k + v)).toEqual(["a1", "b2"]);
    const seen: unknown[] = [];
    Util.each(["x", "y"], (k, v) => seen.push([k, v]));
    Util.each({ p: 1 }, (k, v) => seen.push([k, v]));
    expect(seen).toEqual([
      [0, "x"],
      [1, "y"],
      ["p", 1],
    ]);
  });

  it("sorts stably in place", () => {
    const list = [5, 3, 9, 1, 3, 7];
    expect(Util.bubbleSort(list, (a, b) => (a < b ? -1 : a > b ? 1 : 0))).toBe(list);
    expect(list).toEqual([1, 3, 3, 5, 7, 9]);
  });

  it("base64 encodes unicode", () => {
    expect(Util.base64EncodeUnicode("Grüße ✓")).toBe("R3LDvMOfZSDinJM=");
    expect(Util.base64DecodeUnicode("R3LDvMOfZSDinJM=")).toBe("Grüße ✓");
    expect(() => Util.base64EncodeUnicode(5 as unknown as string)).toThrow();
  });

  it.each(oldCompressed)(
    "compresses $text with pako like the old bundle",
    ({ text, compressed }) => {
      // The deflated binary string goes through base64EncodeUnicode, so every
      // byte above 0x7f is UTF-8 encoded before base64 (old quirk).
      expect(Util.compressString(text)).toBe(compressed);
      expect(Util.decompressString(compressed)).toBe(text);
    },
  );

  it("compresses through a replaced codec", () => {
    setStringCompression({
      deflate: (text) => text.split("").reverse().join(""),
      inflate: (text) => text.split("").reverse().join(""),
    });
    try {
      const packed = Util.compressString("abc ä");
      expect(packed).toBe(Util.base64EncodeUnicode("ä cba"));
      expect(Util.decompressString(packed)).toBe("abc ä");
    } finally {
      setStringCompression();
    }
    expect(Util.compressString("abc ä")).toBe("eMKcS0xKVjjCvAQACEwCwq4=");
  });
});

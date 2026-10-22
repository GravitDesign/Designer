import { paritySuite } from "../../support/suite.ts";
import { defineScenarios, geo } from "./lib.ts";

// GLength (units, conversion, typed math) and the GUtil helpers the model
// relies on for numbers and packing.
const scenarios = defineScenarios([
  geo("length/units", ["ENG-GEOM-012"], (L, G) => {
    const units = Object.keys(G.GLength.Unit).map((k) => G.GLength.Unit[k]);
    const values = [0, 1, -1, 2.5, 72, 100, 1e-6, 123456.789, ...L.floats(61, 6, -1000, 1000)];
    const convert = [];
    for (const u of units) {
      for (const v of values) {
        const l = new G.GLength(v, u);
        convert.push({
          v,
          u,
          value: l.getValue(),
          unit: l.getUnit(),
          pt: L.enc(l.toPoint()),
          to: units.map((t: string) => L.enc(l.toUnit(t))),
          convert: L.enc([
            l.convert("mm").getValue(),
            l.convert("mm").getUnit(),
            l.convert(u).getValue(),
          ]),
          str: [l.toString(), l.toString(1), l.toString(0)],
        });
      }
    }
    return {
      unitEnum: G.GLength.Unit,
      defaultUnit: G.GLength.DEFAULT_UNIT,
      dpi: G.GLength.DPI,
      defaultCtor: [new G.GLength(5).getUnit(), new G.GLength().getValue() ?? "null"],
      convert,
    };
  }),
  geo("length/parse", ["ENG-GEOM-012"], (L, G) => {
    const inputs = [
      "",
      "   ",
      null,
      "10",
      "10px",
      "10 px",
      "10pt",
      "10pc",
      "1in",
      "25.4mm",
      "2.54cm",
      "1m",
      "1 m",
      "1km",
      "1ft",
      "3PT",
      " 12.5 MM ",
      "12,5mm",
      "1.234,5px",
      "-3in",
      "+4px",
      ".5in",
      "abc",
      "10xyz",
      "1e3px",
      "1,000.5",
      "0",
    ];
    return inputs.map((s) => {
      const a = G.GLength.parseLength(s);
      const b = G.GLength.parseLength(s, "mm");
      return {
        in: s,
        px: a ? [L.enc(a.getValue()), a.getUnit()] : a,
        mm: b ? [L.enc(b.getValue()), b.getUnit()] : b,
      };
    });
  }),
  geo("length/equation", ["ENG-GEOM-012"], (L, G) => {
    const exprs = [
      "1+2",
      "1 + 2 * 3",
      "(1 + 2) * 3",
      "10 / 4",
      "10 / 0",
      "-5",
      "+5",
      "--5",
      "2 * -3",
      "1in + 1mm",
      "1in - 10pt",
      "2cm * 2",
      "pi",
      "phi * 2",
      "sqrt(16)",
      "abs(-3) + floor(2.7) + ceil(2.1)",
      "sin(0) + cos(0)",
      "atan(1) * 4",
      "exp(1)",
      "ln(2)",
      "x = 5",
      "unknown",
      "foo(1)",
      "1 +",
      "(1",
      "1 2",
      "",
      "3.5mm",
      "100%",
      "10px*3+2pt",
      "tan(pi/4)",
      "acos(1)+asin(0)",
    ];
    const len = (l: { getValue(): number; getUnit(): string } | null) =>
      l ? [L.enc(l.getValue()), l.getUnit()] : l;
    return exprs.map((e) => ({
      in: e,
      px: L.run(() => len(G.GLength.parseEquation(e))),
      mm: L.run(() => len(G.GLength.parseEquation(e, "mm"))),
      value: L.run(() => G.GLength.parseEquationValue(e)),
    }));
  }),
  geo("util/numbers", ["ENG-GEOM-004"], (L, G) => {
    const U = G.GUtil;
    const nums = [
      0,
      1,
      -1,
      0.5,
      1.005,
      2.675,
      -2.675,
      1234.5678,
      1e21,
      1e-7,
      3.14159,
      100,
      NaN,
      Infinity,
    ];
    return {
      formatNumber: nums.map((n) => [
        U.formatNumber(n),
        U.formatNumber(n, 0),
        U.formatNumber(n, 1, ","),
        U.formatNumber(n, 5),
      ]),
      parseNumber: [
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
        "1.2.3",
      ].map((s) => L.enc(U.parseNumber(s))),
      isNumeric: ["1", "1.5", "abc", "", " ", "1e3", "-3", "12px", "0x10"].map((s) =>
        U.isNumeric(s),
      ),
      hex: [0, 255, 0xabcdef, 0x1234567, 16].map((n) => U.numToHexSixDigitsString(n)),
      formatOpacity: [0, 0.5, 1, 0.123456].map((n) => L.run(() => U.formatOpacity(n))),
    };
  }),
  geo("util/packing", ["ENG-GEOM-004"], (L, G) => {
    const U = G.GUtil;
    const pts = [
      [0, 0],
      [1, -1],
      [0.1, 0.2],
      [123.456, -789.012],
      [1e10, -1e-10],
      [16777217, 3.4e38],
      ...[0, 1, 2, 3, 4, 5].map((i) => L.floats(62 + i, 2, -1e4, 1e4)),
    ];
    return {
      points: pts.map(([x, y]) => {
        const packed = U.packPoint(x, y);
        return { in: [x, y], packed, unpacked: L.enc(Array.from(U.unpackPoint(packed))) };
      }),
      numbers: [[1], [1, 2, 3], [0.1, -0.2, 300.5, 7], []].map((list) => {
        const packed = U.packNumbers(...list);
        // unpackNumbers walks the base64 string length, not the decoded
        // length, so it returns extra entries; that is recorded as is.
        return { in: list, packed, unpacked: L.run(() => U.unpackNumbers(packed)) };
      }),
    };
  }),
  geo("util/helpers", ["ENG-GEOM-004"], (L, G) => {
    const U = G.GUtil;
    const ids = [U.uuid(), U.uuid(6), U.uuid(1)];
    return {
      uuidShape: ids.map((id) => [id.length, /^[0-9A-Za-z]+$/.test(id)]),
      xss: ["<b>x</b>", "", null, "a & b", "<<>>"].map((s) => U.xss(s)),
      escape: U.escape(`<a href="x">'&'</a>`),
      unescape: U.unescape("&lt;a&gt; &amp;lt; &quot;&#039;"),
      replaceAll: U.replaceAll("a.b.c", ".", "/"),
      unique: [U.unique([1, 2, 2, "2", 3, 1]), U.unique(null)],
      uniqueObj: (() => {
        const o = { a: 1 };
        return U.uniqueObj([o, 1, o, 2, 1]).length;
      })(),
      hash: ["", "a", "hello world", "Gravit"].map((s) => U.hash(s)),
      equals: [
        U.equals(1, 1),
        U.equals(1, 1 + 1e-15),
        U.equals(1, 1.1),
        U.equals(1, 1.05, false, 0.1),
        U.equals(NaN, NaN),
        U.equals("a", "a"),
        U.equals("a", "b"),
        U.equals(true, true),
        U.equals([1, [2, 3]], [1, [2, 3]]),
        U.equals([1, 2], [1, 2, 3]),
        U.equals({ a: 1 }, { a: 1 }),
        U.equals({ a: 1 }, { a: 1 }, true),
        U.equals({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] }, true),
        U.equals({ a: 1 }, { b: 1 }, true),
        U.equals(new Date(5), new Date(5)),
        U.equals(null, null),
        U.equals(null, undefined),
        U.equals(0, null),
        U.equals(new G.GPoint(1, 2), new G.GPoint(1, 2)),
        U.equals(new G.GRect(1, 2, 3, 4), new G.GRect(1, 2, 3, 4)),
        U.equals(new G.GRect(1, 2, 3, 4), new G.GPoint(1, 2)),
        U.equals(1, "1"),
      ],
      indexOfEquals: [
        U.indexOfEquals([1, [2], { a: 1 }], [2]),
        U.indexOfEquals([{ a: 1 }], { a: 1 }, true),
        U.indexOfEquals([], 1),
      ],
      extend: [
        U.extend({ a: 1, b: { c: 2 } }, { b: { d: 3 }, e: 4 }),
        U.extend(true, { a: 1, b: { c: 2 } }, { b: { d: 3 }, e: 4 }),
        U.extend({}, { a: [1, 2] }, { b: 5 }),
      ],
      contains: [
        U.containsOneOf([1, 2, 3], [5, 3]),
        U.containsOneOf([1, 2, 3], [5]),
        U.containsObjectKey(["a", "b"], { c: 1, b: 2 }),
        U.dictionaryContainsValue({ a: 1, b: 2 }, 2),
        U.dictionaryContainsValue({ a: 1 }, "1"),
      ],
      bubbleSort: U.bubbleSort([5, 3, 9, 1, 3, 7], (a: number, b: number) =>
        a < b ? -1 : a > b ? 1 : 0,
      ),
      base64: [
        U.base64EncodeUnicode("Grüße ✓"),
        U.base64DecodeUnicode(U.base64EncodeUnicode("Grüße ✓")),
      ],
      compress: (() => {
        const s = "abcabcabc äöü 12345 ".repeat(10);
        const c = U.compressString(s);
        return [c, U.decompressString(c) === s];
      })(),
      lineFeed: [U.replaceMicrosoftLineFeed("a\r\nb\r\n"), U.replaceMicrosoftLineFeed(5)],
      sanitize: ['a/b\\c:d*e?f"g<h>i|j', "normal.gvdesign", "  "].map((s) =>
        L.run(() => U.sanitizeFilename(s)),
      ),
    };
  }),
]);

paritySuite("engine-geometry length and util", scenarios, { newApp: false });

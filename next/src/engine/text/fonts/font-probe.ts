// Test support: runs the font API over the bundled fonts and returns plain
// data. The same function runs against the old bundle (in Node, outside
// the repo) to record __fixtures__/old-fonts.json, against the port in
// open-type-font.test.ts, and in both apps' pages for the engine-model
// fonts parity scenario (sent as source text). So it may only use what it
// is given: no imports and no module-level names inside probeFonts.
/* eslint-disable @typescript-eslint/no-explicit-any -- drives the old and the new engine through the same untyped surface */

export interface ProbeApi {
  GOpenTypeFont: any;
  GOpenTypeUtil: any;
  /** The bytes of a font under public/assets/font. */
  readFont(name: string): ArrayBuffer;
}

/** Fonts whose names, glyph API and shaping are recorded. */
export const PROBE_FONTS = [
  "OpenSans-Regular.ttf",
  "OpenSans-Bold.ttf",
  "OpenSans-SemiBoldItalic.ttf",
  "OpenSans-ExtraBold.ttf",
  "OpenSans-Light.ttf",
  "OpenSans-LightItalic.ttf",
  "noto/NotoSansArabic-Regular.ttf",
  "noto/NotoSansArabic-Bold.ttf",
  "noto/NotoSansHebrew-Regular.ttf",
  "noto/NotoSansDevanagari-Regular.ttf",
  "noto/NotoSansThai-Regular.ttf",
  "noto/NotoSansMyanmar-Regular.ttf",
  "noto/NotoSansCJKjp-Regular.otf",
];

/** Fonts whose name records only are read (every other bundled font file). */
export const NAME_ONLY_FONTS = [
  "OpenSans-BoldItalic.ttf",
  "OpenSans-ExtraBoldItalic.ttf",
  "OpenSans-Italic.ttf",
  "OpenSans-SemiBold.ttf",
  "Lato-Regular.woff2",
  "gravit-designer.ttf",
  "gravit-designer.woff",
  "chinese-simplified/NotoSansCJKsc-Regular.otf",
  "noto/NotoSansAdlam-Regular.ttf",
  "noto/NotoSansArmenian-Bold.ttf",
  "noto/NotoSansCherokee-Regular.ttf",
  "noto/NotoSansCJKkr-Bold.otf",
  "noto/NotoSansKhmer-Regular.ttf",
  "noto/NotoSansSyriacEastern-Regular.ttf",
  "noto/NotoSansTibetan-Bold.ttf",
  "noto/NotoSansYi-Regular.ttf",
  "noto/undetected/NotoSansTaiLe-Regular.ttf",
];

export const TEXTS: [string, string[]][] = [
  ["OpenSans-Regular.ttf", ["Hello world", "office flow", "1/2 3/4", "AVATAR To", "éà", " ", "x"]],
  ["OpenSans-Bold.ttf", ["Hello", "fi fl"]],
  ["noto/NotoSansArabic-Regular.ttf", ["مرحبا بالعالم", "مرحبا", "لا", "العربية ١٢٣ abc"]],
  ["noto/NotoSansArabic-Bold.ttf", ["بِسْمِ اللَّهِ"]],
  ["noto/NotoSansHebrew-Regular.ttf", ["שלום עולם", "שָׁלוֹם"]],
  ["noto/NotoSansDevanagari-Regular.ttf", ["नमस्ते दुनिया"]],
  ["noto/NotoSansThai-Regular.ttf", ["สวัสดีชาวโลก"]],
  ["noto/NotoSansMyanmar-Regular.ttf", ["မင်္ဂလာပါ"]],
  ["noto/NotoSansCJKjp-Regular.otf", ["日本語のテキスト", "ｶﾀｶﾅ"]],
];

export const OPTION_SETS: Record<string, any> = {
  plain: {},
  sized: { size: 20 },
  letterSpacing: { size: 24, letterSpacing: 3 },
  ligaAuto: { size: 24, letterSpacing: 2, features: { liga: "auto", rlig: "auto" } },
  noLiga: { size: 24, features: { liga: false } },
  frac: { size: 24, features: { frac: true } },
  noghb: { size: 24, noghb: true },
  noreverse: { size: 24, noreverse: true },
  generateText: { size: 24, generateText: true },
  scriptArabic: { size: 24, script: "ARABIC" },
  scriptLatin: { size: 24, script: "LATIN" },
  scriptAuto: { size: 24, script: "auto" },
  languageTurkish: { size: 24, language: "TRK " },
  languageArabic: { size: 24, language: "ARA " },
  stylisticSet: { size: 24, features: { stylisticSet: "ss01" } },
  variant: { size: 24, variant: '{"wght":700}' },
  badVariant: { size: 24, variant: "{oops" },
  kerning: { size: 24, kerning: true },
};

/** What the probe goes through; the defaults are the full lists above. */
export interface ProbeLists {
  probeFonts: readonly string[];
  nameOnlyFonts: readonly string[];
  texts: readonly [string, readonly string[]][];
  optionSets: Record<string, any>;
}

export const FULL_PROBE: ProbeLists = {
  probeFonts: PROBE_FONTS,
  nameOnlyFonts: NAME_ONLY_FONTS,
  texts: TEXTS,
  optionSets: OPTION_SETS,
};

/** Fonts the collection and resource-fork parts read besides the listed ones. */
export const PROBE_EXTRA_FONTS = ["OpenSans-Light.ttf", "OpenSans-Bold.ttf", "OpenSans-Italic.ttf"];

export function probeFonts(api: ProbeApi, lists: ProbeLists): Record<string, unknown> {
  const F = api.GOpenTypeFont;
  const U = api.GOpenTypeUtil;
  const attempt = (fn: () => any): any => {
    try {
      const value = fn();
      return value === undefined ? "<undefined>" : value;
    } catch (e) {
      return "<throws " + (e as Error).name + ">";
    }
  };
  const rect = (r: any) => (r ? [r.getX(), r.getY(), r.getWidth(), r.getHeight()] : null);
  const vertices = (source: any) => {
    const out: any[] = [];
    if (!source.rewindVertices(0)) return out;
    const v: any = {};
    while (source.readVertex(v))
      out.push([v.command, v.x === undefined ? "u" : v.x, v.y === undefined ? "u" : v.y]);
    return out;
  };
  const glyphs = (list: any[]) =>
    list.map((g) => [
      g.glyph ? g.glyph.index : null,
      g.x,
      g.y,
      g.text === undefined ? "u" : g.text,
      g.kerning === undefined ? "u" : g.kerning,
      g.xOff === undefined ? "u" : g.xOff,
    ]);
  const out: Record<string, unknown> = {};

  // Names.
  const info: Record<string, unknown> = {};
  for (const name of [...lists.probeFonts, ...lists.nameOnlyFonts]) {
    const bytes = api.readFont(name);
    info[name] = {
      info: attempt(() => U.getOpenTypeInfo(bytes)),
      raw: attempt(() => U._getOpenTypeInfo(bytes, 0)),
      cmapCheck: attempt(() => U._getOpenTypeInfo(bytes, 0, true)),
      listed: attempt(() =>
        (U.getFont("", null, null, bytes, true, true) || []).map((e: any) => [
          e.family,
          e.weight,
          e.style,
          e.subfamily === undefined ? "u" : e.subfamily,
          e.displayname === undefined ? "u" : e.displayname,
          e.buffer === null,
        ]),
      ),
      parserType: attempt(() => new U.Parser(bytes)._type),
    };
  }
  out.info = info;

  // A collection of two fonts, built the way .ttc files are laid out.
  const collection = (names: string[]) => {
    const parts = names.map((n) => new Uint8Array(api.readFont(n)));
    const header = 12 + 4 * parts.length;
    const offsets: number[] = [];
    let total = header;
    for (const p of parts) {
      offsets.push(total);
      total += p.length + ((4 - (p.length % 4)) % 4);
    }
    const bytes = new Uint8Array(total);
    const view = new DataView(bytes.buffer);
    bytes.set([0x74, 0x74, 0x63, 0x66], 0);
    view.setUint32(4, 0x00010000);
    view.setUint32(8, parts.length);
    parts.forEach((p, i) => {
      const at = offsets[i] as number;
      view.setUint32(12 + 4 * i, at);
      bytes.set(p, at);
      const tables = view.getUint16(at + 4);
      for (let t = 0; t < tables; t++) {
        const field = at + 12 + 16 * t + 8;
        view.setUint32(field, view.getUint32(field) + at);
      }
    });
    return bytes.buffer;
  };
  const ttc = collection(["OpenSans-Light.ttf", "OpenSans-Bold.ttf"]);
  out.collection = {
    type: new U.Parser(ttc)._type,
    listed: attempt(() =>
      U.getFont("", null, null, ttc, true, true).map((e: any) => [e.family, e.weight, e.style]),
    ),
    bold: attempt(() =>
      U.getFont("Open Sans", "N", 700, ttc).map((e: any) => [
        e.family,
        e.weight,
        (e.buffer as ArrayBuffer).byteLength,
      ]),
    ),
    missing: attempt(() => U.getFont("Open Sans", "I", 700, ttc).length),
    font: attempt(() => {
      const f = F.create("Open Sans", "N", 700, ttc);
      return [f.getFamily(), f.getAdvance(20, "W"), glyphs(f.stringToGlyphs("Hi", 0, 0, 20, {}))];
    }),
  };
  // The table directory of a font buffer (ArrayBuffer or DataView).
  const tables = (font: any) => {
    if (!font) return null;
    const view =
      font instanceof DataView
        ? font
        : new DataView(font instanceof ArrayBuffer ? font : font.buffer);
    const count = view.getUint16(4);
    const out: any[] = [view.byteLength];
    for (let t = 0; t < count; t++) {
      const at = 12 + 16 * t;
      out.push([
        String.fromCharCode(
          view.getUint8(at),
          view.getUint8(at + 1),
          view.getUint8(at + 2),
          view.getUint8(at + 3),
        ),
        view.getUint32(at + 8),
        view.getUint32(at + 12),
      ]);
    }
    return out;
  };
  out.collectionTables = attempt(() =>
    U.getFont("", null, null, ttc, true).map((e: any) => [e.family, e.weight, tables(e.buffer)]),
  );
  // The same collection with its offset list in reverse order: the fonts
  // are still visited in file order.
  const reversed = ttc.slice(0);
  {
    const view = new DataView(reversed);
    const first = view.getUint32(12);
    view.setUint32(12, view.getUint32(16));
    view.setUint32(16, first);
  }
  out.collectionReversed = {
    listed: attempt(() =>
      U.getFont("", null, null, reversed, true, true).map((e: any) => [e.family, e.weight]),
    ),
    light: attempt(() =>
      U.getFont("Open Sans Light", "N", 400, reversed).map((e: any) => [
        e.family,
        tables(e.buffer),
      ]),
    ),
  };

  // A Mac resource fork (.dfont) with a FOND resource and two sfnt
  // resources: the first in the reference list is stored second and has a
  // name, the second has none.
  const resourceFork = () => {
    const fond = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const bold = new Uint8Array(api.readFont("OpenSans-Bold.ttf"));
    const italic = new Uint8Array(api.readFont("OpenSans-Italic.ttf"));
    const dataStart = 256;
    const fondAt = 0;
    const boldAt = fondAt + 4 + fond.length;
    const italicAt = boldAt + 4 + bold.length;
    const dataLength = italicAt + 4 + italic.length;
    const name = "Open Sans Italic";
    const typeList = 2 + 8 * 2;
    const refs = 12 * 3;
    const mapLength = 28 + typeList + refs + 1 + name.length;
    const mapStart = dataStart + dataLength;
    const bytes = new Uint8Array(mapStart + mapLength);
    const view = new DataView(bytes.buffer);
    const header = [dataStart, mapStart, dataLength, mapLength];
    header.forEach((value, i) => {
      view.setUint32(4 * i, value);
      view.setUint32(mapStart + 4 * i, value);
    });
    const putData = (at: number, data: Uint8Array) => {
      view.setUint32(dataStart + at, data.length);
      bytes.set(data, dataStart + at + 4);
    };
    putData(fondAt, fond);
    putData(boldAt, bold);
    putData(italicAt, italic);
    view.setUint16(mapStart + 24, 28);
    view.setUint16(mapStart + 26, 28 + typeList + refs);
    const types = mapStart + 28;
    view.setUint16(types, 1);
    const putType = (at: number, tag: string, count: number, refOffset: number) => {
      for (let c = 0; c < 4; c++) view.setUint8(at + c, tag.charCodeAt(c));
      view.setUint16(at + 4, count - 1);
      view.setUint16(at + 6, refOffset);
    };
    putType(types + 2, "FOND", 1, typeList);
    putType(types + 10, "sfnt", 2, typeList + 12);
    const putRef = (at: number, id: number, nameOffset: number, dataOffset: number) => {
      view.setUint16(at, id);
      view.setInt16(at + 2, nameOffset);
      view.setUint8(at + 4, 0);
      view.setUint8(at + 5, (dataOffset >> 16) & 0xff);
      view.setUint16(at + 6, dataOffset & 0xffff);
      view.setUint32(at + 8, 0);
    };
    putRef(types + typeList, 128, -1, fondAt);
    putRef(types + typeList + 12, 129, 0, italicAt);
    putRef(types + typeList + 24, 130, -1, boldAt);
    const names = types + typeList + refs;
    view.setUint8(names, name.length);
    for (let c = 0; c < name.length; c++) view.setUint8(names + 1 + c, name.charCodeAt(c));
    return bytes.buffer;
  };
  const dfont = resourceFork();
  out.resourceFork = {
    type: attempt(() => new U.Parser(dfont)._type),
    info: attempt(() => U.getOpenTypeInfo(dfont)),
    listed: attempt(() =>
      U.getFont("", null, null, dfont, true, true).map((e: any) => [
        e.family,
        e.weight,
        e.style,
        e.buffer === null,
      ]),
    ),
    all: attempt(() =>
      U.getFont("", null, null, dfont, true).map((e: any) => [e.family, e.style, tables(e.buffer)]),
    ),
    italic: attempt(() =>
      U.getFont("Open Sans", "I", 400, dfont).map((e: any) => [e.family, e.buffer.byteLength]),
    ),
    missing: attempt(() => U.getFont("Open Sans", "N", 400, dfont).length),
    names: attempt(() => {
      const parser = new U.Parser(dfont);
      parser.getFont("", null, null, true, true);
      return parser._parsedStruct.map.typeList.types.map((t: any) => [
        t.name,
        t.refList.map((r: any) => [r.id, r.nameOffset, r.dataOffset, r.name ?? null]),
      ]);
    }),
    font: attempt(() => {
      const f = F.create("Open Sans", "N", 700, dfont);
      return f
        ? [f.getFamily(), f.getAdvance(20, "W"), glyphs(f.stringToGlyphs("Hi", 0, 0, 20, {}))]
        : null;
    }),
  };

  const tiny = new Uint8Array([0, 1, 0, 0, 0, 3]).buffer;
  out.odd = {
    tiny: attempt(() => [
      new U.Parser(tiny)._type,
      U.getOpenTypeInfo(tiny),
      U._getOpenTypeInfo(tiny, 0, true),
    ]),
    empty: attempt(() => [
      new U.Parser(new ArrayBuffer(0))._type,
      U.getOpenTypeInfo(new ArrayBuffer(0)),
    ]),
    view: attempt(() => U.getOpenTypeInfo(new DataView(api.readFont("OpenSans-Bold.ttf")))),
    nullData: attempt(() => U.getFont("x", "N", 400, null)),
    noFont: attempt(() => F.create("x", "N", 400, tiny)),
  };

  // Script, direction and language helpers.
  const strings = [
    "abc",
    "مرحبا",
    "שלום",
    "中文",
    "",
    "123",
    " ",
    "ｶﾀｶﾅ",
    "！",
    "é",
    "Ελληνικά",
    "Привет",
    "한국어",
    "ひらがな",
    "ᚠᚢᚦ",
    "̀",
  ];
  out.direction = strings.map((s) => attempt(() => F.getDirectionForString(s)));
  out.script = strings.map((s) => attempt(() => F.getScriptForString(s)));
  out.bcp47 = ["DEU ", "ENG ", "ARA ", "TRK ", "ZHS ", "ZHT ", "JAN ", "XXXX", "dflt", "DEU"].map(
    (t) => attempt(() => F.openTypeLanguageSystemTagStringToBCP47(t)),
  );
  out.scriptTags = ["LATIN", "ARABIC", "HAN", "CYRILLIC", "HEBREW", "NKO", "INVALID", "NOPE"].map(
    (n) => attempt(() => F.scriptNameToOpenTypeScriptTagString(n)),
  );

  // Glyph API and shaping.
  const fonts: Record<string, unknown> = {};
  for (const name of lists.probeFonts) {
    const f = F.create("Probe", "N", 400, api.readFont(name));
    if (!f) {
      fonts[name] = null;
      continue;
    }
    const entry: Record<string, unknown> = {
      baseline: f.getGlyphBaseline(20),
      maxHeight: f.getMaxFontHeight(20),
      advance: ["A", "W", "i", " "].map((c) => attempt(() => f.getAdvance(20, c))),
      advanceKern: attempt(() => f.getAdvance(20, "V", "A")),
      lsb: attempt(() => f.getLeftSideBearing(20, "A")),
      bbox: attempt(() => rect(f.getGlyphBoundingRect(20, "A"))),
      bboxExact: attempt(() => rect(f.getGlyphBoundingRect(20, "A", true))),
      outline: attempt(() => vertices(f.getGlyphOutline(20, 3, 4, "g"))),
      outlineByIndexString: attempt(() => vertices(f.getGlyphOutline(10, 0, 0, "5")).length),
      unicode: ["A", "ا"].map((c) => attempt(() => f.getUnicode(c))),
      strikeout: attempt(() => [f.getStrikeoutPosition(20, 10, 1, 20), f.getStrikeoutWidth(20)]),
      features: ["smcp", "frac", "fvar", "stylisticset", "locl", "other"].map((x) =>
        attempt(() => f.hasFeature(x)),
      ),
      stylisticSets: attempt(() => f.getAvailableStylisticSets()),
      languageTags: attempt(() => f.getAvailableLanguageSystemTags()),
      scripts: attempt(() => f.getAvailableScripts()),
      variants: attempt(() => f.getAvailableVariants()),
      css: attempt(() => f.toCssProperties()),
      resolved: f.isResolved(),
    };
    const shaping: Record<string, unknown> = {};
    for (const [fontName, texts] of lists.texts) {
      if (fontName !== name) continue;
      for (const text of texts) {
        for (const [label, options] of Object.entries(lists.optionSets)) {
          const opts = JSON.parse(JSON.stringify(options));
          const size = opts.size;
          delete opts.size;
          shaping[text + " | " + label] = attempt(() =>
            glyphs(f.stringToGlyphs(text, 1, 2, size, opts)),
          );
          if (label === "languageArabic")
            shaping[text + " | " + label + " script"] = opts.script ?? "u";
        }
      }
    }
    // The variation and stylistic set stay on the cached HarfBuzz font.
    entry.allScripts = attempt(() => f.getAvailableScripts(true));
    entry.shaping = shaping;
    fonts[name] = entry;
  }
  out.fonts = fonts;
  return out;
}

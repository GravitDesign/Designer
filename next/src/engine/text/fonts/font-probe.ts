// Test support: runs the font API over the bundled fonts and returns plain
// data. The same function runs against the old bundle (in Node, outside
// the repo) to record __fixtures__/old-fonts.json and against the port in
// fonts.test.ts, so it may only use what it is given and no imports.
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

const TEXTS: [string, string[]][] = [
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

const OPTION_SETS: Record<string, any> = {
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

export function probeFonts(api: ProbeApi): Record<string, unknown> {
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
  for (const name of [...PROBE_FONTS, ...NAME_ONLY_FONTS]) {
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
  for (const name of PROBE_FONTS) {
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
    for (const [fontName, texts] of TEXTS) {
      if (fontName !== name) continue;
      for (const text of texts) {
        for (const [label, options] of Object.entries(OPTION_SETS)) {
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

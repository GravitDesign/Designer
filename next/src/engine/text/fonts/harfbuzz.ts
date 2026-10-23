// Old: chunk.vendor.js module 838 (the HarfBuzz wrapper, "GHarfBuzz").
/**
 * The thin layer over HarfBuzz that GOpenTypeFont shapes with: script and
 * direction tables, a text buffer and a font. It mirrors the old wrapper's
 * calls one to one, including what it got wrong (see the notes on
 * `HarfBuzzBuffer.getScript`, `DIRECTIONS.BBT` and `HarfBuzzFont.getGlyphs`).
 */
import { harfBuzzModule, type HeapValueType } from "../harfbuzz/harfbuzz-module.ts";

const hb = harfBuzzModule;
const api = hb.exports;

/** A four-character tag as HarfBuzz stores it (HB_TAG), as a signed 32-bit number. */
function makeTag(c1: string, c2: string, c3: string, c4: string): number {
  return (
    ((c1.charCodeAt(0) & 255) << 24) |
    ((c2.charCodeAt(0) & 255) << 16) |
    ((c3.charCodeAt(0) & 255) << 8) |
    (c4.charCodeAt(0) & 255)
  );
}

/** HarfBuzz's direction names (hb_direction_to_string). */
export const DIRECTIONS = {
  LTR: "ltr",
  RTL: "rtl",
  TTB: "ttb",
  // HarfBuzz calls it "btt"; the old table's typo means bottom-to-top text
  // never matches this entry. Kept, GOpenTypeFont.getDirectionForString
  // depends on it.
  BBT: "bbt",
} as const;

/** The script tags of HarfBuzz 2.2.0 by name, plus INVALID (0). */
export const SCRIPTS: Record<string, number> = {
  COMMON: makeTag("Z", "y", "y", "y"),
  INHERITED: makeTag("Z", "i", "n", "h"),
  UNKNOWN: makeTag("Z", "z", "z", "z"),
  ARABIC: makeTag("A", "r", "a", "b"),
  ARMENIAN: makeTag("A", "r", "m", "n"),
  BENGALI: makeTag("B", "e", "n", "g"),
  CYRILLIC: makeTag("C", "y", "r", "l"),
  DEVANAGARI: makeTag("D", "e", "v", "a"),
  GEORGIAN: makeTag("G", "e", "o", "r"),
  GREEK: makeTag("G", "r", "e", "k"),
  GUJARATI: makeTag("G", "u", "j", "r"),
  GURMUKHI: makeTag("G", "u", "r", "u"),
  HANGUL: makeTag("H", "a", "n", "g"),
  HAN: makeTag("H", "a", "n", "i"),
  HEBREW: makeTag("H", "e", "b", "r"),
  HIRAGANA: makeTag("H", "i", "r", "a"),
  KANNADA: makeTag("K", "n", "d", "a"),
  KATAKANA: makeTag("K", "a", "n", "a"),
  LAO: makeTag("L", "a", "o", "o"),
  LATIN: makeTag("L", "a", "t", "n"),
  MALAYALAM: makeTag("M", "l", "y", "m"),
  ORIYA: makeTag("O", "r", "y", "a"),
  TAMIL: makeTag("T", "a", "m", "l"),
  TELUGU: makeTag("T", "e", "l", "u"),
  THAI: makeTag("T", "h", "a", "i"),
  TIBETAN: makeTag("T", "i", "b", "t"),
  BOPOMOFO: makeTag("B", "o", "p", "o"),
  BRAILLE: makeTag("B", "r", "a", "i"),
  CANADIAN_SYLLABICS: makeTag("C", "a", "n", "s"),
  CHEROKEE: makeTag("C", "h", "e", "r"),
  ETHIOPIC: makeTag("E", "t", "h", "i"),
  KHMER: makeTag("K", "h", "m", "r"),
  MONGOLIAN: makeTag("M", "o", "n", "g"),
  MYANMAR: makeTag("M", "y", "m", "r"),
  OGHAM: makeTag("O", "g", "a", "m"),
  RUNIC: makeTag("R", "u", "n", "r"),
  SINHALA: makeTag("S", "i", "n", "h"),
  SYRIAC: makeTag("S", "y", "r", "c"),
  THAANA: makeTag("T", "h", "a", "a"),
  YI: makeTag("Y", "i", "i", "i"),
  DESERET: makeTag("D", "s", "r", "t"),
  GOTHIC: makeTag("G", "o", "t", "h"),
  OLD_ITALIC: makeTag("I", "t", "a", "l"),
  BUHID: makeTag("B", "u", "h", "d"),
  HANUNOO: makeTag("H", "a", "n", "o"),
  TAGALOG: makeTag("T", "g", "l", "g"),
  TAGBANWA: makeTag("T", "a", "g", "b"),
  CYPRIOT: makeTag("C", "p", "r", "t"),
  LIMBU: makeTag("L", "i", "m", "b"),
  LINEAR_B: makeTag("L", "i", "n", "b"),
  OSMANYA: makeTag("O", "s", "m", "a"),
  SHAVIAN: makeTag("S", "h", "a", "w"),
  TAI_LE: makeTag("T", "a", "l", "e"),
  UGARITIC: makeTag("U", "g", "a", "r"),
  BUGINESE: makeTag("B", "u", "g", "i"),
  COPTIC: makeTag("C", "o", "p", "t"),
  GLAGOLITIC: makeTag("G", "l", "a", "g"),
  KHAROSHTHI: makeTag("K", "h", "a", "r"),
  NEW_TAI_LUE: makeTag("T", "a", "l", "u"),
  OLD_PERSIAN: makeTag("X", "p", "e", "o"),
  SYLOTI_NAGRI: makeTag("S", "y", "l", "o"),
  TIFINAGH: makeTag("T", "f", "n", "g"),
  BALINESE: makeTag("B", "a", "l", "i"),
  CUNEIFORM: makeTag("X", "s", "u", "x"),
  NKO: makeTag("N", "k", "o", "o"),
  PHAGS_PA: makeTag("P", "h", "a", "g"),
  PHOENICIAN: makeTag("P", "h", "n", "x"),
  CARIAN: makeTag("C", "a", "r", "i"),
  CHAM: makeTag("C", "h", "a", "m"),
  KAYAH_LI: makeTag("K", "a", "l", "i"),
  LEPCHA: makeTag("L", "e", "p", "c"),
  LYCIAN: makeTag("L", "y", "c", "i"),
  LYDIAN: makeTag("L", "y", "d", "i"),
  OL_CHIKI: makeTag("O", "l", "c", "k"),
  REJANG: makeTag("R", "j", "n", "g"),
  SAURASHTRA: makeTag("S", "a", "u", "r"),
  SUNDANESE: makeTag("S", "u", "n", "d"),
  VAI: makeTag("V", "a", "i", "i"),
  AVESTAN: makeTag("A", "v", "s", "t"),
  BAMUM: makeTag("B", "a", "m", "u"),
  EGYPTIAN_HIEROGLYPHS: makeTag("E", "g", "y", "p"),
  IMPERIAL_ARAMAIC: makeTag("A", "r", "m", "i"),
  INSCRIPTIONAL_PAHLAVI: makeTag("P", "h", "l", "i"),
  INSCRIPTIONAL_PARTHIAN: makeTag("P", "r", "t", "i"),
  JAVANESE: makeTag("J", "a", "v", "a"),
  KAITHI: makeTag("K", "t", "h", "i"),
  LISU: makeTag("L", "i", "s", "u"),
  MEETEI_MAYEK: makeTag("M", "t", "e", "i"),
  OLD_SOUTH_ARABIAN: makeTag("S", "a", "r", "b"),
  OLD_TURKIC: makeTag("O", "r", "k", "h"),
  SAMARITAN: makeTag("S", "a", "m", "r"),
  TAI_THAM: makeTag("L", "a", "n", "a"),
  TAI_VIET: makeTag("T", "a", "v", "t"),
  BATAK: makeTag("B", "a", "t", "k"),
  BRAHMI: makeTag("B", "r", "a", "h"),
  MANDAIC: makeTag("M", "a", "n", "d"),
  CHAKMA: makeTag("C", "a", "k", "m"),
  MEROITIC_CURSIVE: makeTag("M", "e", "r", "c"),
  MEROITIC_HIEROGLYPHS: makeTag("M", "e", "r", "o"),
  MIAO: makeTag("P", "l", "r", "d"),
  SHARADA: makeTag("S", "h", "r", "d"),
  SORA_SOMPENG: makeTag("S", "o", "r", "a"),
  TAKRI: makeTag("T", "a", "k", "r"),
  BASSA_VAH: makeTag("B", "a", "s", "s"),
  CAUCASIAN_ALBANIAN: makeTag("A", "g", "h", "b"),
  DUPLOYAN: makeTag("D", "u", "p", "l"),
  ELBASAN: makeTag("E", "l", "b", "a"),
  GRANTHA: makeTag("G", "r", "a", "n"),
  KHOJKI: makeTag("K", "h", "o", "j"),
  KHUDAWADI: makeTag("S", "i", "n", "d"),
  LINEAR_A: makeTag("L", "i", "n", "a"),
  MAHAJANI: makeTag("M", "a", "h", "j"),
  MANICHAEAN: makeTag("M", "a", "n", "i"),
  MENDE_KIKAKUI: makeTag("M", "e", "n", "d"),
  MODI: makeTag("M", "o", "d", "i"),
  MRO: makeTag("M", "r", "o", "o"),
  NABATAEAN: makeTag("N", "b", "a", "t"),
  OLD_NORTH_ARABIAN: makeTag("N", "a", "r", "b"),
  OLD_PERMIC: makeTag("P", "e", "r", "m"),
  PAHAWH_HMONG: makeTag("H", "m", "n", "g"),
  PALMYRENE: makeTag("P", "a", "l", "m"),
  PAU_CIN_HAU: makeTag("P", "a", "u", "c"),
  PSALTER_PAHLAVI: makeTag("P", "h", "l", "p"),
  SIDDHAM: makeTag("S", "i", "d", "d"),
  TIRHUTA: makeTag("T", "i", "r", "h"),
  WARANG_CITI: makeTag("W", "a", "r", "a"),
  AHOM: makeTag("A", "h", "o", "m"),
  ANATOLIAN_HIEROGLYPHS: makeTag("H", "l", "u", "w"),
  HATRAN: makeTag("H", "a", "t", "r"),
  MULTANI: makeTag("M", "u", "l", "t"),
  OLD_HUNGARIAN: makeTag("H", "u", "n", "g"),
  SIGNWRITING: makeTag("S", "g", "n", "w"),
  ADLAM: makeTag("A", "d", "l", "m"),
  BHAIKSUKI: makeTag("B", "h", "k", "s"),
  MARCHEN: makeTag("M", "a", "r", "c"),
  OSAGE: makeTag("O", "s", "g", "e"),
  TANGUT: makeTag("T", "a", "n", "g"),
  NEWA: makeTag("N", "e", "w", "a"),
  MASARAM_GONDI: makeTag("G", "o", "n", "m"),
  NUSHU: makeTag("N", "s", "h", "u"),
  SOYOMBO: makeTag("S", "o", "y", "o"),
  ZANABAZAR_SQUARE: makeTag("Z", "a", "n", "b"),
  DOGRA: makeTag("D", "o", "g", "r"),
  GUNJALA_GONDI: makeTag("G", "o", "n", "g"),
  HANIFI_ROHINGYA: makeTag("R", "o", "h", "g"),
  MAKASAR: makeTag("M", "a", "k", "a"),
  MEDEFAIDRIN: makeTag("M", "e", "d", "f"),
  OLD_SOGDIAN: makeTag("S", "o", "g", "o"),
  SOGDIAN: makeTag("S", "o", "g", "d"),
  INVALID: 0,
};

/** One field of a C struct for `initStruct`. */
export interface StructField {
  name: string;
  type: { name: HeapValueType; length: number };
}

const INT32 = { name: "i32", length: 4 } as const;

/** hb_feature_t: tag, value, start, end. */
const FEATURE_STRUCT: readonly StructField[] = [
  { name: "tag", type: INT32 },
  { name: "value", type: INT32 },
  { name: "start", type: INT32 },
  { name: "end", type: INT32 },
];

/** HB_MEMORY_MODE_READONLY. */
const MEMORY_MODE_READONLY = 1;

/** A shaped glyph as getGlyphs returns it (hb_glyph_info_t plus hb_glyph_position_t). */
export interface ShapedGlyph {
  /** The glyph id after shaping. */
  codepoint: number;
  mask: number;
  /** Byte offset of the glyph's cluster in the UTF-8 text. */
  cluster: number;
  xAdvance: number;
  yAdvance: number;
  xOffset: number;
  yOffset: number;
}

/** Writes a struct into newly allocated memory and returns its address. */
export function initStruct(fields: readonly StructField[], values: Record<string, number>): number {
  const size = fields.reduce((sum, field) => sum + field.type.length, 0);
  const pointer = api.malloc(size);
  let offset = 0;
  fields.forEach((field) => {
    hb.setValue(pointer + offset, values[field.name] as number, field.type.name);
    offset += field.type.length;
  });
  return pointer;
}

/** The BCP 47 language (an hb_language_t) of an OpenType language system tag; 0 if none. */
export function openTypeLanguageSystemTagNumberToBCP47TagNumber(tag: number): number {
  return api.hb_ot_tag_to_language(tag);
}

/** The text of an hb_language_t ("de"). */
export function bcp47TagNumberToString(language: number): string {
  return hb.readString(api.hb_language_to_string(language));
}

/**
 * A tag from its first four characters ("DEU "). A shorter string throws a
 * TypeError, as it did before.
 */
export function stringToTag(text: string): number {
  const [c1, c2, c3, c4] = text.split("") as [string, string, string, string];
  return makeTag(c1, c2, c3, c4);
}

/** The tag of a script name ("ARABIC"); undefined for unknown names. */
export function nameToTag(name: string): number | undefined {
  return SCRIPTS[name];
}

/** The script name of a tag, or null. */
export function tagToName(tag: number): string | null {
  const index = Object.values(SCRIPTS).indexOf(tag);
  return index < 0 ? null : (Object.keys(SCRIPTS)[index] as string);
}

/**
 * The script name of an OpenType script tag string ("arab" -> "ARABIC"):
 * the first letter capitalized gives HarfBuzz's ISO 15924 tag. Tags that
 * differ between the two (like "deva" vs "dev2") only match by accident.
 */
export function stringTagToName(text: string): string | null {
  text = text.slice(0, 4);
  while (text.length < 4) text = text.concat(String.fromCharCode(0));
  const chars = text.split("");
  chars[0] = (chars[0] as string).toUpperCase();
  return tagToName(
    makeTag(chars[0] as string, chars[1] as string, chars[2] as string, chars[3] as string),
  );
}

/**
 * The OpenType-style script tag of a script name ("ARABIC" -> "arab"). An
 * unknown name gives four NUL characters.
 */
export function scriptNameToOpenTypeScriptTagString(name: string): string {
  const tag = nameToTag(name) as number;
  return String.fromCharCode
    .apply(null, [(tag >> 24) & 255, (tag >> 16) & 255, (tag >> 8) & 255, tag & 255])
    .toLowerCase();
}

/** A HarfBuzz text buffer filled with one text; segment properties are guessed from it. */
export class HarfBuzzBuffer {
  _text: string;
  _hbBuffer: number;

  constructor(text: string) {
    this._text = text;
    this._hbBuffer = api.hb_buffer_create();
    // The text is passed null-terminated with length -1, so it ends at a
    // NUL character, as it did through the old cwrap.
    hb.withString(this._text, (pointer) =>
      api.hb_buffer_add_utf8(this._hbBuffer, pointer, -1, 0, -1),
    );
    api.hb_buffer_guess_segment_properties(this._hbBuffer);
  }

  getLanguage(): string {
    if (!this._text) throw new Error("Text not set, cannot check language");
    return hb.readString(api.hb_language_to_string(api.hb_buffer_get_language(this._hbBuffer)));
  }

  /** Takes an hb_language_t or a BCP 47 string. */
  setLanguage(language: number | string): void {
    if (!this._text) throw new Error("Cannot set language, text is not set");
    if (typeof language === "string") {
      const text = language;
      language = hb.withString(text, (pointer) =>
        api.hb_language_from_string(pointer, text.length),
      );
    }
    api.hb_buffer_set_language(this._hbBuffer, language);
  }

  getDirection(): string {
    if (!this._text) throw new Error("Text not set, cannot check text direction");
    return hb.readString(api.hb_direction_to_string(api.hb_buffer_get_direction(this._hbBuffer)));
  }

  setDirection(direction: string): void {
    if (!this._text) throw new Error("Text not set, cannot set text direction");
    const value = hb.withString(direction, (pointer) =>
      api.hb_direction_from_string(pointer, direction.length),
    );
    api.hb_buffer_set_direction(this._hbBuffer, value);
  }

  reverse(): void {
    api.hb_buffer_reverse(this._hbBuffer);
  }

  /**
   * The script HarfBuzz guessed. When it found none, text starting with a
   * halfwidth or fullwidth form (U+FF00 to U+FFEF) counts as Katakana.
   */
  getScript(): number {
    if (!this._text) throw new Error("Text not set, cannot check text script");
    const script = api.hb_buffer_get_script(this._hbBuffer);
    if (script === SCRIPTS.INVALID) {
      const first = this._text.codePointAt(0) as number;
      if (first >= 65280 && first <= 65519) return SCRIPTS.KATAKANA as number;
    }
    return script;
  }

  setScript(script: number): void {
    if (typeof script !== "number") {
      throw new Error("Script must be a 32bit integer from GHarfBuzz.SCRIPTS array");
    }
    if (Object.values(SCRIPTS).indexOf(script) < 0) throw new Error("Unknown script type");
    if (!this._text) throw new Error("Text not set, cannot set text script");
    api.hb_buffer_set_script(this._hbBuffer, script);
  }

  /** The horizontal direction name of a script ("ltr", "rtl" or "invalid"). */
  directionForScript(script: number): string {
    return hb.readString(
      api.hb_direction_to_string(api.hb_script_get_horizontal_direction(script)),
    );
  }

  destroy(): void {
    api.hb_buffer_destroy(this._hbBuffer);
  }
}

/** A HarfBuzz font (hb_font_t) plus the stylistic set to shape with. */
export class HarfBuzzFont {
  _font: number;
  _stylisticSet: string | null | undefined = null;

  constructor(font: number) {
    if (typeof font !== "number") throw new Error("Invalid font provided");
    this._font = font;
  }

  setScale(scale: number): void {
    api.hb_font_set_scale(this._font, scale, scale);
  }

  /**
   * Sets variation axis values ({wght: 700}). They stay on the font for
   * every later shaping call, as before.
   */
  setVariations(variations: Record<string, number>): void {
    const tags = Object.keys(variations);
    const values = Object.values(variations);
    // As in the old wrapper: `8 * variations.length` is NaN for an object,
    // which wasm receives as malloc(0), and the loop writes past the block.
    const pointer = api.malloc(8 * (variations as unknown as unknown[]).length);
    for (let i = 0; i < tags.length; i++) {
      const tag = stringToTag(tags[i] as string);
      hb.setValue(pointer + 8 * i, tag, "i32");
      hb.setValue(pointer + 8 * i + 4, values[i] as number, "float");
    }
    api.hb_font_set_variations(this._font, pointer, tags.length);
  }

  /** The old name, typo included. */
  setStylistcSet(stylisticSet: string | null | undefined): void {
    this._stylisticSet = stylisticSet;
  }

  /** The features to shape with: the stylistic set, if any. */
  _getFeatures(): { ptr: number; length: number } {
    return this._stylisticSet
      ? {
          ptr: initStruct(FEATURE_STRUCT, {
            tag: stringToTag(this._stylisticSet),
            value: 1,
            start: 0,
            end: -1,
          }),
          length: 1,
        }
      : { ptr: 0, length: 0 };
  }

  /**
   * Shapes the buffer and returns its glyphs in buffer order. Clusters are
   * byte offsets into the UTF-8 text, not string indexes; GOpenTypeFont
   * uses them as string indexes anyway.
   */
  getGlyphs(buffer: HarfBuzzBuffer): ShapedGlyph[] {
    if (!(buffer && buffer instanceof HarfBuzzBuffer)) {
      throw new Error("Cannot get glyphs - no text buffer provided");
    }
    const features = this._getFeatures();
    api.hb_shape(this._font, buffer._hbBuffer, features.ptr, features.length);
    const length = api.hb_buffer_get_length(buffer._hbBuffer);
    const infos = api.hb_buffer_get_glyph_infos(buffer._hbBuffer, 0);
    const positions = api.hb_buffer_get_glyph_positions(buffer._hbBuffer, 0);
    const u32 = hb.HEAPU32;
    const i32 = hb.HEAP32;
    const glyphs: ShapedGlyph[] = [];
    for (let i = 0; i < length; i++) {
      // hb_glyph_info_t and hb_glyph_position_t are five 32-bit words each.
      const info = infos / 4 + 5 * i;
      const position = positions / 4 + 5 * i;
      glyphs.push({
        codepoint: u32[info] as number,
        mask: u32[info + 1] as number,
        cluster: u32[info + 2] as number,
        xAdvance: i32[position] as number,
        yAdvance: i32[position + 1] as number,
        xOffset: i32[position + 2] as number,
        yOffset: i32[position + 3] as number,
      });
    }
    return glyphs;
  }
}

/**
 * A HarfBuzz font for a font file. The file is copied into HarfBuzz's
 * memory and stays there (the old wrapper never freed it either).
 */
export function createFontFromArrayBuffer(data: ArrayBuffer | ArrayBufferView): HarfBuzzFont {
  let buffer: ArrayBufferLike;
  if (data instanceof ArrayBuffer) {
    buffer = data;
  } else {
    if (!ArrayBuffer.isView(data)) throw new Error("Invalid input data type");
    // The whole underlying buffer, not just the view's part, as before.
    buffer = data.buffer;
  }
  const bytes = new Uint8Array(buffer);
  const pointer = api.malloc(bytes.length * bytes.BYTES_PER_ELEMENT);
  hb.HEAPU8.set(bytes, pointer);
  const blob = api.hb_blob_create(pointer, bytes.length, MEMORY_MODE_READONLY, 0, 0);
  const face = api.hb_face_create(blob, 0);
  return new HarfBuzzFont(api.hb_font_create(face));
}

/**
 * The wrapper as the old code exposed it: a static object (calling it
 * throws) with the tables, helpers and the Buffer and Font classes.
 */
export const HarfBuzz = Object.assign(
  function HarfBuzz(): never {
    throw new Error("cannot initialize - this is a static entity");
  },
  {
    _Module: hb,
    DIRECTIONS,
    SCRIPTS,
    Buffer: HarfBuzzBuffer,
    Font: HarfBuzzFont,
    createFontFromArrayBuffer,
    initStruct,
    openTypeLanguageSystemTagNumberToBCP47TagNumber,
    bcp47TagNumberToString,
    stringToTag,
    nameToTag,
    tagToName,
    stringTagToName,
    scriptNameToOpenTypeScriptTagString,
  },
);

// Old: chunk.vendor.js module 587 (GOpenTypeFont).
/**
 * A resolved font: an opentype.js font for outlines, metrics and simple
 * shaping, plus a HarfBuzz font for the scripts opentype.js can't shape.
 *
 * stringToGlyphs decides per call which of the two shapes the text (see
 * `_useHarfBuzz` there). HarfBuzz positions are whole units at the font
 * size it is scaled to, opentype.js positions are not rounded, so the two
 * paths give slightly different layouts for the same text.
 */
import { extend } from "../../core/util.ts";
import { Locale } from "../../core/locale/locale.ts";
import { LocaleLanguage } from "../../core/locale/locale-language.ts";
import { registerClass } from "../../core/object.ts";
import { VertexCommand } from "../../geometry/vertex.ts";
import { VertexContainer } from "../../geometry/vertex-container.ts";
import { VertexInfo } from "../../geometry/vertex-info.ts";
import { VertexTransformer } from "../../geometry/vertex-transformer.ts";
import { Rect } from "../../math/rect.ts";
import { Transform } from "../../math/transform.ts";
import * as opentype from "../opentype/opentype.ts";
import type { Font as OpenTypeJsFont, RenderFeatures, RenderOptions } from "../opentype/font.ts";
import type { Glyph } from "../opentype/glyph.ts";
import { Font, type FontStyle, type PositionedGlyph } from "./font.ts";
import {
  DIRECTIONS,
  HarfBuzzBuffer,
  type HarfBuzzFont,
  SCRIPTS,
  createFontFromArrayBuffer,
  nameToTag,
  openTypeLanguageSystemTagNumberToBCP47TagNumber,
  bcp47TagNumberToString,
  scriptNameToOpenTypeScriptTagString as scriptNameToTagString,
  stringTagToName,
  stringToTag,
  tagToName,
} from "./harfbuzz.ts";
import { OpenTypeUtil } from "./open-type-util.ts";
import { TLDirectionTextTransformer } from "../tl-direction-text-transformer.ts";

/** Text directions as GTLDirectionTextTransformer numbers them (chunk.vendor.js module 266). */
export const TextDirection = {
  LTR: TLDirectionTextTransformer.LTR,
  RTL: TLDirectionTextTransformer.RTL,
  TTB: TLDirectionTextTransformer.TTB,
  BTT: TLDirectionTextTransformer.BTT,
};

/**
 * Unicode blocks of scripts that have no OpenType script tag in the fonts
 * that cover them; getAvailableScripts(true) adds them by the glyphs found.
 */
const EXTRA_SCRIPT_RANGES: [number, number, string][] = [
  [69632, 69759, "BRAHMI"],
  [6656, 6687, "BUGINESE"],
  [69760, 69839, "KAITHI"],
  [3712, 3839, "LAO"],
  [7168, 7247, "LEPCHA"],
  [6400, 6479, "LIMBU"],
  [65536, 65791, "LINEAR_B"],
  [4096, 4255, "MYANMAR"],
  [66464, 66527, "OLD_PERSIAN"],
  [66688, 66735, "OSMANYA"],
  [67840, 67871, "PHOENICIAN"],
  [5792, 5887, "RUNIC"],
  [7040, 7103, "SUNDANESE"],
  [5888, 5919, "TAGALOG"],
  [6480, 6527, "TAI_LE"],
  [6688, 6831, "TAI_THAM"],
  [43648, 43743, "TAI_VIET"],
  [40960, 42191, "YI"],
];

const NO_COORDINATE = undefined as unknown as number;

/** Features as the text style passes them; "auto" turns ligatures off with letter spacing. */
export interface GlyphFeatures extends Omit<RenderFeatures, "liga" | "rlig"> {
  liga?: boolean | "auto";
  rlig?: boolean | "auto";
}

/** The options of stringToGlyphs. */
export interface GlyphOptions extends Omit<RenderOptions, "script" | "features" | "language"> {
  /** A HarfBuzz script name ("ARABIC"), "auto" or null. Filled in from `language` when unset. */
  script?: string | null;
  /** An OpenType language system tag ("TRK "). */
  language?: string | null;
  features?: GlyphFeatures;
  /** Variation axis values as JSON ('{"wght":700}'); shapes with HarfBuzz. */
  variant?: string | null;
  /** Never shape with HarfBuzz. */
  noghb?: boolean;
  /** Keep right-to-left glyphs in logical order. */
  noreverse?: boolean;
}

/** A glyph as an index into the opentype.js font, or the character to look up. */
type GlyphRef = Glyph | string;

export class OpenTypeFont extends Font {
  static {
    registerClass(this, "GOpenTypeFont");
  }

  /**
   * The font for a font file, or null when it can't be parsed or isn't
   * supported. For a collection the matching font is parsed, but the
   * HarfBuzz font and toFontFaceSrc use the whole file, so they see the
   * collection's first font.
   */
  static create(
    family: string,
    style: FontStyle,
    weight: number,
    buffer: ArrayBuffer | ArrayBufferView,
  ): OpenTypeFont | null {
    let fonts: { buffer: ArrayBuffer | DataView | ArrayBufferView | null }[] = OpenTypeUtil.getFont(
      family,
      style,
      weight,
      buffer,
    ) as { buffer: ArrayBuffer | DataView | null }[];
    if (!fonts.length) fonts = [{ buffer }];
    let font: OpenTypeJsFont | null;
    try {
      font = opentype.parse((fonts[0] as { buffer: ArrayBuffer | DataView }).buffer);
    } catch (e) {
      console.warn("Couldn't parse font: " + ((e as Error).message || ""));
      font = null;
    }
    return font && font.supported ? new OpenTypeFont(family, style, weight, buffer, font) : null;
  }

  /**
   * The direction (TextDirection) of a text from its first strong script.
   * An empty text gives SCRIPTS.INVALID (0, the same number as LTR).
   * Bottom-to-top never matches (see DIRECTIONS.BBT).
   */
  static getDirectionForString(text: string): number {
    let buffer: HarfBuzzBuffer | undefined;
    if (!text || !text.length) return SCRIPTS.INVALID as number;
    try {
      buffer = new HarfBuzzBuffer(text);
      switch (buffer.directionForScript(buffer.getScript())) {
        case DIRECTIONS.LTR:
          return TextDirection.LTR;
        case DIRECTIONS.RTL:
          return TextDirection.RTL;
        case DIRECTIONS.TTB:
          return TextDirection.TTB;
        case DIRECTIONS.BBT:
          return TextDirection.BTT;
      }
    } finally {
      if (buffer) buffer.destroy();
    }
    return TextDirection.LTR;
  }

  /** The script name of a text ("ARABIC"); "INVALID" when it has none, 0 when empty. */
  static getScriptForString(text: string): string | number | null {
    let buffer: HarfBuzzBuffer | undefined;
    let name: string | null;
    if (!text || !text.length) return SCRIPTS.INVALID as number;
    try {
      buffer = new HarfBuzzBuffer(text);
      name = tagToName(buffer.getScript());
    } finally {
      if (buffer) buffer.destroy();
    }
    return name;
  }

  /** "DEU " -> "de"; null when HarfBuzz knows no language for the tag. */
  static openTypeLanguageSystemTagStringToBCP47(tag: string): string | null {
    const language = openTypeLanguageSystemTagNumberToBCP47TagNumber(stringToTag(tag));
    return language ? bcp47TagNumberToString(language) : null;
  }

  /** "ARABIC" -> "arab". */
  static scriptNameToOpenTypeScriptTagString(name: string): string {
    return scriptNameToTagString(name);
  }

  _family: string;
  _style: FontStyle;
  _weight: number;
  _buffer: ArrayBuffer | ArrayBufferView;
  _openTypeFont: OpenTypeJsFont;
  _ghbFont: HarfBuzzFont | null = null;
  /** Outline caches by glyph index (looked up by the string when given one, see getGlyphOutline). */
  _outlinesCache: Record<string | number, VertexContainer> = {};
  _boundsCache: Rect[] = [];
  _smallCaps: boolean | undefined = undefined;
  _fractions: boolean | undefined = undefined;
  _stylisticSets: boolean | undefined = undefined;
  _localizedForms: boolean | undefined = undefined;

  constructor(
    family: string,
    style: FontStyle,
    weight: number,
    buffer: ArrayBuffer | ArrayBufferView,
    openTypeFont: OpenTypeJsFont,
  ) {
    super();
    this._family = family;
    this._style = style;
    this._weight = weight;
    this._buffer = buffer;
    this._openTypeFont = openTypeFont;
  }

  override isResolved(): boolean {
    return true;
  }

  /** The font file as a data: URL for @font-face. */
  override toFontFaceSrc(): string {
    let binary = "";
    const bytes = new Uint8Array(this._buffer as ArrayBuffer);
    const length = bytes.byteLength;
    for (let i = 0; i < length; i++) binary += String.fromCharCode(bytes[i] as number);
    return "url(data:font/ttf;base64," + window.btoa(binary) + ') format("truetype")';
  }

  override getFamily(): string {
    return this._family;
  }

  override getStyle(): FontStyle {
    return this._style;
  }

  override getWeight(): number {
    return this._weight;
  }

  override getGlyphBaseline(fontSize: number): number {
    const scale = (1 / this._openTypeFont.unitsPerEm) * fontSize;
    return this._openTypeFont.ascender * scale;
  }

  /**
   * Shapes a text into positioned glyphs, closed by an entry with
   * `glyph: null` at the end position.
   *
   * HarfBuzz shapes when the options name a non-Latin script (or the text
   * has combining marks, U+0300-U+036F), when a variant is set, or, with no
   * script given, when the text's own script isn't Latin/Common or the font
   * has a morx table; `noghb` and `generateText` turn it off. opentype.js
   * shapes the rest. A single space always goes to opentype.js.
   *
   * Changes `options.script` when it was unset or "auto" and a language is
   * given (the first script that has the language).
   */
  override stringToGlyphs(
    text: string,
    x?: number,
    y?: number,
    fontSize?: number,
    options?: GlyphOptions,
  ): PositionedGlyph<Glyph>[] {
    const opts = options as GlyphOptions;
    let buffer: HarfBuzzBuffer | undefined;
    let useHarfBuzz: boolean | undefined = undefined;
    let glyphs: PositionedGlyph<Glyph>[] = [];

    const isComplexScript = (script: number | undefined) =>
      script &&
      script !== SCRIPTS.LATIN &&
      script !== SCRIPTS.COMMON &&
      script !== SCRIPTS.INVALID &&
      script !== SCRIPTS.UNKNOWN;
    const hasCombiningMarks = (value: string) => {
      if (value.length <= 1) return false;
      for (let i = 0; i < value.length; i++) {
        const code = value.codePointAt(i) as number;
        if (code >= 768 && code <= 879) return true;
      }
      return false;
    };

    if (this._shouldSetScriptNameByLanguage(opts)) this._setScriptNameByLanguage(opts);
    if (text !== " ") {
      buffer = new HarfBuzzBuffer(text);
      if (opts) {
        if (opts.script && !opts.noghb && !opts.generateText) {
          const script = nameToTag(opts.script);
          if (isComplexScript(script) || hasCombiningMarks(text)) {
            buffer.setScript(script as number);
            useHarfBuzz = true;
          } else {
            useHarfBuzz = false;
          }
        }
        if (opts.variant && !opts.noghb && !opts.generateText) useHarfBuzz = true;
      }
      if (useHarfBuzz === undefined && opts && !opts.noghb) {
        useHarfBuzz = !!(
          isComplexScript(buffer.getScript()) ||
          this._openTypeFont.hasGHBTables ||
          hasCombiningMarks(text)
        );
      }
    }

    if (useHarfBuzz) {
      const hbBuffer = buffer as HarfBuzzBuffer;
      if (opts.language) {
        const language = openTypeLanguageSystemTagNumberToBCP47TagNumber(
          stringToTag(opts.language),
        );
        if (language) hbBuffer.setLanguage(language);
      }
      const font = this._ghbFont || createFontFromArrayBuffer(this._buffer);
      if (opts.features) font.setStylistcSet(opts.features.stylisticSet);
      this._ghbFont = font;
      const direction = hbBuffer.directionForScript(hbBuffer.getScript());
      font.setScale(fontSize || 72);
      if (opts && opts.variant) {
        let variations: Record<string, number> | null = null;
        let invalid = false;
        try {
          variations = JSON.parse(opts.variant) as Record<string, number> | null;
        } catch {
          invalid = true;
        }
        if (!invalid && variations) font.setVariations(variations);
      }
      const shaped = font.getGlyphs(hbBuffer);
      let penX = x || 0;
      let penY = y || 0;
      const openTypeFont = this._openTypeFont;
      if (direction !== DIRECTIONS.RTL || (opts && opts.noreverse)) {
        glyphs = shaped.map((glyph, i) => {
          // Clusters are UTF-8 byte offsets, used here as string indexes.
          const end =
            i + 1 < shaped.length ? (shaped[i + 1] as { cluster: number }).cluster : text.length;
          const positioned: PositionedGlyph<Glyph> = {
            x: penX + glyph.xOffset,
            y: penY - glyph.yOffset,
            text: text.slice(glyph.cluster, end),
            glyph: openTypeFont.glyphs.get(glyph.codepoint) as Glyph,
          };
          penX += glyph.xAdvance;
          penY -= glyph.yAdvance;
          if (opts && opts.letterSpacing) penX += opts.letterSpacing;
          return positioned;
        });
      } else {
        shaped.reverse();
        glyphs = shaped.map((glyph, i) => {
          const end =
            i + 1 < shaped.length ? (shaped[i + 1] as { cluster: number }).cluster : text.length;
          const positioned: PositionedGlyph<Glyph> = {
            x: penX,
            y: penY - glyph.yOffset,
            text: text.slice(glyph.cluster, end),
            glyph: openTypeFont.glyphs.get(glyph.codepoint) as Glyph,
            xOff: -glyph.xOffset,
          };
          penX += glyph.xAdvance;
          penY -= glyph.yAdvance;
          if (opts && opts.letterSpacing) penX += opts.letterSpacing;
          return positioned;
        });
      }
      glyphs.push({ glyph: null, x: penX, y: penY, text: null });
    } else {
      const renderOptions = extend({}, opts) as GlyphOptions;
      renderOptions.script = null;
      if (opts.script && opts.script !== "auto") {
        const tag = scriptNameToTagString(opts.script);
        if (tag) renderOptions.script = tag;
      }
      if (renderOptions.letterSpacing && fontSize) renderOptions.letterSpacing /= fontSize;
      if (renderOptions.features) {
        const features = extend({}, renderOptions.features) as GlyphFeatures;
        renderOptions.features = features;
        if (features.rlig === "auto") features.rlig = !renderOptions.letterSpacing;
        if (features.liga === "auto") features.liga = !renderOptions.letterSpacing;
      }
      const endX = this._openTypeFont.forEachGlyph(
        text,
        x,
        y,
        fontSize,
        renderOptions as RenderOptions,
        (glyph, glyphX, glyphY, _size, _options, glyphText, kerning) => {
          glyphs.push({ glyph, x: glyphX, y: glyphY, text: glyphText, kerning });
        },
      );
      glyphs.push({ glyph: null, x: endX, y: y as number, text: null });
    }
    if (buffer) buffer.destroy();
    return glyphs;
  }

  _shouldSetScriptNameByLanguage(options: GlyphOptions): boolean {
    return !(!options.language || (options.script && options.script !== "auto"));
  }

  _setScriptNameByLanguage(options: GlyphOptions): void {
    const script = this._getScriptNameByLanguage(options.language as string);
    if (script) options.script = script;
  }

  /** The script name of the first GSUB script that has the language system. */
  _getScriptNameByLanguage(language: string): string | null {
    const scripts = this._openTypeFont.substitution.getScriptNames();
    if (scripts.length > 0) {
      const script = scripts.find(
        (name) => this.getAvailableLanguageSystemTags(name).indexOf(language) >= 0,
      );
      if (script) return stringTagToName(script);
    }
    return null;
  }

  /**
   * The bounds of a glyph at a font size: from the glyph's metrics, or with
   * `exact` from its outline (cached per glyph at size 1).
   */
  override getGlyphBoundingRect(fontSize: number, glyph: GlyphRef, exact?: boolean): Rect {
    let bounds: Rect;
    const resolved =
      typeof glyph == "string" ? (this._openTypeFont.stringToGlyphs(glyph)[0] as Glyph) : glyph;
    if (exact) {
      let cached = this._boundsCache[resolved.index];
      if (!cached) {
        const outline = this.getGlyphOutline(1, 0, 0, resolved);
        cached = VertexInfo.calculateBounds(outline, true) || new Rect();
        this._boundsCache[resolved.index] = cached;
      }
      bounds = cached.scaled(fontSize, fontSize);
    } else {
      const scale = (1 / this._openTypeFont.unitsPerEm) * fontSize;
      const metrics = resolved.getMetrics();
      const height = (metrics.yMax - metrics.yMin) * scale;
      const width = (metrics.xMax - metrics.xMin) * scale;
      bounds = new Rect(metrics.xMin * scale, -metrics.yMax * scale, width, height);
    }
    return bounds;
  }

  /**
   * The hinted outline of a glyph at a font size and position. Outlines are
   * cached by glyph index; a string is looked up under the string itself,
   * which only hits when the string is a glyph index ("5" finds glyph 5).
   */
  override getGlyphOutline(
    fontSize: number,
    x: number,
    y: number,
    glyph: GlyphRef,
  ): VertexTransformer {
    let outline = this._outlinesCache[typeof glyph == "string" ? glyph : glyph.index];
    const scale = (1 / this._openTypeFont.unitsPerEm) * fontSize;
    if (!outline) {
      const resolved =
        typeof glyph == "string" ? (this._openTypeFont.stringToGlyphs(glyph)[0] as Glyph) : glyph;
      const path = resolved.getPath(
        0,
        0,
        this._openTypeFont.unitsPerEm,
        { hinting: true },
        this._openTypeFont,
      );
      outline = new VertexContainer();
      this._outlinesCache[resolved.index] = outline;
      for (let i = 0; i < path.commands.length; i += 1) {
        const command = path.commands[i] as (typeof path.commands)[number];
        if (command.type === "M") {
          outline.addVertex(VertexCommand.Move, command.x, command.y);
        } else if (command.type === "L") {
          outline.addVertex(VertexCommand.Line, command.x, command.y);
        } else if (command.type === "C") {
          outline.addVertex(VertexCommand.Curve2, command.x, command.y);
          outline.addVertex(VertexCommand.Curve2, command.x1, command.y1);
          outline.addVertex(VertexCommand.Curve2, command.x2, command.y2);
        } else if (command.type === "Q") {
          outline.addVertex(VertexCommand.Curve, command.x, command.y);
          outline.addVertex(VertexCommand.Curve, command.x1, command.y1);
        } else if (command.type === "Z") {
          // A close vertex without coordinates (x and y undefined), as before.
          outline.addVertex(VertexCommand.Close, NO_COORDINATE, NO_COORDINATE);
        }
      }
    }
    return new VertexTransformer(outline, new Transform(scale, 0, 0, scale, x, y));
  }

  /** ss01 to ss20 that the script (default: the font's default script) has. */
  override getAvailableStylisticSets(script?: string): string[] {
    script = script || this._openTypeFont.substitution.getDefaultScriptName();
    const sets: string[] = [];
    for (let i = 1; i <= 20; i++) {
      const tag = "ss" + "00".substr(String(i).length) + i;
      const feature = this._openTypeFont.substitution.getFeature(tag, script);
      if (feature && feature.length > 0) sets.push(tag);
    }
    return sets;
  }

  /** The language system tags of a script, or of all scripts for none or "auto". */
  override getAvailableLanguageSystemTags(script?: string): string[] {
    if (!script || script === "auto") {
      const scripts = this._openTypeFont.substitution.getScriptNames();
      if (scripts.length > 0) {
        const tags = scripts
          .map((name) => this._openTypeFont.substitution.getLangSysTags(name))
          .reduce((all, list) => all.concat(list), [] as string[]);
        return Array.from(new Set(tags));
      }
    }
    return this._openTypeFont.substitution.getLangSysTags(script);
  }

  /**
   * The script names of the GSUB and GPOS scripts (null for tags HarfBuzz
   * doesn't name). With `byGlyphs`, scripts from EXTRA_SCRIPT_RANGES whose
   * characters are among the glyphs loaded so far are added.
   */
  getAvailableScripts(byGlyphs?: boolean): (string | null)[] {
    const positionScripts = this._openTypeFont.position.getScriptNames();
    const tags = this._openTypeFont.substitution.getScriptNames();
    for (let i = positionScripts.length - 1; i >= 0; i--) {
      if (tags.indexOf(positionScripts[i] as string) < 0) tags.push(positionScripts[i] as string);
    }
    const names: (string | null)[] = tags.map((tag) => stringTagToName(tag));
    if (byGlyphs) {
      const found: Record<string, boolean> = {};
      const loaded = this._openTypeFont.glyphs.glyphs;
      for (const index in loaded) {
        // Glyphs not loaded yet are loader functions without a unicode.
        const glyph = loaded[index] as Partial<Glyph>;
        if (glyph.unicode) {
          for (let i = 0; i < EXTRA_SCRIPT_RANGES.length; i++) {
            const range = EXTRA_SCRIPT_RANGES[i] as [number, number, string];
            if (glyph.unicode >= range[0] && glyph.unicode <= range[1]) {
              found[range[2]] = true;
              break;
            }
          }
        }
      }
      for (const name in found) if (names.indexOf(name) < 0) names.push(name);
    }
    return names;
  }

  /** The named instances of a variable font, named in the UI language or English. */
  getAvailableVariants(): { name?: string; coords?: Record<string, number> }[] {
    if (this.hasFeature(Font.Features.Variants)) {
      const fvar = this._openTypeFont.tables.fvar;
      const variants: { name?: string; coords?: Record<string, number> }[] = [];
      if (fvar) {
        const language = Locale.getLanguage();
        for (let i = 0; i < fvar.instances.length; i++) {
          const instance = fvar.instances[i] as (typeof fvar.instances)[number];
          // Keyed by language codes ("en"), so the numeric language ids
          // never match and the first name is used.
          const names = instance.name as Record<string | number, string>;
          const variant: { name?: string; coords?: Record<string, number> } = {};
          if (names[language]) variant.name = names[language];
          else if (names[LocaleLanguage.English]) variant.name = names[LocaleLanguage.English];
          else if (Object.keys(names).length) variant.name = Object.values(names)[0];
          if (variant.name) {
            variant.coords = instance.coordinates;
            variants.push(variant);
          }
        }
      }
      return variants;
    }
    return [];
  }

  override getLeftSideBearing(fontSize: number, char: string): number {
    return (
      ((this._openTypeFont.charToGlyph(char).leftSideBearing as number) /
        this._openTypeFont.unitsPerEm) *
      fontSize
    );
  }

  override getMaxFontHeight(fontSize: number): number {
    const head = this._openTypeFont.tables.head as { yMin: number; yMax: number };
    return ((-head.yMin + head.yMax) / this._openTypeFont.unitsPerEm) * fontSize;
  }

  /** The strikeout line's y from the OS/2 table, or the middle of the x height. */
  getStrikeoutPosition(
    baseline: number,
    xHeight: number,
    lineWidth: number,
    fontSize: number,
  ): number {
    const os2 = this._openTypeFont.tables.os2;
    if (os2) {
      const position = os2.yStrikeoutPosition;
      if (typeof position == "number") {
        return baseline - (fontSize / this._openTypeFont.unitsPerEm) * position - lineWidth / 2;
      }
    }
    return baseline - xHeight / 2 - lineWidth / 2;
  }

  getStrikeoutWidth(fontSize: number): number {
    const os2 = this._openTypeFont.tables.os2;
    const scale = fontSize / this._openTypeFont.unitsPerEm;
    if (os2) {
      const size = os2.yStrikeoutSize;
      if (typeof size == "number") return scale * size;
    }
    return fontSize / 20;
  }

  /** The code point of the character's glyph, or -1. */
  getUnicode(char: string): number {
    const glyph = this._openTypeFont.stringToGlyphs(char)[0] as Glyph;
    return glyph.unicode !== undefined ? glyph.unicode : -1;
  }

  /**
   * The advance of a glyph, at most the font's widest advance. With
   * `previous` the kerning is added; it is looked up with the characters
   * themselves, so it is only found when they are glyph indexes.
   */
  override getAdvance(fontSize: number, glyph: GlyphRef, previous?: GlyphRef): number {
    const scale = (1 / this._openTypeFont.unitsPerEm) * fontSize;
    const resolved =
      typeof glyph == "string" ? (this._openTypeFont.stringToGlyphs(glyph)[0] as Glyph) : glyph;
    let advance = 0;
    if (resolved.advanceWidth) {
      let maxAdvance = (this._openTypeFont.tables.hhea as { advanceWidthMax: number })
        .advanceWidthMax;
      if (!maxAdvance) maxAdvance = this._openTypeFont.unitsPerEm;
      advance = Math.min(resolved.advanceWidth * scale, scale * maxAdvance);
    }
    if (previous) {
      advance += this._openTypeFont.getKerningValue(previous as Glyph, glyph as Glyph) * scale;
    }
    return advance;
  }

  /**
   * Whether the font has a feature (Font.Features). Asking for variants on
   * a font without fvar instances answers the fractions question, as the
   * old switch fell through.
   */
  override hasFeature(feature: string): boolean {
    switch (feature) {
      case Font.Features.SmallCaps:
        if (this._smallCaps == null) {
          this._smallCaps = Object.values(Font.SmallCapsUnicodeMap).every(
            (char) => this._openTypeFont.charToGlyph(char).index !== 0,
          );
        }
        return this._smallCaps;
      // @ts-expect-error -- falls through to Fractions, as before.
      case Font.Features.Variants: {
        const fvar = this._openTypeFont.tables.fvar;
        if (
          fvar &&
          fvar.axes &&
          fvar.axes.length > 0 &&
          fvar.instances &&
          fvar.instances.length > 0
        ) {
          return true;
        }
      }
      // falls through
      case Font.Features.Fractions:
        if (this._fractions == null) {
          const script = this._openTypeFont.substitution.getDefaultScriptName();
          const slash = this._openTypeFont.charToGlyphIndex(String.fromCharCode(8260));
          const numerators = this._openTypeFont.substitution.getFeature("numr", script);
          const denominators = this._openTypeFont.substitution.getFeature("dnom", script);
          this._fractions = !!(
            slash !== 0 &&
            numerators &&
            numerators.length &&
            denominators &&
            denominators.length
          );
        }
        return this._fractions;
      case Font.Features.StylisticSet:
        return this._hasStylisticSetsAvailable();
      case Font.Features.LocalizedForm:
        return this._hasLocalizedFormsAvailable();
    }
    return false;
  }

  _hasStylisticSetsAvailable(): boolean {
    if (this._stylisticSets === undefined) {
      const scripts = this._openTypeFont.substitution.getScriptNames();
      this._stylisticSets = scripts.some((script) => {
        const sets = this.getAvailableStylisticSets(script);
        return sets && sets.length > 0;
      });
    }
    return this._stylisticSets;
  }

  _hasLocalizedFormsAvailable(): boolean {
    if (this._localizedForms === undefined) {
      const scripts = this._openTypeFont.substitution.getScriptNames();
      this._localizedForms = scripts.some((script) =>
        this.getAvailableLanguageSystemTags(script).some((language) => {
          const feature = this._openTypeFont.substitution.getFeature("locl", script, language);
          return !!(feature && feature.length > 0);
        }),
      );
    }
    return this._localizedForms;
  }
}

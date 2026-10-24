// Old: chunk.vendor.js module 982 (opentype.js font.js).
// Gravit changes:
// - stringToGlyphs takes the text direction from options.direction for Bidi
//   and can report the characters behind each glyph (third argument).
// - stringToGlyphs applies the frac (numr/dnom), locl and stylistic set
//   (ssNN) features; the default options gain frac: false and stylisticSet: null.
// - forEachGlyph passes the glyph's characters (with options.generateText)
//   and the kerning value to the callback, and adds the kerning only when it
//   is non-zero. The kerning value is not reset per glyph, so the last glyph
//   gets the previous pair's kerning again (old quirk, kept).
// - parse() sets hasGHBTables for fonts with a morx table (see opentype.ts).

import type { Bidi } from "./bidi.ts";
import { Bidi as BidiProcessor } from "./bidi.ts";
import type { DrawingContext } from "./draw.ts";
import { DefaultEncoding } from "./encoding.ts";
import type { Encoding, GlyphNames } from "./encoding.ts";
import { FeatureQuery } from "./features/feature-query.ts";
import type { Glyph } from "./glyph.ts";
import { GlyphSet } from "./glyphset.ts";
import { HintingTrueType } from "./hintingtt.ts";
import { Path } from "./path.ts";
import { Position } from "./position.ts";
import { Substitution } from "./substitution.ts";
import type { FeatureSubstitution } from "./substitution.ts";
import type { Table } from "./table.ts";
import type { CffTable } from "./tables/cff.ts";
import type { CmapTable } from "./tables/cmap.ts";
import type { FvarTable } from "./tables/fvar.ts";
import type { GposTable } from "./tables/gpos.ts";
import type { GsubTable } from "./tables/gsub.ts";
import type { HeadTable } from "./tables/head.ts";
import type { HheaTable } from "./tables/hhea.ts";
import type { KerningPairs } from "./tables/kern.ts";
import type { MaxpTable } from "./tables/maxp.ts";
import type { MetaTable } from "./tables/meta.ts";
import type { NameTable } from "./tables/name.ts";
import type { Os2Table } from "./tables/os2.ts";
import type { PostTable } from "./tables/post.ts";
import * as sfnt from "./tables/sfnt.ts";
import { arrayBufferToNodeBuffer, checkArgument, isBrowser, nodeFs } from "./util.ts";

const SOLIDUS = String.fromCharCode(47);
const DIVISION_SLASH = String.fromCharCode(8725);
const FRACTION_SLASH = String.fromCharCode(8260);

/** The parsed tables a font keeps. Which ones exist depends on the file. */
export interface FontTables {
  /** null when the file has a cmap but no sub-table the fork can read (parse() then throws). */
  cmap?: CmapTable | null;
  cvt?: number[];
  fpgm?: number[];
  prep?: number[];
  head?: HeadTable;
  hhea?: HheaTable;
  maxp?: MaxpTable;
  os2?: Os2Table;
  post?: PostTable;
  name?: NameTable;
  cff?: CffTable;
  gpos?: GposTable;
  gsub?: GsubTable;
  fvar?: FvarTable;
  meta?: MetaTable;
}

export interface FontOptions {
  /** Create an empty font that parse() fills; skips every other option. */
  empty?: boolean;
  familyName?: string;
  styleName?: string;
  fullName?: string;
  postScriptName?: string;
  designer?: string;
  designerURL?: string;
  manufacturer?: string;
  manufacturerURL?: string;
  license?: string;
  licenseURL?: string;
  version?: string;
  description?: string;
  copyright?: string;
  trademark?: string;
  unitsPerEm?: number;
  ascender?: number;
  descender?: number;
  createdTimestamp?: number;
  weightClass?: number;
  widthClass?: number;
  fsSelection?: number;
  glyphs?: Glyph[];
}

export interface RenderFeatures {
  liga?: boolean;
  rlig?: boolean;
  /** Gravit: apply numr/dnom around fraction slashes. */
  frac?: boolean;
  /** Gravit: a stylistic set feature tag such as "ss01". */
  stylisticSet?: string | null;
}

export interface RenderOptions {
  /** OpenType script tag; defaults to DFLT or latn. */
  script?: string;
  /** OpenType language system tag. Gravit: with a language, locl is applied. */
  language?: string;
  kerning?: boolean;
  features?: RenderFeatures;
  /** Gravit: base direction for Bidi ("ltr" or "rtl"). */
  direction?: string;
  /** Gravit: have forEachGlyph pass each glyph's characters to the callback. */
  generateText?: boolean;
  letterSpacing?: number;
  tracking?: number;
  hinting?: boolean;
  xScale?: number;
  yScale?: number;
}

/** forEachGlyph's callback. Gravit adds the glyph's characters and the kerning value. */
export type GlyphCallback = (
  this: Font,
  glyph: Glyph,
  x: number,
  y: number,
  fontSize: number,
  options: RenderOptions,
  text: string | undefined,
  kerningValue: number | undefined,
) => void;

/** While stringToGlyphs runs, the characters behind each glyph. */
interface GlyphText {
  char?: string;
  lig?: string;
}

/** A loaded OpenType font: glyphs, metrics, tables and text layout helpers. */
export class Font {
  declare names: NameTable;
  declare unitsPerEm: number;
  declare ascender: number;
  declare descender: number;
  declare createdTimestamp: number | undefined;
  declare tables: FontTables;
  declare supported: boolean;
  declare glyphs: GlyphSet;
  declare encoding: Encoding;
  declare position: Position;
  declare substitution: Substitution;
  declare outlinesFormat: "truetype" | "cff";
  declare numberOfHMetrics: number;
  declare numGlyphs: number;
  declare glyphNames: GlyphNames;
  declare kerningPairs: KerningPairs;
  declare metas: MetaTable;
  /** Gravit: the font has a morx table, so text has to be shaped with HarfBuzz. */
  declare hasGHBTables: boolean;

  // Set by the CFF parser (tables/cff.ts).
  declare cffEncoding: unknown;
  declare isCIDFont: boolean;
  declare nGlyphs: number;
  declare gsubrs: number[][];
  declare gsubrsBias: number;
  declare subrs: number[][];
  declare subrsBias: number;
  declare defaultWidthX: number;
  declare nominalWidthX: number;
  declare fdArray: unknown[];
  declare fdSelect: number[];

  /** Shared through the prototype like the old values, so callers may change or replace them. */
  declare defaultRenderOptions: RenderOptions;
  declare fsSelectionValues: typeof FS_SELECTION_VALUES;
  declare usWidthClasses: typeof US_WIDTH_CLASSES;
  declare usWeightClasses: typeof US_WEIGHT_CLASSES;

  declare private _hinting: HintingTrueType | undefined;

  constructor(options?: FontOptions) {
    options = options || {};

    if (!options.empty) {
      checkArgument(options.familyName, "When creating a new Font object, familyName is required.");
      checkArgument(options.styleName, "When creating a new Font object, styleName is required.");
      checkArgument(options.unitsPerEm, "When creating a new Font object, unitsPerEm is required.");
      checkArgument(options.ascender, "When creating a new Font object, ascender is required.");
      checkArgument(options.descender, "When creating a new Font object, descender is required.");
      checkArgument(options.descender < 0, "Descender should be negative (e.g. -512).");

      // OS X complains about empty names, so every name defaults to a space.
      this.names = {
        fontFamily: { en: options.familyName || " " },
        fontSubfamily: { en: options.styleName || " " },
        fullName: { en: options.fullName || options.familyName + " " + options.styleName },
        // postScriptName may not contain whitespace.
        postScriptName: {
          en: options.postScriptName || (options.familyName + options.styleName).replace(/\s/g, ""),
        },
        designer: { en: options.designer || " " },
        designerURL: { en: options.designerURL || " " },
        manufacturer: { en: options.manufacturer || " " },
        manufacturerURL: { en: options.manufacturerURL || " " },
        license: { en: options.license || " " },
        licenseURL: { en: options.licenseURL || " " },
        version: { en: options.version || "Version 0.1" },
        description: { en: options.description || " " },
        copyright: { en: options.copyright || " " },
        trademark: { en: options.trademark || " " },
      };
      this.unitsPerEm = options.unitsPerEm || 1000;
      this.ascender = options.ascender;
      this.descender = options.descender;
      this.createdTimestamp = options.createdTimestamp;
      // A new font starts with these three OS/2 fields; sfnt.fontToTable
      // fills in the rest.
      this.tables = {
        os2: {
          usWeightClass: options.weightClass || this.usWeightClasses.MEDIUM,
          usWidthClass: options.widthClass || this.usWidthClasses.MEDIUM,
          fsSelection: options.fsSelection || this.fsSelectionValues.REGULAR,
        } as Os2Table,
      };
    }

    // Deprecated in opentype.js; Gravit's GOpenTypeFont still checks it.
    this.supported = true;
    this.glyphs = new GlyphSet(this, options.glyphs || []);
    this.encoding = new DefaultEncoding(this);
    this.position = new Position(this);
    this.substitution = new Substitution(this);
    this.tables = this.tables || {};
  }

  /** The TrueType hinting engine, created on first use; undefined for CFF fonts. */
  get hinting(): HintingTrueType | undefined {
    if (this._hinting) return this._hinting;
    if (this.outlinesFormat === "truetype") {
      return (this._hinting = new HintingTrueType(this));
    }
    return undefined;
  }

  hasChar(c: string): boolean {
    return this.encoding.charToGlyphIndex(c) !== null;
  }

  /** One glyph index for the character; assumes a one-to-one mapping. */
  charToGlyphIndex(s: string): number | null {
    return this.encoding.charToGlyphIndex(s);
  }

  /** One glyph for the character, or .notdef. */
  charToGlyph(c: string): Glyph {
    const glyphIndex = this.charToGlyphIndex(c);
    let glyph = this.glyphs.get(glyphIndex as number);
    if (!glyph) {
      glyph = this.glyphs.get(0) as Glyph;
    }
    return glyph;
  }

  /**
   * Converts text to glyphs, applying the arabic forms, ligatures and (Gravit)
   * fractions, localized forms and stylistic sets. When chars is given it is
   * filled with the characters behind each returned glyph (a ligature gets
   * all its characters).
   */
  stringToGlyphs(s: string, options?: RenderOptions, chars?: string[]): Glyph[] {
    options = options || this.defaultRenderOptions;

    const bidi: Bidi = new BidiProcessor(options.direction);
    const charToGlyphIndexMod = (token: { char: string }): number | null =>
      this.charToGlyphIndex(token.char);
    bidi.registerModifier("glyphIndex", null, charToGlyphIndexMod);

    const arabFeatureQuery = new FeatureQuery(this);
    bidi.applyFeatures(
      ["init", "medi", "fina", "rlig"].map((tag) => {
        const query = { tag: tag, script: "arab" };
        const feature = arabFeatureQuery.getFeature(query);
        if (feature) return feature;
        return undefined;
      }),
    );

    const tokenChars: string[] | undefined = chars && [];
    const indexes = bidi.getTextGlyphs(s, tokenChars);
    let length = indexes.length;

    let glyphText: GlyphText[] | undefined;
    if (chars && tokenChars) {
      glyphText = [];
      for (let i = 0; i < tokenChars.length; i++) {
        glyphText.push({ char: tokenChars[i] });
      }
    }

    if (options.features) {
      const script = options.script || this.substitution.getDefaultScriptName();
      let manyToOne: FeatureSubstitution[] = [];
      if (options.features.liga) {
        manyToOne = manyToOne.concat(
          this.substitution.getFeature("liga", script, options.language) as FeatureSubstitution[],
        );
      }
      if (options.features.rlig) {
        manyToOne = manyToOne.concat(
          this.substitution.getFeature("rlig", script, options.language) as FeatureSubstitution[],
        );
      }
      for (let i = 0; i < length; i += 1) {
        for (let j = 0; j < manyToOne.length; j++) {
          const ligature = manyToOne[j] as FeatureSubstitution;
          const components = ligature.sub as number[];
          const compCount = components.length;
          let k = 0;
          while (k < compCount && components[k] === indexes[i + k]) k++;
          if (k === compCount) {
            indexes.splice(i, compCount, ligature.by as number);
            if (glyphText) {
              glyphText.splice(i, compCount, {
                lig: glyphText
                  .slice(i, i + compCount)
                  .map((entry) => entry.char)
                  .join(""),
              });
            }
            length = length - compCount + 1;
          }
        }
      }

      if (options.features.frac) {
        const numerators = this.substitution.getFeature(
          "numr",
          script,
          options.language,
        ) as FeatureSubstitution[];
        const denominators = this.substitution.getFeature(
          "dnom",
          script,
          options.language,
        ) as FeatureSubstitution[];
        const fractionSlash = this.charToGlyphIndex(FRACTION_SLASH) || -1;
        const solidus = this.charToGlyphIndex(SOLIDUS) || -1;
        const divisionSlash = this.charToGlyphIndex(DIVISION_SLASH) || -1;
        // Digits before a slash become numerators, after it denominators. Every
        // slash becomes the fraction slash. A glyph without a substitute
        // switches back to numerators.
        let substitutes = numerators;
        nextGlyph: for (let i = 0; i < length; i++) {
          if (
            indexes[i] === solidus ||
            indexes[i] === fractionSlash ||
            indexes[i] === divisionSlash
          ) {
            indexes.splice(i, 1, fractionSlash);
            substitutes = denominators;
            continue;
          }
          for (let j = 0; j < substitutes.length; j++) {
            const substitute = substitutes[j] as FeatureSubstitution;
            if (substitute.sub === indexes[i]) {
              indexes.splice(i, 1, substitute.by as number);
              continue nextGlyph;
            }
          }
          substitutes = numerators;
        }
      }

      if (options.language) {
        this._applyLocalizedForm(indexes, script, options.language);
      }
      if (options.features.stylisticSet) {
        this._applyStylisticSet(indexes, options.features.stylisticSet, script, options.language);
      }
    }

    if (chars && glyphText) {
      chars.splice(0, chars.length);
      for (let i = 0; i < glyphText.length; i++) {
        const entry = glyphText[i] as GlyphText;
        chars.push((entry.lig || entry.char) as string);
      }
    }

    const glyphs = new Array<Glyph>(length);
    const notdef = this.glyphs.get(0) as Glyph;
    for (let i = 0; i < length; i += 1) {
      glyphs[i] = this.glyphs.get(indexes[i] as number) || notdef;
    }
    return glyphs;
  }

  /** Gravit: applies a stylistic set feature (ssNN) as single substitutions. */
  _applyStylisticSet(
    indexes: number[],
    stylisticSet: string,
    script: string | undefined,
    language: string | undefined,
  ): void {
    const substitutions = this.substitution.getFeature(stylisticSet, script, language);
    if (substitutions && substitutions.length > 0) {
      this._applySubsitution(substitutions, indexes);
    }
  }

  /** Gravit: applies the locl feature for the language. */
  _applyLocalizedForm(indexes: number[], script: string | undefined, language: string): void {
    const substitutions = this.substitution.getFeature("locl", script, language);
    if (substitutions && substitutions.length > 0) {
      this._applySubsitution(substitutions, indexes);
    }
  }

  /** Gravit: replaces each glyph index that has a substitute. The name's typo is the old one. */
  _applySubsitution(substitutions: FeatureSubstitution[] | undefined, indexes: number[]): void {
    if (!substitutions) return;
    const bySub = substitutions.reduce<Record<string, FeatureSubstitution>>((map, entry) => {
      map[String(entry.sub)] = entry;
      return map;
    }, {});
    const length = indexes.length;
    for (let i = 0; i < length; i++) {
      const entry = bySub[String(indexes[i])];
      if (entry) {
        indexes.splice(i, 1, entry.by as number);
      }
    }
  }

  nameToGlyphIndex(name: string): number {
    return this.glyphNames.nameToGlyphIndex(name);
  }

  nameToGlyph(name: string): Glyph {
    const glyphIndex = this.nameToGlyphIndex(name);
    let glyph = this.glyphs.get(glyphIndex);
    if (!glyph) {
      glyph = this.glyphs.get(0) as Glyph;
    }
    return glyph;
  }

  glyphIndexToName(gid: number): string {
    if (!this.glyphNames.glyphIndexToName) {
      return "";
    }
    return this.glyphNames.glyphIndexToName(gid);
  }

  /**
   * The kerning between two glyphs (or glyph indexes): GPOS kerning for the
   * default script when the font has it, else the kern table, else 0.
   */
  getKerningValue(leftGlyph: Glyph | number, rightGlyph: Glyph | number): number {
    const left = (
      typeof leftGlyph === "number" ? leftGlyph : leftGlyph.index || leftGlyph
    ) as number;
    const right = (
      typeof rightGlyph === "number" ? rightGlyph : rightGlyph.index || rightGlyph
    ) as number;
    const gposKerning = this.position.defaultKerningTables;
    if (gposKerning) {
      return this.position.getKerningValue(gposKerning, left, right);
    }
    return this.kerningPairs[left + "," + right] || 0;
  }

  /**
   * Calls callback for each glyph of the text and returns the x after the
   * last glyph.
   */
  forEachGlyph(
    text: string,
    x: number | undefined,
    y: number | undefined,
    fontSize: number | undefined,
    options: RenderOptions | undefined,
    callback: GlyphCallback,
  ): number {
    x = x !== undefined ? x : 0;
    y = y !== undefined ? y : 0;
    fontSize = fontSize !== undefined ? fontSize : 72;
    options = options || this.defaultRenderOptions;
    const fontScale = (1 / this.unitsPerEm) * fontSize;
    let chars: string[] | undefined;
    if (options.generateText) chars = [];
    const glyphs = this.stringToGlyphs(text, options, chars);
    let kerningLookups: ReturnType<Position["getKerningTables"]> | undefined;
    if (options.kerning) {
      const script = options.script || this.position.getDefaultScriptName();
      kerningLookups = this.position.getKerningTables(script, options.language);
    }
    // Declared outside the loop like the old `var`: the last glyph sees the
    // previous pair's value.
    let kerningValue: number | undefined;
    for (let i = 0; i < glyphs.length; i += 1) {
      const glyph = glyphs[i] as Glyph;
      if (options.kerning && i < glyphs.length - 1) {
        const next = glyphs[i + 1] as Glyph;
        kerningValue = kerningLookups
          ? this.position.getKerningValue(kerningLookups, glyph.index, next.index)
          : this.getKerningValue(glyph, next);
      }
      callback.call(this, glyph, x, y, fontSize, options, chars && chars[i], kerningValue);
      if (glyph.advanceWidth) {
        x += glyph.advanceWidth * fontScale;
      }
      if (options.kerning && kerningValue) {
        x += kerningValue * fontScale;
      }
      if (options.letterSpacing) {
        x += options.letterSpacing * fontSize;
      } else if (options.tracking) {
        x += (options.tracking / 1000) * fontSize;
      }
    }
    return x;
  }

  /** One path for the whole text. */
  getPath(text: string, x?: number, y?: number, fontSize?: number, options?: RenderOptions): Path {
    const fullPath = new Path();
    this.forEachGlyph(text, x, y, fontSize, options, function (glyph, gX, gY, gFontSize) {
      const glyphPath = glyph.getPath(gX, gY, gFontSize, options, this);
      fullPath.extend(glyphPath);
    });
    return fullPath;
  }

  /** One path per glyph. */
  getPaths(
    text: string,
    x?: number,
    y?: number,
    fontSize?: number,
    options?: RenderOptions,
  ): Path[] {
    const glyphPaths: Path[] = [];
    this.forEachGlyph(text, x, y, fontSize, options, function (glyph, gX, gY, gFontSize) {
      const glyphPath = glyph.getPath(gX, gY, gFontSize, options, this);
      glyphPaths.push(glyphPath);
    });
    return glyphPaths;
  }

  getAdvanceWidth(text: string, fontSize?: number, options?: RenderOptions): number {
    return this.forEachGlyph(text, 0, 0, fontSize, options, function () {});
  }

  draw(
    ctx: DrawingContext,
    text: string,
    x?: number,
    y?: number,
    fontSize?: number,
    options?: RenderOptions,
  ): void {
    this.getPath(text, x, y, fontSize, options).draw(ctx);
  }

  drawPoints(
    ctx: DrawingContext,
    text: string,
    x?: number,
    y?: number,
    fontSize?: number,
    options?: RenderOptions,
  ): void {
    this.forEachGlyph(text, x, y, fontSize, options, function (glyph, gX, gY, gFontSize) {
      glyph.drawPoints(ctx, gX, gY, gFontSize);
    });
  }

  drawMetrics(
    ctx: DrawingContext,
    text: string,
    x?: number,
    y?: number,
    fontSize?: number,
    options?: RenderOptions,
  ): void {
    this.forEachGlyph(text, x, y, fontSize, options, function (glyph, gX, gY, gFontSize) {
      glyph.drawMetrics(ctx, gX, gY, gFontSize);
    });
  }

  getEnglishName(name: string): string | undefined {
    const translations = this.names[name];
    if (translations) {
      return translations.en;
    }
    return undefined;
  }

  /** Collects warnings about missing names; like opentype.js it doesn't return them. */
  validate(): void {
    const warnings: string[] = [];

    const assert = (predicate: unknown, message: string): void => {
      if (!predicate) {
        warnings.push(message);
      }
    };

    const assertNamePresent = (name: string): void => {
      const englishName = this.getEnglishName(name);
      assert(englishName && englishName.trim().length > 0, "No English " + name + " specified.");
    };

    assertNamePresent("fontFamily");
    assertNamePresent("weightName");
    assertNamePresent("manufacturer");
    assertNamePresent("copyright");
    assertNamePresent("version");
    assert(this.unitsPerEm > 0, "No unitsPerEm specified.");
  }

  toTables(): Table {
    return sfnt.fontToTable(this);
  }

  /** @deprecated Use toArrayBuffer. */
  toBuffer(): ArrayBuffer {
    console.warn("Font.toBuffer is deprecated. Use Font.toArrayBuffer instead.");
    return this.toArrayBuffer();
  }

  toArrayBuffer(): ArrayBuffer {
    const sfntTable = this.toTables();
    const bytes = sfntTable.encode();
    const buffer = new ArrayBuffer(bytes.length);
    const intArray = new Uint8Array(buffer);
    for (let i = 0; i < bytes.length; i++) {
      intArray[i] = bytes[i] as number;
    }
    return buffer;
  }

  /** Saves the font as an .otf file: a download in the browser, a file in Node. */
  download(fileName?: string): void {
    const familyName = this.getEnglishName("fontFamily") as string;
    const styleName = this.getEnglishName("fontSubfamily");
    fileName = fileName || familyName.replace(/\s/g, "") + "-" + styleName + ".otf";
    const arrayBuffer = this.toArrayBuffer();

    if (isBrowser()) {
      if (window.URL) {
        const dataView = new DataView(arrayBuffer);
        const blob = new Blob([dataView], { type: "font/opentype" });
        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        link.download = fileName;
        const event = document.createEvent("MouseEvents");
        event.initEvent("click", true, false);
        link.dispatchEvent(event);
      } else {
        console.warn("Font file could not be downloaded. Try using a different browser.");
      }
    } else {
      nodeFs().writeFileSync(fileName, arrayBufferToNodeBuffer(arrayBuffer));
    }
  }
}

const DEFAULT_RENDER_OPTIONS: RenderOptions = {
  kerning: true,
  features: {
    liga: true,
    rlig: true,
    frac: false,
    stylisticSet: null,
  },
};

const FS_SELECTION_VALUES = {
  ITALIC: 0x001,
  UNDERSCORE: 0x002,
  NEGATIVE: 0x004,
  OUTLINED: 0x008,
  STRIKEOUT: 0x010,
  BOLD: 0x020,
  REGULAR: 0x040,
  USER_TYPO_METRICS: 0x080,
  WWS: 0x100,
  OBLIQUE: 0x200,
};

const US_WIDTH_CLASSES = {
  ULTRA_CONDENSED: 1,
  EXTRA_CONDENSED: 2,
  CONDENSED: 3,
  SEMI_CONDENSED: 4,
  MEDIUM: 5,
  SEMI_EXPANDED: 6,
  EXPANDED: 7,
  EXTRA_EXPANDED: 8,
  ULTRA_EXPANDED: 9,
};

const US_WEIGHT_CLASSES = {
  THIN: 100,
  EXTRA_LIGHT: 200,
  LIGHT: 300,
  NORMAL: 400,
  MEDIUM: 500,
  SEMI_BOLD: 600,
  BOLD: 700,
  EXTRA_BOLD: 800,
  BLACK: 900,
};

Font.prototype.defaultRenderOptions = DEFAULT_RENDER_OPTIONS;
Font.prototype.fsSelectionValues = FS_SELECTION_VALUES;
Font.prototype.usWidthClasses = US_WIDTH_CLASSES;
Font.prototype.usWeightClasses = US_WEIGHT_CLASSES;

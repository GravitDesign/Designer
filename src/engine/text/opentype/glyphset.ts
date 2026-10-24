// Old: chunk.vendor.js module 529 (opentype.js glyphset.js, unchanged).

import type { Font } from "./font.ts";
import { Glyph } from "./glyph.ts";
import type { Path } from "./path.ts";

/** Makes a glyph on first access. */
export type GlyphLoader = () => Glyph;

/** Defines glyph[externalName] so that reading it loads the path first (TrueType bounds). */
function defineDependentProperty(
  glyph: Glyph,
  externalName: "xMin" | "xMax" | "yMin" | "yMax",
  internalName: "_xMin" | "_xMax" | "_yMin" | "_yMax",
): void {
  Object.defineProperty(glyph, externalName, {
    get: function () {
      // Reading the path makes the loader parse the glyph, which sets the internal value.
      void glyph.path;
      return glyph[internalName];
    },
    set: function (newValue: number | undefined) {
      glyph[internalName] = newValue;
    },
    enumerable: true,
    configurable: true,
  });
}

/** The glyphs of a font by index. Entries can be loaders that run on first get(). */
export class GlyphSet {
  font: Font;
  glyphs: Record<number, Glyph | GlyphLoader>;
  length: number;

  constructor(font: Font, glyphs?: Glyph[]) {
    this.font = font;
    this.glyphs = {};
    if (Array.isArray(glyphs)) {
      for (let i = 0; i < glyphs.length; i++) {
        this.glyphs[i] = glyphs[i] as Glyph;
      }
    }
    this.length = (glyphs && glyphs.length) || 0;
  }

  get(index: number): Glyph | undefined {
    const entry = this.glyphs[index];
    if (typeof entry === "function") {
      this.glyphs[index] = entry();
    }
    return this.glyphs[index] as Glyph | undefined;
  }

  push(index: number, loader: Glyph | GlyphLoader): void {
    this.glyphs[index] = loader;
    this.length++;
  }
}

/** An empty glyph (no outline). */
export function glyphLoader(font: Font, index: number): Glyph {
  return new Glyph({ index: index, font: font });
}

/** A loader for a TrueType glyph: the outline is parsed when the path is first read. */
export function ttfGlyphLoader(
  font: Font,
  index: number,
  parseGlyph: (glyph: Glyph, data: DataView, position: number) => void,
  data: DataView,
  position: number,
  buildPath: (glyphs: GlyphSet, glyph: Glyph) => Path,
): GlyphLoader {
  return function () {
    const glyph = new Glyph({ index: index, font: font });

    glyph.path = function () {
      parseGlyph(glyph, data, position);
      const path = buildPath(font.glyphs, glyph);
      path.unitsPerEm = font.unitsPerEm;
      return path;
    };

    defineDependentProperty(glyph, "xMin", "_xMin");
    defineDependentProperty(glyph, "xMax", "_xMax");
    defineDependentProperty(glyph, "yMin", "_yMin");
    defineDependentProperty(glyph, "yMax", "_yMax");

    return glyph;
  };
}

/** A loader for a CFF glyph: the charstring runs when the path is first read. */
export function cffGlyphLoader(
  font: Font,
  index: number,
  parseCFFCharstring: (font: Font, glyph: Glyph, charstring: number[]) => Path,
  charstring: number[],
): GlyphLoader {
  return function () {
    const glyph = new Glyph({ index: index, font: font });

    glyph.path = function () {
      const path = parseCFFCharstring(font, glyph, charstring);
      path.unitsPerEm = font.unitsPerEm;
      return path;
    };

    return glyph;
  };
}

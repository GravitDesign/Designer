// Old: chunk.vendor.js module 1429 (the PDF font descriptor).
import type { OpenTypeFont } from "../../../engine/text/fonts/open-type-font.ts";
import type { Font as OpenTypeJsFont } from "../../../engine/text/opentype/font.ts";
import type { PDFIndirectReference } from "./indirect-reference.ts";
import { PDFArray } from "./pdf-array.ts";
import { PDFDictionary } from "./pdf-dictionary.ts";

/** The parts of the opentype.js tables the descriptor reads. */
export interface DescriptorTables {
  head: { unitsPerEm: number; xMin: number; yMin: number; xMax: number; yMax: number };
  os2?: { sTypoAscender: number; sTypoDescender: number; sCapHeight?: number };
  name: { postScriptName: { en: string } };
  post: { italicAngle: number };
}

export function tablesOf(font: OpenTypeJsFont): DescriptorTables {
  return font.tables as unknown as DescriptorTables;
}

/**
 * `/FontDescriptor`: metrics in 1/1000 em (from OS/2 when present: typo
 * ascender and descender, cap height), the box, the PostScript name and
 * the embedded TrueType file.
 */
export class PDFFontDescriptor extends PDFDictionary {
  declare _font: OpenTypeFont | null;

  constructor(font: OpenTypeFont, fontFile: PDFIndirectReference | null) {
    super();
    this._font = font;
    const tables = tablesOf(this.getOpenTypeFont());
    let ascent = this.getOpenTypeFont().ascender;
    let descent = this.getOpenTypeFont().descender;
    let capHeight = 0.7 * tables.head.unitsPerEm;
    if (tables.os2) {
      ascent = tables.os2.sTypoAscender;
      descent = tables.os2.sTypoDescender;
      capHeight = tables.os2.sCapHeight || 0;
    }
    this.put("/Type", "/FontDescriptor");
    this.put("/Ascent", (1e3 * ascent) / tables.head.unitsPerEm);
    this.put("/Descent", (1e3 * descent) / tables.head.unitsPerEm);
    this.put("/CapHeight", (1e3 * capHeight) / tables.head.unitsPerEm);
    const box = new PDFArray();
    box.push((1e3 * tables.head.xMin) / tables.head.unitsPerEm);
    box.push((1e3 * tables.head.yMin) / tables.head.unitsPerEm);
    box.push((1e3 * tables.head.xMax) / tables.head.unitsPerEm);
    box.push((1e3 * tables.head.yMax) / tables.head.unitsPerEm);
    this.put("/FontBBox", box);
    this.put("/FontName", "/" + tables.name.postScriptName.en);
    this.put("/StemV", 80);
    this.put("/ItalicAngle", tables.post.italicAngle);
    this.put("/Flags", 32);
    if (fontFile) this.put("/FontFile2", fontFile);
  }

  getFont(): OpenTypeFont {
    return this._font as OpenTypeFont;
  }

  getOpenTypeFont(): OpenTypeJsFont {
    return this.getFont()._openTypeFont;
  }
}

PDFFontDescriptor.prototype._font = null;

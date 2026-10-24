// Old: chunk.vendor.js module 1431 (GPDFCIDFontType).
import { parseTableEntries } from "../../../engine/text/opentype/opentype.ts";
import { tablesOf, type PDFFontDescriptor } from "./font-lookup.ts";
import { PDFFlateDecode } from "./flate-decode.ts";
import { PDFIdentityEncoding } from "./identity-encoding.ts";
import { PDFIndirectReference } from "./indirect-reference.ts";
import { PDFArray } from "./pdf-array.ts";
import { PDFDictionary } from "./pdf-dictionary.ts";
import { PDFFont } from "./pdf-font.ts";
import { PDFNumber } from "./pdf-number.ts";
import type { PDFObject } from "./pdf-object.ts";
import type { PDFStreamData } from "./pdf-filter.ts";
import { PDFStream } from "./pdf-stream.ts";
import type { PDFTextEncodeOptions } from "./text-writer.ts";
import { PDFUnicode } from "./unicode.ts";
import type { PDFIndirectObject } from "./xref-entry.ts";

/** What the CID font needs from the document. */
export interface PDFFontDocument {
  getIndirectObject<T extends PDFObject>(object: T): PDFIndirectObject<T>;
  addIndirectObject(object: PDFIndirectObject): void;
  removeIndirectObject(object: PDFIndirectObject | null | undefined): void;
  isCompress(): boolean;
}

const TO_UNICODE_HEADER =
  "/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo\n<< /Registry (TTX+0)\n/Ordering (T42UV)\n/Supplement 0\n>> def\n/CMapName /TTX+0 def\n/CMapType 2 def\n1 begincodespacerange\n<0000><FFFF>\nendcodespacerange\n";

const TO_UNICODE_FOOTER =
  "endbfrange\nendcmap\nCMapName currentdict /CMap defineresource pop\nend end";

/**
 * A Type0 font with Identity-H encoding over a CIDFontType2 descendant
 * (CIDFontType0 with the CFF table for CFF fonts). Every encode updates
 * the widths (/W, for glyphs not 1000 wide) and the ToUnicode map from
 * the glyphs used so far.
 */
export class PDFCIDFontType extends PDFFont {
  declare _fontDescriptor: PDFFontDescriptor | null;
  declare _cidFontType2: PDFDictionary | null;
  declare _toUnicode: PDFStream | null;

  constructor(
    name: string,
    descriptor: PDFIndirectReference<PDFFontDescriptor>,
    document: PDFFontDocument,
  ) {
    super(name);
    const font = descriptor.getPDFObject().getOpenTypeFont();
    const tables = tablesOf(font);
    const systemInfo = new PDFDictionary();
    systemInfo.putText("/Registry", "Adobe");
    systemInfo.putText("/Ordering", "Identity");
    systemInfo.put("/Supplement", 0);
    const descendant = new PDFDictionary();
    this._cidFontType2 = descendant;
    descendant.put("/Type", "/Font");
    descendant.put("/Subtype", "/CIDFontType2");
    descendant.put("/BaseFont", "/" + tables.name.postScriptName.en);
    descendant.put("/DW", 1e3);
    descendant.put("/CIDSystemInfo", systemInfo);
    descendant.put("/CIDToGIDMap", "/Identity");
    descendant.put("/FontDescriptor", descriptor);
    const descendantObject = document.getIndirectObject(descendant);
    document.addIndirectObject(descendantObject);
    // The stream gets its data (the deflated map) on the first encode.
    this._toUnicode = new PDFStream(undefined as unknown as PDFStreamData);
    const toUnicodeObject = document.getIndirectObject(this._toUnicode);
    document.addIndirectObject(toUnicodeObject);
    this.put("/Type", "/Font");
    this.put("/Subtype", "/Type0");
    this.put("/BaseFont", "/" + tables.name.postScriptName.en);
    this.put("/Encoding", "/Identity-H");
    this.put("/ToUnicode", new PDFIndirectReference(toUnicodeObject));
    this.put("/DescendantFonts", new PDFArray([new PDFIndirectReference(descendantObject)]));
    this._fontDescriptor = descriptor.getPDFObject();
    this._encoding = new PDFIdentityEncoding(this._fontDescriptor.getFont());
    if (font.isCIDFont) {
      const cff = this._getCFFTable(this._fontDescriptor.getFont()._buffer as ArrayBuffer);
      if (cff) {
        const cffStream = new PDFStream(new PDFFlateDecode(cff));
        cffStream.putDictionary("/Subtype", "/CIDFontType0C");
        const cffObject = document.getIndirectObject(cffStream);
        document.addIndirectObject(cffObject);
        const fontName = "/" + tables.name.postScriptName.en + "-Identity-H";
        this._fontDescriptor.put("/FontFile3", new PDFIndirectReference(cffObject));
        this._fontDescriptor.put("/FontName", fontName);
        const fontFile = this._fontDescriptor.remove("/FontFile2") as PDFIndirectReference | null;
        if (fontFile) document.removeIndirectObject(fontFile.getPDFIndirectObject());
        descendant.put("/BaseFont", fontName);
        descendant.put("/Subtype", "/CIDFontType0");
        descendant.remove("/CIDToGIDMap");
        this.put("/BaseFont", fontName);
      }
    }
  }

  override encode(text: string, options?: PDFTextEncodeOptions): unknown[] {
    const encoded = super.encode(text, options);
    this._updateWidths();
    this._updateUnicode();
    return encoded;
  }

  /**
   * `/W [cid [w w ...] cid [w ...]]`: runs of consecutive glyph ids. The
   * old code sorted the glyphs by a field they don't have, which keeps
   * their order (by glyph id).
   */
  _updateWidths(): void {
    let run: PDFArray | undefined;
    let previous: number | null = null;
    const widths = new PDFArray();
    (this._encoding as PDFIdentityEncoding).getGlyphs().forEach((glyph) => {
      if (1e3 != glyph.width) {
        if (!(null != previous && glyph.cid === previous + 1)) {
          run = new PDFArray();
          widths.push(glyph.cid);
          widths.push(run);
        }
        (run as PDFArray).push(glyph.width);
        previous = glyph.cid;
      }
    });
    if (widths.size()) (this._cidFontType2 as PDFDictionary).put("/W", widths);
  }

  /**
   * The ToUnicode CMap, in bfrange blocks of 100 glyphs. Code points above
   * U+FFFF were meant as a surrogate pair, but the old code didn't round
   * the lead surrogate, so they come out as hex with a fraction (see
   * "PDF writer quirks kept from the old code" in QUESTIONS.md).
   */
  _updateUnicode(): void {
    let cmap = TO_UNICODE_HEADER;
    let remaining = 0;
    const glyphs = (this._encoding as PDFIdentityEncoding)
      .getGlyphs()
      .filter((glyph) => !!glyph.unicode);
    const hex = (code: number) => {
      if (code < 65536) return "<" + PDFNumber.toHex(code, 4) + ">";
      const lead = (code -= 65536) / 1024 + PDFUnicode.Surrogate.Lead.FirstChar;
      const trail = (code % 1024) + PDFUnicode.Surrogate.Trail.FirstChar;
      return "[<" + PDFNumber.toHex(lead, 4) + PDFNumber.toHex(trail, 4) + ">]";
    };
    glyphs.forEach((glyph, index) => {
      if (0 == remaining) {
        if (0 != index) cmap += "endbfrange\n";
        remaining = Math.min(100, glyphs.length - index);
        cmap += remaining + " beginbfrange\n";
      }
      --remaining;
      const cid = hex(glyph.cid);
      cmap += cid + cid + hex(glyph.unicode as number) + "\n";
    });
    cmap += TO_UNICODE_FOOTER;
    (this._toUnicode as PDFStream).filter = new PDFFlateDecode(cmap);
  }

  _getCFFTable(buffer: ArrayBuffer): Uint8Array | null {
    const entries = parseTableEntries(buffer);
    for (let i = 0; i < entries.length; i += 1) {
      const entry = entries[i] as (typeof entries)[number];
      if ("CFF " === entry.tag) return new Uint8Array(buffer, entry.offset, entry.length);
    }
    return null;
  }

  override toString(): string {
    return "[GPDFCIDFontType]";
  }
}

Object.assign(PDFCIDFontType.prototype, {
  _fontDescriptor: null,
  _cidFontType2: null,
  _toUnicode: null,
});

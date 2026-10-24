// Old: chunk.vendor.js module 1428 (the PDF font factory).
import type { OpenTypeFont } from "../../../engine/text/fonts/open-type-font.ts";
import { PDFCIDFontType, type PDFFontDocument } from "./cid-font-type.ts";
import { PDFFontDescriptor } from "./font-lookup.ts";
import { PDFFontStream } from "./font-stream.ts";
import { PDFIndirectReference } from "./indirect-reference.ts";
import type { PDFFont } from "./pdf-font.ts";
import { PDFType1Font } from "./type1-font.ts";
import type { PDFIndirectObject } from "./xref-entry.ts";

export const PDFFontFactory = {
  /**
   * The font object for an engine font: a standard font by family name, or
   * an embedded CID font (the TrueType file goes in unless the font is CFF).
   */
  createFont(
    document: PDFFontDocument,
    font: OpenTypeFont,
    name: string,
  ): PDFIndirectObject<PDFFont> {
    let pdfFont: PDFFont;
    if (PDFType1Font.isStandardFont(font.getFamily())) {
      pdfFont = new PDFType1Font(name, font.getFamily());
    } else {
      let fontFile: PDFIndirectReference | null = null;
      if (!font._openTypeFont.isCIDFont) {
        const stream = new PDFFontStream(font._buffer, document.isCompress());
        const streamObject = document.getIndirectObject(stream);
        fontFile = new PDFIndirectReference(streamObject);
        document.addIndirectObject(streamObject);
      }
      const descriptor = document.getIndirectObject(new PDFFontDescriptor(font, fontFile));
      document.addIndirectObject(descriptor);
      pdfFont = new PDFCIDFontType(name, new PDFIndirectReference(descriptor), document);
    }
    const fontObject = document.getIndirectObject(pdfFont);
    document.addIndirectObject(fontObject);
    return fontObject;
  },
};

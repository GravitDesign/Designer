// Old: chunk.vendor.js module 1435 (the PDF standard Type 1 font).
import { PDFEncodings } from "./encodings.ts";
import { PDFFont } from "./pdf-font.ts";

const BASE_14 = [
  "Courier",
  "Courier-Bold",
  "Courier-Oblique",
  "Courier-BoldOblique",
  "Helvetica",
  "Helvetica-Bold",
  "Helvetica-Oblique",
  "Helvetica-BoldOblique",
  "Times-Roman",
  "Times-Bold",
  "Times-Italic",
  "Times-BoldItalic",
  "ZapfDingbats",
  "Symbol",
];

/** One of the 14 standard fonts, not embedded, in WinAnsi. */
export class PDFType1Font extends PDFFont {
  static BASE_14 = BASE_14;

  constructor(name: string, family: string) {
    super(name);
    this.put("/Type", "/Font");
    this.put("/Subtype", "/Type1");
    this.put("/BaseFont", "/" + family);
    this.put("/Encoding", "/WinAnsiEncoding");
    this._encoding = PDFEncodings.WINANSI;
  }

  override encode(text: string): unknown[] {
    return this._encoding.encode(text);
  }

  static isStandardFont(family: string): boolean {
    return BASE_14.some((name) => name === family);
  }
}

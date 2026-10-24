// Old: chunk.vendor.js module 1408 (GPDFImage).
import type { PDFColorSpace } from "./color-spaces.ts";
import type { PDFIndirectReference } from "./indirect-reference.ts";
import type { PDFObject } from "./pdf-object.ts";
import type { PDFStreamData } from "./pdf-filter.ts";
import { PDFStream } from "./pdf-stream.ts";

/** An image XObject, 8 bits per component; the encoded pixels are set as its filter. */
export class PDFImage extends PDFStream {
  constructor(width: number, height: number, colorSpace: PDFColorSpace, filter?: PDFStreamData) {
    super(filter as PDFStreamData);
    this.putDictionary("/Type", "/XObject");
    this.putDictionary("/Subtype", "/Image");
    this.putDictionary("/Width", width);
    this.putDictionary("/Height", height);
    this.putDictionary("/ColorSpace", colorSpace.name);
    this.putDictionary("/BitsPerComponent", 8);
  }

  getWidth(): number {
    return this.dictionary.get("/Width") as number;
  }

  getHeight(): number {
    return this.dictionary.get("/Height") as number;
  }

  setMask(mask: PDFIndirectReference<PDFImage>): void {
    this.putDictionary("/SMask", mask);
  }

  getMask(): PDFObject | null {
    const mask = this.dictionary.get("/SMask") as PDFIndirectReference | null;
    return mask ? mask.getPDFObject() : null;
  }

  setFilter(filter: PDFStreamData): void {
    this.filter = filter;
  }

  override toString(): string {
    return "[Object GPDFImage]";
  }
}

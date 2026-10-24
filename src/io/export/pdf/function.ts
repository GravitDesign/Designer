// Old: chunk.vendor.js module 1228 (the PDF function base).
import { PDFArray } from "./pdf-array.ts";
import { PDFDictionary } from "./pdf-dictionary.ts";

/** `<</FunctionType n/Domain [0 1]...>>`. */
export class PDFFunction extends PDFDictionary {
  constructor(type: number) {
    super();
    const domain = new PDFArray([0, 1]);
    this.put("/FunctionType", type);
    this.put("/Domain", domain);
  }
}

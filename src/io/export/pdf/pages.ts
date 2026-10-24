// Old: chunk.vendor.js module 1436 (the PDF page tree).
import { PDFArray } from "./pdf-array.ts";
import { PDFDictionary } from "./pdf-dictionary.ts";
import type { PDFIndirectReference } from "./indirect-reference.ts";
import type { PDFPage } from "./page.ts";

/** `<</Type /Pages/Kids [...]/Count n>>`. */
export class PDFPages extends PDFDictionary {
  pages: PDFArray;

  constructor() {
    super();
    this.pages = new PDFArray();
    this.put("/Type", "/Pages");
  }

  addPage(page: PDFIndirectReference<PDFPage>): void {
    this.pages.push(page);
    this.put("/Kids", this.pages);
    this.put("/Count", this.pages.size());
  }

  getPage(index: number): PDFPage | null {
    const value = this.pages.get(index);
    const reference = value && (value.getValue() as PDFIndirectReference<PDFPage> | null);
    return reference ? reference.getPDFObject() : null;
  }
}

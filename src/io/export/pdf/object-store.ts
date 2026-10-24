// Old: chunk.vendor.js module 1425 (the PDF page contents).
import { PDFByteStream } from "./byte-stream.ts";
import { PDFDictionary } from "./pdf-dictionary.ts";
import { PDFFlateDecode } from "./flate-decode.ts";
import { PDFObjectCollection } from "./object-collection.ts";
import { PDFObject } from "./pdf-object.ts";
import { PDFStream } from "./pdf-stream.ts";
import type { PDFOutput } from "./output.ts";

/**
 * A page's content stream. It is always deflated: the document passes its
 * compress flag, but the old constructor ignored it (see
 * "PDF writer quirks kept from the old code" in QUESTIONS.md).
 */
export class PDFPageContents extends PDFObject {
  _collection: PDFObjectCollection;
  dictionary: PDFDictionary;

  constructor() {
    super();
    this._collection = new PDFObjectCollection();
    this.dictionary = new PDFDictionary();
  }

  add(object: unknown, index?: number | null): void {
    this._collection.add(object, index);
  }

  getCollection(): PDFObjectCollection {
    return this._collection;
  }

  override write(output: PDFOutput): void {
    const content = new PDFByteStream();
    this._collection.write(content);
    new PDFStream(new PDFFlateDecode(content.asArray())).write(output);
  }
}

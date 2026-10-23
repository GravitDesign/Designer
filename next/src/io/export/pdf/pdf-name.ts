// Old: chunk.vendor.js module 560 (the PDF value wrapper).
import { PDFObject } from "./pdf-object.ts";
import { PDFPrimitive } from "./primitive.ts";
import type { PDFOutput } from "./output.ts";

/**
 * Holds one entry of an array, dictionary or content stream. A PDFObject
 * writes itself; any other value is written as a PDFPrimitive.
 */
export class PDFValue extends PDFObject {
  value: unknown;

  constructor(value: unknown) {
    super();
    this.value = value;
  }

  override equals(other: unknown): boolean {
    return this._wrap().equals(other);
  }

  override isEmpty(): boolean {
    return this._wrap().isEmpty();
  }

  getValue(): unknown {
    return this.value;
  }

  _wrap(): PDFObject {
    let value = this.value;
    if (!(value instanceof PDFObject)) value = new PDFPrimitive(value);
    return value as PDFObject;
  }

  override write(output: PDFOutput): void {
    this._wrap().write(output);
  }

  /** A value holding an empty PDFObject (what peek returns on an empty stream). */
  declare static Null: typeof PDFNullValue;
}

export class PDFNullValue extends PDFValue {
  constructor() {
    super(new PDFObject());
  }
}

PDFValue.Null = PDFNullValue;

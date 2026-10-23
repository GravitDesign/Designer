// Old: chunk.vendor.js module 602 (the PDF object collection).
import { PDFValue } from "./pdf-name.ts";
import { PDFObject } from "./pdf-object.ts";
import type { PDFOutput } from "./output.ts";

/** A list of objects written one per line, skipping empty ones. */
export class PDFObjectCollection extends PDFObject {
  _objects: PDFValue[];

  constructor() {
    super();
    this._objects = [];
  }

  peek(): PDFValue {
    return this._objects[this._objects.length - 1] as PDFValue;
  }

  forEach(fn: (value: PDFValue, index: number, array: PDFValue[]) => void): void {
    this._objects.forEach(fn);
  }

  add(object: unknown, index?: number | null): void {
    const value = new PDFValue(object);
    if (null != index) this._objects.splice(index, 0, value);
    else this._objects.push(value);
  }

  override isEmpty(): boolean {
    return 0 === this.size();
  }

  size(): number {
    return this._objects.length;
  }

  /**
   * A newline follows every written object except the last one; an empty
   * object writes nothing (but its newline still follows the previous one).
   */
  override write(output: PDFOutput): void {
    if (this._objects.length) {
      this._objects.forEach((value, i) => {
        if (!value.isEmpty()) {
          value.write(output);
          if (i !== this._objects.length - 1) output.writeln();
        }
      });
    }
  }
}

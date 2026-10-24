// Old: chunk.vendor.js module 182 (the PDF array).
import { PDFValue } from "./pdf-name.ts";
import { PDFObject } from "./pdf-object.ts";
import type { PDFOutput } from "./output.ts";

/** `[a b c]`. Pushing an array pushes its items one by one. */
export class PDFArray extends PDFObject {
  array: PDFValue[];

  constructor(values?: unknown) {
    super();
    this.array = [];
    if (values) this.push(values);
  }

  get(index?: number): PDFValue | undefined {
    return this.array[index || 0];
  }

  push(value: unknown): void {
    if (Array.isArray(value)) {
      // forEach like the old GUtil.each: holes of a sparse array are skipped.
      value.forEach((item) => this.push(item));
    } else this.array.push(new PDFValue(value));
  }

  override equals(other: unknown): boolean {
    return (
      other instanceof PDFArray &&
      this.size() === other.size() &&
      this.array.every((value, i) => value.getValue() === (other.array[i] as PDFValue).getValue())
    );
  }

  size(): number {
    return this.array.length;
  }

  forEach(fn: (value: PDFValue, index: number, array: PDFValue[]) => void): void {
    this.array.forEach(fn);
  }

  every(fn: (value: PDFValue, index: number, array: PDFValue[]) => boolean): boolean {
    return this.array.every(fn);
  }

  override write(output: PDFOutput): void {
    output.write("[");
    const size = this.size();
    this.array.forEach((value, i) => {
      value.write(output);
      if (i < size - 1) output.writeSpace();
    });
    output.write("]");
  }
}

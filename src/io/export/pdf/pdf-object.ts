// Old: chunk.vendor.js module 90 (GPDFObject).
import type { PDFOutput } from "./output.ts";

/**
 * The base of everything the PDF writer puts into a file. A value that is
 * not a PDFObject (a number, string or boolean) is written through
 * PDFPrimitive (see PDFValue).
 *
 * The old module also had GPDFObject.Container, a mixin whose only method
 * (`accept`) threw; the one class that mixed it in (the content stream)
 * defines its own `accept`, so it is left out.
 */
export class PDFObject {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- subclasses write themselves
  write(_output: PDFOutput): void {}

  isEmpty(): boolean {
    return false;
  }

  equals(other: unknown): boolean {
    return this === other;
  }

  toString(): string {
    return "[Object GPDFObject]";
  }
}

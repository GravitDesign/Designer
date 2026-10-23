// Old: chunk.vendor.js module 197 (the PDF dictionary).
import { PDFValue } from "./pdf-name.ts";
import { PDFObject } from "./pdf-object.ts";
import { PDFString } from "./pdf-string.ts";
import type { PDFOutput } from "./output.ts";

/**
 * `<</Key value/Key value>>`, in insertion order. Keys are written as
 * given (with their slash), each followed by one space and the value.
 */
export class PDFDictionary extends PDFObject {
  hashmap: Record<string, PDFValue>;

  constructor() {
    super();
    this.hashmap = {};
  }

  /** Puts a text string, escaped and in parentheses. */
  putText(key: string, text: string): void {
    this.put(key, PDFString.newFromString(text));
  }

  put(key: string, value: unknown): void {
    this.hashmap[key] = new PDFValue(value);
  }

  get(key: string): unknown {
    const value = this.hashmap[key];
    return value ? value.getValue() : null;
  }

  remove(key: string): unknown {
    const value = this.hashmap[key];
    Reflect.deleteProperty(this.hashmap, key);
    return value ? value.getValue() : null;
  }

  length(): number {
    return Object.keys(this.hashmap).length || 0;
  }

  override write(output: PDFOutput): void {
    output.write("<<");
    for (const key of Object.keys(this.hashmap)) {
      output.write(key);
      output.write(" ");
      (this.hashmap[key] as PDFValue).write(output);
    }
    output.write(">>");
  }
}

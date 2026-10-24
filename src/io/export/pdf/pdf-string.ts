// Old: chunk.vendor.js module 1144 (GPDFString).
import { PDFValue } from "./pdf-name.ts";
import { PDFObject } from "./pdf-object.ts";
import { PDFRawBuffer } from "./raw-buffer.ts";
import type { PDFOutput } from "./output.ts";

const BACKSLASH = "\\".charCodeAt(0);
const BACKSPACE = "\b".charCodeAt(0);
const TAB = "\t".charCodeAt(0);
const NEWLINE = "\n".charCodeAt(0);
const FORM_FEED = "\f".charCodeAt(0);
const RETURN = "\r".charCodeAt(0);
const OPEN_PARENTHESIS = "(".charCodeAt(0);
const CLOSE_PARENTHESIS = ")".charCodeAt(0);

/** What a string holds: escaped text (a PDFValue) or escaped bytes (a PDFRawBuffer). */
export interface PDFStringContent {
  write(output: PDFOutput): void;
}

/** A literal string `(...)`, from text or from bytes. */
export class PDFString extends PDFObject {
  declare _value: PDFStringContent;

  static BACKSLASH = BACKSLASH;
  static Lb = BACKSPACE;
  static Lt = TAB;
  static Ln = NEWLINE;
  static Lf = FORM_FEED;
  static Lr = RETURN;
  static OPEN_PARENTHESIS = OPEN_PARENTHESIS;
  static CLOSE_PARENTHESIS = CLOSE_PARENTHESIS;

  constructor(value: PDFStringContent) {
    super();
    this._value = value;
  }

  static newFromBytes(bytes: number[]): PDFString {
    return new PDFString(new PDFRawBuffer(new Uint8Array(PDFString.escape(bytes))));
  }

  static newFromString(text: string): PDFString {
    return new PDFString(new PDFValue(PDFString.escape(text)));
  }

  /**
   * Text: backslashes and parentheses get a backslash. Bytes: also the
   * control characters \b \t \n \f \r become escapes.
   */
  static escape(value: string): string;
  static escape(value: number[]): number[];
  static escape(value: string | number[]): string | number[] {
    if ("string" == typeof value) {
      return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    }
    const out: number[] = [];
    value.forEach((byte) => {
      switch (byte) {
        case BACKSPACE:
          out.push(BACKSLASH);
          out.push("b".charCodeAt(0));
          break;
        case TAB:
          out.push(BACKSLASH);
          out.push("t".charCodeAt(0));
          break;
        case NEWLINE:
          out.push(BACKSLASH);
          out.push("n".charCodeAt(0));
          break;
        case FORM_FEED:
          out.push(BACKSLASH);
          out.push("f".charCodeAt(0));
          break;
        case RETURN:
          out.push(BACKSLASH);
          out.push("r".charCodeAt(0));
          break;
        case OPEN_PARENTHESIS:
        case CLOSE_PARENTHESIS:
        case BACKSLASH:
          out.push(BACKSLASH);
          out.push(byte);
          break;
        default:
          out.push(byte);
      }
    });
    return out;
  }

  override write(output: PDFOutput): void {
    output.write("(");
    this._value.write(output);
    output.write(")");
  }

  override toString(): string {
    return "[Object GPDFString]";
  }
}

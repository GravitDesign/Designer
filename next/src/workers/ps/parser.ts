// Old: public/psparser.js (PSParser, webpack module 1372 of its own build).
//
// The tokenizer and read loop of the PostScript interpreter. read() skips
// to the first "%!", then reads tokens and hands each to the core. The
// loop yields to the event loop now and then (see PSHost.shouldYield) and
// reports progress in whole percent.
//
// Kept: the time limit compares `new Date()` with a string (endTime is a
// date string with the wait time appended), which is never true, so only
// the page's own timeout ends a long import (FMT-WORKER-003).
import type { PSCore } from "./core.ts";
import type { PSClasses, PSValue } from "./objects.ts";

/** Byte input: the file, an executed string's bytes or a file's collected bytes. */
export type PSInput = Uint8Array | number[];

/** A DSC comment: `{key: value}`, `{key: null}` without a colon. */
type DSCComment = Record<string, string | null>;

/** Characters that end a name or operator. */
const DELIMITERS = "[]{}()\n\r \t\0<>\f%/";
const NUMBER_START = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "-", "+", "."];
const NUMBER_SECOND = [
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  ".",
  "#",
  "e",
  "E",
  "-",
  "+",
];

export class PSParser {
  static MAXWAITTIME = 18e4;

  inputArray: PSInput;
  pointer = 0;
  declare classes: PSClasses;
  declare core: PSCore;
  comments: Record<number, string> = {};
  DSCs: Record<number, DSCComment | undefined> = {};
  EOF = false;
  percentage = 0;
  nestedParse = 0;
  MAXWAITTIME: number;
  /** Sic: a string, see the file comment. */
  declare endTime: string;

  constructor(input: PSInput, maxWaitTime?: number) {
    this.inputArray = input;
    this.MAXWAITTIME = maxWaitTime || PSParser.MAXWAITTIME;
  }

  /**
   * The token readers, tried in order on the character at the pointer.
   * Each returns its token, true for a consumed comment, or false.
   */
  private readonly tokenReaders: ((this: PSParser) => PSValue | false)[] = [
    PSParser.prototype.readDSC,
    PSParser.prototype.readComment,
    PSParser.prototype.readNumber,
    PSParser.prototype.readOpeningMark,
    PSParser.prototype.readArrayEnd,
    PSParser.prototype.readDictEnd,
    PSParser.prototype.readImmediateName,
    PSParser.prototype.readName,
    PSParser.prototype.readString,
    PSParser.prototype.readHexString,
    PSParser.prototype.readAscii85String,
    PSParser.prototype.readProcedureMark,
    PSParser.prototype.readBinaryReal,
    PSParser.prototype.readOperator,
  ];

  /** `%%Key: value` comments; %%EOF ends the input. */
  private readDSC(): boolean {
    if (this._charAt() == "%" && this._charAt(1) == "%") {
      const start = this.pointer;
      const comment = this.parseDSC();
      this.DSCs[start] = comment;
      if (typeof comment == "object" && Object.keys(comment).indexOf("EOF") != -1) this.EOF = true;
      return true;
    }
    return false;
  }

  /** `%` comments; ones longer than 10 KB aren't kept. */
  private readComment(): boolean {
    if (this._charAt() == "%") {
      const start = this.pointer;
      this._findEOL();
      if (this.pointer - start > 10240) return true;
      const text = String.fromCharCode.apply(
        null,
        toCharCodes(this._inputSlice(start, this.pointer)),
      );
      this.comments[start] = text;
      return true;
    }
    return false;
  }

  /**
   * Integers, reals (with exponents) and radix numbers (`16#FF`). Leaves
   * the pointer on the last character of the number. A lone sign or dot
   * reads as NaN.
   */
  private readNumber(): number | false {
    let result: number | false = false;
    const digitValue = (radix: number, char: string): number | false => {
      let code = char.toLowerCase().charCodeAt(0);
      if (code >= "0".charCodeAt(0) && code <= "9".charCodeAt(0)) code -= "0".charCodeAt(0);
      else {
        if (!(code >= "a".charCodeAt(0) && code <= "z".charCodeAt(0))) return false;
        code = code - "a".charCodeAt(0) + 10;
      }
      return code < radix && code;
    };
    if (NUMBER_START.indexOf(this._charAt()) != -1) {
      if (this._charAt() == "-" && this._charAt(1) == "|") return false;
      let text = this._charAt();
      let value: number | false = false;
      if (NUMBER_SECOND.indexOf(this._charAt(1)) == -1) {
        result = parseInt(text);
      } else {
        const sign = text == "-" ? -1 : 1;
        if (sign == -1 || text == "+") {
          this.pointer++;
          text = this._charAt();
        }
        if (text == ".") text = "0.";
        do {
          if (text.length > 128) break;
          result = value;
          value = Number(text);
          text += this._charAt(1);
          this.pointer++;
          if (this._charAt() == "#") {
            const radix = value;
            this.pointer++;
            result = 0;
            let digit: number | false;
            while ((digit = digitValue(radix, this._charAt())) !== false) {
              result = result * radix + digit;
              this.pointer++;
            }
            this.pointer++;
            break;
          }
          if (this.isEOF() || this._charAt().toLowerCase() != "e") {
            if (NUMBER_START.indexOf(this._charAt()) == -1) {
              result = value;
              this.pointer++;
              break;
            }
          } else {
            if (this._charAt(1) == "-" || this._charAt(1) == "+") {
              text += this._charAt(1);
              this.pointer++;
            }
            text += this._charAt(1);
            this.pointer++;
          }
        } while (!isNaN(value));
        this.pointer -= 2;
        // Sic: `false * sign` is 0 or -0.
        result = (result as number) * sign;
      }
      // The old code reset the pointer when the result was false here,
      // which can't happen: both branches produce a number.
    }
    return result;
  }

  private readOpeningMark(): PSValue | false {
    let mark: PSValue | false = false;
    if (this._charAt() == "[") mark = this.classes.newObject("mark", "[");
    if (this._charAt() == "<" && this._charAt(1) == "<") {
      this.pointer++;
      mark = this.classes.newObject("mark", "<<");
    }
    return mark;
  }

  private readArrayEnd(): PSValue | false {
    return this._charAt() == "]" && this.classes.newObject("mark", "]");
  }

  private readDictEnd(): PSValue | false {
    if (this._charAt() == ">" && this._charAt(1) == ">") {
      const mark = this.classes.newObject("mark", ">>");
      this.pointer++;
      return mark;
    }
    return false;
  }

  /** `//name`: looked up when the core receives it. */
  private readImmediateName(): PSValue | false {
    if (this._charAt() == "/" && this._charAt(1) == "/") {
      this.pointer += 2;
      const text = this._readUntil(function (this: PSParser) {
        return DELIMITERS.indexOf(this._charAt()) == -1;
      });
      if (text) {
        const name = this.classes.newObject("name", text);
        name.IEN = true;
        this.pointer--;
        return name;
      }
    }
    return false;
  }

  /** `/name` literal. */
  private readName(): PSValue | false {
    const start = this.pointer;
    if (this._charAt() == "/") {
      this.pointer++;
      const text = this._readUntil(function (this: PSParser) {
        return DELIMITERS.indexOf(this._charAt()) == -1;
      });
      if (text) {
        const name = this.classes.newObject("name", text);
        this.pointer--;
        return name;
      }
    }
    this.pointer = start;
    return false;
  }

  /** `(string)` with nested parentheses and backslash escapes. */
  private readString(): PSValue | false {
    let text = "";
    if (this._charAt() == "(") {
      let depth = 1;
      for (this.pointer++; depth > 0 && !this.isEOF();) {
        if (this._charAt() != "\\") {
          text += this._charAt();
          if (this._charAt() == "(") depth++;
          if (this._charAt() == ")") depth--;
        } else {
          switch (this._charAt(1)) {
            case "n":
              text += "\n";
              this.pointer++;
              break;
            case "r":
              text += "\r";
              this.pointer++;
              break;
            case "t":
              text += "\t";
              this.pointer++;
              break;
            case "b":
              text += "\b";
              this.pointer++;
              break;
            case "f":
              text += "\f";
              this.pointer++;
              break;
            case "\\":
              text += "\\";
              this.pointer++;
              break;
            case "(":
              text += "(";
              this.pointer++;
              break;
            case ")":
              text += ")";
              this.pointer++;
              break;
            case "0":
            case "1":
            case "2":
            case "3":
            case "4":
            case "5":
            case "6":
            case "7":
              text += String.fromCharCode(
                parseInt(this._charAt(1) + this._charAt(2) + this._charAt(3), 8),
              );
              this.pointer += 3;
              break;
            case "\n":
            case "\r":
              for (this.pointer++; "\r\n".indexOf(this._charAt()) != -1 && !this.isEOF();)
                this.pointer++;
              this.pointer--;
          }
        }
        this.pointer++;
      }
      // Sic: the empty string `()` is not a token.
      if (text != "") {
        text = text.substring(0, text.length - 1);
        this.pointer--;
        return this.classes.newObject("string", text);
      }
    }
    return false;
  }

  /** `<hex>` string; whitespace is skipped, an odd last digit is padded with 0. */
  private readHexString(): PSValue | false {
    let text = "";
    let pair = "";
    if (
      this._charAt() == "<" &&
      "0123456789abcdefABCDEF \f\r\n\t\0".indexOf(this._charAt(1)) != -1
    ) {
      for (this.pointer++; this._charAt() != ">" && !this.isEOF();) {
        if (" \f\r\n\t\0".indexOf(this._charAt()) == -1) {
          if ("0123456789abcdefABCDEF".indexOf(this._charAt()) == -1) return false;
          pair += this._charAt();
          if (pair.length == 2) {
            text += String.fromCharCode(parseInt(pair, 16));
            pair = "";
          }
        }
        this.pointer++;
      }
      if (text != "" || pair != "") {
        if (pair.length == 1) {
          pair += "0";
          text += String.fromCharCode(parseInt(pair, 16));
        }
        if (text != "") return this.classes.newObject("string", text);
      }
    }
    return false;
  }

  /** `<~ascii85~>` string. */
  private readAscii85String(): PSValue | false {
    let text = "";
    let tuple = "";
    if (this._charAt() == "<" && this._charAt(1) == "~") {
      for (this.pointer += 2; this._charAt() != "~" && !this.isEOF();) {
        if (this._charAt() == "z" && tuple == "") text += "\0\0\0\0";
        else if (
          this._charAt().charCodeAt(0) >= 33 &&
          this._charAt().charCodeAt(0) <= 118 &&
          (tuple += this._charAt()).length == 5
        ) {
          const decoded = this.decodeTuple(tuple);
          if (decoded === false) return false;
          text += decoded;
          tuple = "";
        }
        this.pointer++;
      }
      if (this._charAt(1) == ">") {
        this.pointer++;
        if (tuple.length == 1) return false;
        if (tuple != "") {
          const decoded = this.decodeTuple(tuple);
          if (decoded === false) return false;
          text += decoded;
        }
        if (text != "") return this.classes.newObject("string", text);
      }
    }
    return false;
  }

  /** `{` and `}`: switch the core between executing and collecting a procedure. */
  private readProcedureMark(): PSValue | false {
    if (this._charAt() == "{") {
      this.core.nestedProcCount++;
      this.core.execute = false;
      return this.classes.newObject("mark", "{");
    }
    if (this._charAt() == "}") {
      if (this.core.nestedProcCount > 0) {
        this.core.nestedProcCount--;
        this.core.execute = this.core.nestedProcCount == 0;
        const mark = this.classes.newObject("mark", "}");
        mark.pointer = this.pointer;
        return mark;
      }
    }
    return false;
  }

  /** Binary token 138/139: a 32-bit IEEE real, big- or little-endian. */
  private readBinaryReal(): number | false {
    const marker = this._uint8At();
    if (marker == 138 || marker == 139) {
      this.pointer++;
      const view = new DataView(new ArrayBuffer(4));
      let byte: number | null = null;
      for (let i = 0; i < 4 && (byte = this._uint8At(marker == 138 ? i : 3 - i)) != null; ++i) {
        view.setUint8(i, byte);
        this.pointer++;
      }
      if (byte != null) {
        this.pointer--;
        return view.getFloat32(0, marker == 138);
      }
      this.pointer--;
    }
    return false;
  }

  /** Anything else up to a delimiter is an executable name (operator). */
  private readOperator(): PSValue | false {
    const start = this.pointer;
    const text = this._readUntil(function (this: PSParser) {
      return DELIMITERS.indexOf(this._charAt()) == -1;
    });
    if (text) {
      this.pointer--;
      return this.classes.newObject("operator", text);
    }
    this.pointer = start;
    return false;
  }

  isEOF(): boolean {
    if (
      this._charAt(0) == "%" &&
      this._charAt(1) == "%" &&
      this._charAt(2) == "E" &&
      this._charAt(3) == "O" &&
      this._charAt(4) == "F"
    )
      this.EOF = true;
    return !!this.EOF || (this.EOF = !(this.inputArray.length > this.pointer));
  }

  _findEOL(): void {
    while (["\n", "\r"].indexOf(this._charAt()) == -1 && !this.isEOF()) this.pointer++;
  }

  _findFileStart(): void {
    while ((this._charAt(0) != "%" || this._charAt(1) != "!") && !this.isEOF()) this.pointer++;
  }

  /** The byte at pointer + offset, or null past the end. */
  _uint8At(offset?: number | null): number | null {
    let index = this.pointer;
    if (offset != null) index += offset;
    return index < this.inputArray.length ? (this.inputArray[index] as number) : null;
  }

  /** The character at pointer + offset ("\0" past the end, from fromCharCode(null)). */
  _charAt(offset?: number): string {
    return String.fromCharCode(this._uint8At(offset) as number);
  }

  _parseCurrentNotWhitespaceSequence(): PSValue | false {
    let token: PSValue | false = false;
    for (const reader of this.tokenReaders) {
      if ((token = reader.call(this)) !== false) return token;
    }
    return token;
  }

  _isWhiteSpaceCharacter(): boolean {
    return [0, 9, 10, 12, 13, 32].indexOf(this._uint8At() as number) != -1;
  }

  _findNextNotWhitespaceCharacter(): void {
    while (this._isWhiteSpaceCharacter()) {
      this.pointer++;
      if (this.isEOF()) return;
    }
  }

  _inputSlice(start: number, end: number): PSInput {
    return this.inputArray.slice(start, end);
  }

  /**
   * Reads characters while `accept` holds (one argument) or until it holds
   * (second argument false).
   */
  _readUntil(accept: (this: PSParser) => boolean, whileFalse?: false): string {
    let text = "";
    if (whileFalse === false) {
      while (!this.isEOF() && !accept.call(this)) {
        text += this._charAt();
        this.pointer++;
      }
    } else {
      while (!this.isEOF() && accept.call(this)) {
        text += this._charAt();
        this.pointer++;
      }
    }
    return text;
  }

  /** Reads tokens until the end of the input, yielding now and then. */
  _readLoop(): void {
    let yielded = false;
    while (!this.isEOF()) {
      this._findNextNotWhitespaceCharacter();
      const start = this.pointer;
      const token = this._parseCurrentNotWhitespaceSequence();
      if (this.classes.isPSObject(token)) token.pointer = start;
      this.pointer++;
      // After `RD` / `-|` inside eexec, the single space before the binary data belongs to the token.
      if (
        this.classes.isPSObject(token, "operator") &&
        (token.value == "RD" || token.value == "-|") &&
        this._isWhiteSpaceCharacter() &&
        this.core.execstack.length
      ) {
        let skipped = false;
        for (let i = 0; i < this.core.execstack.length && !skipped; ++i) {
          const entry = this.core.execstack[i];
          if (this.classes.isPSObject(entry, "operator") && entry.value == "eexec") {
            this.pointer++;
            skipped = true;
          }
        }
      }
      this.core.tokenAction(token as PSValue);
      const percentage = Math.round((100 * this.pointer) / this.inputArray.length);
      if (percentage != this.percentage && !this.nestedParse) {
        this.percentage = percentage;
        this.core.toGravit("progress", [this.percentage], false);
      }
      if (this.core.host.shouldYield()) {
        yielded = true;
        break;
      }
    }
    if (yielded && !this.isEOF() && !this.nestedParse) {
      this.core.host.setTimeout(() => this._readLoop(), 0);
    }
    if (new Date() > (this.endTime as unknown as Date)) {
      console.log("MAX WAIT TIME EXCEEDED");
      this.core.toGravit("done");
      this.core.toGravit("error", [3]);
      this.core.host.close();
    }
    if (!this.nestedParse && this.isEOF()) {
      this.core.toGravit("done");
      this.core.host.setTimeout(() => this.core.host.close(), 500);
    }
  }

  read(): void {
    this.endTime = String(new Date()) + this.MAXWAITTIME;
    this._findFileStart();
    this._readLoop();
  }

  /** Reads a `%%Key: value` line. Near the end of the input it sets EOF instead. */
  parseDSC(): DSCComment | undefined {
    while (
      (this._charAt() != "%" || this._charAt(1) != "%") &&
      this.pointer < this.inputArray.length - 2
    )
      this.pointer++;
    if (this.pointer >= this.inputArray.length - 2) {
      this.EOF = true;
      return undefined;
    }
    const start = this.pointer;
    while (
      this._charAt() != ":" &&
      this._uint8At() != 10 &&
      this._uint8At() != 13 &&
      this.pointer < this.inputArray.length - 2
    )
      this.pointer++;
    if (this.pointer >= this.inputArray.length - 2) {
      this.EOF = true;
      return undefined;
    }
    const hasValue = this._charAt() == ":";
    const key = String.fromCharCode
      .apply(null, toCharCodes(this._inputSlice(start, this.pointer)))
      .substring(2);
    const comment: DSCComment = {};
    if (!hasValue) {
      comment[key] = null;
      return comment;
    }
    this.pointer++;
    const valueStart = this.pointer;
    while (
      this._uint8At() != 10 &&
      this._uint8At() != 13 &&
      this.pointer < this.inputArray.length - 2
    )
      this.pointer++;
    if (!(this.pointer >= this.inputArray.length - 2)) {
      comment[key] = String.fromCharCode.apply(
        null,
        toCharCodes(this._inputSlice(valueStart, this.pointer)),
      );
      return comment;
    }
    this.EOF = true;
    return undefined;
  }

  /** Decodes one ASCII85 group (padded with "u"), or false when it overflows 32 bits. */
  decodeTuple(group: string): string | false {
    let tuple = group;
    let value = 0;
    let text = "";
    const length = tuple.length;
    if (tuple.length < 5) for (let i = tuple.length; i < 5; i++) tuple += "u";
    for (let i = 0; i < 5; i++)
      value = i < tuple.length ? 85 * value + tuple.charCodeAt(i) - 33 : value * 85;
    if (value > 4294967295) return false;
    for (let i = 0; i < tuple.length - 1; i++)
      text += String.fromCharCode((value >> (8 * (3 - i))) & 255);
    return text.substring(0, length - 1);
  }
}

function toCharCodes(input: PSInput): number[] {
  return input as number[];
}

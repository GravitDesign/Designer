// Old: public/pscore.js, systemdict entries file … writestring.
//
// Kept quirks (QUESTIONS.md):
// - file, currentfile and status are stubs: file pops its two operands and
//   pushes a file on the program input, status always answers false.
// - fileposition of an unpositioned file pushes undefined (the file object
//   has no valuePointer).
// - readline appends the line to the target string's old content and
//   skips leading line breaks.
// - readstring and readhexstring replace the target string's value.
// - writestring discards its operands.
import type { PSCore } from "../core.ts";
import type { PSPlainRecord, PSString, PSValue } from "../objects.ts";
import { sloppySet } from "./basic-support.ts";

function top(core: PSCore, offset = 1): PSValue {
  return core.stack[core.stack.length - offset];
}

/** A data source the read operators use without checking its type. */
interface ReadSource {
  getUint8(): number | null;
  getChar(): string | null;
  isEOF(): boolean;
  init?(length?: number): void;
}

/** The hex digit value of a character code, or null. */
function hexDigit(code: number): number | null {
  const zero = "0".charCodeAt(0);
  const nine = "9".charCodeAt(0);
  const lowerA = "a".charCodeAt(0);
  const lowerF = "f".charCodeAt(0);
  const upperA = "A".charCodeAt(0);
  const upperF = "F".charCodeAt(0);
  if (code >= zero && code <= nine) return code - zero;
  if (code >= lowerA && code <= lowerF) return code - lowerA + 10;
  if (code >= upperA && code <= upperF) return code - upperA + 10;
  return null;
}

export const fileOperators: PSPlainRecord = {
  file(this: PSCore) {
    this.stack.pop();
    this.stack.pop();
    this.stack.push(this.classes.newObject("file", undefined));
  },
  closefile(this: PSCore) {
    if (this.stackunderflowCheck(1, "closefile")) return;
    sloppySet(top(this), "EOF", true);
    this.stack.pop();
  },
  status(this: PSCore) {
    this.stack.pop();
    this.stack.push(this.classes.newObject("bool", false));
  },
  currentfile(this: PSCore) {
    this.stack.push(this.classes.newObject("file", undefined));
  },
  filenameforall(this: PSCore) {
    this.stack.pop();
    this.stack.pop();
    this.stack.pop();
  },
  flushfile(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(1, "flushfile")) return;
    const file = top(this);
    if (this.classes.isPSObject(file, "file")) {
      this.stack.pop();
      file.flushSelf();
    } else this.initiateError("typecheck", "flushfile");
  },
  flush() {},
  fileposition(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(1, "fileposition")) return;
    const file = top(this);
    if (this.classes.isPSObject(file, "file")) {
      const position = file.pointer as number;
      this.stack.push(
        position >= 0 ? position : (file as unknown as { valuePointer?: number }).valuePointer,
      );
    } else this.initiateError("typecheck", "fileposition");
  },
  bytesavailable(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(1, "v")) return;
    const file = top(this);
    if (this.classes.isPSObject(file, "file")) this.stack.push(file.bytesAvailable());
    else this.initiateError("typecheck", "v");
  },
  setfileposition(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(2, "setfileposition")) return;
    const position = top(this);
    const file = top(this, 2);
    if (this.classes.isUnsignedInt(position) && this.classes.isPSObject(file, "file")) {
      file.pointer = position;
      this.stack.pop();
      this.stack.pop();
    } else this.initiateError("typecheck", "setfileposition");
  },
  resetfile(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(1, "resetfile")) return;
    const file = top(this);
    if (this.classes.isPSObject(file, "file")) file.resetSelf();
    else this.initiateError("typecheck", "resetfile");
  },
  readline(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(2, "readline")) return;
    const target = top(this);
    const file = top(this, 2);
    if (this.classes.isPSObject(target, "string") && this.classes.isPSObject(file, "file")) {
      const capacity = target.value.length;
      let length = 0;
      let line = "";
      let byte = file.getUint8();
      if (byte == 13 || byte == 10)
        while ((byte == 13 || byte == 10) && !file.isEOF()) byte = file.getUint8();
      if (!file.isEOF()) {
        line = String.fromCharCode(byte as number);
        byte = file.getUint8();
        while (byte != 13 && byte != 10 && !file.isEOF()) {
          line += String.fromCharCode(byte as number);
          if (++length >= capacity) {
            this.initiateError("rangecheck", "readline");
            return;
          }
          byte = file.getUint8();
        }
      }
      target.value = target.value + line;
      this.stack.pop();
      this.stack.pop();
      this.stack.push(this.classes.newObject("string", line));
      this.stack.push(this.classes.newObject("bool", !file.isEOF()));
    } else this.initiateError("typecheck", "readline");
  },
  readstring(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(2, "readstring")) return;
    const target = top(this) as PSString;
    const source = top(this, 2) as unknown as ReadSource;
    const capacity = target.value.length;
    if (capacity !== 0) {
      let text = "";
      if ("init" in (source as object)) (source as { init(length: number): void }).init(capacity);
      for (let i = 0; i < capacity; ++i) {
        text += source.getChar();
        if (source.isEOF()) break;
      }
      target.value = text;
      this.stack.pop();
      this.stack.pop();
      this.stack.push(this.classes.newObject("string", text));
      this.stack.push(this.classes.newObject("bool", !source.isEOF()));
    } else this.initiateError("rangecheck", "readstring");
  },
  readhexstring(this: PSCore) {
    this.fill$error();
    if (this.stackunderflowCheck(2, "readhexstring")) return;
    const target = top(this) as PSString;
    const source = top(this, 2) as unknown as ReadSource;
    const capacity = target.value.length;
    if (capacity !== 0) {
      let text = "";
      if ("init" in (source as object)) (source as { init(length: number): void }).init(capacity);
      let highChar: string | null = null;
      let lowChar: string | null = null;
      let byte: number | null = null;
      let high: number | null = null;
      let low: number | null = null;
      let count = 0;
      while (count < capacity) {
        if (highChar == null) {
          if ((highChar = source.getChar()) != null) {
            const digit = hexDigit(highChar.charCodeAt(0));
            if (digit != null) high = digit;
            else highChar = null;
          }
        } else if (lowChar == null && (lowChar = source.getChar()) != null) {
          const digit = hexDigit(lowChar.charCodeAt(0));
          if (digit != null) low = digit;
          else lowChar = null;
        }
        if (high != null && low != null) byte = (high << 4) + low;
        if (byte != null) {
          text += String.fromCharCode(byte);
          byte = null;
          highChar = null;
          high = null;
          lowChar = null;
          low = null;
          ++count;
        }
        if (source.isEOF()) break;
      }
      target.value = text;
      this.stack.pop();
      this.stack.pop();
      this.stack.push(this.classes.newObject("string", text));
      this.stack.push(this.classes.newObject("bool", !source.isEOF()));
    } else this.initiateError("rangecheck", "readhexstring");
  },
  writestring(this: PSCore) {
    this.stack.pop();
    this.stack.pop();
  },
};

// Old: public/pscore.js (webpack module 1370 of its own build), the Filter
// resource dict built in the PSCore constructor.
//
// Each entry is a native operator (called with the core as `this` by the
// filter and eexec operators): it takes the data source (and parameters)
// off the stack and pushes a file whose `filter` returns one decoded byte
// per call, or null at the end.
//
// There is no ASCIIHexDecode (or any encoding filter): `filter` raises
// nodecoder for those.
//
// SubFileDecode reads only the bytes it needs to match the EOD string,
// ASCII85Decode keeps its tuple across calls, ends at `~>` and reads
// strings too, and LZWDecode decodes; the old filters lost or corrupted
// data or threw ("PostScript filters lose or corrupt data (LZWDecode never
// works)" in BUGS-FIXED.md).
//
// Kept (QUESTIONS.md "PS worker: filter quirks"):
// - ReusableStreamDecode checks a variable that isn't assigned yet for its
//   parameter dict, so a dict operand is never taken.
//
// DCTDecode decodes through the page (waitForResponse "jpeg", see
// ./jpeg.ts). The old filter asked for as many bytes as its reader guessed
// and skipped every fourth byte when alpha was requested (BUG-008).
import type { PSCore } from "./core.ts";
import { jpegComponentCount, rgbaToComponents } from "./jpeg.ts";
import { BitsReader } from "./core.ts";
import type { PSFile, PSPlainRecord, PSString } from "./objects.ts";

/** What the filters read from: a file, another filter, a string or a procedure. */
interface DataSource {
  getUint8(): number | null;
  getChar(): string;
  isEOF(): boolean;
  back(): void;
}

function isHexDigit(code: number | null): boolean {
  const c = code as number;
  return (c >= 48 && c <= 57) || (c >= 65 && c <= 70) || (c >= 97 && c <= 102);
}

/** `"" == value` as the old code compared it: false also counts as empty. */
function isEmpty(value: string | false): boolean {
  return value === "" || value === false;
}

/**
 * One character of `source`, or "" at its end. Strings have no getChar of
 * their own, so the bytes are read.
 */
function readChar(source: DataSource): string {
  const byte = source.getUint8();
  return byte === null || byte === undefined ? "" : String.fromCharCode(byte);
}

export function createFilters(core: PSCore): PSPlainRecord {
  return {
    SubFileDecode(this: PSCore) {
      this.fill$error();
      if (this.stack.length < 3) {
        this.initiateError("stackunderflow", "SubFileDecode");
        return;
      }
      const eodString = this.stack.pop() as PSString;
      let eodCount = this.stack.pop() as number;
      const source = this.stack.pop() as DataSource;
      const file = this.classes.newObject("file", source as unknown as PSFile);
      const eod = eodString.value;
      // Bytes read ahead while matching the EOD string, and how many of them
      // belong to a counted EOD occurrence that passes through unmatched.
      let queue: (number | null)[] = [];
      let passThrough = 0;
      file.filter = function (this: PSFile) {
        if (this.EOF) return null;
        if (!queue.length) queue.push(source.getUint8());
        if (passThrough > 0) {
          passThrough--;
          return queue.shift() as number | null;
        }
        if (queue[0] === null) return null;
        if (eod.length && String.fromCharCode(queue[0] as number) == eod[0]) {
          while (queue.length < eod.length && queue[queue.length - 1] !== null)
            queue.push(source.getUint8());
          let matched = true;
          for (let i = 1; matched && i < eod.length; i++)
            matched = queue[i] !== null && eod[i] == String.fromCharCode(queue[i] as number);
          if (matched) {
            if (eodCount == 0) {
              this.EOF = true;
              return null;
            }
            eodCount--;
            passThrough = eod.length - 1;
          }
        }
        return queue.shift() as number | null;
      };
      file.resetSelf = function () {
        queue = [];
        passThrough = 0;
      };
      this.stack.push(file);
    },

    ASCII85Decode(this: PSCore) {
      const source = this.stack.pop() as DataSource;
      const file = this.classes.newObject("file", source as unknown as PSFile);
      let tuple = "";
      let decoded: string | false = "";
      file.isEOF = function (this: PSFile) {
        return this.EOF && isEmpty(decoded);
      };
      file.filter = function (this: PSFile) {
        this.EOF = this.EOF || source.isEOF();
        if (isEmpty(decoded) && !this.EOF) {
          // The tuple carries over between calls, and the `>` of `~>` ends
          // the data instead of going into a tuple.
          while (isEmpty(decoded) && !this.EOF) {
            let char = readChar(source);
            this.EOF = this.EOF || source.isEOF();
            if (!char) continue;
            if (char == "~") {
              this.EOF = true;
              char = readChar(source);
              if (tuple.length == 1) {
                tuple = "";
                return null;
              }
              if (tuple != "") {
                decoded = core.parser.decodeTuple(tuple);
                tuple = "";
                if (decoded === false) return null;
              }
              if (char != ">") {
                tuple = "";
                return null;
              }
              break;
            }
            if (char == "z" && tuple == "") decoded = "\0\0\0\0";
            if (char.charCodeAt(0) >= 33 && char.charCodeAt(0) <= 118) {
              tuple += char;
              if (tuple.length == 5) {
                decoded = core.parser.decodeTuple(tuple);
                tuple = "";
                if (decoded === false) return null;
              }
            }
          }
        }
        if (this.EOF && isEmpty(decoded)) {
          tuple = "";
          return null;
        }
        const text = decoded as string;
        const code = text.charCodeAt(0);
        decoded = text.slice(1);
        return code;
      };
      file.resetSelf = function () {
        tuple = "";
        decoded = "";
      };
      this.stack.push(file);
    },

    ReusableStreamDecode(this: PSCore) {
      const source = this.stack.pop() as DataSource;
      // Sic: the old code tested its byte list (still undefined) for a
      // parameter dict here, so that branch never ran.
      const bytes: number[] = [];
      let byte = source.isEOF() ? null : source.getUint8();
      while (byte != null) {
        bytes.push(byte);
        byte = source.isEOF() ? null : source.getUint8();
      }
      const data = new Uint8Array(bytes);
      const file = this.classes.newObject("file", data as unknown as PSFile);
      file.pointer = 0;
      const position = (stream: PSFile) => stream.pointer as number;
      const stored = (stream: PSFile) => stream.underlyingFile as unknown as Uint8Array;
      file.isEOF = function (this: PSFile) {
        return position(this) >= stored(this).length;
      };
      file.filter = function (this: PSFile) {
        if (this.isEOF()) return null;
        const at = position(this);
        this.pointer = at + 1;
        return stored(this)[at] as number;
      };
      file.resetSelf = function (this: PSFile) {
        this.pointer = 0;
      };
      file.flushSelf = function (this: PSFile) {
        this.pointer = stored(this).length;
      };
      file.bytesAvailable = function (this: PSFile) {
        return stored(this).length - position(this);
      };
      this.stack.push(file);
    },

    LZWDecode(this: PSCore) {
      const source = this.stack.pop() as DataSource;
      const file = this.classes.newObject("file", source as unknown as PSFile);
      file.isEOF = function (this: PSFile) {
        return this.EOF || source.isEOF();
      };
      const reader = new BitsReader(source);
      let table: number[][] = [];
      let codeLength = 8;
      let pending: number[] = [];
      let previous: number | null = null;
      const resetTable = () => {
        table = [];
        previous = null;
        for (let i = 0; i < 258; i++) table[i] = [i];
        codeLength = 8;
      };
      file.filter = function (this: PSFile) {
        if (pending.length > 0) return pending.shift() as number;
        let code: number | null;
        do {
          code = reader.readBits(codeLength + 1);
          if (code == 256) {
            resetTable();
            code = null;
          }
          if (code == 257) {
            while (!source.isEOF()) source.getUint8();
            return null;
          }
        } while (!this.isEOF() && code === null);
        const entry = code as number;
        if (previous !== null) {
          table[table.length] = (table[previous] as number[]).slice();
          const last = table.length - 1;
          const current = table[entry] as number[];
          table[last] =
            current.length == 1
              ? (table[last] as number[]).concat(current)
              : (table[last] as number[]).concat(current.slice(0, 1));
          if ([511, 1023, 2047].indexOf(table.length) >= 0) codeLength++;
        }
        pending = (table[entry] as number[]).slice();
        previous = entry;
        return pending.shift() as number;
      };
      this.stack.push(file);
    },

    RunLengthDecode(this: PSCore) {
      const source = this.stack.pop() as DataSource;
      const file = this.classes.newObject("file", source as unknown as PSFile);
      file.isEOF = function (this: PSFile) {
        return this.EOF || source.isEOF();
      };
      let queue: (number | null)[] = [];
      file.filter = function (this: PSFile) {
        if (queue.length > 0) return queue.shift() as number | null;
        const length = source.getUint8() as number;
        if (length == 128) {
          while (!source.isEOF()) source.getUint8();
          return null;
        }
        if (length < 128) {
          for (let i = 0; i <= length; i++) {
            queue.push(source.getUint8());
            if (source.isEOF()) {
              this.EOF = true;
              break;
            }
          }
        } else if (length > 128) {
          const byte = source.getUint8();
          for (let i = 0; i < 257 - length; i++) queue.push(byte);
        }
        return queue.shift() as number | null;
      };
      file.resetSelf = function () {
        queue = [];
      };
      this.stack.push(file);
    },

    DCTDecode(this: PSCore) {
      const source = this.stack.pop() as DataSource;
      const file = this.classes.newObject("file", source as unknown as PSFile);
      let samples: Uint8Array | null | undefined;
      let jpeg = "";
      let requested = false;
      let index = 0;
      file.isEOF = function (this: PSFile) {
        return this.EOF;
      };
      file.filter = function (this: PSFile) {
        if (!samples) this.EOF = true;
        if (this.isEOF()) return null;
        const data = samples as Uint8Array;
        index++;
        this.EOF = data.length <= index;
        return data[index - 1] as number;
      };
      // The first read decodes the whole JPEG through the page; the reader's
      // size and alpha hints don't matter, the output is the JPEG's own
      // components (gray, RGB or CMYK), one byte each, row by row.
      file._init = function (size?: unknown) {
        if (requested || !size) return;
        while (!source.isEOF()) jpeg += source.getChar();
        requested = true;
        let base64: string;
        try {
          base64 = btoa(jpeg);
        } catch {
          base64 = "";
        }
        const image = core.waitForResponse("jpeg", ["data:image/jpeg;base64," + escape(base64)]);
        samples = image ? rgbaToComponents(image.rgba, jpegComponentCount(jpeg)) : null;
        index = 0;
      };
      file.resetSelf = function () {
        samples = null;
        index = 0;
      };
      file.flushSelf = function (this: PSFile) {
        if (samples) index = samples.length;
        this.EOF = true;
      };
      this.stack.push(file);
    },

    FontType1Decode(this: PSCore) {
      const source = this.stack.pop() as DataSource;
      const file = this.classes.newObject("file", source as unknown as PSFile);
      file.isEOF = function (this: PSFile) {
        return this.EOF || source.isEOF();
      };
      let key = 55665;
      const leadBytes: (number | null)[] = [];
      let first = true;
      let binary = false;
      let lastChars = "";
      file.filter = function (this: PSFile): number | null {
        let cipher: number;
        if (first) {
          let byte = source.getUint8();
          if (byte == 13 || byte == 10)
            while ((byte == 13 || byte == 10) && !source.isEOF()) byte = source.getUint8();
          this.EOF = source.isEOF();
          if (byte != null) {
            leadBytes.push(byte);
            binary = !isHexDigit(byte);
          }
          for (let i = 1; i < 4 && !this.EOF; ++i) {
            byte = source.getUint8();
            this.EOF = source.isEOF();
            leadBytes.push(byte);
            binary = binary || !isHexDigit(byte);
          }
          if (leadBytes.length == 4) for (let i = 0; i < 4; ++i) source.back();
          first = false;
          for (let i = 0; i < 4; ++i) (this.filter as () => number | null).call(this);
        }
        if (lastChars.length == 9 && lastChars == "closefile") this.EOF = true;
        if (this.isEOF()) return null;
        if (binary) {
          cipher = source.getUint8() as number;
          if (source.isEOF()) {
            this.EOF = true;
            return null;
          }
        } else {
          let high = source.getUint8();
          while (!isHexDigit(high) && !(this.EOF = source.isEOF())) high = source.getUint8();
          if (source.isEOF()) {
            this.EOF = true;
            return null;
          }
          let low = source.getUint8();
          while (!isHexDigit(low) && !(this.EOF = source.isEOF())) low = source.getUint8();
          if (source.isEOF()) {
            this.EOF = true;
            return null;
          }
          cipher = parseInt(String.fromCharCode(high as number, low as number), 16);
        }
        const plain = cipher ^ (key >> 8);
        key = (52845 * (cipher + key) + 22719) & 65535;
        lastChars = lastChars.concat(String.fromCharCode(plain));
        if (lastChars.length > 9) lastChars = lastChars.substring(1);
        return plain;
      };
      this.stack.push(file);
    },
  };
}

// Old: chunk.vendor.js module 1432 (the PDF WinAnsi encoding).
import { PDFEncoding } from "./encoding.ts";
import { PDFString } from "./pdf-string.ts";

/**
 * Code points to WinAnsi codes: 0-127 and 160-255 map to themselves, the
 * typographic characters to 128-159. Unknown code points are written as
 * they are (a byte, so they wrap).
 */
const SPECIALS: Record<number, number> = {
  8364: 128,
  8218: 130,
  402: 131,
  8222: 132,
  8230: 133,
  8224: 134,
  8225: 135,
  710: 136,
  8240: 137,
  352: 138,
  8249: 139,
  338: 140,
  381: 142,
  8216: 145,
  8217: 146,
  8220: 147,
  8221: 148,
  8226: 149,
  8211: 150,
  8212: 151,
  732: 152,
  8482: 153,
  353: 154,
  8250: 155,
  339: 156,
  382: 158,
  376: 159,
};

function buildTable(): Record<number, number> {
  const table: Record<number, number> = {};
  for (let code = 0; code <= 127; code++) table[code] = code;
  for (let code = 160; code <= 255; code++) table[code] = code;
  return Object.assign(table, SPECIALS);
}

export class PDFWinAnsiEncoding extends PDFEncoding {
  declare _table: Record<number, number>;

  override encode(text: string | number[]): PDFString[] {
    const bytes: number[] = [];
    for (let i = 0; i < text.length; i++) {
      const code = "string" == typeof text ? text.charCodeAt(i) : (text[i] as number);
      const mapped = this._table[code];
      if (mapped) bytes.push(mapped);
      else bytes.push(code);
    }
    return [PDFString.newFromBytes(bytes)];
  }

  /** The code point that encodes to the low byte of `code`, or null. */
  toUnicode(code: number): number | null {
    const keys = Object.keys(this._table);
    for (let i = 0; i < keys.length; i++) {
      if (this._table[keys[i] as unknown as number] == (255 & code)) {
        return parseInt(keys[i] as string);
      }
    }
    return null;
  }
}

PDFWinAnsiEncoding.prototype._table = buildTable();

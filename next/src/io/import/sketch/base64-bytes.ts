// Old: designer.browser.dev.js module 250 (base64-js toByteArray), as the
// NSKeyedArchiver reader used it.

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const REVERSE: number[] = [];
for (let i = 0; i < ALPHABET.length; i++) REVERSE[ALPHABET.charCodeAt(i)] = i;
// URL-safe base64 decodes too.
REVERSE["-".charCodeAt(0)] = 62;
REVERSE["_".charCodeAt(0)] = 63;

/** Unknown characters count as 0 (`undefined << n`), as in base64-js. */
function digit(text: string, index: number): number {
  return REVERSE[text.charCodeAt(index)] as number;
}

/**
 * Decodes base64 without validating characters. Throws for a length that
 * isn't a multiple of 4; "=" anywhere ends the data.
 */
export function base64ToBytes(text: string): Uint8Array {
  const length = text.length;
  if (length % 4 > 0) throw new Error("Invalid string. Length must be a multiple of 4");
  let validLength = text.indexOf("=");
  if (-1 === validLength) validLength = length;
  const padding = validLength === length ? 0 : 4 - (validLength % 4);
  const bytes = new Uint8Array((3 * (validLength + padding)) / 4 - padding);
  let out = 0;
  const end = padding > 0 ? validLength - 4 : validLength;
  let i: number;
  let value: number;
  for (i = 0; i < end; i += 4) {
    value =
      (digit(text, i) << 18) |
      (digit(text, i + 1) << 12) |
      (digit(text, i + 2) << 6) |
      digit(text, i + 3);
    bytes[out++] = (value >> 16) & 255;
    bytes[out++] = (value >> 8) & 255;
    bytes[out++] = 255 & value;
  }
  if (2 === padding) {
    value = (digit(text, i) << 2) | (digit(text, i + 1) >> 4);
    bytes[out] = 255 & value;
  }
  if (1 === padding) {
    value = (digit(text, i) << 10) | (digit(text, i + 1) << 4) | (digit(text, i + 2) >> 2);
    bytes[out++] = (value >> 8) & 255;
    bytes[out] = 255 & value;
  }
  return bytes;
}

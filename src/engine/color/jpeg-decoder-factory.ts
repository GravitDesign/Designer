// Old: chunk.vendor.js module 932 (JPEG decoder factory).
import { JpegDecoder } from "./jpeg-decoder.ts";

const BASE64_DIGITS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const BASE64_VALUES: number[] = [];
for (let i = 0; i < BASE64_DIGITS.length; ++i) BASE64_VALUES[BASE64_DIGITS.charCodeAt(i)] = i;
BASE64_VALUES["-".charCodeAt(0)] = 62;
BASE64_VALUES["_".charCodeAt(0)] = 63;

/**
 * base64 → bytes as the base64-js package the old app bundled decodes it:
 * URL-safe digits are accepted and unknown characters count as 0 (atob
 * would throw on them).
 */
function base64ToBytes(base64: string): Uint8Array {
  const digit = (index: number) => BASE64_VALUES[base64.charCodeAt(index)] as number;
  const length = base64.length;
  if (length % 4 > 0) throw new Error("Invalid string. Length must be a multiple of 4");
  let validLength = base64.indexOf("=");
  if (-1 === validLength) validLength = length;
  const placeholders = validLength === length ? 0 : 4 - (validLength % 4);
  const bytes = new Uint8Array((3 * (validLength + placeholders)) / 4 - placeholders);
  let byte = 0;
  const fullLength = placeholders > 0 ? validLength - 4 : validLength;
  let i: number;
  let bits: number;
  for (i = 0; i < fullLength; i += 4) {
    bits = (digit(i) << 18) | (digit(i + 1) << 12) | (digit(i + 2) << 6) | digit(i + 3);
    bytes[byte++] = (bits >> 16) & 255;
    bytes[byte++] = (bits >> 8) & 255;
    bytes[byte++] = 255 & bits;
  }
  if (2 === placeholders) {
    bits = (digit(i) << 2) | (digit(i + 1) >> 4);
    bytes[byte] = 255 & bits;
  }
  if (1 === placeholders) {
    bits = (digit(i) << 10) | (digit(i + 1) << 4) | (digit(i + 2) >> 2);
    bytes[byte++] = (bits >> 8) & 255;
    bytes[byte] = 255 & bits;
  }
  return bytes;
}

export const JpegDecoderFactory = {
  /**
   * A decoder for a base64 data URL or for bytes (any ArrayBuffer view),
   * or null for anything else. Throws (a string, as jpg.js does) when the
   * data isn't a JPEG it can read.
   */
  getDecoder(source: unknown): JpegDecoder | null {
    if ("string" == typeof source) {
      const match = /^data:.{0,255};base64,/i.exec(source);
      if (match) {
        const base64 = source.substring((match.pop() as string).length);
        if (base64.length && base64.length % 4 == 0) {
          return new JpegDecoder(base64ToBytes(base64));
        }
        return null;
      }
    } else if (ArrayBuffer.isView(source)) {
      return new JpegDecoder(source as Uint8Array);
    }
    return null;
  },

  /** RGBA pixels of a CMYK JPEG, or null when it isn't one. */
  decodeCMYK(source: string | JpegDecoder | null | undefined): Uint8Array | null {
    const decoder = "string" == typeof source ? JpegDecoderFactory.getDecoder(source) : source;
    return decoder && decoder.getColorSpace() === JpegDecoder.ColorSpace.CMYK
      ? decoder.getData()
      : null;
  },
};

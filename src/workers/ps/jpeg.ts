// The JPEG handshake between the PostScript worker and the page (BUG-008).
//
// The worker can't decode JPEGs, so DCTDecode asks the page: it posts a
// "jpeg" call with `data = [dataUrl, kind]` and a SharedArrayBuffer as
// `result`, then blocks in Atomics.wait on the buffer's first Int32 until
// the page stores 1 there and calls Atomics.notify.
//
//   1. kind "size":   12 bytes, flag + width and height (Int32 at 4 and 8).
//                     The page answers 0 x 0 when it can't decode the image.
//   2. kind "pixels": 4 + width * height * 4 bytes, flag + the RGBA pixels
//                     the browser decoded (at 4).
//
// The worker then turns the RGBA pixels into the JPEG's own components
// (gray, RGB or CMYK, as DCTDecode delivers them in PostScript).
//
// Old (public/pscore.js, chunk.vendor.js module 1404): the page signalled
// with Atomics.wake, which browsers have removed; it told a size request by
// a byte view of length 2, which the 8-byte size view never has, so it
// wrote pixels where the size belonged; the worker asked for width * height
// bytes of RGBA (a quarter of the image) or for the byte count its caller
// guessed; and the old server never made the page cross-origin isolated,
// so there was no SharedArrayBuffer and every JPEG failed with error "02".

/** What a "jpeg" call asks the page for (its second data entry). */
export const JpegRequest = {
  Size: "size",
  Pixels: "pixels",
} as const;

export type JpegRequestKind = (typeof JpegRequest)[keyof typeof JpegRequest];

/** Bytes before the payload: the Int32 flag the page sets to 1. */
export const JPEG_FLAG_BYTES = 4;

/** Byte length of a size request's buffer: flag, width, height. */
export const JPEG_SIZE_REQUEST_BYTES = JPEG_FLAG_BYTES + 8;

/**
 * The number of color components of a JPEG (1 gray, 3 YCbCr/RGB, 4
 * CMYK/YCCK), read from its start-of-frame marker. `jpeg` holds one byte
 * per character. Returns 3 when there is no frame header.
 */
export function jpegComponentCount(jpeg: string): number {
  let i = 2; // after SOI (FF D8)
  while (i + 3 < jpeg.length) {
    if (jpeg.charCodeAt(i) !== 0xff) {
      i++;
      continue;
    }
    const marker = jpeg.charCodeAt(i + 1);
    // Fill bytes, standalone markers (TEM, RST0-7) and SOI.
    if (marker === 0xff) {
      i++;
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      i += 2;
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) break; // EOI or start of scan
    const length = (jpeg.charCodeAt(i + 2) << 8) | jpeg.charCodeAt(i + 3);
    const isFrame =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    // SOFn: length (2), precision (1), height (2), width (2), components (1).
    if (isFrame && i + 9 < jpeg.length) {
      const components = jpeg.charCodeAt(i + 9);
      if (components === 1 || components === 3 || components === 4) return components;
      return 3;
    }
    i += 2 + length;
  }
  return 3;
}

/**
 * The decoded RGBA pixels as the JPEG's components: gray (the red
 * channel, which equals green and blue for a gray JPEG), RGB, or CMYK
 * (the browser has already converted a CMYK JPEG to RGB; this inverts it
 * back with no black, which the image operator's CMYK conversion turns
 * into the same RGB again).
 */
export function rgbaToComponents(rgba: ArrayLike<number>, components: number): Uint8Array {
  const pixelCount = Math.floor(rgba.length / 4);
  const out = new Uint8Array(pixelCount * components);
  for (let p = 0, o = 0; p < pixelCount; p++) {
    const r = rgba[4 * p] as number;
    const g = rgba[4 * p + 1] as number;
    const b = rgba[4 * p + 2] as number;
    if (components === 1) {
      out[o++] = r;
    } else if (components === 4) {
      out[o++] = 255 - r;
      out[o++] = 255 - g;
      out[o++] = 255 - b;
      out[o++] = 0;
    } else {
      out[o++] = r;
      out[o++] = g;
      out[o++] = b;
    }
  }
  return out;
}

/**
 * Snappy decompression (the raw block format, no framing), for the
 * compressed blocks of Chromium's LevelDB tables. Format:
 * https://github.com/google/snappy/blob/main/format_description.txt
 */
export function snappyDecompress(input: Uint8Array): Uint8Array {
  let pos = 0;
  // Preamble: the uncompressed length as a little-endian varint.
  let length = 0;
  for (let shift = 0; ; shift += 7) {
    if (pos >= input.length || shift > 28) throw new Error("snappy: bad length preamble");
    const byte = input[pos++] as number;
    length += (byte & 0x7f) * 2 ** shift;
    if (byte < 0x80) break;
  }
  const out = new Uint8Array(length);
  let o = 0;
  while (pos < input.length) {
    const tag = input[pos++] as number;
    const kind = tag & 3;
    if (kind === 0) {
      // Literal: the length is in the tag, or in the 1-4 bytes after it.
      let len = tag >>> 2;
      if (len >= 60) {
        const bytes = len - 59;
        len = 0;
        for (let i = 0; i < bytes; i++) len += (input[pos++] as number) * 2 ** (8 * i);
      }
      len += 1;
      if (pos + len > input.length || o + len > length) throw new Error("snappy: bad literal");
      out.set(input.subarray(pos, pos + len), o);
      pos += len;
      o += len;
      continue;
    }
    let len: number;
    let offset: number;
    if (kind === 1) {
      len = ((tag >>> 2) & 7) + 4;
      offset = ((tag >>> 5) << 8) | (input[pos++] as number);
    } else if (kind === 2) {
      len = (tag >>> 2) + 1;
      offset = (input[pos] as number) | ((input[pos + 1] as number) << 8);
      pos += 2;
    } else {
      len = (tag >>> 2) + 1;
      offset =
        ((input[pos] as number) |
          ((input[pos + 1] as number) << 8) |
          ((input[pos + 2] as number) << 16)) +
        (input[pos + 3] as number) * 2 ** 24;
      pos += 4;
    }
    if (offset === 0 || offset > o || o + len > length) throw new Error("snappy: bad copy");
    // Copies may overlap their own output (a run), so byte by byte.
    for (let i = 0; i < len; i++, o++) out[o] = out[o - offset] as number;
  }
  if (o !== length) throw new Error("snappy: length mismatch");
  return out;
}

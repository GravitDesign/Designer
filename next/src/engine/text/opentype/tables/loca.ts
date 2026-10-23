// Old: chunk.vendor.js module 997 (opentype.js tables/loca.js, unchanged).

import { Parser } from "../parse.ts";

/**
 * Parses the loca table: numGlyphs + 1 glyph offsets into the glyf table
 * (the extra entry gives the length of the last glyph). The short version
 * stores offsets divided by 2.
 */
export function parse(
  data: DataView,
  start: number,
  numGlyphs: number,
  shortVersion: boolean,
): number[] {
  const p = new Parser(data, start);
  const parseFn = shortVersion ? p.parseUShort : p.parseULong;
  const glyphOffsets: number[] = [];
  for (let i = 0; i < numGlyphs + 1; i += 1) {
    let glyphOffset = parseFn.call(p);
    if (shortVersion) {
      glyphOffset *= 2;
    }
    glyphOffsets.push(glyphOffset);
  }
  return glyphOffsets;
}

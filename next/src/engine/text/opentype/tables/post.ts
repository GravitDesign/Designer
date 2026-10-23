// Old: chunk.vendor.js module 720 (opentype.js tables/post.js, unchanged).
// The post table: PostScript information and glyph names.

import { standardNames } from "../encoding.ts";
import { Parser } from "../parse.ts";
import { Table } from "../table.ts";

export interface PostTable {
  version: number;
  italicAngle: number;
  underlinePosition: number;
  underlineThickness: number;
  isFixedPitch: number;
  minMemType42: number;
  maxMemType42: number;
  minMemType1: number;
  maxMemType1: number;
  /** Version 1: the standard names; version 2: the names after the standard ones. */
  names?: string[];
  numberOfGlyphs?: number;
  glyphNameIndex?: number[];
  /** Version 2.5: per-glyph offsets into the standard names. */
  offset?: number[];
}

export function parse(data: DataView, start: number): PostTable {
  const p = new Parser(data, start);
  const version = p.parseVersion();
  const italicAngle = p.parseFixed();
  const underlinePosition = p.parseShort();
  const underlineThickness = p.parseShort();
  const isFixedPitch = p.parseULong();
  const minMemType42 = p.parseULong();
  const maxMemType42 = p.parseULong();
  const minMemType1 = p.parseULong();
  const post: PostTable = {
    version,
    italicAngle,
    underlinePosition,
    underlineThickness,
    isFixedPitch,
    minMemType42,
    maxMemType42,
    minMemType1,
    maxMemType1: p.parseULong(),
  };
  switch (post.version) {
    case 1:
      post.names = standardNames.slice();
      break;
    case 2: {
      const numberOfGlyphs = p.parseUShort();
      const glyphNameIndex = new Array<number>(numberOfGlyphs);
      post.numberOfGlyphs = numberOfGlyphs;
      post.glyphNameIndex = glyphNameIndex;
      for (let i = 0; i < numberOfGlyphs; i++) {
        glyphNameIndex[i] = p.parseUShort();
      }
      const names: string[] = [];
      post.names = names;
      for (let i = 0; i < numberOfGlyphs; i++) {
        if ((glyphNameIndex[i] as number) >= standardNames.length) {
          const nameLength = p.parseChar();
          names.push(p.parseString(nameLength));
        }
      }
      break;
    }
    case 2.5: {
      const numberOfGlyphs = p.parseUShort();
      const offset = new Array<number>(numberOfGlyphs);
      post.numberOfGlyphs = numberOfGlyphs;
      post.offset = offset;
      for (let i = 0; i < numberOfGlyphs; i++) {
        offset[i] = p.parseChar();
      }
      break;
    }
  }
  return post;
}

/** A version 3 post table (no glyph names). */
export function make(): Table {
  return new Table("post", [
    { name: "version", type: "FIXED", value: 0x00030000 },
    { name: "italicAngle", type: "FIXED", value: 0 },
    { name: "underlinePosition", type: "FWORD", value: 0 },
    { name: "underlineThickness", type: "FWORD", value: 0 },
    { name: "isFixedPitch", type: "ULONG", value: 0 },
    { name: "minMemType42", type: "ULONG", value: 0 },
    { name: "maxMemType42", type: "ULONG", value: 0 },
    { name: "minMemType1", type: "ULONG", value: 0 },
    { name: "maxMemType1", type: "ULONG", value: 0 },
  ]);
}

// Old: chunk.vendor.js module 716 (opentype.js tables/ltag.js, unchanged).
// The ltag table (Apple): language tags that name records refer to.

import * as check from "../check.ts";
import { Parser } from "../parse.ts";
import { Table } from "../table.ts";

export type LtagTable = string[];

export function make(tags: string[]): Table {
  const result = new Table("ltag", [
    { name: "version", type: "ULONG", value: 1 },
    { name: "flags", type: "ULONG", value: 0 },
    { name: "numTags", type: "ULONG", value: tags.length },
  ]);
  let stringPool = "";
  const stringPoolOffset = 12 + tags.length * 4;
  for (let i = 0; i < tags.length; ++i) {
    const tag = tags[i] as string;
    // A tag already contained in the pool reuses those bytes.
    let pos = stringPool.indexOf(tag);
    if (pos < 0) {
      pos = stringPool.length;
      stringPool += tag;
    }
    result.fields.push({ name: "offset " + i, type: "USHORT", value: stringPoolOffset + pos });
    result.fields.push({ name: "length " + i, type: "USHORT", value: tag.length });
  }
  result.fields.push({ name: "stringPool", type: "CHARARRAY", value: stringPool });
  return result;
}

export function parse(data: DataView, start: number): LtagTable {
  const p = new Parser(data, start);
  const tableVersion = p.parseULong();
  check.argument(tableVersion === 1, "Unsupported ltag table version.");
  // No flags are defined.
  p.skip("uLong", 1);
  const numTags = p.parseULong();
  const tags: string[] = [];
  for (let i = 0; i < numTags; i++) {
    let tag = "";
    const offset = start + p.parseUShort();
    const length = p.parseUShort();
    for (let j = offset; j < offset + length; ++j) {
      tag += String.fromCharCode(data.getInt8(j));
    }
    tags.push(tag);
  }
  return tags;
}

// Old: chunk.vendor.js module 722 (opentype.js tables/meta.js, unchanged).
// The meta table: metadata strings keyed by tag (dlng, slng, ...).

import * as check from "../check.ts";
import { Parser } from "../parse.ts";
import { Table } from "../table.ts";
import { decode } from "../types.ts";

export type MetaTable = Record<string, string>;

export function parse(data: DataView, start: number): MetaTable {
  const p = new Parser(data, start);
  const tableVersion = p.parseULong();
  check.argument(tableVersion === 1, "Unsupported META table version.");
  p.parseULong(); // flags, unused
  p.parseULong(); // tableOffset
  const numDataMaps = p.parseULong();
  const tags: MetaTable = {};
  for (let i = 0; i < numDataMaps; i++) {
    const tag = p.parseTag();
    const dataOffset = p.parseULong();
    const dataLength = p.parseULong();
    tags[tag] = decode.UTF8(data, start + dataOffset, dataLength);
  }
  return tags;
}

export function make(tags: MetaTable): Table {
  const numTags = Object.keys(tags).length;
  let stringPool = "";
  const stringPoolOffset = 16 + numTags * 12;
  const result = new Table("meta", [
    { name: "version", type: "ULONG", value: 1 },
    { name: "flags", type: "ULONG", value: 0 },
    { name: "offset", type: "ULONG", value: stringPoolOffset },
    { name: "numTags", type: "ULONG", value: numTags },
  ]);
  for (const tag in tags) {
    const value = tags[tag] as string;
    const pos = stringPool.length;
    stringPool += value;
    result.fields.push({ name: "tag " + tag, type: "TAG", value: tag });
    result.fields.push({ name: "offset " + tag, type: "ULONG", value: stringPoolOffset + pos });
    result.fields.push({ name: "length " + tag, type: "ULONG", value: value.length });
  }
  result.fields.push({ name: "stringPool", type: "CHARARRAY", value: stringPool });
  return result;
}

// Old: chunk.vendor.js module 708 (opentype.js opentype.js, the entry point).
// Gravit changes:
// - WOFF tables are inflated with pako 1.0.11 (inflate with raw: true)
//   instead of tiny-inflate.
// - parse() also accepts a DataView.
// - A morx table sets font.hasGHBTables (the text then goes through HarfBuzz).
// - parse() throws when there is no cmap table.
// - numGlyphs is clamped to the number of glyphs actually read.
// - parseTableEntries is exported (the PDF exporter uses it to find "CFF ").

import { inflate as pakoInflate } from "pako";
import { BoundingBox } from "./bbox.ts";
import { defined } from "./check.ts";
import { addGlyphNames, CmapEncoding, GlyphNames } from "./encoding.ts";
import { Font } from "./font.ts";
import { Glyph } from "./glyph.ts";
import * as parseUtil from "./parse.ts";
import { Parser } from "./parse.ts";
import { Path } from "./path.ts";
import * as cff from "./tables/cff.ts";
import * as cmap from "./tables/cmap.ts";
import * as fvar from "./tables/fvar.ts";
import * as glyf from "./tables/glyf.ts";
import * as gpos from "./tables/gpos.ts";
import * as gsub from "./tables/gsub.ts";
import * as head from "./tables/head.ts";
import * as hhea from "./tables/hhea.ts";
import * as hmtx from "./tables/hmtx.ts";
import * as kern from "./tables/kern.ts";
import * as loca from "./tables/loca.ts";
import * as ltag from "./tables/ltag.ts";
import * as maxp from "./tables/maxp.ts";
import * as meta from "./tables/meta.ts";
import * as nameTable from "./tables/name.ts";
import * as os2 from "./tables/os2.ts";
import * as post from "./tables/post.ts";
import { nodeBufferToArrayBuffer, nodeFs } from "./util.ts";

export { BoundingBox, Font, Glyph, Path, parseUtil as _parse };

/**
 * Raw deflate decompression, as pako 1.0.11's inflate(data, { raw: true }).
 * Must return a Uint8Array whose buffer holds exactly the output: the old
 * code wraps result.buffer in a DataView from offset 0.
 */
export type InflateRaw = (data: Uint8Array, options: { raw: true }) => Uint8Array;

const pakoInflateRaw: InflateRaw = (data, options) => pakoInflate(data, options);

let inflateRaw: InflateRaw = pakoInflateRaw;

/**
 * Port helper for tests: replaces the WOFF inflater; null restores pako,
 * which the old bundle used.
 */
export function setInflate(inflate: InflateRaw | null): void {
  inflateRaw = inflate || pakoInflateRaw;
}

export interface TableEntry {
  tag: string;
  checksum?: number;
  offset: number;
  length: number;
  compression: false | "WOFF";
  compressedLength?: number;
}

interface TableData {
  data: DataView;
  offset: number;
}

function loadFromFile(path: string, callback: (err: unknown, buffer?: ArrayBuffer) => void): void {
  const fs = nodeFs();
  fs.readFile(path, function (err, buffer) {
    if (err) {
      return callback(err.message);
    }
    callback(null, nodeBufferToArrayBuffer(buffer));
  });
}

function loadFromUrl(url: string, callback: (err: unknown, buffer?: ArrayBuffer) => void): void {
  const request = new XMLHttpRequest();
  request.open("get", url, true);
  request.responseType = "arraybuffer";
  request.onload = function () {
    if (request.response) {
      return callback(null, request.response as ArrayBuffer);
    }
    return callback("Font could not be loaded: " + request.statusText);
  };
  request.onerror = function () {
    callback("Font could not be loaded");
  };
  request.send();
}

function parseOpenTypeTableEntries(data: DataView, numTables: number): TableEntry[] {
  const tableEntries: TableEntry[] = [];
  let p = 12;
  for (let i = 0; i < numTables; i += 1) {
    const tag = parseUtil.getTag(data, p);
    const checksum = parseUtil.getULong(data, p + 4);
    const offset = parseUtil.getULong(data, p + 8);
    const length = parseUtil.getULong(data, p + 12);
    tableEntries.push({
      tag: tag,
      checksum: checksum,
      offset: offset,
      length: length,
      compression: false,
    });
    p += 16;
  }
  return tableEntries;
}

function parseWOFFTableEntries(data: DataView, numTables: number): TableEntry[] {
  const tableEntries: TableEntry[] = [];
  // Offset of the first table directory entry.
  let p = 44;
  for (let i = 0; i < numTables; i += 1) {
    const tag = parseUtil.getTag(data, p);
    const offset = parseUtil.getULong(data, p + 4);
    const compLength = parseUtil.getULong(data, p + 8);
    const origLength = parseUtil.getULong(data, p + 12);
    const compression = compLength < origLength && "WOFF";
    tableEntries.push({
      tag: tag,
      offset: offset,
      compression: compression,
      compressedLength: compLength,
      length: origLength,
    });
    p += 20;
  }
  return tableEntries;
}

function uncompressTable(data: DataView, tableEntry: TableEntry): TableData {
  if (tableEntry.compression === "WOFF") {
    // The 2 bytes skipped are the zlib header; the rest is raw deflate.
    const inBuffer = new Uint8Array(
      data.buffer,
      tableEntry.offset + 2,
      (tableEntry.compressedLength as number) - 2,
    );
    const outBuffer = inflateRaw(inBuffer, { raw: true });
    if (outBuffer.byteLength !== tableEntry.length) {
      throw new Error(
        "Decompression error: " +
          tableEntry.tag +
          " decompressed length doesn't match recorded length",
      );
    }
    return { data: new DataView(outBuffer.buffer, 0), offset: 0 };
  }
  return { data: data, offset: tableEntry.offset };
}

/**
 * Parses an OpenType, TrueType or WOFF font. Throws when the font can't be
 * read.
 */
export function parse(buffer: ArrayBuffer | DataView): Font {
  let indexToLocFormat: number | undefined;
  let ltagTable: string[] | undefined;

  // An empty font that the tables below fill.
  const font = new Font({ empty: true });

  // OpenType is big endian; DataView lets us say so.
  const data = buffer instanceof DataView ? buffer : new DataView(buffer, 0);
  let numTables: number;
  let tableEntries: TableEntry[];
  const signature = parseUtil.getTag(data, 0);
  if (
    signature === String.fromCharCode(0, 1, 0, 0) ||
    signature === "true" ||
    signature === "typ1"
  ) {
    font.outlinesFormat = "truetype";
    numTables = parseUtil.getUShort(data, 4);
    tableEntries = parseOpenTypeTableEntries(data, numTables);
  } else if (signature === "OTTO") {
    font.outlinesFormat = "cff";
    numTables = parseUtil.getUShort(data, 4);
    tableEntries = parseOpenTypeTableEntries(data, numTables);
  } else if (signature === "wOFF") {
    const flavor = parseUtil.getTag(data, 4);
    if (flavor === String.fromCharCode(0, 1, 0, 0)) {
      font.outlinesFormat = "truetype";
    } else if (flavor === "OTTO") {
      font.outlinesFormat = "cff";
    } else {
      throw new Error("Unsupported OpenType flavor " + signature);
    }
    numTables = parseUtil.getUShort(data, 12);
    tableEntries = parseWOFFTableEntries(data, numTables);
  } else {
    throw new Error("Unsupported OpenType signature " + signature);
  }

  let cffTableEntry: TableEntry | undefined;
  let fvarTableEntry: TableEntry | undefined;
  let glyfTableEntry: TableEntry | undefined;
  let gposTableEntry: TableEntry | undefined;
  let gsubTableEntry: TableEntry | undefined;
  let hmtxTableEntry: TableEntry | undefined;
  let kernTableEntry: TableEntry | undefined;
  let locaTableEntry: TableEntry | undefined;
  let nameTableEntry: TableEntry | undefined;
  let metaTableEntry: TableEntry | undefined;
  let p: Parser;

  for (let i = 0; i < numTables; i += 1) {
    const tableEntry = tableEntries[i] as TableEntry;
    let table: TableData;
    switch (tableEntry.tag) {
      case "cmap":
        table = uncompressTable(data, tableEntry);
        font.tables.cmap = cmap.parse(table.data, table.offset);
        font.encoding = new CmapEncoding(font.tables.cmap);
        break;
      case "cvt ":
        table = uncompressTable(data, tableEntry);
        p = new Parser(table.data, table.offset);
        font.tables.cvt = p.parseShortList(tableEntry.length / 2);
        break;
      case "fvar":
        fvarTableEntry = tableEntry;
        break;
      case "fpgm":
        table = uncompressTable(data, tableEntry);
        p = new Parser(table.data, table.offset);
        font.tables.fpgm = p.parseByteList(tableEntry.length);
        break;
      case "head":
        table = uncompressTable(data, tableEntry);
        font.tables.head = head.parse(table.data, table.offset);
        font.unitsPerEm = font.tables.head.unitsPerEm;
        indexToLocFormat = font.tables.head.indexToLocFormat;
        break;
      case "hhea":
        table = uncompressTable(data, tableEntry);
        font.tables.hhea = hhea.parse(table.data, table.offset);
        font.ascender = font.tables.hhea.ascender;
        font.descender = font.tables.hhea.descender;
        font.numberOfHMetrics = font.tables.hhea.numberOfHMetrics;
        break;
      case "hmtx":
        hmtxTableEntry = tableEntry;
        break;
      case "ltag":
        table = uncompressTable(data, tableEntry);
        ltagTable = ltag.parse(table.data, table.offset);
        break;
      case "maxp":
        table = uncompressTable(data, tableEntry);
        font.tables.maxp = maxp.parse(table.data, table.offset);
        font.numGlyphs = font.tables.maxp.numGlyphs;
        break;
      case "name":
        nameTableEntry = tableEntry;
        break;
      case "OS/2":
        table = uncompressTable(data, tableEntry);
        font.tables.os2 = os2.parse(table.data, table.offset);
        break;
      case "post":
        table = uncompressTable(data, tableEntry);
        font.tables.post = post.parse(table.data, table.offset);
        font.glyphNames = new GlyphNames(font.tables.post);
        break;
      case "prep":
        table = uncompressTable(data, tableEntry);
        p = new Parser(table.data, table.offset);
        font.tables.prep = p.parseByteList(tableEntry.length);
        break;
      case "glyf":
        glyfTableEntry = tableEntry;
        break;
      case "loca":
        locaTableEntry = tableEntry;
        break;
      case "CFF ":
        cffTableEntry = tableEntry;
        break;
      case "kern":
        kernTableEntry = tableEntry;
        break;
      case "GPOS":
        gposTableEntry = tableEntry;
        break;
      case "GSUB":
        gsubTableEntry = tableEntry;
        break;
      case "meta":
        metaTableEntry = tableEntry;
        break;
      case "morx":
        // Gravit: AAT shaping tables, only HarfBuzz can apply them.
        font.hasGHBTables = true;
        break;
    }
  }

  if (!font.tables.cmap) {
    throw new Error("Font doesn't contain known CMAP table.");
  }

  const nameTableData = uncompressTable(data, defined(nameTableEntry, "The name table"));
  font.tables.name = nameTable.parse(nameTableData.data, nameTableData.offset, ltagTable);
  font.names = font.tables.name;

  if (glyfTableEntry && locaTableEntry) {
    const shortVersion = indexToLocFormat === 0;
    const locaTable = uncompressTable(data, locaTableEntry);
    const locaOffsets = loca.parse(locaTable.data, locaTable.offset, font.numGlyphs, shortVersion);
    const glyfTable = uncompressTable(data, glyfTableEntry);
    font.glyphs = glyf.parse(glyfTable.data, glyfTable.offset, locaOffsets, font);
  } else if (cffTableEntry) {
    const cffTable = uncompressTable(data, cffTableEntry);
    cff.parse(cffTable.data, cffTable.offset, font);
  } else {
    throw new Error("Font doesn't contain TrueType or CFF outlines.");
  }

  // Gravit: some fonts declare more glyphs in maxp than they contain.
  font.numGlyphs = Math.min(font.numGlyphs, font.glyphs.length);

  const hmtxTable = uncompressTable(data, defined(hmtxTableEntry, "The hmtx table"));
  hmtx.parse(hmtxTable.data, hmtxTable.offset, font.numberOfHMetrics, font.numGlyphs, font.glyphs);
  addGlyphNames(font);

  if (kernTableEntry) {
    const kernTable = uncompressTable(data, kernTableEntry);
    font.kerningPairs = kern.parse(kernTable.data, kernTable.offset);
  } else {
    font.kerningPairs = {};
  }

  if (gposTableEntry) {
    const gposTable = uncompressTable(data, gposTableEntry);
    font.tables.gpos = gpos.parse(gposTable.data, gposTable.offset);
    font.position.init();
  }

  if (gsubTableEntry) {
    const gsubTable = uncompressTable(data, gsubTableEntry);
    font.tables.gsub = gsub.parse(gsubTable.data, gsubTable.offset);
  }

  if (fvarTableEntry) {
    const fvarTable = uncompressTable(data, fvarTableEntry);
    font.tables.fvar = fvar.parse(fvarTable.data, fvarTable.offset, font.names);
  }

  if (metaTableEntry) {
    const metaTable = uncompressTable(data, metaTableEntry);
    font.tables.meta = meta.parse(metaTable.data, metaTable.offset);
    font.metas = font.tables.meta;
  }

  return font;
}

/**
 * Gravit: the table directory of a font file without parsing the tables.
 * Throws for anything but OpenType, TrueType and WOFF.
 */
export function parseTableEntries(buffer: ArrayBuffer): TableEntry[] {
  const data = new DataView(buffer, 0);
  const signature = parseUtil.getTag(data, 0);
  if (
    signature === String.fromCharCode(0, 1, 0, 0) ||
    signature === "true" ||
    signature === "typ1"
  ) {
    return parseOpenTypeTableEntries(data, parseUtil.getUShort(data, 4));
  }
  if (signature === "OTTO") {
    return parseOpenTypeTableEntries(data, parseUtil.getUShort(data, 4));
  }
  if (signature === "wOFF") {
    const flavor = parseUtil.getTag(data, 4);
    if (flavor !== String.fromCharCode(0, 1, 0, 0) && flavor !== "OTTO") {
      throw new Error("Unsupported OpenType flavor " + signature);
    }
    return parseWOFFTableEntries(data, parseUtil.getUShort(data, 12));
  }
  throw new Error("Unsupported OpenType signature " + signature);
}

/**
 * Loads and parses a font from a URL (browser) or a file (Node). The callback
 * gets (error, font) in Node's convention.
 */
export function load(url: string, callback: (err: unknown, font?: Font | null) => void): void {
  const isNode = typeof window === "undefined";
  const loadFn = isNode ? loadFromFile : loadFromUrl;
  loadFn(url, function (err, arrayBuffer) {
    if (err) {
      return callback(err);
    }
    let font: Font;
    try {
      font = parse(arrayBuffer as ArrayBuffer);
    } catch (e) {
      return callback(e, null);
    }
    return callback(null, font);
  });
}

/** Loads and parses a font file synchronously. Node only. */
export function loadSync(url: string): Font {
  const buffer = nodeFs().readFileSync(url);
  return parse(nodeBufferToArrayBuffer(buffer));
}

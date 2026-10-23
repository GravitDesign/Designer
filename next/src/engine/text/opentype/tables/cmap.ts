// Old: chunk.vendor.js module 710 (opentype.js tables/cmap.js).
// The cmap table maps character codes to glyph indexes.
// Gravit changes:
// - Sub-table choice: Windows (3) and also Macintosh (1) platform tables with
//   encoding 0, 1 or 10 are taken, besides Unicode (0) with encoding 0 to 4.
//   As a fallback, any other Unicode platform sub-table is used.
// - When no sub-table fits, parse returns null instead of throwing (opentype.ts
//   then throws "Font doesn't contain known CMAP table.").
// - Formats 0, 6, 10 and 13 are read too, not only 4 and 12; the error for
//   other formats doesn't name the format.
// - make() is the format 4 only writer of earlier opentype.js versions (no
//   format 12 sub-table, segments without glyphIndex, the length field is set).

import * as check from "../check.ts";
import type { Glyph } from "../glyph.ts";
import type { GlyphSet } from "../glyphset.ts";
import * as parseUtil from "../parse.ts";
import { Parser } from "../parse.ts";
import { Table } from "../table.ts";

export interface CmapTable {
  version: number;
  numTables: number;
  format: number;
  length: number;
  language: number;
  /** Character code to glyph index. */
  glyphIndexMap: Record<number, number>;
  /** Formats 12 and 13. */
  groupCount?: number;
  /** Format 4. */
  segCount?: number;
}

/** Format 12: segmented coverage, consecutive glyph ids per group. */
function parseCmapTableFormat12(cmap: CmapTable, p: Parser): void {
  // reserved
  p.parseUShort();
  cmap.length = p.parseULong();
  cmap.language = p.parseULong();
  const groupCount = p.parseULong();
  cmap.groupCount = groupCount;
  cmap.glyphIndexMap = {};
  for (let i = 0; i < groupCount; i += 1) {
    const startCharCode = p.parseULong();
    const endCharCode = p.parseULong();
    let startGlyphId = p.parseULong();
    for (let c = startCharCode; c <= endCharCode; c += 1) {
      cmap.glyphIndexMap[c] = startGlyphId;
      startGlyphId++;
    }
  }
}

/** Gravit: format 13, many-to-one: every code of a group maps to the same glyph. */
function parseCmapTableFormat13(cmap: CmapTable, p: Parser): void {
  // reserved
  p.parseUShort();
  cmap.length = p.parseULong();
  cmap.language = p.parseULong();
  const groupCount = p.parseULong();
  cmap.groupCount = groupCount;
  cmap.glyphIndexMap = {};
  for (let i = 0; i < groupCount; i += 1) {
    const startCharCode = p.parseULong();
    const endCharCode = p.parseULong();
    const glyphId = p.parseULong();
    for (let c = startCharCode; c <= endCharCode; c += 1) {
      cmap.glyphIndexMap[c] = glyphId;
    }
  }
}

/** Format 4: segment mapping to delta values. The last (0xFFFF) segment is skipped. */
function parseCmapTableFormat4(
  cmap: CmapTable,
  p: Parser,
  data: DataView,
  start: number,
  offset: number,
): void {
  cmap.length = p.parseUShort();
  cmap.language = p.parseUShort();
  // segCount is stored times 2.
  const segCount = p.parseUShort() >> 1;
  cmap.segCount = segCount;
  // searchRange, entrySelector, rangeShift
  p.skip("uShort", 3);

  cmap.glyphIndexMap = {};
  const endCountParser = new Parser(data, start + offset + 14);
  const startCountParser = new Parser(data, start + offset + 16 + segCount * 2);
  const idDeltaParser = new Parser(data, start + offset + 16 + segCount * 4);
  const idRangeOffsetParser = new Parser(data, start + offset + 16 + segCount * 6);
  // opentype.js also starts this at the glyphIdArray (start + offset + 16 +
  // segCount * 8), a value that is always overwritten before use.
  let glyphIndexOffset: number;
  for (let i = 0; i < segCount - 1; i += 1) {
    let glyphIndex: number;
    const endCount = endCountParser.parseUShort();
    const startCount = startCountParser.parseUShort();
    const idDelta = idDeltaParser.parseShort();
    const idRangeOffset = idRangeOffsetParser.parseUShort();
    for (let c = startCount; c <= endCount; c += 1) {
      if (idRangeOffset !== 0) {
        // idRangeOffset is relative to its own position in the idRangeOffset array.
        glyphIndexOffset = idRangeOffsetParser.offset + idRangeOffsetParser.relativeOffset - 2;
        glyphIndexOffset += idRangeOffset;
        glyphIndexOffset += (c - startCount) * 2;
        glyphIndex = parseUtil.getUShort(data, glyphIndexOffset);
        if (glyphIndex !== 0) {
          glyphIndex = (glyphIndex + idDelta) & 0xffff;
        }
      } else {
        glyphIndex = (c + idDelta) & 0xffff;
      }
      cmap.glyphIndexMap[c] = glyphIndex;
    }
  }
}

/** Gravit: format 6, trimmed table mapping (16-bit codes). */
function parseCmapTableFormat6(cmap: CmapTable, p: Parser): void {
  cmap.length = p.parseUShort();
  cmap.language = p.parseUShort();
  const firstCode = p.parseUShort();
  const end = firstCode + p.parseUShort();
  cmap.glyphIndexMap = {};
  for (let c = firstCode; c < end; c += 1) {
    cmap.glyphIndexMap[c] = p.parseUShort();
  }
}

/** Gravit: format 10, trimmed array (32-bit codes). */
function parseCmapTableFormat10(cmap: CmapTable, p: Parser): void {
  // reserved
  p.parseUShort();
  cmap.length = p.parseULong();
  cmap.language = p.parseULong();
  const startCharCode = p.parseULong();
  const end = startCharCode + p.parseULong();
  cmap.glyphIndexMap = {};
  for (let c = startCharCode; c < end; c += 1) {
    cmap.glyphIndexMap[c] = p.parseUShort();
  }
}

/** Gravit: format 0, byte encoding table for codes 0 to 255. */
function parseCmapTableFormat0(cmap: CmapTable, p: Parser): void {
  cmap.length = p.parseUShort();
  cmap.language = p.parseUShort();
  cmap.glyphIndexMap = {};
  for (let c = 0; c < 256; c += 1) {
    cmap.glyphIndexMap[c] = p.parseByte();
  }
}

/** Parses the cmap table, or returns null when it has no sub-table we can use. */
export function parse(data: DataView, start: number): CmapTable | null {
  const version = parseUtil.getUShort(data, start);
  check.argument(version === 0, "cmap table version should be 0.");
  const numTables = parseUtil.getUShort(data, start + 2);
  const cmap = { version: version, numTables: numTables } as CmapTable;

  let offset = -1;
  let unicodeFallbackOffset = -1;
  for (let i = cmap.numTables - 1; i >= 0; i -= 1) {
    const platformId = parseUtil.getUShort(data, start + 4 + i * 8);
    const encodingId = parseUtil.getUShort(data, start + 4 + i * 8 + 2);
    if (
      ((platformId === 3 || platformId === 1) &&
        (encodingId === 0 || encodingId === 1 || encodingId === 10)) ||
      (platformId === 0 &&
        (encodingId === 0 ||
          encodingId === 1 ||
          encodingId === 2 ||
          encodingId === 3 ||
          encodingId === 4))
    ) {
      offset = parseUtil.getULong(data, start + 4 + i * 8 + 4);
      break;
    }
    if (platformId === 0) {
      unicodeFallbackOffset = parseUtil.getULong(data, start + 4 + i * 8 + 4);
    }
  }

  if (offset === -1) {
    if (unicodeFallbackOffset === -1) {
      return null;
    }
    offset = unicodeFallbackOffset;
  }

  const p = new Parser(data, start + offset);
  cmap.format = p.parseUShort();
  if (cmap.format === 12) {
    parseCmapTableFormat12(cmap, p);
  } else if (cmap.format === 4) {
    parseCmapTableFormat4(cmap, p, data, start, offset);
  } else if (cmap.format === 6) {
    parseCmapTableFormat6(cmap, p);
  } else if (cmap.format === 10) {
    parseCmapTableFormat10(cmap, p);
  } else if (cmap.format === 13) {
    parseCmapTableFormat13(cmap, p);
  } else if (cmap.format === 0) {
    parseCmapTableFormat0(cmap, p);
  } else {
    throw new Error("Only format 4 and 12 cmap tables are supported.");
  }
  return cmap;
}

interface Segment {
  end: number;
  start: number;
  delta: number;
  offset: number;
  glyphId?: number;
}

function addSegment(segments: Segment[], code: number, glyphIndex: number): void {
  segments.push({
    end: code,
    start: code,
    delta: -(code - glyphIndex),
    offset: 0,
  });
}

function addTerminatorSegment(segments: Segment[]): void {
  segments.push({
    end: 0xffff,
    start: 0xffff,
    delta: 1,
    offset: 0,
  });
}

/** A format 4 cmap with one segment per character. */
export function make(glyphs: GlyphSet): Table {
  const t = new Table("cmap", [
    { name: "version", type: "USHORT", value: 0 },
    { name: "numTables", type: "USHORT", value: 1 },
    { name: "platformID", type: "USHORT", value: 3 },
    { name: "encodingID", type: "USHORT", value: 1 },
    { name: "offset", type: "ULONG", value: 12 },
    { name: "format", type: "USHORT", value: 4 },
    { name: "length", type: "USHORT", value: 0 },
    { name: "language", type: "USHORT", value: 0 },
    { name: "segCountX2", type: "USHORT", value: 0 },
    { name: "searchRange", type: "USHORT", value: 0 },
    { name: "entrySelector", type: "USHORT", value: 0 },
    { name: "rangeShift", type: "USHORT", value: 0 },
  ]);

  let segments: Segment[] = [];
  t.segments = segments;
  for (let i = 0; i < glyphs.length; i += 1) {
    const glyph = glyphs.get(i) as Glyph;
    for (let j = 0; j < glyph.unicodes.length; j += 1) {
      addSegment(segments, glyph.unicodes[j] as number, i);
    }
    segments = segments.sort(function (a, b) {
      return a.start - b.start;
    });
    t.segments = segments;
  }

  addTerminatorSegment(segments);

  const segCount = segments.length;
  t.segCountX2 = segCount * 2;
  t.searchRange = 2 * Math.pow(2, Math.floor(Math.log(segCount) / Math.log(2)));
  t.entrySelector = Math.log((t.searchRange as number) / 2) / Math.log(2);
  t.rangeShift = (t.segCountX2 as number) - (t.searchRange as number);

  // Parallel segment arrays.
  let endCounts: Table["fields"] = [];
  let startCounts: Table["fields"] = [];
  let idDeltas: Table["fields"] = [];
  let idRangeOffsets: Table["fields"] = [];
  let glyphIds: Table["fields"] = [];

  for (let i = 0; i < segCount; i += 1) {
    const segment = segments[i] as Segment;
    endCounts = endCounts.concat({ name: "end_" + i, type: "USHORT", value: segment.end });
    startCounts = startCounts.concat({ name: "start_" + i, type: "USHORT", value: segment.start });
    idDeltas = idDeltas.concat({ name: "idDelta_" + i, type: "SHORT", value: segment.delta });
    idRangeOffsets = idRangeOffsets.concat({
      name: "idRangeOffset_" + i,
      type: "USHORT",
      value: segment.offset,
    });
    if (segment.glyphId !== undefined) {
      glyphIds = glyphIds.concat({ name: "glyph_" + i, type: "USHORT", value: segment.glyphId });
    }
  }

  t.fields = t.fields.concat(endCounts);
  t.fields.push({ name: "reservedPad", type: "USHORT", value: 0 });
  t.fields = t.fields.concat(startCounts);
  t.fields = t.fields.concat(idDeltas);
  t.fields = t.fields.concat(idRangeOffsets);
  t.fields = t.fields.concat(glyphIds);

  t.length =
    14 + // sub-table header
    endCounts.length * 2 +
    2 + // reservedPad
    startCounts.length * 2 +
    idDeltas.length * 2 +
    idRangeOffsets.length * 2 +
    glyphIds.length * 2;

  return t;
}

// Old: chunk.vendor.js module 714 (opentype.js tables/hhea.js, unchanged).
// The hhea table: information for horizontal layout.

import { Parser } from "../parse.ts";
import { Table } from "../table.ts";

export interface HheaTable {
  version: number;
  ascender: number;
  descender: number;
  lineGap: number;
  advanceWidthMax: number;
  minLeftSideBearing: number;
  minRightSideBearing: number;
  xMaxExtent: number;
  caretSlopeRise: number;
  caretSlopeRun: number;
  caretOffset: number;
  metricDataFormat: number;
  numberOfHMetrics: number;
}

export function parse(data: DataView, start: number): HheaTable {
  const p = new Parser(data, start);
  const version = p.parseVersion();
  const ascender = p.parseShort();
  const descender = p.parseShort();
  const lineGap = p.parseShort();
  const advanceWidthMax = p.parseUShort();
  const minLeftSideBearing = p.parseShort();
  const minRightSideBearing = p.parseShort();
  const xMaxExtent = p.parseShort();
  const caretSlopeRise = p.parseShort();
  const caretSlopeRun = p.parseShort();
  const caretOffset = p.parseShort();
  // Four reserved shorts.
  p.relativeOffset += 8;
  return {
    version,
    ascender,
    descender,
    lineGap,
    advanceWidthMax,
    minLeftSideBearing,
    minRightSideBearing,
    xMaxExtent,
    caretSlopeRise,
    caretSlopeRun,
    caretOffset,
    metricDataFormat: p.parseShort(),
    numberOfHMetrics: p.parseUShort(),
  };
}

export function make(options: Record<string, unknown>): Table {
  return new Table(
    "hhea",
    [
      { name: "version", type: "FIXED", value: 0x00010000 },
      { name: "ascender", type: "FWORD", value: 0 },
      { name: "descender", type: "FWORD", value: 0 },
      { name: "lineGap", type: "FWORD", value: 0 },
      { name: "advanceWidthMax", type: "UFWORD", value: 0 },
      { name: "minLeftSideBearing", type: "FWORD", value: 0 },
      { name: "minRightSideBearing", type: "FWORD", value: 0 },
      { name: "xMaxExtent", type: "FWORD", value: 0 },
      { name: "caretSlopeRise", type: "SHORT", value: 1 },
      { name: "caretSlopeRun", type: "SHORT", value: 0 },
      { name: "caretOffset", type: "SHORT", value: 0 },
      { name: "reserved1", type: "SHORT", value: 0 },
      { name: "reserved2", type: "SHORT", value: 0 },
      { name: "reserved3", type: "SHORT", value: 0 },
      { name: "reserved4", type: "SHORT", value: 0 },
      { name: "metricDataFormat", type: "SHORT", value: 0 },
      { name: "numberOfHMetrics", type: "USHORT", value: 0 },
    ],
    options,
  );
}

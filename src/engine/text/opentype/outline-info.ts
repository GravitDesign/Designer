// Test support: the per-glyph values the outline fixtures hold, computed
// the same way the dump script ran them on the old bundle. Only tests
// import this file.

import type { Font } from "./font.ts";
import type { Glyph } from "./glyph.ts";

export interface OutlineFixture {
  font: string;
  numGlyphs: number;
  glyphsLength: number;
  unitsPerEm: number;
  outlinesFormat: string;
  glyphs: unknown[];
  [extra: string]: unknown;
}

/** JSON round trip, so NaN and undefined compare as the fixture stored them. */
export function asJson(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value)) as unknown;
}

export function glyphInfo(glyph: Glyph): unknown {
  const commands = asJson(glyph.path.commands);
  const bb = glyph.getBoundingBox();
  return asJson({
    index: glyph.index,
    name: glyph.name,
    unicode: glyph.unicode,
    unicodes: glyph.unicodes,
    advanceWidth: glyph.advanceWidth,
    leftSideBearing: glyph.leftSideBearing,
    xMin: glyph.xMin,
    yMin: glyph.yMin,
    xMax: glyph.xMax,
    yMax: glyph.yMax,
    numberOfContours: glyph.numberOfContours,
    isComposite: glyph.isComposite,
    components: glyph.components,
    instructions: glyph.instructions ? glyph.instructions.length : undefined,
    commands,
    bbox: { x1: bb.x1, y1: bb.y1, x2: bb.x2, y2: bb.y2 },
    pathData: glyph.getPath(10, 20, 36).toPathData(3),
    scaledPathData: glyph.getPath(0, 0, 12, { xScale: 0.02, yScale: 0.03 }).toPathData(5),
    metrics: glyph.getMetrics(),
    points: glyph.points,
    contours: glyph.getContours().length,
  });
}

/** The fixture's glyph list, looked up by the same indexes and characters. */
export function sampleGlyphs(font: Font, fixture: OutlineFixture): unknown[] {
  return fixture.glyphs.map((entry) => {
    const index = (entry as { index: number }).index;
    return glyphInfo(font.glyphs.get(index) as Glyph);
  });
}

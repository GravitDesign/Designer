// Old: chunk.vendor.js module 369 (the GTL render flags).

/**
 * Bits for TLCore.render and TLCanvasContext.renderMode. FILL and STROKE
 * paint, VERTEX turns glyphs into outlines, NODRAW collects outlines
 * without painting them, RENDERSTYLES records the style of each run with
 * its outlines.
 */
export const RenderFlags = {
  RENDERFLAG_RENDERSTYLES: 2048,
  RENDERFLAG_NODRAW: 1024,
  RENDERFLAG_INSIDEBRD: 512,
  RENDERFLAG_OUTSIDEBRD: 256,
  RENDERFLAG_LOCKSTROKE: 128,
  RENDERFLAG_EVENODDFILL: 64,
  RENDERFLAG_LOCKFILL: 32,
  RENDERFLAG_DRAWSELECTION: 16,
  RENDERFLAG_SCALEBITMAP: 8,
  RENDERFLAG_VERTEX: 4,
  RENDERFLAG_STROKE: 2,
  RENDERFLAG_FILL: 1,
} as const;

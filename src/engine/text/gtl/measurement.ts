// Old: chunk.vendor.js module 508 (the GTL text measurement).

/** What measuring a piece of text gives: advance width, font metrics and ink extents. */
export class Measurement {
  // All eight metrics default to 0 on the prototype, as in the old module.
  // The constructor makes the first six own properties; minX and maxX stay
  // inherited until a meter sets them, so a bare Measurement lists only the
  // six (Object.keys, JSON.stringify).
  declare width: number;
  declare height: number;
  declare ascent: number;
  declare descent: number;
  declare minY: number;
  declare maxY: number;
  declare minX: number;
  declare maxX: number;
  /** Set by the OpenType measure for the last glyph of the text. */
  declare lastGlyphWidth?: number;
  declare lastGlyphAdvance?: number;

  constructor(
    width?: number,
    height?: number,
    ascent?: number,
    descent?: number,
    minY?: number,
    maxY?: number,
  ) {
    // The old constructor assigned its arguments unconditionally, so a
    // Measurement made without arguments has undefined metrics.
    this.width = width as number;
    this.height = height as number;
    this.ascent = ascent as number;
    this.descent = descent as number;
    this.minY = minY as number;
    this.maxY = maxY as number;
  }
}

Object.assign(Measurement.prototype, {
  width: 0,
  height: 0,
  ascent: 0,
  descent: 0,
  minY: 0,
  maxY: 0,
  minX: 0,
  maxX: 0,
});

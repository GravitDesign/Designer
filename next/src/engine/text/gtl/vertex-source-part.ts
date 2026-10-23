// Old: chunk.vendor.js module 924 (GTLCodes.VertexSource: an inline code drawn as a shape).
import { VertexInfo } from "../../geometry/vertex-info.ts";
import type { VertexReader } from "../../geometry/vertex-source.ts";
import { VertexTransformer } from "../../geometry/vertex-transformer.ts";
import { Rect } from "../../math/rect.ts";
import { Transform } from "../../math/transform.ts";
import type { Run } from "./formatting.ts";
import type { CodeMeasurement, TextCode } from "./inline.ts";
import { RunDraw, type RunDrawContext } from "./run-draw.ts";

/**
 * An inline code that draws a shape (list bullets). The shape is scaled
 * to a quarter of the font size (of 20 without one) the first time it is
 * measured or drawn, and keeps that size.
 */
export class VertexSourceCode implements TextCode {
  source: VertexReader | null = null;
  _markerSource: VertexTransformer | null = null;
  _bbox: Rect | null = null;

  constructor(source: VertexReader) {
    this.source = source;
  }

  _update(run: Run): void {
    if (!this._markerSource) {
      const scale = (run.fontSize || 20) / 4;
      this._markerSource = new VertexTransformer(
        this.source as VertexReader,
        new Transform(scale, 0, 0, scale, 0, 0),
      );
      this._bbox = VertexInfo.calculateBounds(this._markerSource, true);
    }
  }

  /** The shape's width with the font's ascent and descent (of a space). */
  measure(run: Run): CodeMeasurement {
    this._update(run);
    const box = this._bbox || new Rect();
    const space = RunDraw.measure(" ", run);
    return {
      width: box.getWidth(),
      ascent: space ? space.ascent : box.getHeight(),
      descent: space ? space.descent : 0,
    };
  }

  draw(
    context: RunDrawContext,
    x: number,
    y: number,
    _width: number,
    _ascent: number,
    _descent: number,
    run: Run,
  ): void {
    this._update(run);
    const box = this._bbox || new Rect();
    const shifted = new VertexTransformer(
      this._markerSource as VertexTransformer,
      new Transform(1, 0, 0, 1, -box.getX(), 0),
    );
    RunDraw.drawMarker(context, shifted, run, x, y);
  }
}

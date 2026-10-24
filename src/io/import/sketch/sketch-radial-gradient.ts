// Old: chunk.vendor.js module 1130 (pattern/sketchradialgradient).
import { GMath } from "../../../engine/math/math.ts";
import { Point } from "../../../engine/math/point.ts";
import { Transform } from "../../../engine/math/transform.ts";
import { RadialGradient } from "../../../engine/style/radial-gradient.ts";
import { SketchGradient } from "./sketch-gradient.ts";
import { SketchPoint } from "./sketch-point.ts";

/**
 * Sketch's radial gradient (centre `from`, radius to `to`, ellipse ratio
 * `elipseLength`) as a unit-circle gradient centred at (0.5, 0.5) with a
 * transform that skews and scales it onto the ellipse.
 */
export class SketchRadialGradient extends SketchGradient {
  override _getGradient(): RadialGradient {
    if (this._data) {
      const from = SketchPoint.parse(this._data.from);
      const to = SketchPoint.parse(this._data.to);
      const cx = 0.5;
      const cy = 0.5;
      const right = new Point(1, cy);
      const top = new Point(cx, 0);
      let transform = new Transform().translated(from.getX() - cx, from.getY() - cy);
      const mappedTo = (transform.inverted() as Transform).mapPoint(to);
      let width = mappedTo.getX() - cx;
      let skewY = 0;
      if (GMath.isEqualEps(width, 0))
        width = -GMath.ptDist(from.getX(), from.getY(), to.getX(), to.getY());
      else skewY = (mappedTo.getY() - right.getY()) / width;
      const scaleX = width / 0.5;
      let candidate = new Transform()
        .translated(-cx, -cy)
        .scaled(scaleX, 1)
        .multiplied(new Transform(1, skewY, 0, 1, 0, 0))
        .translated(cx, cy);
      if ((candidate = candidate.multiplied(transform)).inverted()) transform = candidate;
      let side = new Transform()
        .translated(-from.getX(), -from.getY())
        .rotated(GMath.toRadians(90))
        .translated(from.getX(), from.getY())
        .mapPoint(to);
      side = (transform.inverted() as Transform).mapPoint(side);
      let scaleY = scaleX;
      if (0 !== this._data.elipseLength && 1 !== this._data.elipseLength)
        scaleY = ((cy - side.getY()) / 0.5) * (this._data.elipseLength || 1);
      const height = side.getY() - cy;
      let skewX = 0;
      if (!GMath.isEqualEps(height, 0)) skewX = (side.getX() - top.getX()) / height;
      candidate = new Transform()
        .translated(-cx, -cy)
        .scaled(1, scaleY)
        .multiplied(new Transform(1, 0, skewX, 1, 0, 0))
        .translated(cx, cy)
        .multiplied(transform);
      if (candidate.inverted()) transform = candidate;
      return new RadialGradient(this._getStops(), 0.5, 0.5, 0.5, cx, cy, transform);
    }
    return new RadialGradient();
  }
}

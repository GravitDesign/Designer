// Old: chunk.vendor.js module 1127 (geometry/sketchcurvepoint).
import type { Point } from "../../../engine/math/point.ts";
import type { Transform } from "../../../engine/math/transform.ts";
import type { SketchCurvePointData } from "./sketch-data.ts";
import { SketchPoint } from "./sketch-point.ts";

/** A path point with its handles, parsed from the "{x, y}" strings. */
export class SketchCurvePoint {
  // Assigned in the constructor even when the data lacks them, so
  // `hasOwnProperty("cornerRadius")` is always true (see sketch-path-util.ts).
  cornerRadius: number | undefined;
  curveMode: number | undefined;
  curveFrom: Point;
  curveTo: Point;
  hasCurveFrom: boolean | undefined;
  hasCurveTo: boolean | undefined;
  point: Point;

  constructor(data: SketchCurvePointData) {
    this.cornerRadius = data.cornerRadius;
    this.curveMode = data.curveMode;
    this.curveFrom = SketchPoint.parse(data.curveFrom);
    this.curveTo = SketchPoint.parse(data.curveTo);
    this.hasCurveFrom = data.hasCurveFrom;
    this.hasCurveTo = data.hasCurveTo;
    this.point = SketchPoint.parse(data.point);
  }

  transform(transform: Transform | null | undefined): void {
    if (transform) {
      this.curveFrom = transform.mapPoint(this.curveFrom);
      this.curveTo = transform.mapPoint(this.curveTo);
      this.point = transform.mapPoint(this.point);
    }
  }
}

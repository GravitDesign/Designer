// Old: chunk.vendor.js module 1131 (pattern/sketchangulargradient).
import { AngularGradient } from "../../../engine/style/angular-gradient.ts";
import { SketchGradient } from "./sketch-gradient.ts";

export class SketchAngularGradient extends SketchGradient {
  /** Stops sorted by position, the inner ones mirrored (1 - position). */
  override _getGradient(): AngularGradient {
    if (this._data) {
      const stops = this._getStops();
      stops.sort((a, b) => a.position - b.position);
      stops.forEach((stop, index) => {
        if (index > 0 && index < stops.length - 1) stop.position = 1 - stop.position;
      });
      return new AngularGradient(stops);
    }
    return new AngularGradient();
  }
}

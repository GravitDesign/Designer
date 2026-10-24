// Old: chunk.vendor.js module 1129 (pattern/sketchlineargradient).
import { GMath } from "../../../engine/math/math.ts";
import { LinearGradient } from "../../../engine/style/linear-gradient.ts";
import { SketchGradient } from "./sketch-gradient.ts";
import { SketchPoint } from "./sketch-point.ts";

export class SketchLinearGradient extends SketchGradient {
  override _getGradient(): LinearGradient {
    if (this._data) {
      const from = SketchPoint.parse(this._data.from);
      const to = SketchPoint.parse(this._data.to);
      const fx = from.getX();
      const fy = from.getY();
      const dx = to.getX() - from.getX();
      const dy = to.getY() - from.getY();
      const angle = -GMath.normalizeAngleRadians(-Math.atan2(dy, dx));
      let scale = (0 !== dx ? to.getX() - from.getX() : to.getY() - from.getY()) / Math.cos(angle);
      if (scale < Number.MIN_VALUE || scale > Number.MAX_VALUE) scale = 1;
      return new LinearGradient(this._getStops(), scale, angle, fx, fy);
    }
    return new LinearGradient(null, 1, GMath.toRadians(90), 0.5, 0);
  }
}

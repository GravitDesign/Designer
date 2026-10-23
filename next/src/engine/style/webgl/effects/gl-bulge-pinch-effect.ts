// Old: chunk.vendor.js module 1004 (GGLBulgePinchEffect).
//
// The padding depends on the element's size, so the effect keeps the
// last bounding box it was given; without one it guesses from the radius.
import { Locale } from "../../../core/locale/locale.ts";
import type { Rect } from "../../../math/rect.ts";
import { registerNodeClass } from "../../../scene/node.ts";
import type { EffectPadding } from "../../effect.ts";
import type { BulgePinchParameters } from "../shaders/gl-bulge-pinch-shader.ts";
import { WebGLEffect, type ParameterRange } from "../webgl-effect.ts";

const GeometryProperties = {
  shp: {
    centerX: 50,
    centerY: 50,
    radius: 50,
    strength: 0.5,
  },
  sh: "GGLBulgePinchShader",
};

export class GLBulgePinchEffect extends WebGLEffect {
  static {
    registerNodeClass(this, "GGLBulgePinchEffect", "GGLBulgePinchEffect");
  }

  static override GeometryProperties: Record<string, unknown> = GeometryProperties;

  static RANGES: Record<string, ParameterRange> = {
    centerX: [0, 100],
    centerY: [0, 100],
    radius: [0, 100],
    strength: [-1, 1],
  };

  declare $shp: BulgePinchParameters;
  declare _savedBBox: Rect | null;

  constructor() {
    super();
    this._setDefaultProperties(GeometryProperties);
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GGLBulgePinchEffect", "name", this.getNodeName()) as string;
  }

  /**
   * Only a bulge pads. The old code measured the offset from the center of
   * the box to the center of the box (always 0), not to the effect center.
   */
  override getEffectPadding(bbox?: unknown): EffectPadding {
    if (bbox) this._savedBBox = bbox as Rect;
    if (!this._savedBBox) {
      const padding = 3 * this.$shp.radius * Math.max(0, 0.75 * this.$shp.strength);
      return [padding, padding, padding, padding];
    }
    const box = this._savedBBox;
    const centerX = box.getWidth() / 2;
    const centerY = box.getHeight() / 2;
    let reach = Math.max(box.getWidth(), box.getHeight()) * this.$shp.radius * 0.01;
    reach *= 0.75 * this.$shp.strength;
    const offsetX = box.getWidth() / 2 - centerX;
    const offsetY = box.getHeight() / 2 - centerY;
    const left = Math.max(0, reach - offsetX);
    const right = Math.max(0, reach + offsetX);
    return [left, Math.max(0, reach + offsetY), right, Math.max(0, reach - offsetY)];
  }

  /** Every side, a pinch at half; capped at half the box. Effect types this as a number. */
  override getAbsoluteEffectPadding(): number {
    if (!this._savedBBox) {
      const padding = 3 * this.$shp.radius * Math.abs(0.75 * this.$shp.strength);
      return [padding, padding, padding, padding] as unknown as number;
    }
    const box = this._savedBBox;
    let reach = Math.max(box.getWidth(), box.getHeight()) * this.$shp.radius * 0.01;
    let strength = 0.75 * this.$shp.strength;
    if (strength < 0) strength *= 0.5;
    reach *= strength;
    reach = Math.min(Math.abs(reach), box.getHeight() / 2, box.getWidth() / 2);
    return [reach, reach, reach, reach] as unknown as number;
  }

  override isAffectedByChildren(): boolean {
    return true;
  }
}

GLBulgePinchEffect.prototype._savedBBox = null;

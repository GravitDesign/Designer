// Old: chunk.vendor.js module 839 (GGLZoomBlurEffect).
//
// Zoom blur from a center in percent of the element. The padding grows
// with the strength and with the distance to each side, measured on the
// last bounding box getEffectPadding was given.
import { Locale } from "../../../core/locale/locale.ts";
import type { Rect } from "../../../math/rect.ts";
import { registerNodeClass } from "../../../scene/node.ts";
import type { EffectPadding } from "../../effect.ts";
import type { ZoomBlurParameters } from "../shaders/gl-zoom-blur-shader.ts";
import { WebGLEffect, type ParameterRange } from "../webgl-effect.ts";

const GeometryProperties = {
  shp: {
    centerX: 50,
    centerY: 50,
    strength: 0.3,
  },
  sh: "GGLZoomBlurShader",
};

export class GLZoomBlurEffect extends WebGLEffect {
  static {
    registerNodeClass(this, "GGLZoomBlurEffect", "GGLZoomBlurEffect");
  }

  static override GeometryProperties: Record<string, unknown> = GeometryProperties;

  static RANGES: Record<string, ParameterRange> = {
    centerX: [0, 100],
    centerY: [0, 100],
    strength: [0, 0.5],
  };

  declare $shp: ZoomBlurParameters;
  declare _savedBBox: Rect | null;

  constructor() {
    super();
    this._setDefaultProperties(GeometryProperties);
  }

  /**
   * [left, top, right, bottom]. Any truthy argument is kept as the bounding
   * box, as in the old code; the effects container passes its scale there,
   * which then fails on getWidth.
   */
  override getEffectPadding(bbox?: unknown): EffectPadding {
    if (bbox) this._savedBBox = bbox as Rect;
    const width = this._savedBBox ? this._savedBBox.getWidth() : 0;
    const height = this._savedBBox ? this._savedBBox.getHeight() : 0;
    const centerX = 0.01 * width * this.$shp.centerX;
    const centerY = 0.01 * height * this.$shp.centerY;
    const reach = 2 * this.$shp.strength;
    return [
      reach * (centerX + 1),
      reach * (centerY + 1),
      reach * (width - centerX + 1),
      reach * (height - centerY + 1),
    ];
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GGLZoomBlurEffect", "name", this.getNodeName()) as string;
  }
}

GLZoomBlurEffect.prototype._savedBBox = null;

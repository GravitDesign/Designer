// Old: chunk.vendor.js module 1016 (GGLSwirlEffect).
//
// The swirl radius is relative to the element's bounding box, which
// getEffectPadding keeps in `swirlBBox` when it is given one; the shader
// reads it from there.
import { Locale } from "../../../core/locale/locale.ts";
import type { Rect } from "../../../math/rect.ts";
import { registerNodeClass } from "../../../scene/node.ts";
import type { EffectPadding } from "../../effect.ts";
import type { SwirlParameters } from "../shaders/gl-swirl-shader.ts";
import { WebGLEffect, type ParameterRange } from "../webgl-effect.ts";

const GeometryProperties = {
  shp: {
    centerX: 50,
    centerY: 50,
    radius: 50,
    angle: 0.5,
  },
  sh: "GGLSwirlShader",
};

export class GLSwirlEffect extends WebGLEffect {
  static {
    registerNodeClass(this, "GGLSwirlEffect", "GGLSwirlEffect");
  }

  static override GeometryProperties: Record<string, unknown> = GeometryProperties;

  static RANGES: Record<string, ParameterRange> = {
    centerX: [0, 100],
    centerY: [0, 100],
    radius: [0, 100],
    angle: [-Math.PI, Math.PI],
  };

  declare $shp: SwirlParameters;
  declare swirlBBox: Rect | undefined;

  constructor() {
    super();
    this._setDefaultProperties(GeometryProperties);
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GGLSwirlEffect", "name", this.getNodeName()) as string;
  }

  /** How far the swirl circle reaches past the box on each axis. */
  override getEffectPadding(bbox?: unknown): EffectPadding {
    if (bbox) this.swirlBBox = bbox as Rect;
    const width = this.swirlBBox ? this.swirlBBox.getWidth() : 0;
    const height = this.swirlBBox ? this.swirlBBox.getHeight() : 0;
    const radius = 0.005 * this.$shp.radius * Math.max(width, height);
    const centerX = width * (0.01 * this.$shp.centerX);
    const centerY = height * (0.01 * this.$shp.centerY);
    const horizontal = Math.max(
      centerX - radius < 0 ? radius - centerX : 0,
      centerX + radius - width > 0 ? centerX + radius - width : 0,
    );
    const vertical = Math.max(
      centerY - radius < 0 ? radius - centerY : 0,
      centerY + radius - height > 0 ? centerY + radius - height : 0,
    );
    return [horizontal, vertical, horizontal, vertical];
  }

  /** Returns four sides although the base returns one number, as the old code did. */
  override getAbsoluteEffectPadding(): number {
    const width = this.swirlBBox ? this.swirlBBox.getWidth() : 0;
    const height = this.swirlBBox ? this.swirlBBox.getHeight() : 0;
    const radius = 0.005 * this.$shp.radius * Math.max(width, height);
    const padding = Math.abs(Math.sin(this.$shp.angle / 2)) * radius;
    return [padding, padding, padding, padding] as unknown as number;
  }
}

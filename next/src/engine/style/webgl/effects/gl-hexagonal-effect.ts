// Old: chunk.vendor.js module 1007 (GGLHexagonalEffect).
//
// Pixelates into hexagons (glfx.js).
import { Locale } from "../../../core/locale/locale.ts";
import { registerNodeClass } from "../../../scene/node.ts";
import type { EffectPadding } from "../../effect.ts";
import type { HexagonalParameters } from "../shaders/gl-hexagonal-shader.ts";
import { WebGLEffect, type ParameterRange } from "../webgl-effect.ts";

const GeometryProperties = {
  shp: {
    centerX: 50,
    centerY: 50,
    scale: 1,
  },
  sh: "GGLHexagonalShader",
};

export class GLHexagonalEffect extends WebGLEffect {
  static {
    registerNodeClass(this, "GGLHexagonalEffect", "GGLHexagonalEffect");
  }

  static override GeometryProperties: Record<string, unknown> = GeometryProperties;

  static RANGES: Record<string, ParameterRange> = {
    centerX: [0, 100],
    centerY: [0, 100],
    scale: [0, 100],
  };

  declare $shp: HexagonalParameters;

  constructor() {
    super();
    this._setDefaultProperties(GeometryProperties);
  }

  override getNodeNameTranslated(): string {
    return Locale.getValue("GGLHexagonalEffect", "name", this.getNodeName()) as string;
  }

  override getEffectPadding(): EffectPadding {
    return 0;
  }

  override isAffectedByChildren(): boolean {
    return true;
  }
}

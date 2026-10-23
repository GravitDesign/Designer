// What the effect shaders use from the renderer that owns them (a WebGL
// effect or gradient): the Shader host plus the third texture the
// multi-pass shaders render into, and the swirl effect's bounding box.
import type { Rect } from "../../../math/rect.ts";
import type { GLTexture } from "../../../paint/webgl/gl-context.ts";
import type { ShaderHost } from "../../../paint/webgl/shader.ts";

export interface EffectShaderHost extends ShaderHost {
  extraTexture: GLTexture;
  /** Set by GGLSwirlEffect.getEffectPadding when it gets a bounding box. */
  swirlBBox?: Rect | null;
}

/** The sigma of a Gaussian that fades out at `radius` pixels (at 1/255). */
export function radiusToSigma(radius: number): number {
  return radius / (Math.sqrt(2 * Math.log(255)) - 1);
}

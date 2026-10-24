// Classes of later clusters that the paint code refers to. The old code
// required them directly; here the owning cluster registers them once at
// load time:
//
//   engine-style (texture-pattern.ts):
//     registerTexturePattern(TexturePattern);
//   engine-effects-webgl (gl-blur-effect.ts):
//     registerGLBlurEffect(GLBlurEffect);
//
// Until then, PaintCanvas.createPatternPaint rejects texture patterns with
// the old "Unknown pattern." error, and the WebGL bug probe in
// WebGLRenderer.drawShader cannot run (it is only reached by effects that
// set _isAffectedByGLBug).
import type { Rect } from "../math/rect.ts";
import type { Transform } from "../math/transform.ts";
import type { PaintCanvas } from "./paint-canvas.ts";

/** What createPatternPaint needs from GTexturePattern (chunk.vendor.js module 139). */
export interface TexturePatternLike {
  getTransform(): Transform | null | undefined;
  getTexture(canvas: PaintCanvas, rect?: Rect | null): unknown;
  getRepeatMode(): string;
}

export type TexturePatternClass = abstract new (...args: never[]) => TexturePatternLike;

/** What the WebGL bug probe needs from GGLBlurEffect (chunk.vendor.js module 282). */
export interface GLBlurEffectLike {
  prepareShader(): boolean;
  shaderInstance: unknown;
}

export type GLBlurEffectClass = new () => GLBlurEffectLike;

let texturePatternClass: TexturePatternClass | null = null;
let glBlurEffectClass: GLBlurEffectClass | null = null;

export function registerTexturePattern(cls: TexturePatternClass): void {
  texturePatternClass = cls;
}

export function getTexturePatternClass(): TexturePatternClass | null {
  return texturePatternClass;
}

export function registerGLBlurEffect(cls: GLBlurEffectClass): void {
  glBlurEffectClass = cls;
}

export function getGLBlurEffectClass(): GLBlurEffectClass {
  if (!glBlurEffectClass) {
    throw new Error(
      "GGLBlurEffect is not registered (engine-effects-webgl calls registerGLBlurEffect)",
    );
  }
  return glBlurEffectClass;
}

/** GTexturePattern.RepeatMode; createTexture defaults to Both. */
export const TextureRepeatMode = {
  Both: "repeat",
  Horizontal: "repeat-x",
  Vertical: "repeat-y",
  None: "no-repeat",
} as const;

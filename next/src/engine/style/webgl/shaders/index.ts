// Old: designer.browser.dev.js module 817 (the webpack context of the
// shader modules).
//
// GWebGLEffect finds its shader by the name in its `sh` property:
// "GGLBlurShader" becomes the request "./glblurshader". The old context
// resolved that to a module; here it is an explicit table.
import { BlendShader } from "../../../paint/webgl/blend-shader.ts";
import { GLAngularGradientShader } from "./gl-angular-gradient-shader.ts";
import { GLBendBlurShader } from "./gl-bend-blur-shader.ts";
import { GLBendShader } from "./gl-bend-shader.ts";
import { GLBloomShader } from "./gl-bloom-shader.ts";
import { GLBlurShader } from "./gl-blur-shader.ts";
import { GLBrightnessContrastShader } from "./gl-brightness-contrast-shader.ts";
import { GLBulgePinchShader } from "./gl-bulge-pinch-shader.ts";
import { GLClipBlurShader } from "./gl-clip-blur-shader.ts";
import { GLColorAdjustShader } from "./gl-color-adjust-shader.ts";
import { GLColorHalftoneShader } from "./gl-color-halftone-shader.ts";
import { GLDenoiseShader } from "./gl-denoise-shader.ts";
import { GLDotScreenShader } from "./gl-dot-screen-shader.ts";
import { GLDrunkShader } from "./gl-drunk-shader.ts";
import { GLEdgeWorkShader } from "./gl-edge-work-shader.ts";
import { GLFisheyeShader } from "./gl-fisheye-shader.ts";
import { GLHexagonalShader } from "./gl-hexagonal-shader.ts";
import { GLHueSaturationShader } from "./gl-hue-saturation-shader.ts";
import { GLInkShader } from "./gl-ink-shader.ts";
import { GLInnerGlowShader } from "./gl-inner-glow-shader.ts";
import { GLLensBlurShader } from "./gl-lens-blur-shader.ts";
import { GLNoiseShader } from "./gl-noise-shader.ts";
import { GLOuterGlowShader } from "./gl-outer-glow-shader.ts";
import { GLRecolourShader } from "./gl-recolour-shader.ts";
import { GLSepiaShader } from "./gl-sepia-shader.ts";
import { GLSketchShader } from "./gl-sketch-shader.ts";
import { GLStrokeLayerShader } from "./gl-stroke-layer-shader.ts";
import { GLSwirlShader } from "./gl-swirl-shader.ts";
import { GLTiltShiftShader } from "./gl-tilt-shift-shader.ts";
import { GLToonShader } from "./gl-toon-shader.ts";
import { GLTrueBlurShader } from "./gl-true-blur-shader.ts";
import { GLUnsharpMaskShader } from "./gl-unsharp-mask-shader.ts";
import { GLVibranceShader } from "./gl-vibrance-shader.ts";
import { GLVignetteShader } from "./gl-vignette-shader.ts";
import { GLWarpShader } from "./gl-warp-shader.ts";
import { GLZoomBlurShader } from "./gl-zoom-blur-shader.ts";

/** Request ("./<name>", lower case, without the G) → shader class. */
const SHADERS: Record<string, unknown> = {
  "./glangulargradientshader": GLAngularGradientShader,
  "./glbendblurshader": GLBendBlurShader,
  "./glbendshader": GLBendShader,
  "./glblendshader": BlendShader,
  "./glbloomshader": GLBloomShader,
  "./glblurshader": GLBlurShader,
  "./glbrightnesscontrastshader": GLBrightnessContrastShader,
  "./glbulgepinchshader": GLBulgePinchShader,
  "./glclipblurshader": GLClipBlurShader,
  "./glcoloradjustshader": GLColorAdjustShader,
  "./glcolorhalftoneshader": GLColorHalftoneShader,
  "./gldenoiseshader": GLDenoiseShader,
  "./gldotscreenshader": GLDotScreenShader,
  "./gldrunkshader": GLDrunkShader,
  "./gledgeworkshader": GLEdgeWorkShader,
  "./glfisheyeshader": GLFisheyeShader,
  "./glhexagonalshader": GLHexagonalShader,
  "./glhuesaturationshader": GLHueSaturationShader,
  "./glinkshader": GLInkShader,
  "./glinnerglowshader": GLInnerGlowShader,
  "./gllensblurshader": GLLensBlurShader,
  "./glnoiseshader": GLNoiseShader,
  "./glouterglowshader": GLOuterGlowShader,
  "./glrecolourshader": GLRecolourShader,
  "./glsepiashader": GLSepiaShader,
  "./glsketchshader": GLSketchShader,
  "./glstrokelayershader": GLStrokeLayerShader,
  "./glswirlshader": GLSwirlShader,
  "./gltiltshiftshader": GLTiltShiftShader,
  "./gltoonshader": GLToonShader,
  "./gltrueblurshader": GLTrueBlurShader,
  "./glunsharpmaskshader": GLUnsharpMaskShader,
  "./glvibranceshader": GLVibranceShader,
  "./glvignetteshader": GLVignetteShader,
  "./glwarpshader": GLWarpShader,
  "./glzoomblurshader": GLZoomBlurShader,
};

/** The requests the old context answered (each name also with ".js"). */
export function shaderRequests(): string[] {
  return Object.keys(SHADERS).flatMap((request) => [request, request + ".js"]);
}

/**
 * The shader class for a request. An unknown request throws the error
 * webpack threw ("Cannot find module", code MODULE_NOT_FOUND).
 */
export function requireShader(request: string): unknown {
  const key = request.endsWith(".js") ? request.slice(0, -3) : request;
  if (!Object.hasOwn(SHADERS, key)) {
    const error = new Error("Cannot find module '" + request + "'") as Error & { code?: string };
    error.code = "MODULE_NOT_FOUND";
    throw error;
  }
  return SHADERS[key];
}

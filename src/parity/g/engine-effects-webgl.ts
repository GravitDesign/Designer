// Registers GGLBendBlurEffect's node name, which GCurvedShadowEffect looks up.
import "../../engine/style/webgl/effects/gl-bend-blur-effect.ts";
import { AngularGradient } from "../../engine/style/angular-gradient.ts";
import { NoisePattern } from "../../engine/style/noise-pattern.ts";
import { GLBendEffect } from "../../engine/style/webgl/effects/gl-bend-effect.ts";
import { GLBloomEffect } from "../../engine/style/webgl/effects/gl-bloom-effect.ts";
import { GLBlurEffect } from "../../engine/style/webgl/effects/gl-blur-effect.ts";
import { GLBrightnessContrastEffect } from "../../engine/style/webgl/effects/gl-brightness-contrast-effect.ts";
import { GLBulgePinchEffect } from "../../engine/style/webgl/effects/gl-bulge-pinch-effect.ts";
import { GLColorAdjustEffect } from "../../engine/style/webgl/effects/gl-color-adjust-effect.ts";
import { GLColorHalfToneEffect } from "../../engine/style/webgl/effects/gl-color-half-tone-effect.ts";
import { GLDenoiseEffect } from "../../engine/style/webgl/effects/gl-denoise-effect.ts";
import { GLDotScreenEffect } from "../../engine/style/webgl/effects/gl-dot-screen-effect.ts";
import { GLDrunkEffect } from "../../engine/style/webgl/effects/gl-drunk-effect.ts";
import { GLEdgeWorkEffect } from "../../engine/style/webgl/effects/gl-edge-work-effect.ts";
import { GLFisheyeEffect } from "../../engine/style/webgl/effects/gl-fisheye-effect.ts";
import { GLHexagonalEffect } from "../../engine/style/webgl/effects/gl-hexagonal-effect.ts";
import { GLHueSaturationEffect } from "../../engine/style/webgl/effects/gl-hue-saturation-effect.ts";
import { GLInkEffect } from "../../engine/style/webgl/effects/gl-ink-effect.ts";
import { GLInnerGlowEffect } from "../../engine/style/webgl/effects/gl-inner-glow-effect.ts";
import { GLLensBlurEffect } from "../../engine/style/webgl/effects/gl-lens-blur-effect.ts";
import { GLNoiseEffect } from "../../engine/style/webgl/effects/gl-noise-effect.ts";
import { GLOuterGlowEffect } from "../../engine/style/webgl/effects/gl-outer-glow-effect.ts";
import { GLRecolourEffect } from "../../engine/style/webgl/effects/gl-recolour-effect.ts";
import { GLSepiaEffect } from "../../engine/style/webgl/effects/gl-sepia-effect.ts";
import { GLSketchEffect } from "../../engine/style/webgl/effects/gl-sketch-effect.ts";
import { GLStrokeLayerEffect } from "../../engine/style/webgl/effects/gl-stroke-layer-effect.ts";
import { GLSwirlEffect } from "../../engine/style/webgl/effects/gl-swirl-effect.ts";
import { GLTiltShiftEffect } from "../../engine/style/webgl/effects/gl-tilt-shift-effect.ts";
import { GLToonEffect } from "../../engine/style/webgl/effects/gl-toon-effect.ts";
import { GLTrueBlurEffect } from "../../engine/style/webgl/effects/gl-true-blur-effect.ts";
import { GLUnsharpMaskEffect } from "../../engine/style/webgl/effects/gl-unsharp-mask-effect.ts";
import { GLVibranceEffect } from "../../engine/style/webgl/effects/gl-vibrance-effect.ts";
import { GLVignetteEffect } from "../../engine/style/webgl/effects/gl-vignette-effect.ts";
import { GLZoomBlurEffect } from "../../engine/style/webgl/effects/gl-zoom-blur-effect.ts";
import { WebGLEffect } from "../../engine/style/webgl/webgl-effect.ts";

// Only the names the old G barrel had (vendor module 1). GGLBendBlurEffect
// was not in it; GCurvedShadowEffect reaches it through its node name.
export const engineEffectsWebgl = {
  GAngularGradient: AngularGradient,
  GNoisePattern: NoisePattern,
  GWebGLEffect: WebGLEffect,
  GGLBendEffect: GLBendEffect,
  GGLBloomEffect: GLBloomEffect,
  GGLBlurEffect: GLBlurEffect,
  GGLBrightnessContrastEffect: GLBrightnessContrastEffect,
  GGLBulgePinchEffect: GLBulgePinchEffect,
  GGLColorAdjustEffect: GLColorAdjustEffect,
  GGLColorHalfToneEffect: GLColorHalfToneEffect,
  GGLDenoiseEffect: GLDenoiseEffect,
  GGLDotScreenEffect: GLDotScreenEffect,
  GGLDrunkEffect: GLDrunkEffect,
  GGLEdgeWorkEffect: GLEdgeWorkEffect,
  GGLFisheyeEffect: GLFisheyeEffect,
  GGLHexagonalEffect: GLHexagonalEffect,
  GGLHueSaturationEffect: GLHueSaturationEffect,
  GGLInkEffect: GLInkEffect,
  GGLInnerGlowEffect: GLInnerGlowEffect,
  GGLLensBlurEffect: GLLensBlurEffect,
  GGLNoiseEffect: GLNoiseEffect,
  GGLOuterGlowEffect: GLOuterGlowEffect,
  GGLRecolourEffect: GLRecolourEffect,
  GGLSepiaEffect: GLSepiaEffect,
  GGLSketchEffect: GLSketchEffect,
  GGLStrokeLayerEffect: GLStrokeLayerEffect,
  GGLSwirlEffect: GLSwirlEffect,
  GGLTiltShiftEffect: GLTiltShiftEffect,
  GGLToonEffect: GLToonEffect,
  GGLTrueBlurEffect: GLTrueBlurEffect,
  GGLUnsharpMaskEffect: GLUnsharpMaskEffect,
  GGLVibranceEffect: GLVibranceEffect,
  GGLVignetteEffect: GLVignetteEffect,
  GGLZoomBlurEffect: GLZoomBlurEffect,
};

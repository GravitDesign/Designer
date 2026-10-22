// Effect classes and non-default parameters shared by the styles and render
// scenarios.

/** Every effect class in the G namespace (GMultiEffect is abstract). */
export const EFFECTS = [
  "GBlurEffect",
  "GDropShadowEffect",
  "GInnerShadowEffect",
  "GOverlayEffect",
  "GMirrorEffect",
  "GColorGradingEffect",
  "GContactShadowEffect",
  "GCurvedShadowEffect",
  "GLongShadowEffect",
  "GColorAdjustMultiEffect",
  "GAdjustMultiEffect",
  "GWebGLEffect",
  "GGLBlurEffect",
  "GGLColorAdjustEffect",
  "GGLNoiseEffect",
  "GGLSepiaEffect",
  "GGLBrightnessContrastEffect",
  "GGLDotScreenEffect",
  "GGLHueSaturationEffect",
  "GGLZoomBlurEffect",
  "GGLBulgePinchEffect",
  "GGLEdgeWorkEffect",
  "GGLColorHalfToneEffect",
  "GGLHexagonalEffect",
  "GGLInnerGlowEffect",
  "GGLToonEffect",
  "GGLBloomEffect",
  "GGLTrueBlurEffect",
  "GGLDenoiseEffect",
  "GGLOuterGlowEffect",
  "GGLSwirlEffect",
  "GGLVignetteEffect",
  "GGLStrokeLayerEffect",
  "GGLInkEffect",
  "GGLUnsharpMaskEffect",
  "GGLVibranceEffect",
  "GGLSketchEffect",
  "GGLLensBlurEffect",
  "GGLTiltShiftEffect",
  "GGLRecolourEffect",
  "GGLBendEffect",
  "GGLDrunkEffect",
  "GGLFisheyeEffect",
];

/** Non-default parameters per effect class (GL effects keep them in `shp`). */
export const EFFECT_VALUES: Record<string, Record<string, unknown>> = {
  GBlurEffect: { r: 20, b: true },
  GDropShadowEffect: { r: 12, x: 6, y: -8, pat: "pattern:C#[255,0,0]", opc: 0.3 },
  GInnerShadowEffect: { r: 9, x: -3, y: 4, pat: "pattern:C#[0,0,255]", opc: 0.8 },
  GOverlayEffect: { pat: "pattern:C#[0,255,0]", opc: 0.5, alm: true },
  GMirrorEffect: { rfh: 0.6, pad: 10, opc: 0.2 },
  GColorGradingEffect: {
    cp: {
      json: {
        a: [
          [0, 0],
          [128, 200],
          [255, 255],
        ],
        r: null,
      },
    },
  },
  GContactShadowEffect: { r: 30, a: 20, o: 10, opc: 0.4 },
  GCurvedShadowEffect: { s: 2, b: 20, a: 90, l: 15, c: 0.4, opc: 0.5 },
  GLongShadowEffect: { l: 120, a: 0.5, opc: 0.6, den: 2, fdm: false },
  GColorAdjustMultiEffect: {
    "GGLBrightnessContrastEffect&shp": { json: { brightness: 0.2, contrast: -0.3 } },
    "GGLHueSaturationEffect&shp": { json: { hue: 0.5, saturation: 0.1 } },
  },
  GAdjustMultiEffect: {
    "GGLSepiaEffect&shp": { json: { amount: 0.9 } },
    "GGLBlurEffect&shp": { json: { radius: 12, clip: true } },
  },
  GGLBlurEffect: { shp: { json: { radius: 20, clip: true } } },
  GGLColorAdjustEffect: {
    shp: { json: { brightness: 0.1, contrast: 0.2, hue: 0.3, saturation: 0.4 } },
    comp: false,
  },
  GGLNoiseEffect: { shp: { json: { amount: 0.9 } } },
  GGLSepiaEffect: { shp: { json: { amount: 1 } } },
  GGLBrightnessContrastEffect: { shp: { json: { brightness: -0.5, contrast: 0.5 } } },
  GGLDotScreenEffect: { shp: { json: { centerX: 10, centerY: 90, angle: 1, size: 5 } } },
  GGLHueSaturationEffect: { shp: { json: { hue: -1, saturation: 1 } } },
  GGLZoomBlurEffect: { shp: { json: { centerX: 0, centerY: 100, strength: 0.5 } } },
  GGLBulgePinchEffect: { shp: { json: { centerX: 20, centerY: 30, radius: 80, strength: -1 } } },
  GGLEdgeWorkEffect: { shp: { json: { radius: 150 } } },
  GGLColorHalfToneEffect: { shp: { json: { centerX: 1, centerY: 2, angle: 0.5, size: 10 } } },
  GGLHexagonalEffect: { shp: { json: { centerX: 5, centerY: 6, scale: 40 } } },
  GGLInnerGlowEffect: {
    shp: {
      json: {
        radius: 25,
        intensity: 2,
        color: [1, 2, 3],
        opacity: { type: "opacity", value: 0.5 },
      },
    },
  },
  GGLToonEffect: { shp: { json: { threshold: 1.5, quantization: 3 } } },
  GGLBloomEffect: {
    shp: {
      json: {
        bloomIntensity: 2,
        baseIntensity: 0.5,
        bloomSaturation: 0,
        baseSaturation: 2,
        blurRadius: 30,
        bloomThreshold: 0.9,
      },
    },
  },
  GGLTrueBlurEffect: { shp: { json: { radius: 40 } } },
  GGLDenoiseEffect: { shp: { json: { exponent: 45 } } },
  GGLOuterGlowEffect: {
    shp: {
      json: {
        radius: 30,
        intensity: 0.5,
        color: [9, 8, 7],
        opacity: { type: "opacity", value: 0.3 },
      },
    },
  },
  GGLSwirlEffect: { shp: { json: { centerX: 10, centerY: 10, radius: 90, angle: -2 } } },
  GGLVignetteEffect: { shp: { json: { size: 0.8, amount: 0.1 } } },
  GGLStrokeLayerEffect: {
    shp: {
      json: {
        width: 40,
        softness: 0.1,
        shape: 1.5,
        color: [0, 0, 0],
        opacity: { type: "opacity", value: 0.7 },
        ellyptical: true,
        placement: { type: "dropdown", value: 2 },
      },
    },
  },
  GGLInkEffect: { shp: { json: { strength: 1 } } },
  GGLUnsharpMaskEffect: { shp: { json: { radius: 100, strength: 4 } } },
  GGLVibranceEffect: { shp: { json: { amount: -0.5 } } },
  GGLSketchEffect: { shp: { json: { strength: 1.8 } } },
  GGLLensBlurEffect: { shp: { json: { radius: 40, brightness: 0.5, angle: 2 } } },
  GGLTiltShiftEffect: {
    shp: {
      json: { startX: 0, startY: 10, endX: 100, endY: 90, blurRadius: 40, gradientRadius: 80 },
    },
  },
  GGLRecolourEffect: { shp: { json: { hue: 0.2, saturation: 0.6 } } },
  GGLBendEffect: { shp: { json: { strengthX: -1, strengthY: 1, radius: 90 } } },
  GGLDrunkEffect: { shp: { json: { strengthX: 0.1, strengthY: 0.9, radius: 20 } } },
  GGLFisheyeEffect: { shp: { json: { strength: -80 } } },
};

/** The inventory item of each effect class. */
export const EFFECT_ITEMS: Record<string, string> = Object.fromEntries(
  [
    ["GBlurEffect", 3],
    ["GDropShadowEffect", 4],
    ["GInnerShadowEffect", 5],
    ["GOverlayEffect", 6],
    ["GMirrorEffect", 7],
    ["GColorGradingEffect", 8],
    ["GContactShadowEffect", 9],
    ["GCurvedShadowEffect", 10],
    ["GLongShadowEffect", 11],
    ["GColorAdjustMultiEffect", 13],
    ["GAdjustMultiEffect", 14],
    ["GWebGLEffect", 15],
    ...EFFECTS.filter((c) => c.startsWith("GGL"))
      .slice(0, 28)
      .map((c, i) => [c, 16 + i] as const),
    ["GGLBendEffect", 45],
    ["GGLDrunkEffect", 46],
    ["GGLFisheyeEffect", 47],
  ].map(([c, n]) => [c as string, `ENG-EFFECT-${String(n).padStart(3, "0")}`]),
);

import { describe, expect, it } from "vitest";
import { Node } from "../../../scene/node.ts";
import { GLLensBlurEffect } from "./gl-lens-blur-effect.ts";
import { GLNoiseEffect } from "./gl-noise-effect.ts";
import { GLRecolourEffect } from "./gl-recolour-effect.ts";
import { GLSketchEffect } from "./gl-sketch-effect.ts";
import { GLTiltShiftEffect } from "./gl-tilt-shift-effect.ts";

// The simple effects of this batch: node name, defaults and padding.
describe("GLLensBlurEffect and the other parameter-only GL effects", () => {
  it("pads the lens blur by its radius", () => {
    const effect = new GLLensBlurEffect();
    expect(Node.getName(effect)).toBe("GGLLensBlurEffect");
    expect(effect.$shp).toEqual({ radius: 10, brightness: 0, angle: 0 });
    expect(effect.getEffectPadding()).toBe(10);
    effect.setProperty("shp", { radius: 40, brightness: 0.5, angle: 2 });
    expect(effect.getEffectPadding()).toBe(40);
  });

  it("pads the tilt shift by its blur radius", () => {
    const effect = new GLTiltShiftEffect();
    expect(Node.getName(effect)).toBe("GGLTiltShiftEffect");
    expect(effect.$sh).toBe("GGLTiltShiftShader");
    expect(effect.getEffectPadding()).toBe(10);
    effect.setProperty("shp", { ...effect.$shp, blurRadius: 40, gradientRadius: 80 });
    expect(effect.getEffectPadding()).toBe(40);
  });

  it("keeps the defaults of noise, recolour and sketch", () => {
    const noise = new GLNoiseEffect();
    const recolour = new GLRecolourEffect();
    const sketch = new GLSketchEffect();
    expect([noise, recolour, sketch].map((effect) => Node.getName(effect))).toEqual([
      "GGLNoiseEffect",
      "GGLRecolourEffect",
      "GGLSketchEffect",
    ]);
    expect([noise.$shp, recolour.$shp, sketch.$shp]).toEqual([
      { amount: 0.5 },
      { hue: 1, saturation: 1 },
      { strength: 0.5 },
    ]);
    expect([noise.$sh, recolour.$sh, sketch.$sh]).toEqual([
      "GGLNoiseShader",
      "GGLRecolourShader",
      "GGLSketchShader",
    ]);
    expect([noise, recolour, sketch].map((effect) => effect.getEffectPadding())).toEqual([0, 0, 0]);
  });
});

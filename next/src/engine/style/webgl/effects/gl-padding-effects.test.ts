// Padding of the batch's distortion and filter effects, written from the
// old modules 1004, 1012, 1014, 1032-1034, 731, 1005 and 1006.
import { describe, expect, it } from "vitest";
import { Rect } from "../../../math/rect.ts";
import { Node } from "../../../scene/node.ts";
import { GLBendEffect } from "./gl-bend-effect.ts";
import { GLBloomEffect } from "./gl-bloom-effect.ts";
import { GLBulgePinchEffect } from "./gl-bulge-pinch-effect.ts";
import { GLColorHalfToneEffect } from "./gl-color-half-tone-effect.ts";
import { GLDenoiseEffect } from "./gl-denoise-effect.ts";
import { GLDotScreenEffect } from "./gl-dot-screen-effect.ts";
import { GLDrunkEffect } from "./gl-drunk-effect.ts";
import { GLEdgeWorkEffect } from "./gl-edge-work-effect.ts";
import { GLFisheyeEffect } from "./gl-fisheye-effect.ts";

describe("batch A effects", () => {
  it("register the old node names and shader names", () => {
    const names = [
      [new GLBendEffect(), "GGLBendEffect", "GGLBendShader"],
      [new GLBloomEffect(), "GGLBloomEffect", "GGLBloomShader"],
      [new GLBulgePinchEffect(), "GGLBulgePinchEffect", "GGLBulgePinchShader"],
      [new GLColorHalfToneEffect(), "GGLColorHalfToneEffect", "GGLColorHalfToneShader"],
      [new GLDenoiseEffect(), "GGLDenoiseEffect", "GGLDenoiseShader"],
      [new GLDotScreenEffect(), "GGLDotScreenEffect", "GGLDotScreenShader"],
      [new GLDrunkEffect(), "GGLDrunkEffect", "GGLDrunkShader"],
      [new GLEdgeWorkEffect(), "GGLEdgeWorkEffect", "GGLEdgeWorkShader"],
      [new GLFisheyeEffect(), "GGLFisheyeEffect", "GGLFishEyeShader"],
    ] as const;
    for (const [effect, node, shader] of names) {
      expect(Node.getName(effect)).toBe(node);
      expect(effect.$sh).toBe(shader);
      // Every shader name resolves in the shader table.
      expect(typeof effect.getShaderClass()).toBe("function");
    }
  });

  it("pad the bend towards its direction", () => {
    const bend = new GLBendEffect();
    const sx = 50 * Math.sin((0.5 * Math.PI) / 2);
    expect(bend.getEffectPadding()).toEqual([sx, 0, 0, 0]);
    expect(bend.getAbsoluteEffectPadding()).toEqual([sx, 0, sx, 0]);
    bend.setProperty("shp", { strengthX: -1, strengthY: 1, radius: 90 });
    expect(bend.getEffectPadding()).toEqual([0, 90, 90, 0]);
    expect(bend.getAbsoluteEffectPadding()).toEqual([90, 90, 90, 90]);
    expect(bend.isAffectedByChildren()).toBe(true);
  });

  it("pad a bulge from the radius, or from the saved box", () => {
    const bulge = new GLBulgePinchEffect();
    expect(bulge.getEffectPadding()).toEqual([56.25, 56.25, 56.25, 56.25]);
    expect(bulge.getAbsoluteEffectPadding()).toEqual([56.25, 56.25, 56.25, 56.25]);
    bulge.setProperty("shp", { centerX: 20, centerY: 30, radius: 80, strength: -1 });
    // A pinch pads nothing on its own, its absolute padding is 3 r * 0.75.
    expect(bulge.getEffectPadding()).toEqual([0, 0, 0, 0]);
    expect(bulge.getAbsoluteEffectPadding()).toEqual([180, 180, 180, 180]);
    // With a box: 100 x 60 box, radius 80 % of 100, strength -1.
    expect(bulge.getEffectPadding(new Rect(0, 0, 100, 60))).toEqual([0, 0, 0, 0]);
    expect(bulge.getAbsoluteEffectPadding()).toEqual([30, 30, 30, 30]);
    bulge.setProperty("shp", { centerX: 20, centerY: 30, radius: 80, strength: 0.5 });
    // The box is kept: 80 * 0.375.
    expect(bulge.getEffectPadding()).toEqual([30, 30, 30, 30]);
    bulge.setProperty("shp", { centerX: 20, centerY: 30, radius: 20, strength: 0.4 });
    expect(bulge.getEffectPadding()).toEqual(Array(4).fill(20 * (0.75 * 0.4)));
    expect(bulge.getAbsoluteEffectPadding()).toEqual(Array(4).fill(20 * (0.75 * 0.4)));
    // A pinch under the cap counts half.
    bulge.setProperty("shp", { centerX: 20, centerY: 30, radius: 20, strength: -0.4 });
    expect(bulge.getAbsoluteEffectPadding()).toEqual(
      Array(4).fill(Math.abs(20 * (0.75 * -0.4 * 0.5))),
    );
  });

  it("pad bloom by its blur, drunk and fisheye only absolutely", () => {
    const bloom = new GLBloomEffect();
    expect(bloom.getEffectPadding()).toBe(4);
    const drunk = new GLDrunkEffect();
    drunk.setProperty("shp", { strengthX: 0.1, strengthY: -0.9, radius: 20 });
    expect(drunk.getEffectPadding()).toBe(0);
    expect(drunk.getAbsoluteEffectPadding()).toEqual([2, 18, 2, 18]);
    const fisheye = new GLFisheyeEffect();
    expect(fisheye.getEffectPadding()).toBe(100);
    expect(fisheye.getAbsoluteEffectPadding()).toBe(100);
    fisheye.setProperty("shp", { strength: -80 });
    expect(fisheye.getAbsoluteEffectPadding()).toBe(130);
    fisheye.setProperty("shp", { strength: -50 });
    expect(fisheye.getAbsoluteEffectPadding()).toBe(100);
  });

  it("mark which effects reach beyond their content", () => {
    expect(new GLDenoiseEffect().isAffectedByChildren()).toBe(true);
    expect(new GLDotScreenEffect().isAffectedByChildren()).toBe(true);
    expect(new GLEdgeWorkEffect().isAffectedByChildren()).toBe(true);
    expect(new GLDrunkEffect().isAffectedByChildren()).toBe(true);
    // Without an override: false for no padding, else the padding number itself.
    expect(new GLColorHalfToneEffect().isAffectedByChildren()).toBe(false);
    expect(new GLBloomEffect().isAffectedByChildren()).toBe(4);
  });

  it("save shp and sh before the base properties", () => {
    const blob = JSON.parse(Node.serialize(new GLDotScreenEffect()) as string);
    expect(Object.keys(blob).slice(1, 3)).toEqual(["shp", "sh"]);
    expect(blob.shp).toEqual({ centerX: 50, centerY: 50, angle: 0, size: 10 });
  });
});

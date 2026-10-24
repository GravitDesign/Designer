import { describe, expect, it } from "vitest";
import type { LocaleKey } from "../../../core/locale/locale-key.ts";
import { Node } from "../../../scene/node.ts";
import { GLStrokeLayerEffect } from "./gl-stroke-layer-effect.ts";

describe("GLStrokeLayerEffect", () => {
  it("keeps the old node name and defaults", () => {
    const effect = new GLStrokeLayerEffect();
    expect(Node.getName(effect)).toBe("GGLStrokeLayerEffect");
    expect(effect.$shp).toEqual({
      width: 5,
      softness: 0.5,
      shape: 0.7071,
      color: [255, 255, 255],
      opacity: { type: "opacity", value: 1 },
      ellyptical: false,
      placement: { type: "dropdown", value: 0 },
    });
    expect(effect.$sh).toBe("GGLStrokeLayerShader");
    const placements = GLStrokeLayerEffect.RANGES.placement as LocaleKey[];
    expect(placements.map((key) => key.getKey())).toEqual([
      "text.outside",
      "text.inside",
      "text.center",
    ]);
  });

  it("pads by placement: the width outside, one pixel inside, half the width centered", () => {
    const effect = new GLStrokeLayerEffect();
    const padding = (placement: number, width: number) => {
      effect.setProperty("shp", {
        ...effect.$shp,
        width,
        placement: { type: "dropdown", value: placement },
      });
      return effect.getEffectPadding();
    };
    expect(padding(0, 7)).toBe(8);
    expect(padding(1, 7)).toBe(1);
    expect(padding(2, 7)).toBe(5);
    expect(padding(2, 6)).toBe(4);
  });

  it("curves width and softness quadratically, and leaves other values", () => {
    const effect = new GLStrokeLayerEffect();
    expect(effect.propertyTransform("width", 50)).toBe(25);
    expect(effect.propertyInverseTransform("width", 25)).toBe(50);
    expect(effect.propertyTransform("softness", 0.505)).toBeCloseTo(
      Math.pow(0.5, 2) * 0.99 + 0.01,
      15,
    );
    expect(effect.propertyInverseTransform("softness", 0.2575)).toBeCloseTo(0.505, 12);
    expect(effect.propertyTransform("shape", 1.3)).toBe(1.3);
    expect(effect.propertyInverseTransform("shape", 1.3)).toBe(1.3);
  });
});

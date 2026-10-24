import { describe, expect, it } from "vitest";
import { Effect } from "../../effect.ts";
import { Node } from "../../../scene/node.ts";
import { GLInnerGlowEffect } from "./gl-inner-glow-effect.ts";

describe("GLInnerGlowEffect", () => {
  it("keeps the old node name, defaults, type and padding", () => {
    const effect = new GLInnerGlowEffect();
    expect(Node.getName(effect)).toBe("GGLInnerGlowEffect");
    expect(effect.$shp).toEqual({
      radius: 5,
      intensity: 1,
      color: [255, 255, 224],
      opacity: { type: "opacity", value: 1 },
    });
    expect(effect.$sh).toBe("GGLInnerGlowShader");
    expect(effect.getEffectType()).toBe(Effect.Type.Filter);
    expect(effect.getEffectPadding()).toBe(1);
  });

  it("curves the radius quadratically over 0-50", () => {
    const effect = new GLInnerGlowEffect();
    expect(effect.propertyTransform("radius", 25)).toBe(12.5);
    expect(effect.propertyInverseTransform("radius", 12.5)).toBe(25);
    expect(effect.propertyTransform("intensity", 1.5)).toBe(1.5);
  });
});

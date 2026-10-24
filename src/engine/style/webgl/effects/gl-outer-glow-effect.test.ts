import { describe, expect, it } from "vitest";
import { Effect } from "../../effect.ts";
import { Node } from "../../../scene/node.ts";
import { GLOuterGlowEffect } from "./gl-outer-glow-effect.ts";

describe("GLOuterGlowEffect", () => {
  it("is a post effect padded by its radius", () => {
    const effect = new GLOuterGlowEffect();
    expect(Node.getName(effect)).toBe("GGLOuterGlowEffect");
    expect(effect.$sh).toBe("GGLOuterGlowShader");
    expect(effect.getEffectType()).toBe(Effect.Type.PostEffect);
    expect(effect.getEffectPadding()).toBe(5);
    effect.setProperty("shp", { ...effect.$shp, radius: 30 });
    expect(effect.getEffectPadding()).toBe(30);
  });

  it("curves the radius quadratically over 0-50", () => {
    const effect = new GLOuterGlowEffect();
    // (10 / 50)^2 * 50, in floating point.
    expect(effect.propertyTransform("radius", 10)).toBe(2.0000000000000004);
    expect(effect.propertyInverseTransform("radius", 8)).toBe(20);
    expect(effect.propertyInverseTransform("color", 3)).toBe(3);
  });
});

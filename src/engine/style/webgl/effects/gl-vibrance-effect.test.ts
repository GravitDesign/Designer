import { describe, expect, it } from "vitest";
import { Node } from "../../../scene/node.ts";
import { GLVibranceShader } from "../shaders/gl-vibrance-shader.ts";
import { GLVibranceEffect } from "./gl-vibrance-effect.ts";

describe("GLVibranceEffect", () => {
  it("keeps the old node name, defaults, ranges and shader", () => {
    const effect = new GLVibranceEffect();
    expect(Node.getName(effect)).toBe("GGLVibranceEffect");
    expect(effect.$shp).toEqual({ amount: 0.5 });
    expect(effect.getShaderClass()).toBe(GLVibranceShader);
    expect(GLVibranceEffect.RANGES).toEqual({ amount: [-1, 1] });
  });

  it("pads and reaches beyond the content as the old effect did", () => {
    const effect = new GLVibranceEffect();
    expect(effect.getEffectPadding()).toBe(0);
    expect(effect.isAffectedByChildren()).toBe(false);
  });
});

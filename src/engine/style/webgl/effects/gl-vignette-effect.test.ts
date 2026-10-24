import { describe, expect, it } from "vitest";
import { Node } from "../../../scene/node.ts";
import { GLVignetteShader } from "../shaders/gl-vignette-shader.ts";
import { GLVignetteEffect } from "./gl-vignette-effect.ts";

describe("GLVignetteEffect", () => {
  it("keeps the old node name, defaults, ranges and shader", () => {
    const effect = new GLVignetteEffect();
    expect(Node.getName(effect)).toBe("GGLVignetteEffect");
    expect(effect.$shp).toEqual({ size: 0.2, amount: 0.5 });
    expect(effect.getShaderClass()).toBe(GLVignetteShader);
    expect(GLVignetteEffect.RANGES).toEqual({ size: [0, 1], amount: [0, 1] });
  });

  it("pads and reaches beyond the content as the old effect did", () => {
    const effect = new GLVignetteEffect();
    expect(effect.getEffectPadding()).toBe(0);
    expect(effect.isAffectedByChildren()).toBe(false);
  });
});

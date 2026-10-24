import { describe, expect, it } from "vitest";
import { Node } from "../../../scene/node.ts";
import { GLTrueBlurShader } from "../shaders/gl-true-blur-shader.ts";
import { GLTrueBlurEffect } from "./gl-true-blur-effect.ts";

describe("GLTrueBlurEffect", () => {
  it("keeps the old node name, defaults, ranges and shader", () => {
    const effect = new GLTrueBlurEffect();
    expect(Node.getName(effect)).toBe("GGLTrueBlurEffect");
    expect(effect.$shp).toEqual({ radius: 5 });
    expect(effect.getShaderClass()).toBe(GLTrueBlurShader);
    expect(GLTrueBlurEffect.RANGES).toEqual({ radius: [0, 50] });
  });

  it("pads and reaches beyond the content as the old effect did", () => {
    const effect = new GLTrueBlurEffect();
    expect(effect.getEffectPadding()).toBe(5);
    expect(effect.isAffectedByChildren()).toBe(5);
  });
});

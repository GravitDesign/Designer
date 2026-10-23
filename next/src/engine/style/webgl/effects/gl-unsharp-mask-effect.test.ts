import { describe, expect, it } from "vitest";
import { Node } from "../../../scene/node.ts";
import { GLUnsharpMaskShader } from "../shaders/gl-unsharp-mask-shader.ts";
import { GLUnsharpMaskEffect } from "./gl-unsharp-mask-effect.ts";

describe("GLUnsharpMaskEffect", () => {
  it("keeps the old node name, defaults, ranges and shader", () => {
    const effect = new GLUnsharpMaskEffect();
    expect(Node.getName(effect)).toBe("GGLUnsharpMaskEffect");
    expect(effect.$shp).toEqual({ radius: 0, strength: 0 });
    expect(effect.getShaderClass()).toBe(GLUnsharpMaskShader);
    expect(GLUnsharpMaskEffect.RANGES).toEqual({ radius: [0, 200], strength: [0, 5] });
  });

  it("pads and reaches beyond the content as the old effect did", () => {
    const effect = new GLUnsharpMaskEffect();
    expect(effect.getEffectPadding()).toBe(0);
    expect(effect.isAffectedByChildren()).toBe(false);
  });
});

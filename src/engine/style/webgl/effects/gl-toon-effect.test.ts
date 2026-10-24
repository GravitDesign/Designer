import { describe, expect, it } from "vitest";
import { Node } from "../../../scene/node.ts";
import { GLToonShader } from "../shaders/gl-toon-shader.ts";
import { GLToonEffect } from "./gl-toon-effect.ts";

describe("GLToonEffect", () => {
  it("keeps the old node name, defaults, ranges and shader", () => {
    const effect = new GLToonEffect();
    expect(Node.getName(effect)).toBe("GGLToonEffect");
    expect(effect.$shp).toEqual({ threshold: 0.2, quantization: 10 });
    expect(effect.getShaderClass()).toBe(GLToonShader);
    expect(GLToonEffect.RANGES).toEqual({ threshold: [0, 2], quantization: [0, 20] });
  });

  it("pads and reaches beyond the content as the old effect did", () => {
    const effect = new GLToonEffect();
    expect(effect.getEffectPadding()).toBe(0);
    expect(effect.isAffectedByChildren()).toBe(false);
  });
});

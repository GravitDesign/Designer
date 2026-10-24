import { describe, expect, it } from "vitest";
import { Node } from "../../../scene/node.ts";
import { GLInkShader } from "../shaders/gl-ink-shader.ts";
import { GLInkEffect } from "./gl-ink-effect.ts";

describe("GLInkEffect", () => {
  it("keeps the old node name, defaults, ranges and shader", () => {
    const effect = new GLInkEffect();
    expect(Node.getName(effect)).toBe("GGLInkEffect");
    expect(effect.$shp).toEqual({ strength: 0.5 });
    expect(effect.getShaderClass()).toBe(GLInkShader);
    expect(GLInkEffect.RANGES).toEqual({ strength: [0, 1] });
  });

  it("pads and reaches beyond the content as the old effect did", () => {
    const effect = new GLInkEffect();
    expect(effect.getEffectPadding()).toBe(0);
    expect(effect.isAffectedByChildren()).toBe(false);
  });
});

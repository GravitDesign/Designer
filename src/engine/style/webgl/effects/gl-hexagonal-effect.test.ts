import { describe, expect, it } from "vitest";
import { Node } from "../../../scene/node.ts";
import { GLHexagonalShader } from "../shaders/gl-hexagonal-shader.ts";
import { GLHexagonalEffect } from "./gl-hexagonal-effect.ts";

describe("GLHexagonalEffect", () => {
  it("keeps the old node name, defaults, ranges and shader", () => {
    const effect = new GLHexagonalEffect();
    expect(Node.getName(effect)).toBe("GGLHexagonalEffect");
    expect(effect.$shp).toEqual({ centerX: 50, centerY: 50, scale: 1 });
    expect(effect.getShaderClass()).toBe(GLHexagonalShader);
    expect(GLHexagonalEffect.RANGES).toEqual({
      centerX: [0, 100],
      centerY: [0, 100],
      scale: [0, 100],
    });
  });

  it("pads and reaches beyond the content as the old effect did", () => {
    const effect = new GLHexagonalEffect();
    expect(effect.getEffectPadding()).toBe(0);
    expect(effect.isAffectedByChildren()).toBe(true);
  });
});

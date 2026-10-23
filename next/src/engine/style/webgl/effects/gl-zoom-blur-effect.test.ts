import { describe, expect, it } from "vitest";
import { Rect } from "../../../math/rect.ts";
import { Node } from "../../../scene/node.ts";
import { GLZoomBlurShader } from "../shaders/gl-zoom-blur-shader.ts";
import { GLZoomBlurEffect } from "./gl-zoom-blur-effect.ts";

describe("GLZoomBlurEffect", () => {
  it("registers the old node name and finds its shader", () => {
    const effect = new GLZoomBlurEffect();
    expect(Node.getName(effect)).toBe("GGLZoomBlurEffect");
    expect(effect.getShaderClass()).toBe(GLZoomBlurShader);
    expect(effect.$shp).toEqual({ centerX: 50, centerY: 50, strength: 0.3 });
  });

  it("pads only by the strength until it has seen a bounding box", () => {
    const effect = new GLZoomBlurEffect();
    expect(effect.getEffectPadding()).toEqual([0.6, 0.6, 0.6, 0.6]);
  });

  it("pads by the distance from the center to each side of the saved box", () => {
    const effect = new GLZoomBlurEffect();
    effect.setProperty("shp", { centerX: 0, centerY: 100, strength: 0.5 });
    // 100 x 60 box, center at its bottom left.
    expect(effect.getEffectPadding(new Rect(10, 20, 100, 60))).toEqual([1, 61, 101, 1]);
    // The box stays for later calls without one.
    expect(effect.getEffectPadding()).toEqual([1, 61, 101, 1]);
  });

  it("takes a truthy scale for a box and then fails, as the old code did", () => {
    const effect = new GLZoomBlurEffect();
    expect(() => effect.getEffectPadding(2)).toThrow(TypeError);
  });
});

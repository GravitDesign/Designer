import { afterEach, describe, expect, it, vi } from "vitest";
import { Canvas2DPaintCanvas, type PaintCanvas } from "../../paint/paint-canvas.ts";
import { getGLBlurEffectClass } from "../../paint/late-bound.ts";
import { Node } from "../../scene/node.ts";
import { GLBendBlurEffect } from "./effects/gl-bend-blur-effect.ts";
import { GLBlurEffect } from "./effects/gl-blur-effect.ts";
import { GLBrightnessContrastEffect } from "./effects/gl-brightness-contrast-effect.ts";
import { GLBlurShader } from "./shaders/gl-blur-shader.ts";
import { GLClipBlurShader } from "./shaders/gl-clip-blur-shader.ts";
import { requireShader, shaderRequests } from "./shaders/index.ts";
import { WebGLEffect } from "./webgl-effect.ts";

afterEach(() => vi.restoreAllMocks());

function recordingCanvas() {
  const calls: unknown[][] = [];
  const canvas = {
    setFilter: (name: string, value: unknown) => calls.push(["setFilter", name, value]),
    drawCanvas: (...args: unknown[]) => calls.push(["drawCanvas", ...args.slice(1)]),
  };
  return { canvas: canvas as unknown as PaintCanvas, calls };
}

describe("WebGLEffect", () => {
  it("saves shp and sh before the effect base's vs and ly", () => {
    const effect = new GLBlurEffect();
    effect.setProperty("vs", false);
    const blob = JSON.parse(Node.serialize(effect) as string) as Record<string, unknown>;
    expect(Object.keys(blob).filter((key) => !key.startsWith("@"))).toEqual(["shp", "sh", "vs"]);
    expect(blob.shp).toEqual({ radius: 5, clip: false });
    expect(blob.sh).toBe("GGLBlurShader");
    const restored = Node.deserialize(JSON.stringify(blob)) as GLBlurEffect;
    expect(restored).toBeInstanceOf(GLBlurEffect);
    expect(restored.$vs).toBe(false);
  });

  it("resolves sh through the shader table and fails like the webpack context", () => {
    const effect = new GLBlurEffect();
    effect.setProperty("sh", "GGLBlurShader");
    expect(WebGLEffect.prototype.getShaderClass.call(effect)).toBe(GLBlurShader);
    effect.setProperty("sh", "GGLNopeShader");
    expect(() => WebGLEffect.prototype.getShaderClass.call(effect)).toThrow(
      "Cannot find module './glnopeshader'",
    );
    expect(requireShader("./glclipblurshader.js")).toBe(GLClipBlurShader);
    // The old context had 36 modules, each with and without ".js".
    expect(shaderRequests()).toHaveLength(72);
  });

  it("compares effects of one class by their GeometryProperties", () => {
    const a = new GLBlurEffect();
    const b = new GLBlurEffect();
    expect(WebGLEffect.equals(a, b)).toBe(true);
    b.setProperty("shp", { radius: 6, clip: false });
    expect(WebGLEffect.equals(a, b)).toBe(false);
    expect(WebGLEffect.equals(a, new GLBrightnessContrastEffect())).toBe(false);
    expect(WebGLEffect.equals(a, {})).toBe(false);
  });

  it("maps slider positions with a power curve and back", () => {
    expect(WebGLEffect.polynomialTransform(25, 2, [0, 50])).toBe(12.5);
    expect(WebGLEffect.polynomialTransform(0.5, 2, [-1, 1])).toBe(0.125);
    expect(WebGLEffect.polynomialInverseTransform(12.5, 2, [0, 50])).toBe(25);
  });

  it("counts any padding as affected by the GL bug", () => {
    const blur = new GLBlurEffect();
    expect(blur.isAffectedByGLBug()).toBe(true);
    blur.setProperty("shp", { radius: 5, clip: true });
    expect(blur.isAffectedByGLBug()).toBe(false);
    blur.setAffectedByGLBug(true);
    expect(blur.isAffectedByGLBug()).toBe(true);
    const bend = new GLBendBlurEffect();
    expect(bend.isAffectedByGLBug()).toBe(true);
    expect(() => new WebGLEffect().isAffectedByGLBug()).toThrow("Not implemented");
  });

  it("renders through the CSS filter and copies the canvas onto itself when it can", () => {
    vi.spyOn(Canvas2DPaintCanvas, "hasFilters").mockReturnValue(true);
    const { canvas, calls } = recordingCanvas();
    const blur = new GLBlurEffect();
    expect(blur.render(canvas, null, null, 2)).toBe(canvas);
    expect(calls).toEqual([
      ["setFilter", "blur", 10],
      ["drawCanvas", 0, 0, 1, "copy"],
      ["setFilter", "blur", null],
    ]);
  });

  it("returns false without WebGL", () => {
    vi.spyOn(Canvas2DPaintCanvas, "hasFilters").mockReturnValue(false);
    const { canvas, calls } = recordingCanvas();
    expect(new GLBlurEffect().render(canvas, null, null, 1)).toBe(false);
    expect(calls).toEqual([]);
  });
});

describe("GLBlurEffect", () => {
  it("is the blur the paint code probes the WebGL bug with", () => {
    expect(getGLBlurEffectClass()).toBe(GLBlurEffect);
    expect(Node.getName(new GLBlurEffect())).toBe("GGLBlurEffect");
  });

  it("pads by the radius unless it clips, but always tiles with the radius", () => {
    const blur = new GLBlurEffect();
    blur.setProperty("shp", { radius: 12, clip: false });
    expect(blur.getEffectPadding()).toBe(12);
    blur.setProperty("shp", { radius: 12, clip: true });
    expect(blur.getEffectPadding()).toBe(0);
    expect(blur.getAbsoluteEffectPadding()).toBe(12);
  });

  it("takes the CSS filter only for an unclipped blur with a radius", () => {
    vi.spyOn(Canvas2DPaintCanvas, "hasFilters").mockReturnValue(true);
    const blur = new GLBlurEffect();
    expect(blur.canApplyNativeEffect()).toBe(true);
    blur.setProperty("shp", { radius: 0, clip: false });
    expect(blur.canApplyNativeEffect()).toBe(0);
    blur.setProperty("shp", { radius: 3, clip: true });
    expect(blur.canApplyNativeEffect()).toBe(false);
  });

  it("picks the clipping shader class with clip", () => {
    const blur = new GLBlurEffect();
    expect(blur.getShaderClass()).toBe(GLBlurShader);
    blur.setProperty("shp", { radius: 3, clip: true });
    expect(blur.getShaderClass()).toBe(GLClipBlurShader);
    expect(blur.prepareShader()).toBe(false);
  });
});

describe("GLBendBlurEffect", () => {
  it("pads the side the bend goes to", () => {
    const effect = new GLBendBlurEffect();
    expect(Node.getName(effect)).toBe("GGLBendBlurEffect");
    // radius 50, softness 1, bend 50: blur = 1 * (40 + 50) = 90.
    expect(effect.getEffectPadding()).toEqual([190, 240, 190, 290]);
    expect(effect.getAbsoluteEffectPadding()).toEqual([190, 240, 190, 240]);
    effect.setProperty("shp", { radius: 10, softness: 0, bend: -20, cov: 0.8 });
    const blur = 0.001 * (40 + 10);
    expect(effect.getEffectPadding()).toEqual([
      blur + 20,
      10 + 20 + blur + 20,
      blur + 20,
      10 + blur + 20,
    ]);
    expect(effect.isAffectedByChildren()).toBe(true);
  });
});

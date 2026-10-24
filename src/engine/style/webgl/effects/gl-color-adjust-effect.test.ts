import { afterEach, describe, expect, it, vi } from "vitest";
import { Canvas2DPaintCanvas, type PaintCanvas } from "../../../paint/paint-canvas.ts";
import { Node } from "../../../scene/node.ts";
import { GLColorAdjustEffect } from "./gl-color-adjust-effect.ts";

function recordingCanvas(scale = 1) {
  const filters: unknown[][] = [];
  const canvas = {
    setFilter: (name: string, value: unknown) => filters.push([name, value]),
    getScale: () => scale,
  };
  return { canvas: canvas as unknown as PaintCanvas, filters };
}

afterEach(() => vi.restoreAllMocks());

describe("GLColorAdjustEffect", () => {
  it("has the old defaults and node name", () => {
    const effect = new GLColorAdjustEffect();
    expect(Node.getName(effect)).toBe("GGLColorAdjustEffect");
    expect(effect.$shp).toEqual({ brightness: 0, contrast: 0, hue: 0, saturation: 0 });
    expect(effect.$sh).toBe("GGLColorAdjustShader");
    expect(effect.$comp).toBe(true);
    expect(effect.getEffectPadding()).toBe(0);
  });

  it("saves comp only when it is off and reads it back", () => {
    const effect = new GLColorAdjustEffect();
    expect(JSON.parse(Node.serialize(effect) as string)).not.toHaveProperty("comp");
    effect.setProperty("comp", false);
    const json = Node.serialize(effect) as string;
    expect(JSON.parse(json).comp).toBe(false);
    const restored = Node.deserialize(json) as GLColorAdjustEffect;
    expect(restored.$comp).toBe(false);
  });

  it("uses CSS filters only where they match the shader", () => {
    vi.spyOn(Canvas2DPaintCanvas, "hasFilters").mockReturnValue(true);
    const effect = new GLColorAdjustEffect();
    const set = (values: Record<string, number>) =>
      effect.setProperty("shp", { brightness: 0, contrast: 0, hue: 0, saturation: 0, ...values });
    set({ contrast: 0.5, saturation: 0.5 });
    expect(effect.canApplyNativeEffect()).toBe(true);
    set({ brightness: 0.1 });
    expect(effect.canApplyNativeEffect()).toBe(false);
    set({ brightness: -0.1 });
    expect(effect.canApplyNativeEffect()).toBe(false);
    set({ saturation: -0.1 });
    expect(effect.canApplyNativeEffect()).toBe(false);
    set({ hue: 0.2 });
    expect(effect.canApplyNativeEffect()).toBe(false);
    effect.setProperty("comp", false);
    expect(effect.canApplyNativeEffect()).toBe(true);
    set({ brightness: -0.1, saturation: -0.5 });
    expect(effect.canApplyNativeEffect()).toBe(true);
  });

  it("maps the parameters to CSS filter values", () => {
    const effect = new GLColorAdjustEffect();
    effect.setProperty("shp", { brightness: -0.5, contrast: 0.5, hue: 0.25, saturation: 2 });
    const { canvas, filters } = recordingCanvas();
    effect.applyNativeEffect(canvas);
    expect(filters).toEqual([
      ["brightness", 0.25],
      ["contrast", 1 + 0.5 / (1.001 - 0.5)],
      ["hue-rotate", Math.PI * 0.25],
      ["saturate", 1 + 1 / (1.001 - 1)],
    ]);
    filters.length = 0;
    effect.setProperty("shp", { brightness: 3, contrast: -0.3, hue: -4, saturation: -2 });
    effect.applyNativeEffect(canvas);
    expect(filters).toEqual([
      ["brightness", 4],
      ["contrast", 1 - 0.3],
      ["hue-rotate", -Math.PI],
      ["saturate", 0],
    ]);
    filters.length = 0;
    effect.removeNativeEffect(canvas);
    expect(filters).toEqual([
      ["brightness", null],
      ["contrast", null],
      ["hue-rotate", null],
      ["saturate", null],
    ]);
  });

  it("is cacheable only at the canvas scale of the previous call", () => {
    const effect = new GLColorAdjustEffect();
    expect(effect.isCacheable(recordingCanvas(2).canvas)).toBe(false);
    expect(effect.isCacheable(recordingCanvas(2).canvas)).toBe(true);
    expect(effect.isCacheable(recordingCanvas(1).canvas)).toBe(false);
    expect(effect.isCacheable(recordingCanvas(1).canvas)).toBe(true);
    // A zero scale never counts as recorded.
    expect(effect.isCacheable(recordingCanvas(0).canvas)).toBe(false);
    expect(effect.isCacheable(recordingCanvas(0).canvas)).toBe(false);
  });
});

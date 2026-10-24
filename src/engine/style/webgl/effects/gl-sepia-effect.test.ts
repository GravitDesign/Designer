import { afterEach, describe, expect, it, vi } from "vitest";
import { Canvas2DPaintCanvas, type PaintCanvas } from "../../../paint/paint-canvas.ts";
import { Node } from "../../../scene/node.ts";
import { GLSepiaEffect } from "./gl-sepia-effect.ts";

afterEach(() => vi.restoreAllMocks());

describe("GLSepiaEffect", () => {
  it("keeps the old node name and defaults", () => {
    const effect = new GLSepiaEffect();
    expect(Node.getName(effect)).toBe("GGLSepiaEffect");
    expect(effect.$shp).toEqual({ amount: 0.5 });
    expect(effect.$sh).toBe("GGLSepiaShader");
    expect(effect.getEffectPadding()).toBe(0);
  });

  it("uses the CSS sepia filter whenever the browser has filters", () => {
    const effect = new GLSepiaEffect();
    vi.spyOn(Canvas2DPaintCanvas, "hasFilters").mockReturnValue(true);
    expect(effect.canApplyNativeEffect()).toBe(true);
    vi.spyOn(Canvas2DPaintCanvas, "hasFilters").mockReturnValue(false);
    expect(effect.canApplyNativeEffect()).toBe(false);
  });

  it("passes the amount clamped to 0-1", () => {
    const calls: [string, unknown][] = [];
    const canvas = {
      setFilter: (filter: string, value: unknown) => calls.push([filter, value]),
    } as unknown as PaintCanvas;
    const effect = new GLSepiaEffect();
    for (const amount of [0.3, 4, -1]) {
      effect.setProperty("shp", { amount });
      effect.applyNativeEffect(canvas);
    }
    effect.removeNativeEffect(canvas);
    expect(calls).toEqual([
      ["sepia", 0.3],
      ["sepia", 1],
      ["sepia", 0],
      ["sepia", null],
    ]);
  });
});

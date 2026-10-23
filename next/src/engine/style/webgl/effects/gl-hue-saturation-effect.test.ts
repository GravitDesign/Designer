import { afterEach, describe, expect, it, vi } from "vitest";
import { Canvas2DPaintCanvas, type PaintCanvas } from "../../../paint/paint-canvas.ts";
import { Node } from "../../../scene/node.ts";
import { GLHueSaturationEffect } from "./gl-hue-saturation-effect.ts";

function recordingCanvas() {
  const calls: [string, unknown][] = [];
  const canvas = {
    setFilter: (filter: string, value: unknown) => calls.push([filter, value]),
  } as unknown as PaintCanvas;
  return { canvas, calls };
}

afterEach(() => vi.restoreAllMocks());

describe("GLHueSaturationEffect", () => {
  it("keeps the old node name and defaults", () => {
    const effect = new GLHueSaturationEffect();
    expect(Node.getName(effect)).toBe("GGLHueSaturationEffect");
    expect(effect.$shp).toEqual({ hue: 0, saturation: 0 });
    expect(effect.$sh).toBe("GGLHueSaturationShader");
    expect(effect.getEffectPadding()).toBe(0);
  });

  it("uses the CSS filter only without a hue change and without desaturation", () => {
    vi.spyOn(Canvas2DPaintCanvas, "hasFilters").mockReturnValue(true);
    const effect = new GLHueSaturationEffect();
    expect(effect.canApplyNativeEffect()).toBe(true);
    effect.setProperty("shp", { hue: 0, saturation: -0.5 });
    expect(effect.canApplyNativeEffect()).toBe(false);
    effect.setProperty("shp", { hue: 0.1, saturation: 0.5 });
    expect(effect.canApplyNativeEffect()).toBe(false);
    vi.spyOn(Canvas2DPaintCanvas, "hasFilters").mockReturnValue(false);
    effect.setProperty("shp", { hue: 0, saturation: 0 });
    expect(effect.canApplyNativeEffect()).toBe(false);
  });

  it("maps the saturation to the saturate filter like the old code", () => {
    const effect = new GLHueSaturationEffect();
    const { canvas, calls } = recordingCanvas();
    for (const saturation of [0.5, 2, 0, -0.25, -3]) {
      effect.setProperty("shp", { hue: 0, saturation });
      effect.applyNativeEffect(canvas);
    }
    effect.removeNativeEffect(canvas);
    expect(calls).toEqual([
      ["saturate", 1 + 0.5 / (1.001 - 0.5)],
      ["saturate", 1 + 1 / (1.001 - 1)],
      ["saturate", 1],
      ["saturate", 0.75],
      ["saturate", 0],
      ["saturate", null],
    ]);
  });
});

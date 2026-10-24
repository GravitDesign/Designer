// The multi effect class tables must exist when the modules load, before
// any instance is made (old modules 1026 and 1027 called register at load).
// Nothing in this file constructs either effect. The expected tables are
// what the old modules hold after loading them in Node.
import { describe, expect, it } from "vitest";
import { getTypeId } from "../../core/object.ts";
import { Node } from "../../scene/node.ts";
import "../stylable.ts";
import { AdjustMultiEffect } from "./adjust-multi-effect.ts";
import { ColorAdjustMultiEffect } from "./color-adjust-multi-effect.ts";

interface Tables {
  GeometryProperties: Record<string, unknown>;
  VisualProperties: Record<string, unknown> | undefined;
  __FX: unknown[] | null;
}

function tables(cls: unknown): Tables {
  return Node.getClassFromId(getTypeId(cls) as number) as unknown as Tables;
}

describe("multi effect class tables before the first instance", () => {
  it("AdjustMultiEffect has the prefixed dot screen, sepia and blur properties", () => {
    const cls = tables(AdjustMultiEffect);
    expect(cls.GeometryProperties).toEqual({
      fxP: {},
      fxN: {},
      "GGLDotScreenEffect&shp": { centerX: 50, centerY: 50, angle: 0, size: 10 },
      "GGLDotScreenEffect&sh": "GGLDotScreenShader",
      "GGLSepiaEffect&shp": { amount: 0.5 },
      "GGLSepiaEffect&sh": "GGLSepiaShader",
      "GGLBlurEffect&shp": { radius: 5, clip: false },
      "GGLBlurEffect&sh": "GGLBlurShader",
    });
    // None of the three has visual properties.
    expect(Object.prototype.hasOwnProperty.call(cls, "VisualProperties")).toBe(false);
    expect(cls.VisualProperties).toBeUndefined();
    expect(cls.__FX?.map((effect) => Node.getName(effect))).toEqual([
      "GGLDotScreenEffect",
      "GGLSepiaEffect",
      "GGLBlurEffect",
    ]);
  });

  it("ColorAdjustMultiEffect has the prefixed brightness/contrast and hue/saturation properties", () => {
    const cls = tables(ColorAdjustMultiEffect);
    expect(cls.GeometryProperties).toEqual({
      fxP: {},
      fxN: {},
      "GGLBrightnessContrastEffect&shp": { brightness: 0, contrast: 0 },
      "GGLBrightnessContrastEffect&sh": "GGLBrightnessContrastShader",
      "GGLHueSaturationEffect&shp": { hue: 0, saturation: 0 },
      "GGLHueSaturationEffect&sh": "GGLHueSaturationShader",
    });
    expect(cls.VisualProperties).toBeUndefined();
    expect(cls.__FX?.map((effect) => Node.getName(effect))).toEqual([
      "GGLBrightnessContrastEffect",
      "GGLHueSaturationEffect",
    ]);
  });
});

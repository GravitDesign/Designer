// AngularGradient.getGradient keeps the canvas it painted last and hands
// it out again while nothing the shader reads changed. Node has no WebGL,
// so the shader is stubbed; what counts is when it runs.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { RGBColor } from "../color/rgb-color.ts";
import { Rect } from "../math/rect.ts";
import { PaintCanvas } from "../paint/paint-canvas.ts";
import { clearPatternCache } from "../paint/pattern-cache.ts";
import { installFakeCanvas } from "../paint/testing/fake-canvas.ts";
import { GLContext } from "../paint/webgl/gl-context.ts";
import { AngularGradient } from "./angular-gradient.ts";
import type { GradientStop } from "./gradient.ts";

let uninstall: () => void;
beforeAll(() => {
  uninstall = installFakeCanvas();
});
afterAll(() => uninstall());
beforeEach(() => {
  clearPatternCache();
  vi.spyOn(GLContext, "getGLContext").mockReturnValue({} as never);
});
afterEach(() => vi.restoreAllMocks());

function gradient() {
  const result = new AngularGradient(
    [
      { position: 0, color: new RGBColor([255, 0, 0]), opacity: 1 },
      { position: 1, color: new RGBColor([0, 0, 255]), opacity: 0.5 },
    ],
    0.5,
    0.5,
    0.5,
    0,
  );
  vi.spyOn(result, "prepareShader").mockReturnValue(true);
  const draw = vi.spyOn(result, "drawShader").mockImplementation(() => undefined);
  return { gradient: result, draw };
}

const square = new Rect(0, 0, 20, 20);

describe("AngularGradient.getGradient", () => {
  it("hands out the painted canvas again for the same size and opacity", () => {
    const { gradient: angular, draw } = gradient();
    const first = angular.getGradient(1, square);
    expect(first).not.toBeNull();
    expect(angular.getGradient(1, new Rect(5, 5, 20, 20))).toBe(first);
    expect(draw).toHaveBeenCalledTimes(1);
  });

  it("paints anew for another size or opacity", () => {
    const { gradient: angular, draw } = gradient();
    const first = angular.getGradient(1, square);
    expect(angular.getGradient(1, new Rect(0, 0, 20, 21))).not.toBe(first);
    expect(angular.getGradient(0.5, new Rect(0, 0, 20, 21))).not.toBe(first);
    expect(draw).toHaveBeenCalledTimes(3);
  });

  it("paints anew after a stop was changed in place", () => {
    const { gradient: angular, draw } = gradient();
    const first = angular.getGradient(1, square);
    // As the pattern chooser does with a gradient's first stop.
    (angular._stops[0] as GradientStop).color = new RGBColor([0, 255, 0]);
    const second = angular.getGradient(1, square);
    expect(second).not.toBe(first);
    (angular._stops[1] as GradientStop).opacity = 1;
    const third = angular.getGradient(1, square);
    expect(third).not.toBe(second);
    (angular._stops[1] as GradientStop).position = 0.8;
    expect(angular.getGradient(1, square)).not.toBe(third);
    expect(draw).toHaveBeenCalledTimes(4);
  });

  it("paints anew after the center or start angle changed", () => {
    const { gradient: angular, draw } = gradient();
    const first = angular.getGradient(1, square);
    angular._a0 = 1;
    const second = angular.getGradient(1, square);
    expect(second).not.toBe(first);
    angular._fx = 0.25;
    expect(angular.getGradient(1, square)).not.toBe(second);
    expect(draw).toHaveBeenCalledTimes(3);
  });

  it("paints nothing without WebGL", () => {
    const { gradient: angular } = gradient();
    expect(angular.getGradient(1, square)).not.toBeNull();
    vi.mocked(GLContext.getGLContext).mockReturnValue(null);
    expect(angular.getGradient(1, square)).toBeNull();
  });

  it("doesn't keep a canvas of more than 16 MB", () => {
    const { gradient: angular, draw } = gradient();
    const huge = new Rect(0, 0, 2049, 2048);
    angular.getGradient(1, huge);
    angular.getGradient(1, huge);
    expect(draw).toHaveBeenCalledTimes(2);
  });

  it("gives the kept canvas one pattern, and a repainted one a new pattern", () => {
    const { gradient: angular } = gradient();
    const target = new PaintCanvas(false, true);
    const first = angular.getGradient(1, square);
    const pattern = target.createTexture(first, "no-repeat");
    expect(pattern).toBeTruthy();
    expect(target.createTexture(angular.getGradient(1, square), "no-repeat")).toBe(pattern);
    angular._a0 = 2;
    expect(target.createTexture(angular.getGradient(1, square), "no-repeat")).not.toBe(pattern);
  });
});

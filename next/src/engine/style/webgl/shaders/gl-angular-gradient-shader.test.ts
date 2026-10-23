import { afterEach, describe, expect, it, vi } from "vitest";
import { Canvas2DPaintCanvas } from "../../../paint/paint-canvas.ts";
import { GLAngularGradientShader } from "./gl-angular-gradient-shader.ts";
import { compareShader, type RenderCase } from "./testing/old-shader-harness.ts";

const color = (r: number, g: number, b: number) => ({ getValue: () => [r, g, b] });

const stops = () => [
  { position: 1, color: color(0, 0, 255), opacity: 1 },
  { position: 0, color: color(255, 0, 0), opacity: 1 },
  { position: 0.4, color: color(0, 255, 0), opacity: 0.6 },
];

const CASES: RenderCase[] = [
  {
    properties: {},
    makeProperties: () => ({
      cx: 0.5,
      cy: 0.5,
      a0: -Math.PI,
      a1: Math.PI,
      stops: stops(),
      opacity: 1,
    }),
    extra: ["texture:texture", "texture:spareTexture"],
  },
  {
    properties: {},
    // A start angle that isn't a multiple of pi anti-aliases the seam.
    makeProperties: () => ({
      cx: 0.3,
      cy: 0.6,
      a0: Math.PI / 3,
      a1: 0,
      stops: stops(),
      opacity: 0.5,
    }),
    x: 4,
    y: 9,
    width: 120,
    height: 70,
  },
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GLAngularGradientShader", () => {
  it.each([1, 2, 3, 20])("matches the old shader at screen DPI %d", (dpi) => {
    vi.spyOn(Canvas2DPaintCanvas, "getScreenDPI").mockReturnValue(dpi);
    const [oldLog, newLog] = compareShader(364, GLAngularGradientShader, CASES, dpi);
    expect(newLog).toEqual(oldLog);
  });

  it("unrolls one interval per stop slot (16 at DPI 1)", () => {
    vi.spyOn(Canvas2DPaintCanvas, "getScreenDPI").mockReturnValue(1);
    const source = GLAngularGradientShader.generateSource();
    expect(source).toContain("const int MAX_ANGLES = 16;");
    expect(source.split("if (angle >= angles[").length - 1).toBe(15);
  });
});

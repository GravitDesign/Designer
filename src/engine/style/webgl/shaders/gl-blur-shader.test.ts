import { describe, expect, it } from "vitest";
import { GLBlurShader } from "./gl-blur-shader.ts";
import { GLClipBlurShader } from "./gl-clip-blur-shader.ts";
import { compareShader, type RenderCase } from "./testing/old-shader-harness.ts";

const CASES: RenderCase[] = [
  { properties: { radius: 5 } },
  { properties: { radius: 5 }, scale: 2, x: 3, y: 4, width: 100, height: 80 },
  // Radii over 32 use the precompiled programs, over 128 new ones.
  { properties: { radius: 40 } },
  { properties: { radius: 65 }, scale: 2 },
  { properties: { radius: 200 } },
  { properties: { radius: 0 } },
  { properties: { radius: Number.NaN } },
  { properties: { radius: 0.5 }, scale: 1 },
  { properties: { radius: 64 } },
  { properties: { radius: 96 } },
  { properties: { radius: 129 } },
];

describe("GLBlurShader", () => {
  it("compiles the same programs and runs the same passes as the old shader", () => {
    const [oldLog, newLog] = compareShader(206, GLBlurShader, CASES);
    expect(newLog).toEqual(oldLog);
    // Four precompiled programs, two passes for the 5 px blur.
    expect(oldLog.filter((entry) => entry[0] === "program").length).toBeGreaterThan(4);
  });
});

describe("GLClipBlurShader", () => {
  it("compiles the same programs and runs the same passes as the old shader", () => {
    const [oldLog, newLog] = compareShader(365, GLClipBlurShader, CASES);
    expect(newLog).toEqual(oldLog);
    // FXAA only when the radius is over one pixel at the scale.
    expect(oldLog.some((entry) => entry[0] === "fxaa")).toBe(true);
  });
});

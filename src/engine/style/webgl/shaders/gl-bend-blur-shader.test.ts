import { describe, expect, it } from "vitest";
import { GLBendBlurShader } from "./gl-bend-blur-shader.ts";
import { compareShader } from "./testing/old-shader-harness.ts";

describe("GLBendBlurShader", () => {
  it("matches the old shader's programs and both passes", () => {
    const [oldLog, newLog] = compareShader(315, GLBendBlurShader, [
      { properties: { radius: 50, softness: 1, bend: 50, cov: 0.8 } },
      { properties: { radius: 10, softness: 0, bend: -20, cov: 0.3 }, scale: 2, x: 5, y: 7 },
      { properties: { radius: 3, softness: -1, bend: 0, cov: 1 }, width: 200, height: 90 },
    ]);
    expect(newLog).toEqual(oldLog);
  });
});

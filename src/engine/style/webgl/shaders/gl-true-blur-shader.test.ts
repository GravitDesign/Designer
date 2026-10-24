import { describe, expect, it } from "vitest";
import { GLTrueBlurShader } from "./gl-true-blur-shader.ts";
import { compareShader } from "./testing/old-shader-harness.ts";

describe("GLTrueBlurShader", () => {
  it("blurs with the same sigma and sample step, skipping a zero radius", () => {
    const [oldLog, newLog] = compareShader(499, GLTrueBlurShader, [
      { properties: { radius: 5 } },
      { properties: { radius: 40 }, scale: 0.5, hostWidth: 100, hostHeight: 70 },
      { properties: { radius: 0 } },
      { properties: { radius: Number.NaN } },
    ]);
    expect(newLog).toEqual(oldLog);
  });
});

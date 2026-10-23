import { describe, expect, it } from "vitest";
import { GLLensBlurShader } from "./gl-lens-blur-shader.ts";
import { compareShader } from "./testing/old-shader-harness.ts";

describe("GLLensBlurShader", () => {
  it("compiles the same programs and runs the same passes as the old shader", () => {
    const [oldLog, newLog] = compareShader(489, GLLensBlurShader, [
      { properties: { radius: 10, brightness: 0, angle: 0 } },
      {
        properties: { radius: 40, brightness: 0.5, angle: 2 },
        scale: 2,
        hostWidth: 100,
        hostHeight: 70,
      },
      { properties: { radius: 3, brightness: -4, angle: -3 } },
      { properties: { radius: 3, brightness: 9, angle: 1 }, scale: 0.5 },
    ]);
    expect(newLog).toEqual(oldLog);
  });
});

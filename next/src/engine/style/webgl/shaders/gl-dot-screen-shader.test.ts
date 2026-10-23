import { describe, expect, it } from "vitest";
import { GLDotScreenShader } from "./gl-dot-screen-shader.ts";
import { compareShader } from "./testing/old-shader-harness.ts";

describe("GLDotScreenShader", () => {
  it("matches the old shader's programs and passes", () => {
    const [oldLog, newLog] = compareShader(481, GLDotScreenShader, [
      { properties: { centerX: 50, centerY: 50, angle: 0, size: 10 } },
      {
        properties: { centerX: 10, centerY: 90, angle: 1, size: 5 },
        scale: 3,
        x: 8,
        y: 2,
        width: 200,
        height: 100,
      },
      {
        properties: { centerX: 0, centerY: 100, angle: 0.2, size: 20 },
        hostWidth: 33,
        hostHeight: 17,
      },
    ]);
    expect(newLog).toEqual(oldLog);
  });
});

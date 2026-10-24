import { describe, expect, it } from "vitest";
import { GLBulgePinchShader } from "./gl-bulge-pinch-shader.ts";
import { compareShader } from "./testing/old-shader-harness.ts";

describe("GLBulgePinchShader", () => {
  it("matches the old shader's programs and passes", () => {
    const [oldLog, newLog] = compareShader(477, GLBulgePinchShader, [
      { properties: { centerX: 50, centerY: 50, radius: 50, strength: 0.5 } },
      {
        properties: { centerX: 20, centerY: 30, radius: 80, strength: -1 },
        x: 4,
        y: 9,
        width: 300,
        height: 120,
      },
      {
        properties: { centerX: 0, centerY: 100, radius: 10, strength: 4 },
        scale: 2,
        width: 40,
        height: 90,
      },
      {
        properties: { centerX: 70, centerY: 10, radius: 30, strength: -3 },
        hostWidth: 16,
        hostHeight: 32,
      },
    ]);
    expect(newLog).toEqual(oldLog);
  });
});

import { describe, expect, it } from "vitest";
import { GLColorHalftoneShader } from "./gl-color-halftone-shader.ts";
import { compareShader } from "./testing/old-shader-harness.ts";

describe("GLColorHalftoneShader", () => {
  it("matches the old shader's programs and passes", () => {
    const [oldLog, newLog] = compareShader(479, GLColorHalftoneShader, [
      { properties: { centerX: 50, centerY: 50, angle: 0, size: 50 } },
      {
        properties: { centerX: 1, centerY: 2, angle: 0.5, size: 10 },
        scale: 2,
        x: 3,
        y: 6,
        width: 120,
        height: 90,
      },
      {
        properties: { centerX: 100, centerY: 0, angle: 1.5, size: 3 },
        scale: 0.5,
        hostWidth: 20,
        hostHeight: 10,
      },
    ]);
    expect(newLog).toEqual(oldLog);
  });
});

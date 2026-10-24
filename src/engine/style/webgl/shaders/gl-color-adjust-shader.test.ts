import { describe, expect, it } from "vitest";
import { GLColorAdjustShader } from "./gl-color-adjust-shader.ts";
import { compareShader } from "./testing/old-shader-harness.ts";

describe("GLColorAdjustShader", () => {
  it("matches the old shader's programs and passes", () => {
    const [oldLog, newLog] = compareShader(478, GLColorAdjustShader, [
      { properties: { brightness: 0, contrast: 0, hue: 0, saturation: 0 } },
      { properties: { brightness: 0.1, contrast: 0.2, hue: 0.3, saturation: 0.4 } },
      { properties: { brightness: -2, contrast: 5, hue: -9, saturation: 1.5 } },
    ]);
    expect(newLog).toEqual(oldLog);
  });
});

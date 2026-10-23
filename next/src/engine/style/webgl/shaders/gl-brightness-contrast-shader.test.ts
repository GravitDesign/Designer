import { describe, expect, it } from "vitest";
import { GLBrightnessContrastShader } from "./gl-brightness-contrast-shader.ts";
import { compareShader } from "./testing/old-shader-harness.ts";

describe("GLBrightnessContrastShader", () => {
  it("matches the old shader's program and clamped uniforms", () => {
    const [oldLog, newLog] = compareShader(476, GLBrightnessContrastShader, [
      { properties: { brightness: 0, contrast: 0 } },
      { properties: { brightness: -0.5, contrast: 0.5 } },
      { properties: { brightness: 3, contrast: -7 } },
    ]);
    expect(newLog).toEqual(oldLog);
  });
});

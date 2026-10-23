import { describe, expect, it } from "vitest";
import { GLHueSaturationShader } from "./gl-hue-saturation-shader.ts";
import { compareShader } from "./testing/old-shader-harness.ts";

describe("GLHueSaturationShader", () => {
  it("matches the old shader's program and clamped uniforms", () => {
    const [oldLog, newLog] = compareShader(486, GLHueSaturationShader, [
      { properties: { hue: 0, saturation: 0 } },
      { properties: { hue: -1, saturation: 1 } },
      { properties: { hue: 2.5, saturation: -4 } },
    ]);
    expect(newLog).toEqual(oldLog);
  });
});

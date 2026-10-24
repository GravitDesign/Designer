import { describe, expect, it } from "vitest";
import { GLDenoiseShader } from "./gl-denoise-shader.ts";
import { compareShader } from "./testing/old-shader-harness.ts";

describe("GLDenoiseShader", () => {
  it("matches the old shader's programs and passes", () => {
    const [oldLog, newLog] = compareShader(480, GLDenoiseShader, [
      { properties: { exponent: 10 } },
      { properties: { exponent: 45 }, hostWidth: 100, hostHeight: 30 },
      { properties: { exponent: -5 } },
    ]);
    expect(newLog).toEqual(oldLog);
  });
});

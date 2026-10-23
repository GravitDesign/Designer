import { describe, expect, it } from "vitest";
import { GLNoiseShader } from "./gl-noise-shader.ts";
import { compareShader } from "./testing/old-shader-harness.ts";

describe("GLNoiseShader", () => {
  it("compiles the same programs and runs the same passes as the old shader", () => {
    const [oldLog, newLog] = compareShader(490, GLNoiseShader, [
      { properties: { amount: 0.5 } },
      { properties: { amount: 0.9, colored: true, transparency: true } },
      { properties: { amount: -1, colored: false, transparency: true } },
      { properties: { amount: 3, colored: true } },
    ]);
    expect(newLog).toEqual(oldLog);
  });
});

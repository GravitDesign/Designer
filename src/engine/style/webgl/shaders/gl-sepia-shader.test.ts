import { describe, expect, it } from "vitest";
import { GLSepiaShader } from "./gl-sepia-shader.ts";
import { compareShader } from "./testing/old-shader-harness.ts";

describe("GLSepiaShader", () => {
  it("compiles the same programs and runs the same passes as the old shader", () => {
    const [oldLog, newLog] = compareShader(493, GLSepiaShader, [
      { properties: { amount: 0.5 } },
      { properties: { amount: 1 } },
      { properties: { amount: -2 } },
      { properties: { amount: 7 } },
    ]);
    expect(newLog).toEqual(oldLog);
  });
});

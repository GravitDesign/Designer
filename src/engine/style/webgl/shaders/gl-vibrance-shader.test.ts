import { describe, expect, it } from "vitest";
import { GLVibranceShader } from "./gl-vibrance-shader.ts";
import { compareShader } from "./testing/old-shader-harness.ts";

describe("GLVibranceShader", () => {
  it("skips an amount of 0 and clamps the others", () => {
    const [oldLog, newLog] = compareShader(501, GLVibranceShader, [
      { properties: { amount: 0.5 } },
      { properties: { amount: 0 } },
      { properties: { amount: -3 } },
    ]);
    expect(newLog).toEqual(oldLog);
  });
});

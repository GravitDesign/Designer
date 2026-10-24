import { describe, expect, it } from "vitest";
import { GLRecolourShader } from "./gl-recolour-shader.ts";
import { compareShader } from "./testing/old-shader-harness.ts";

describe("GLRecolourShader", () => {
  it("compiles the same programs and runs the same passes as the old shader", () => {
    const [oldLog, newLog] = compareShader(492, GLRecolourShader, [
      { properties: { hue: 1, saturation: 1 } },
      { properties: { hue: 0.2, saturation: 0.6 } },
      { properties: { hue: -3, saturation: 4 } },
    ]);
    expect(newLog).toEqual(oldLog);
  });
});

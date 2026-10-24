import { describe, expect, it } from "vitest";
import { GLSwirlShader } from "./gl-swirl-shader.ts";
import { compareShader } from "./testing/old-shader-harness.ts";

describe("GLSwirlShader", () => {
  it("compiles the same programs and runs the same passes as the old shader", () => {
    const [oldLog, newLog] = compareShader(496, GLSwirlShader, [
      { properties: { centerX: 50, centerY: 50, radius: 50, angle: 0.5 } },
      {
        properties: { centerX: 10, centerY: 10, radius: 90, angle: -2 },
        scale: 2,
        x: 30,
        y: 20,
        width: 300,
        height: 100,
      },
      {
        properties: { centerX: 20, centerY: 70, radius: 40, angle: 1 },
        width: 80,
        height: 60,
        host: { swirlBBox: { getWidth: () => 200, getHeight: () => 300 } },
      },
      {
        properties: { centerX: 20, centerY: 70, radius: 40, angle: 1 },
        host: { swirlBBox: { getWidth: () => 500, getHeight: () => 30 } },
      },
    ]);
    expect(newLog).toEqual(oldLog);
  });
});

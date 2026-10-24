import { describe, expect, it } from "vitest";
import { GLDrunkShader } from "./gl-drunk-shader.ts";
import { compareShader } from "./testing/old-shader-harness.ts";

describe("GLDrunkShader", () => {
  it("matches the old shader's programs and passes", () => {
    const [oldLog, newLog] = compareShader(482, GLDrunkShader, [
      { properties: { strengthX: 0.5, strengthY: 0, radius: 50 } },
      {
        properties: { strengthX: 0.1, strengthY: 0.9, radius: 20 },
        scale: 2,
        x: 1,
        y: 2,
        width: 90,
        height: 60,
      },
      {
        properties: { strengthX: -1, strengthY: -0.5, radius: 100 },
        hostWidth: 12,
        hostHeight: 40,
      },
    ]);
    expect(newLog).toEqual(oldLog);
  });
});

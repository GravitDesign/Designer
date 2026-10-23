import { describe, expect, it } from "vitest";
import { GLBendShader } from "./gl-bend-shader.ts";
import { compareShader } from "./testing/old-shader-harness.ts";

describe("GLBendShader", () => {
  it("matches the old shader's programs and passes", () => {
    const [oldLog, newLog] = compareShader(474, GLBendShader, [
      { properties: { strengthX: 0.5, strengthY: 0, radius: 50 } },
      {
        properties: { strengthX: -1, strengthY: 1, radius: 90 },
        scale: 2,
        x: 5,
        y: 7,
        width: 200,
        height: 150,
      },
      {
        properties: { strengthX: 0.3, strengthY: -0.4, radius: 10 },
        hostWidth: 30,
        hostHeight: 20,
      },
    ]);
    expect(newLog).toEqual(oldLog);
  });
});

import { describe, expect, it } from "vitest";
import { GLHexagonalShader } from "./gl-hexagonal-shader.ts";
import { compareShader } from "./testing/old-shader-harness.ts";

describe("GLHexagonalShader", () => {
  it("pixelates around the same center with the same cell size", () => {
    const [oldLog, newLog] = compareShader(485, GLHexagonalShader, [
      { properties: { centerX: 50, centerY: 50, scale: 1 } },
      { properties: { centerX: 5, centerY: 6, scale: 40 }, x: 7, y: 9, width: 200, height: 120 },
      {
        properties: { centerX: 0, centerY: 100, scale: -3 },
        scale: 2,
        hostWidth: 30,
        hostHeight: 20,
      },
    ]);
    expect(newLog).toEqual(oldLog);
  });
});

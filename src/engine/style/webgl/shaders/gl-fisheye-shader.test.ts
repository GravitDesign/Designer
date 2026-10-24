import { describe, expect, it } from "vitest";
import { GLFisheyeShader } from "./gl-fisheye-shader.ts";
import { compareShader } from "./testing/old-shader-harness.ts";

describe("GLFisheyeShader", () => {
  it("matches the old shader's programs and passes", () => {
    const [oldLog, newLog] = compareShader(484, GLFisheyeShader, [
      { properties: { strength: 50 } },
      { properties: { strength: -80 }, x: 10, y: 20, width: 300, height: 200 },
      { properties: { strength: 150 }, scale: 2 },
      { properties: { strength: -150 }, hostWidth: 20, hostHeight: 64 },
      { properties: { strength: 0 } },
    ]);
    expect(newLog).toEqual(oldLog);
  });
});

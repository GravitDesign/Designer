import { describe, expect, it } from "vitest";
import { GLWarpShader } from "./gl-warp-shader.ts";
import { compareShader } from "./testing/old-shader-harness.ts";

describe("GLWarpShader", () => {
  it("draws the same fixed warp", () => {
    const [oldLog, newLog] = compareShader(503, GLWarpShader, [{ properties: {} }]);
    expect(newLog).toEqual(oldLog);
  });
});

import { describe, expect, it } from "vitest";
import { GLVignetteShader } from "./gl-vignette-shader.ts";
import { compareShader } from "./testing/old-shader-harness.ts";

describe("GLVignetteShader", () => {
  it("skips an amount of 0 and passes the tile geometry", () => {
    const [oldLog, newLog] = compareShader(502, GLVignetteShader, [
      { properties: { size: 0.2, amount: 0.5 } },
      { properties: { size: 0.8, amount: 0 } },
      { properties: { size: 3, amount: 7 }, x: 10, y: 20, width: 300, height: 200 },
      { properties: { size: -1, amount: -1 } },
    ]);
    expect(newLog).toEqual(oldLog);
  });
});

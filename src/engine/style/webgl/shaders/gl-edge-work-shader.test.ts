import { describe, expect, it } from "vitest";
import { GLEdgeWorkShader } from "./gl-edge-work-shader.ts";
import { compareShader } from "./testing/old-shader-harness.ts";

describe("GLEdgeWorkShader", () => {
  it("matches the old shader's programs and passes", () => {
    const [oldLog, newLog] = compareShader(483, GLEdgeWorkShader, [
      { properties: { radius: 10 } },
      { properties: { radius: 150 }, scale: 2, hostWidth: 100, hostHeight: 25 },
      { properties: { radius: 1 }, scale: 0.5 },
    ]);
    expect(newLog).toEqual(oldLog);
  });
});

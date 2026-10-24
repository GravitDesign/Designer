import { describe, expect, it } from "vitest";
import { GLInkShader } from "./gl-ink-shader.ts";
import { compareShader } from "./testing/old-shader-harness.ts";

describe("GLInkShader", () => {
  it("raises the strength to the fifth power like the old shader", () => {
    const [oldLog, newLog] = compareShader(487, GLInkShader, [
      { properties: { strength: 0.5 } },
      { properties: { strength: 1 }, hostWidth: 100, hostHeight: 10 },
      { properties: { strength: -0.7 }, scale: 3 },
    ]);
    expect(newLog).toEqual(oldLog);
  });
});

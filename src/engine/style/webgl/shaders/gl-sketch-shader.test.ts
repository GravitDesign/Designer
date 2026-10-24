import { describe, expect, it } from "vitest";
import { GLSketchShader } from "./gl-sketch-shader.ts";
import { compareShader } from "./testing/old-shader-harness.ts";

describe("GLSketchShader", () => {
  it("compiles the same programs and runs the same passes as the old shader", () => {
    const [oldLog, newLog] = compareShader(494, GLSketchShader, [
      { properties: { strength: 0.5 } },
      { properties: { strength: 1.8 }, hostWidth: 100, hostHeight: 30 },
    ]);
    expect(newLog).toEqual(oldLog);
  });
});

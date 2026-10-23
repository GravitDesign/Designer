import { describe, expect, it } from "vitest";
import { GLUnsharpMaskShader } from "./gl-unsharp-mask-shader.ts";
import { compareShader } from "./testing/old-shader-harness.ts";

describe("GLUnsharpMaskShader", () => {
  it("copies, blurs and mixes in the same passes as the old shader", () => {
    const [oldLog, newLog] = compareShader(500, GLUnsharpMaskShader, [
      { properties: { radius: 0, strength: 0 } },
      { properties: { radius: 100, strength: 4 }, scale: 2 },
      { properties: { radius: 12, strength: 1 }, hostWidth: 20, hostHeight: 90 },
    ]);
    expect(newLog).toEqual(oldLog);
  });
});

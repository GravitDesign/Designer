import { describe, expect, it } from "vitest";
import { GLToonShader } from "./gl-toon-shader.ts";
import { compareShader } from "./testing/old-shader-harness.ts";

describe("GLToonShader", () => {
  it("passes the same uniforms, misspelled texel height included", () => {
    const [oldLog, newLog] = compareShader(498, GLToonShader, [
      { properties: { threshold: 0.2, quantization: 10 } },
      { properties: { threshold: 1.5, quantization: 3 }, hostWidth: 128, hostHeight: 32 },
    ]);
    expect(newLog).toEqual(oldLog);
  });
});

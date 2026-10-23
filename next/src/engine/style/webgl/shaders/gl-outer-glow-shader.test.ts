import { describe, expect, it } from "vitest";
import { GLOuterGlowShader } from "./gl-outer-glow-shader.ts";
import { compareShader } from "./testing/old-shader-harness.ts";

describe("GLOuterGlowShader", () => {
  it("compiles the same programs and runs the same passes as the old shader", () => {
    const [oldLog, newLog] = compareShader(491, GLOuterGlowShader, [
      {
        properties: {
          radius: 5,
          intensity: 1,
          color: [255, 255, 224],
          opacity: { type: "opacity", value: 1 },
        },
      },
      {
        properties: {
          radius: 30,
          intensity: 0.5,
          color: [9, 8, 7],
          opacity: { type: "opacity", value: 0.3 },
        },
        scale: 0.5,
        x: 7,
        y: 1,
        width: 200,
        height: 100,
      },
      {
        properties: {
          radius: 0,
          intensity: 2,
          color: [255, 0, 0],
          opacity: { type: "opacity", value: 0 },
        },
        hostWidth: 13,
        hostHeight: 17,
      },
    ]);
    expect(newLog).toEqual(oldLog);
  });
});

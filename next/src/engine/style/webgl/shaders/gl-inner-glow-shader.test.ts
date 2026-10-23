import { describe, expect, it } from "vitest";
import { GLInnerGlowShader } from "./gl-inner-glow-shader.ts";
import { compareShader } from "./testing/old-shader-harness.ts";

describe("GLInnerGlowShader", () => {
  it("compiles the same programs and runs the same passes as the old shader", () => {
    const [oldLog, newLog] = compareShader(488, GLInnerGlowShader, [
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
          radius: 25,
          intensity: 2,
          color: [1, 2, 3],
          opacity: { type: "opacity", value: 0.5 },
        },
        scale: 2,
        x: 4,
        y: 5,
        width: 120,
        height: 90,
      },
      {
        properties: {
          radius: 0,
          intensity: 0,
          color: [0, 0, 0],
          opacity: { type: "opacity", value: 0 },
        },
        hostWidth: 10,
        hostHeight: 20,
      },
    ]);
    expect(newLog).toEqual(oldLog);
  });
});

import { describe, expect, it } from "vitest";
import { GLBloomShader } from "./gl-bloom-shader.ts";
import { compareShader } from "./testing/old-shader-harness.ts";

describe("GLBloomShader", () => {
  it("matches the old shader's programs and passes", () => {
    const [oldLog, newLog] = compareShader(475, GLBloomShader, [
      {
        properties: {
          bloomIntensity: 1.25,
          baseIntensity: 1,
          bloomSaturation: 1,
          baseSaturation: 1,
          blurRadius: 4,
          bloomThreshold: 0.25,
        },
      },
      {
        properties: {
          bloomIntensity: 2,
          baseIntensity: 0.5,
          bloomSaturation: 0,
          baseSaturation: 2,
          blurRadius: 30,
          bloomThreshold: 0.9,
        },
        scale: 3,
        hostWidth: 100,
        hostHeight: 70,
      },
    ]);
    expect(newLog).toEqual(oldLog);
  });
});

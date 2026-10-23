import { describe, expect, it } from "vitest";
import { GLZoomBlurShader } from "./gl-zoom-blur-shader.ts";
import { compareShader } from "./testing/old-shader-harness.ts";

describe("GLZoomBlurShader", () => {
  it("zooms from the same center in full-image coordinates", () => {
    const [oldLog, newLog] = compareShader(504, GLZoomBlurShader, [
      { properties: { centerX: 50, centerY: 50, strength: 0.3 } },
      {
        properties: { centerX: 0, centerY: 100, strength: 0.5 },
        x: 16,
        y: 8,
        width: 400,
        height: 300,
      },
    ]);
    expect(newLog).toEqual(oldLog);
  });
});

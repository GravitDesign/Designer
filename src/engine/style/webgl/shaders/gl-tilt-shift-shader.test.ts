import { describe, expect, it } from "vitest";
import { GLTiltShiftShader } from "./gl-tilt-shift-shader.ts";
import { compareShader } from "./testing/old-shader-harness.ts";

describe("GLTiltShiftShader", () => {
  it("compiles the same programs and runs the same passes as the old shader", () => {
    const [oldLog, newLog] = compareShader(497, GLTiltShiftShader, [
      // One tile (width and height not over the host size): mirrored by direction.
      {
        properties: {
          startX: 25,
          startY: 50,
          endX: 75,
          endY: 50,
          blurRadius: 10,
          gradientRadius: 30,
        },
      },
      {
        properties: {
          startX: 75,
          startY: 50,
          endX: 25,
          endY: 60,
          blurRadius: 10,
          gradientRadius: 30,
        },
      },
      {
        properties: {
          startX: 75,
          startY: 50,
          endX: 25,
          endY: 10,
          blurRadius: 10,
          gradientRadius: 30,
        },
      },
      {
        properties: {
          startX: 25,
          startY: 50,
          endX: 75,
          endY: 10,
          blurRadius: 10,
          gradientRadius: 30,
        },
      },
      // Start equal to end in x and y.
      {
        properties: {
          startX: 40,
          startY: 40,
          endX: 40,
          endY: 40,
          blurRadius: 5,
          gradientRadius: 80,
        },
        scale: 2,
      },
      // Tiled: the image is larger than the host texture, no mirroring.
      {
        properties: {
          startX: 75,
          startY: 50,
          endX: 25,
          endY: 10,
          blurRadius: 40,
          gradientRadius: 80,
        },
        x: 64,
        y: 48,
        width: 300,
        height: 200,
      },
      // Only wider than the tile: still mirrored.
      {
        properties: {
          startX: 75,
          startY: 50,
          endX: 25,
          endY: 10,
          blurRadius: 40,
          gradientRadius: 80,
        },
        width: 300,
        height: 40,
      },
    ]);
    expect(newLog).toEqual(oldLog);
  });
});

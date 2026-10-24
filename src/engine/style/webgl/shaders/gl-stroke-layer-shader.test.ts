import { describe, expect, it } from "vitest";
import { GLStrokeLayerShader } from "./gl-stroke-layer-shader.ts";
import { compareShader } from "./testing/old-shader-harness.ts";

describe("GLStrokeLayerShader", () => {
  it("compiles the same programs and runs the same passes as the old shader", () => {
    const [oldLog, newLog] = compareShader(495, GLStrokeLayerShader, [
      ...[0, 1, 2].flatMap((placement) =>
        [false, true].map((ellyptical) => ({
          properties: {
            width: 3 + placement,
            softness: 0.5,
            shape: 0.7071,
            color: [255, 128, 0],
            opacity: { type: "opacity", value: 0.7 },
            ellyptical,
            placement: { type: "dropdown", value: placement },
          },
        })),
      ),
      // Fractional widths and scales, a float placement value, center with an odd width.
      {
        properties: {
          width: 2.5,
          softness: 0.1,
          shape: 1.5,
          color: [0, 0, 0],
          opacity: { type: "opacity", value: 0.7 },
          ellyptical: true,
          placement: { type: "dropdown", value: 2.7 },
        },
        scale: 1.5,
      },
      {
        properties: {
          width: 5,
          softness: 1,
          shape: 0,
          color: [1, 2, 3],
          opacity: { type: "opacity", value: 1 },
          ellyptical: false,
          placement: { type: "dropdown", value: 2 },
        },
        scale: 0.7,
      },
    ]);
    expect(newLog).toEqual(oldLog);
  });
});

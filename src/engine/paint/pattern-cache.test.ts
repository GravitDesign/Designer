import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Canvas2DPaintCanvas } from "./paint-canvas.ts";
import { PaintCanvas } from "./paint-canvas.ts";
import { clearPatternCache, freezePatternSource } from "./pattern-cache.ts";
import { RecorderStateContext } from "./recorder-state-context.ts";
import { FakeCanvas, installFakeCanvas, logOf } from "./testing/fake-canvas.ts";

let uninstall: () => void;
beforeAll(() => {
  uninstall = installFakeCanvas();
});
afterAll(() => uninstall());
beforeEach(() => clearPatternCache());

function plain(): Canvas2DPaintCanvas {
  const canvas = new PaintCanvas(false, true);
  canvas.resize(16, 16);
  return canvas;
}

function source(): FakeCanvas {
  const canvas = new FakeCanvas();
  canvas.width = 4;
  canvas.height = 4;
  return canvas;
}

function patternCalls(canvas: Canvas2DPaintCanvas): number {
  return logOf(canvas).filter((entry) => entry.startsWith("createPattern")).length;
}

describe("patterns of frozen canvases", () => {
  it("makes one pattern per frozen canvas and repetition, for every canvas", () => {
    const frozen = source();
    freezePatternSource(frozen);
    const first = plain();
    const second = plain();
    const pattern = first.createTexture(frozen as never, "no-repeat");
    expect(pattern).toBeTruthy();
    expect(second.createTexture(frozen as never, "no-repeat")).toBe(pattern);
    expect(first.createTexture(frozen as never, "no-repeat")).toBe(pattern);
    expect(patternCalls(first) + patternCalls(second)).toBe(1);
    const repeated = second.createTexture(frozen as never, "repeat");
    expect(repeated).not.toBe(pattern);
    expect(second.createTexture(frozen as never, "repeat")).toBe(repeated);
  });

  it("makes a new pattern of any other canvas every time, as it may have been drawn into", () => {
    const drawn = source();
    const canvas = plain();
    const before = canvas.createTexture(drawn as never, "repeat");
    drawn.getContext("2d")?.fillRect(0, 0, 4, 4);
    const after = canvas.createTexture(drawn as never, "repeat");
    expect(after).not.toBe(before);
    expect(patternCalls(canvas)).toBe(2);
  });

  it("shares patterns with recorded canvases but not with other contexts", () => {
    const frozen = source();
    freezePatternSource(frozen);
    const pattern = plain().createTexture(frozen as never, "repeat");
    const recorded = new PaintCanvas(false, true);
    recorded._canvasContext = new RecorderStateContext(
      new FakeCanvas() as unknown as HTMLCanvasElement,
      undefined as never,
      false,
      false,
    ) as never;
    expect(recorded.createTexture(frozen as never, "repeat")).toBe(pattern);
    const made: unknown[] = [];
    const exporting = new PaintCanvas(false, true);
    exporting._canvasContext = {
      canvas: new FakeCanvas(),
      createPattern(image: unknown, repetition: unknown) {
        const own = { own: image, repetition };
        made.push(own);
        return own;
      },
    } as never;
    expect(exporting.createTexture(frozen as never, "repeat")).toBe(made[0]);
    expect(exporting.createTexture(frozen as never, "repeat")).toBe(made[1]);
  });
});

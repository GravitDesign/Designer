import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  RecorderStateContext,
  isCanvasError,
  type ReplayPolicy,
} from "./recorder-state-context.ts";
import { FakeCanvas, installFakeCanvas, type FakeContext2D } from "./testing/fake-canvas.ts";

let uninstall: () => void;
beforeAll(() => {
  uninstall = installFakeCanvas();
});
afterAll(() => uninstall());

function make(policy: Partial<ReplayPolicy> = {}, isRoot = false) {
  const canvas = new FakeCanvas();
  const full: ReplayPolicy = {
    replayParameters: () => ({}),
    isRenderPhase: () => false,
    glCanvas: () => null,
    isRecordedCanvas: () => false,
    ...policy,
  };
  const context = new RecorderStateContext(
    canvas as unknown as HTMLCanvasElement,
    full,
    false,
    isRoot,
  );
  const real = canvas.getContext("2d") as FakeContext2D;
  return { context, real };
}

describe("RecorderStateContext", () => {
  it("answers property reads from its own copies with the recorder defaults", () => {
    const { context, real } = make();
    expect(context.imageSmoothingQuality).toBe("high");
    expect(real.imageSmoothingQuality).toBe("low");
    expect(context.fillStyle).toBe("#000");
    context.fillStyle = "#ff0000";
    expect(context.fillStyle).toBe("#ff0000");
    expect(real.log).toEqual(['fillStyle="#ff0000"']);
    // Like a recorder: property accessors are not own properties.
    expect(Object.prototype.hasOwnProperty.call(context, "imageSmoothingQuality")).toBe(false);
  });

  it("drops composite operators the recorder didn't know", () => {
    const { context, real } = make();
    context.globalCompositeOperation = "linear_burn" as GlobalCompositeOperation;
    expect(context.globalCompositeOperation).toBe("source-over");
    context.globalCompositeOperation = "multiply";
    expect(context.globalCompositeOperation).toBe("multiply");
    expect(real.log).toEqual(['globalCompositeOperation="multiply"']);
  });

  it("keeps only one level of saved values", () => {
    const { context, real } = make();
    context.lineWidth = 1;
    context.save();
    context.lineWidth = 2;
    context.save();
    context.lineWidth = 3;
    context.restore();
    context.restore();
    // The inner save wins both times; the real context unwinds properly.
    expect(context.lineWidth).toBe(2);
    expect(real.lineWidth).toBe(1);
    expect(context.maxRestoreCount).toBe(2);
    expect(context.restoreCount).toBe(0);
  });

  it("turns closePath into a line back to the start with round joins and caps", () => {
    const { context, real } = make();
    context.lineJoin = "round";
    context.lineCap = "round";
    real.log.length = 0;
    context.beginPath();
    context.moveTo(3, 4);
    context.lineTo(10, 4);
    context.moveTo(20, 20);
    context.closePath();
    context.beginPath();
    context.lineTo(5, 5);
    context.closePath();
    context.lineCap = "butt";
    context.closePath();
    expect(real.log).toEqual([
      "beginPath()",
      "moveTo(3,4)",
      "lineTo(10,4)",
      "moveTo(20,20)",
      "lineTo(3,4)",
      "beginPath()",
      "lineTo(5,5)",
      "lineTo(0,0)",
      'lineCap="butt"',
      "closePath()",
    ]);
  });

  it("shares the path start between recorders", () => {
    const first = make();
    const second = make();
    for (const { context } of [first, second]) {
      context.lineJoin = "round";
      context.lineCap = "round";
    }
    first.context.beginPath();
    first.context.moveTo(1, 1);
    second.context.beginPath();
    second.context.moveTo(9, 9);
    first.real.log.length = 0;
    first.context.closePath();
    expect(first.real.log).toEqual(["lineTo(9,9)"]);
  });

  it("leaves out draws the replay would have skipped", () => {
    const glCanvas = new FakeCanvas();
    const subCanvas = new FakeCanvas();
    const empty = new FakeCanvas();
    empty.width = 0;
    let parameters: Record<string, unknown> = { noWebGL: true };
    const { context, real } = make({
      replayParameters: () => parameters,
      isRenderPhase: () => true,
      glCanvas: () => glCanvas as unknown as HTMLCanvasElement,
      isRecordedCanvas: (canvas) => canvas === subCanvas || canvas === empty,
    });
    context.drawImage(glCanvas as unknown as HTMLCanvasElement, 0, 0);
    expect(context.skipped).toBe(true);
    context.skipped = false;
    context.drawImage(empty as unknown as HTMLCanvasElement, 0, 0);
    expect(context.skipped).toBe(false);
    parameters = { quickRender: true };
    context.drawImage(subCanvas as unknown as HTMLCanvasElement, 1, 2, 3, 4);
    expect(context.skipped).toBe(true);
    parameters = {};
    context.drawImage(subCanvas as unknown as HTMLCanvasElement, 1, 2, 3, 4);
    expect(real.log).toEqual(["drawImage(canvas#" + subCanvas.id + ",1,2,3,4)"]);
  });

  it("answers null instead of image data for an empty area", () => {
    const { context } = make();
    expect(context.getImageData(0, 0, 0, 5)).toBeNull();
    expect(context.getImageData(0, 0, 1, 1).data).toHaveLength(4);
  });

  it("marks errors the canvas throws, which the recorder only met at replay", () => {
    const { context, real } = make();
    const indexSize = new DOMException("The radius provided (-1) is negative.", "IndexSizeError");
    vi.spyOn(real, "arc").mockImplementation(() => {
      throw indexSize;
    });
    expect(() => context.arc(0, 0, -1, 0, 1)).toThrow(indexSize);
    expect(isCanvasError(indexSize)).toBe(true);

    // The recorder recorded addColorStop as well.
    const badColor = new DOMException("bad color", "SyntaxError");
    vi.spyOn(real, "createLinearGradient").mockImplementation(() => ({
      stops: [],
      addColorStop: () => {
        throw badColor;
      },
    }));
    const gradient = context.createLinearGradient(0, 0, 1, 1);
    expect(() => gradient.addColorStop(0, "nonsense")).toThrow(badColor);
    expect(isCanvasError(badColor)).toBe(true);

    // getImageData ran on the real canvas at once in the old code too, and
    // errors of the calling code are not marked.
    const readError = new DOMException("tainted", "SecurityError");
    vi.spyOn(real, "getImageData").mockImplementation(() => {
      throw readError;
    });
    expect(() => context.getImageData(0, 0, 1, 1)).toThrow(readError);
    expect(isCanvasError(readError)).toBe(false);
    expect(isCanvasError(new TypeError("x"))).toBe(false);
    expect(isCanvasError(null)).toBe(false);
  });
});

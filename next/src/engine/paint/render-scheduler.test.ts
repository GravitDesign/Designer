import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { PaintCanvas } from "./paint-canvas.ts";
import { RecorderStateContext } from "./recorder-state-context.ts";
import { RenderScheduler } from "./render-scheduler.ts";
import { installFakeCanvas } from "./testing/fake-canvas.ts";

let uninstall: () => void;
beforeAll(() => {
  uninstall = installFakeCanvas();
});
afterAll(() => uninstall());
afterEach(() => {
  RenderScheduler.finish();
  RenderScheduler.init(true, false);
  RenderScheduler._renderParameters = {};
  RenderScheduler._scheduledRenderings = null;
  RenderScheduler._renderJobs = [];
  vi.restoreAllMocks();
});

describe("RenderScheduler", () => {
  it("hands out wrapped contexts only on request or during a render phase", () => {
    expect(RenderScheduler.getRenderer()).not.toBeInstanceOf(RecorderStateContext);
    expect(RenderScheduler.getRenderer(true)).toBeInstanceOf(RecorderStateContext);
    RenderScheduler.begin();
    expect(RenderScheduler.isRenderPhase()).toBe(true);
    expect(RenderScheduler.getRenderer()).toBeInstanceOf(RecorderStateContext);
    RenderScheduler.finish();
    RenderScheduler.init(false);
    expect(RenderScheduler.getRenderer(true)).not.toBeInstanceOf(RecorderStateContext);
  });

  it("reports a rendered canvas as finished with the skipped flag and parameters", () => {
    const context = RenderScheduler.getRenderer(true) as RecorderStateContext;
    context.skipped = true;
    RenderScheduler.setRenderParameters({ noWebGL: true });
    const callback = vi.fn();
    expect(RenderScheduler.render(context, 0, callback)).toBe(context.canvas);
    expect(callback).toHaveBeenCalledWith(context.canvas, true, true, { noWebGL: true });
    expect(context.skipped).toBe(false);
    expect(() => RenderScheduler.render(null, 0, callback)).toThrow(TypeError);
  });

  it("copies render parameters in and out", () => {
    RenderScheduler.setRenderParameters({ quickRender: false, noWebGL: true });
    const parameters = RenderScheduler.getRenderParameters();
    parameters.noWebGL = false;
    expect(RenderScheduler.getRenderParameters()).toEqual({ quickRender: false, noWebGL: true });
  });

  it("runs a rendering at once and queues one that arrives during a render phase", async () => {
    const canvas = new PaintCanvas(true);
    const order: string[] = [];
    RenderScheduler.tryRunRendering(
      canvas,
      () => {
        order.push("paint, render phase " + String(RenderScheduler.isRenderPhase()));
        RenderScheduler.tryRunRendering(
          canvas,
          () => order.push("nested"),
          () => order.push("nested done"),
        );
      },
      () => order.push("done"),
    );
    expect(order).toEqual(["paint, render phase true", "done"]);
    expect(RenderScheduler._scheduledRenderings).toHaveLength(0);
    // The queued one runs on the next frame.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(order).toEqual(["paint, render phase true", "done", "nested", "nested done"]);
  });

  it("forceCleanup undoes the open saves of a canvas", () => {
    const context = RenderScheduler.getRenderer(true) as RecorderStateContext;
    context.save();
    context.save();
    const restore = vi.spyOn(context.real, "restore");
    RenderScheduler.forceCleanup(context);
    expect(restore).toHaveBeenCalledTimes(2);
  });

  it("ends the render phase on a canvas error in tryRunRendering and keeps rendering (BUG-009)", () => {
    const canvas = new PaintCanvas(true);
    const context = canvas.getRendererContext() as RecorderStateContext;
    const indexSize = new DOMException("negative radius", "IndexSizeError");
    const arc = vi.spyOn(context.real, "arc").mockImplementation(() => {
      throw indexSize;
    });
    RenderScheduler.setRenderParameters({ noWebGL: true });
    const done = vi.fn();
    expect(() =>
      RenderScheduler.tryRunRendering(
        canvas,
        () => canvas._canvasContext.arc(0, 0, -1, 0, 1),
        done,
      ),
    ).toThrow(indexSize);
    expect(done).not.toHaveBeenCalled();
    expect(RenderScheduler.isRenderPhase()).toBe(false);
    expect(RenderScheduler.getRenderer()).not.toBeInstanceOf(RecorderStateContext);
    expect(RenderScheduler.getRenderParameters()).toEqual({ noWebGL: true });
    expect(RenderScheduler._renderJobs.some(() => true)).toBe(false);
    arc.mockRestore();
    RenderScheduler.tryRunRendering(canvas, () => {}, done);
    expect(done).toHaveBeenCalledWith(canvas);
  });

  it("ends the render phase when the painting code itself throws (BUG-009)", async () => {
    const canvas = new PaintCanvas(true);
    const bug = new TypeError("painting bug");
    const order: string[] = [];
    expect(() =>
      RenderScheduler.tryRunRendering(
        canvas,
        () => {
          // Queued while the failing one paints; it still runs afterwards.
          RenderScheduler.tryRunRendering(
            canvas,
            () => order.push("queued"),
            () => order.push("queued done"),
          );
          throw bug;
        },
        () => order.push("failed done"),
      ),
    ).toThrow(bug);
    expect(RenderScheduler.isRenderPhase()).toBe(false);
    expect(RenderScheduler._renderJobs.some(() => true)).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(order).toEqual(["queued", "queued done"]);
    const done = vi.fn();
    RenderScheduler.tryRunRendering(canvas, () => {}, done);
    expect(done).toHaveBeenCalledWith(canvas);
  });
});

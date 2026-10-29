import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Rect } from "../math/rect.ts";
import { clearCanvasPool, pooledCanvasCount } from "./canvas-pool.ts";
import { Canvas2DPaintCanvas, PaintCanvas } from "./paint-canvas.ts";
import { RecorderStateContext } from "./recorder-state-context.ts";
import { RenderScheduler } from "./render-scheduler.ts";
import { FakeCanvas, FakeContext2D, installFakeCanvas } from "./testing/fake-canvas.ts";

let uninstall: () => void;
beforeAll(() => {
  uninstall = installFakeCanvas();
});
afterAll(() => uninstall());
beforeEach(() => clearCanvasPool());
afterEach(() => {
  RenderScheduler.finish();
  clearCanvasPool();
});

function canvasOf(canvas: Canvas2DPaintCanvas): FakeCanvas {
  return canvas._canvasContext.canvas as unknown as FakeCanvas;
}

function realContextOf(canvas: Canvas2DPaintCanvas): FakeContext2D {
  return canvasOf(canvas).getContext("2d") as FakeContext2D;
}

/** Leaves every kind of state a paint pass can leave on a canvas. */
function dirty(canvas: Canvas2DPaintCanvas): void {
  const context = realContextOf(canvas);
  context.fillStyle = "#ff0000";
  context.fillRect(0, 0, canvas.getWidth(), canvas.getHeight());
  context.save();
  context.setTransform(2, 0, 0, 2, 5, 7);
  context.translate(3, 4);
  context.filter = "blur(2px)";
  context.globalAlpha = 0.25;
  context.globalCompositeOperation = "multiply";
  context.imageSmoothingEnabled = false;
  context.imageSmoothingQuality = "high";
  context.lineWidth = 7;
  context.lineCap = "round";
  context.lineJoin = "bevel";
  context.miterLimit = 3;
  context.shadowBlur = 4;
  context.shadowColor = "#00ff00";
  context.font = "20px serif";
  context.setLineDash([2, 3]);
  context.beginPath();
  context.clip();
  context.save();
  canvasOf(canvas).style.imageRendering = "pixelated";
  // Through the paint canvas too: prepare() saves and clips.
  canvas.prepare([new Rect(1, 1, 5, 5)]);
  canvas.setFilter(Canvas2DPaintCanvas.Filter.Blur, 3);
}

/** What a new canvas of that size looks like. */
function expectFresh(canvas: Canvas2DPaintCanvas, width: number, height: number): void {
  const fresh = new FakeCanvas();
  fresh.width = width;
  fresh.height = height;
  const freshContext = fresh.getContext("2d") as FakeContext2D;
  const element = canvasOf(canvas);
  const context = realContextOf(canvas);
  expect(element.width).toBe(width);
  expect(element.height).toBe(height);
  expect(context._state).toEqual(freshContext._state);
  expect(context._stack).toEqual([]);
  expect(context._matrix).toEqual([1, 0, 0, 1, 0, 0]);
  expect(context._clips).toBe(0);
  expect(context.getLineDash()).toEqual([]);
  expect(element.style.imageRendering).toBe("");
  expect(element.pixels.length).toBe(width * height * 4);
  expect(element.pixels.every((value) => 0 === value)).toBe(true);
}

describe("canvas pool", () => {
  it("hands a recycled canvas of the same size out reset", () => {
    const first = Canvas2DPaintCanvas._createPooled(40, 30);
    const element = canvasOf(first);
    dirty(first);
    first.recycle();
    expect(pooledCanvasCount()).toBe(1);

    const second = Canvas2DPaintCanvas._createPooled(40, 30);
    expect(canvasOf(second)).toBe(element);
    expect(pooledCanvasCount()).toBe(0);
    expectFresh(second, 40, 30);
    // A new paint canvas, not the recycled one.
    expect(second).not.toBe(first);
    expect(second.getOffset()).toBeNull();
    expect(second.getAreas()).toBeNull();
    expect(second.isMasked()).toBe(false);
  });

  it("resets without context.reset() too", () => {
    const reset = FakeContext2D.prototype.reset;
    (FakeContext2D.prototype as { reset?: unknown }).reset = undefined;
    try {
      const first = Canvas2DPaintCanvas._createPooled(12, 9);
      const element = canvasOf(first);
      dirty(first);
      first.recycle();
      const second = Canvas2DPaintCanvas._createPooled(12, 9);
      expect(canvasOf(second)).toBe(element);
      expectFresh(second, 12, 9);
    } finally {
      FakeContext2D.prototype.reset = reset;
    }
  });

  it("resizes a recycled canvas of another size", () => {
    const first = Canvas2DPaintCanvas._createPooled(40, 30);
    const element = canvasOf(first);
    dirty(first);
    first.recycle();
    const second = Canvas2DPaintCanvas._createPooled(16, 8);
    expect(canvasOf(second)).toBe(element);
    expectFresh(second, 16, 8);
  });

  it("wraps a recycled canvas in a new recorder during a render phase", () => {
    const first = Canvas2DPaintCanvas._createPooled(20, 20);
    const element = canvasOf(first);
    first._canvasContext.globalAlpha = 0.5;
    dirty(first);
    first.recycle();

    RenderScheduler.begin();
    const second = Canvas2DPaintCanvas._createPooled(20, 20);
    RenderScheduler.finish();
    const context = second._canvasContext as RecorderStateContext;
    expect(context).toBeInstanceOf(RecorderStateContext);
    expect(context.canvas).toBe(element);
    expect(context.globalAlpha).toBe(1);
    expect(context.restoreCount).toBe(0);
    expect(context.isRoot).toBe(false);
    expect(context.persistent).toBe(false);
    expectFresh(second, 20, 20);

    // And back to a plain context outside the render phase.
    second.recycle();
    const third = Canvas2DPaintCanvas._createPooled(20, 20);
    expect(third._canvasContext).not.toBeInstanceOf(RecorderStateContext);
    expect(canvasOf(third)).toBe(element);
  });

  it("never hands out a canvas that is still in use", () => {
    const first = Canvas2DPaintCanvas._createPooled(10, 10);
    const second = Canvas2DPaintCanvas._createPooled(10, 10);
    const firstElement = canvasOf(first);
    const secondElement = canvasOf(second);
    expect(secondElement).not.toBe(firstElement);

    first.recycle();
    first.recycle();
    // Released twice through another wrapper of the same context too.
    RenderScheduler.releaseRenderer(firstElement.getContext("2d") as never);
    expect(pooledCanvasCount()).toBe(1);

    const third = Canvas2DPaintCanvas._createPooled(10, 10);
    const fourth = Canvas2DPaintCanvas._createPooled(10, 10);
    expect(canvasOf(third)).toBe(firstElement);
    expect(canvasOf(fourth)).not.toBe(firstElement);
    expect(canvasOf(fourth)).not.toBe(secondElement);
  });

  it("makes a recycled paint canvas unusable", () => {
    const canvas = Canvas2DPaintCanvas._createPooled(10, 10);
    canvas.recycle();
    expect(() => canvas.getWidth()).toThrow(TypeError);
    expect(() => canvas.clear()).toThrow(TypeError);
  });

  it("keeps canvases out whose bitmap was handed out, tile and persistent canvases", () => {
    const withBitmap = Canvas2DPaintCanvas._createPooled(10, 10);
    withBitmap.getBitmap();
    withBitmap.recycle();
    expect(withBitmap.getWidth()).toBe(10);

    const tile = new PaintCanvas(true);
    tile.recycle();
    expect(tile.getWidth()).toBe(300);

    RenderScheduler.begin();
    const persistent = new PaintCanvas(false, false, true);
    RenderScheduler.finish();
    persistent.recycle();
    expect(pooledCanvasCount()).toBe(0);
  });

  it("starts empty-handed like a new canvas when nothing is pooled", () => {
    const canvas = Canvas2DPaintCanvas._createPooled(30, 20);
    expect(realContextOf(canvas).log).toEqual(["<resize 30x150>", "<resize 30x20>"]);
  });

  it("keeps at most eight canvases", () => {
    const canvases = [];
    for (let i = 0; i < 10; i++) canvases.push(Canvas2DPaintCanvas._createPooled(4, 4));
    for (const canvas of canvases) canvas.recycle();
    expect(pooledCanvasCount()).toBe(8);
  });

  it("gives createCanvas a pooled canvas of the computed size", () => {
    const source = new PaintCanvas(false, true);
    source.resize(100, 100);
    source.prepare();
    const made = source.createCanvas(new Rect(10, 10, 30, 20));
    const element = canvasOf(made);
    dirty(made);
    made.finish();
    made.recycle();
    const again = source.createCanvas(new Rect(50, 50, 30, 20));
    expect(canvasOf(again)).toBe(element);
    expect(again.getWidth()).toBe(30);
    expect(again.getHeight()).toBe(20);
    expect(again.getOffset()?.getX()).toBe(50);
    // prepare() of createCanvas saved once on a clean stack.
    expect(realContextOf(again)._stack.length).toBe(1);
    expect(realContextOf(again)._clips).toBe(0);
    expect(realContextOf(again)._state.filter).toBe("none");
  });
});

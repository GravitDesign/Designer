// The effect cache taking over a canvas instead of a copy
// (Canvas2DPaintCanvas.handOver, the `lastUse` of _paintWithEffects). A
// canvas handed over belongs to the cache: it must not go back to the
// canvas pool, or the next style canvas would paint over the cached result.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Point } from "../math/point.ts";
import { Rect } from "../math/rect.ts";
import { Transform } from "../math/transform.ts";
import { clearCanvasPool, pooledCanvasCount } from "../paint/canvas-pool.ts";
import { Canvas2DPaintCanvas, PaintCanvas } from "../paint/paint-canvas.ts";
import { RenderScheduler } from "../paint/render-scheduler.ts";
import { installFakeCanvas, type FakeContext2D } from "../paint/testing/fake-canvas.ts";
import { registerNodeClass } from "../scene/node.ts";
import { Rectangle } from "../scene/rectangle.ts";
import { Effect, type EffectTypeValue } from "./effect.ts";
import "./stylable.ts";

let uninstall: () => void;
beforeAll(() => {
  uninstall = installFakeCanvas();
});
afterAll(() => uninstall());
beforeEach(() => {
  RenderScheduler.finish();
  clearCanvasPool();
});

/** Fills the whole canvas it paints (the content, or the effect canvas) with `color`. */
abstract class FillEffect extends Effect {
  color = "#ff0000";

  override render(canvas: unknown, target: unknown): void {
    const painted = (target || canvas) as Canvas2DPaintCanvas;
    const context = painted._canvasContext as unknown as FakeContext2D;
    context.fillStyle = this.color;
    context.fillRect(0, 0, painted.getWidth(), painted.getHeight());
  }
}

class FillFilterEffect extends FillEffect {
  static {
    registerNodeClass(this, "handOverFilterEffect", "GHandOverFilterEffect");
  }

  override getEffectType(): EffectTypeValue {
    return Effect.Type.Filter;
  }
}

class FillOverlayEffect extends FillEffect {
  static {
    registerNodeClass(this, "handOverOverlayEffect", "GHandOverOverlayEffect");
  }

  override getEffectType(): EffectTypeValue {
    return Effect.Type.PreEffect;
  }
}

type Entry = { bmp: Canvas2DPaintCanvas; fx: Effect };
type Stylable = Rectangle & { _fxCache: Entry[] };

function element(effects: Effect[]): Stylable {
  const node = new Rectangle(0, 0, 10, 10) as Stylable;
  for (const effect of effects) node.getEffects()?.appendChild(effect);
  (node as unknown as { _scene: unknown })._scene = {
    addDestroyable() {},
    destroy() {},
  };
  node._fxCache = [];
  return node;
}

function root(): Canvas2DPaintCanvas {
  const canvas = new PaintCanvas(false, true);
  canvas.resize(40, 40);
  canvas.prepare();
  return canvas;
}

/** A style canvas of 10 x 10, as _createStyleCanvas makes them (from the pool). */
function styleCanvas(parent: Canvas2DPaintCanvas): Canvas2DPaintCanvas {
  return parent.createCanvas(new Rect(0, 0, 10, 10));
}

function pixel(canvas: Canvas2DPaintCanvas): number[] {
  const context = canvas._canvasContext as unknown as FakeContext2D;
  return Array.from(context.getImageData(0, 0, 1, 1).data);
}

function paint(node: Stylable, effects: Effect[], lastUse: boolean) {
  const parent = root();
  const content = styleCanvas(parent);
  const effectCanvas = styleCanvas(parent);
  const contentContext = content._canvasContext;
  const effectContext = effectCanvas._canvasContext;
  node._paintWithEffects(
    content,
    parent,
    parent,
    1,
    effects,
    effectCanvas,
    lastUse ? [] : null,
    true,
    new Rect(0, 0, 10, 10),
    1,
    lastUse,
  );
  // What the callers do afterwards.
  for (const canvas of [content, effectCanvas]) {
    canvas.finish();
    canvas.recycle();
  }
  return { parent, contentContext, effectContext };
}

describe("handOver", () => {
  it("shares the backing canvas with the offset, origin, scale and areas of a copy", () => {
    const parent = root();
    parent.setScale(2);
    const canvas = styleCanvas(parent);
    const copy = canvas.handOver() as Canvas2DPaintCanvas;
    expect(copy._canvasContext).toBe(canvas._canvasContext);
    expect(copy.getOffset()?.getX()).toBe(canvas.getOffset()?.getX());
    expect(copy.getOrigin()?.getY()).toBe(canvas.getOrigin()?.getY());
    expect(copy.getScale()).toBe(2);
    expect(copy.getTransform(true).getMatrix()).toEqual([1, 0, 0, 1, 0, 0]);
    expect(canvas.handOver()).toBeNull();
  });

  it("keeps a handed over canvas out of the pool", () => {
    const canvas = styleCanvas(root());
    const copy = canvas.handOver() as Canvas2DPaintCanvas;
    (canvas._canvasContext as unknown as FakeContext2D).fillStyle = "#ff0000";
    (canvas._canvasContext as unknown as FakeContext2D).fillRect(0, 0, 10, 10);
    canvas.finish();
    canvas.recycle();
    expect(pooledCanvasCount()).toBe(0);
    const next = Canvas2DPaintCanvas._createPooled(10, 10);
    (next._canvasContext as unknown as FakeContext2D).fillStyle = "#0000ff";
    (next._canvasContext as unknown as FakeContext2D).fillRect(0, 0, 10, 10);
    expect(pixel(copy)).toEqual([255, 0, 0, 255]);
  });

  it("refuses where a copy could differ: a raw transform or an offset off the origin", () => {
    const moved = styleCanvas(root());
    moved.setTransform(new Transform(1, 0, 0, 1, 0.5, 0));
    expect(moved.handOver()).toBeNull();
    const offset = styleCanvas(root());
    offset.setOffset(new Point(3, 4));
    expect(offset.handOver()).toBeNull();
  });
});

describe("_paintWithEffects with lastUse", () => {
  it("caches the content after the last filter without copying it", () => {
    const effect = new FillFilterEffect();
    const node = element([effect]);
    const { contentContext } = paint(node, [effect], true);
    expect(node._fxCache).toHaveLength(1);
    const cached = (node._fxCache[0] as Entry).bmp;
    expect(cached._canvasContext).toBe(contentContext);
    expect(pooledCanvasCount()).toBe(1);
    // The next style canvases come from the pool; the cached result stays.
    const parent = root();
    for (let i = 0; i < 2; i++) {
      const next = styleCanvas(parent);
      (next._canvasContext as unknown as FakeContext2D).fillStyle = "#0000ff";
      (next._canvasContext as unknown as FakeContext2D).fillRect(0, 0, 10, 10);
    }
    expect(pixel(cached)).toEqual([255, 0, 0, 255]);
  });

  it("copies the content of a filter another effect follows", () => {
    const first = new FillFilterEffect();
    const second = new FillFilterEffect();
    second.color = "#00ff00";
    const node = element([first, second]);
    const { contentContext } = paint(node, [first, second], true);
    const byEffect = new Map(node._fxCache.map((entry) => [entry.fx, entry.bmp]));
    expect(byEffect.get(first)?._canvasContext).not.toBe(contentContext);
    expect(byEffect.get(second)?._canvasContext).toBe(contentContext);
  });

  it("hands over the effect canvas only after the last overlay", () => {
    const first = new FillOverlayEffect();
    const second = new FillOverlayEffect();
    const node = element([first, second]);
    const { effectContext } = paint(node, [first, second], true);
    const byEffect = new Map(node._fxCache.map((entry) => [entry.fx, entry.bmp]));
    expect(byEffect.get(first)?._canvasContext).not.toBe(effectContext);
    expect(byEffect.get(second)?._canvasContext).toBe(effectContext);
  });

  it("copies everything for the style layers' effects (their canvases are used again)", () => {
    const filter = new FillFilterEffect();
    const overlay = new FillOverlayEffect();
    const node = element([overlay, filter]);
    const { contentContext, effectContext } = paint(node, [overlay, filter], false);
    for (const entry of node._fxCache) {
      expect(entry.bmp._canvasContext).not.toBe(contentContext);
      expect(entry.bmp._canvasContext).not.toBe(effectContext);
    }
    expect(node._fxCache).toHaveLength(2);
    expect(pooledCanvasCount()).toBe(2);
  });
});

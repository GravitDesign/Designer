// The effect result cache of GElement.Stylable (old chunk.vendor.js
// 117790-117961) and the effect cache rule of
// _handleGeometryChangeForProperties for `trf` (old 6165-6210). Parity
// tiles never reach it: toBitmap turns the cache off.
import { afterEach, describe, expect, it, vi } from "vitest";
import { Point } from "../math/point.ts";
import { Rect } from "../math/rect.ts";
import { Transform } from "../math/transform.ts";
import type { PaintCanvas } from "../paint/paint-canvas.ts";
import { CompoundShape } from "../scene/compound-shape.ts";
import { ElementFlag } from "../scene/element-change.ts";
import { Group } from "../scene/group.ts";
import { Node, registerNodeClass } from "../scene/node.ts";
import { NodeChange } from "../scene/node-change.ts";
import { Rectangle } from "../scene/rectangle.ts";
import { Effect, type EffectTypeValue } from "./effect.ts";
import { ElementStylable } from "./element-stylable.ts";
import "./stylable.ts";

class CacheTestEffect extends Effect {
  static {
    registerNodeClass(this, "cacheTestEffect", "GCacheTestEffect");
  }

  override getEffectType(): EffectTypeValue {
    return Effect.Type.Filter;
  }
}

/** The scene hooks the cache uses. */
function fakeScene() {
  return {
    added: [] as unknown[],
    destroyed: [] as unknown[],
    addDestroyable(item: unknown) {
      this.added.push(item);
    },
    destroy(items: unknown[]) {
      this.destroyed.push(...items);
    },
  };
}

type Scene = ReturnType<typeof fakeScene>;

/** A cached bitmap: what _getFxCache reads of it. */
function bitmap(scale: number, width: number, height: number) {
  return {
    canvasElement: { name: "cached" },
    offset: null as Point | null,
    getScale: () => scale,
    isRendered: () => true,
    getWidth: () => width,
    getHeight: () => height,
    setOffset(offset: Point) {
      this.offset = offset;
    },
    get _canvasContext() {
      return { canvas: this.canvasElement };
    },
  };
}

/** The canvas an effect paints into. */
function canvas(scale: number, width: number, height: number, offset = new Point(10, 20)) {
  const calls: unknown[][] = [];
  const context = {
    globalAlpha: 0.5,
    globalCompositeOperation: "multiply",
    drawImage: (...args: unknown[]) => calls.push(["drawImage", ...args]),
  };
  const transform = new Transform(scale, 0, 0, scale, -offset.getX(), -offset.getY());
  const stub = {
    calls,
    _canvasContext: context,
    clipped: false,
    getScale: () => scale,
    getWidth: () => width,
    getHeight: () => height,
    getOffset: () => offset,
    getTransform: (raw: boolean) => {
      calls.push(["getTransform", raw]);
      return transform;
    },
    setTransform: (next: Transform) => {
      calls.push(["setTransform", next.getMatrix()]);
      return transform;
    },
    clear: () => calls.push(["clear"]),
    drawCanvas: (...args: unknown[]) => calls.push(["drawCanvas", ...args]),
    isClipped() {
      return this.clipped;
    },
    clone: (...args: unknown[]) => {
      calls.push(["clone", ...args]);
      return bitmap(scale, width, height);
    },
  };
  return stub;
}

type Stylable = Rectangle & {
  _paintBBox: Rect | null;
  _fxCache: { bmp: unknown; deps: Effect[]; fx: Effect }[];
};

/** Sets the scene an element thinks it is in. */
function setScene(node: Node, scene: unknown): void {
  (node as unknown as { _scene: unknown })._scene = scene;
}

/** A rectangle with `count` effects in a fake scene and an empty cache. */
function element(count: number): { node: Stylable; effects: Effect[]; scene: Scene } {
  const node = new Rectangle(0, 0, 100, 50) as Stylable;
  const effects: Effect[] = [];
  for (let i = 0; i < count; i++) {
    const effect = new CacheTestEffect();
    node.getEffects()?.appendChild(effect);
    effects.push(effect);
  }
  const scene = fakeScene();
  setScene(node, scene);
  node._fxCache = [];
  return { node, effects, scene };
}

/** Puts `bmp` into the cache as the result of `effect`. */
function cache(node: Stylable, effect: Effect, bmp: unknown, deps: Effect[] = []): void {
  node._fxCache.push({ bmp, deps, fx: effect });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the initial cache array", () => {
  it("is one array shared by all stylable classes until a full reset", () => {
    const rectangle = new Rectangle();
    const group = new Group();
    const compound = new CompoundShape();
    expect(Object.hasOwn(rectangle, "_fxCache")).toBe(false);
    expect(rectangle._fxCache).toBe(group._fxCache);
    expect(rectangle._fxCache).toBe(compound._fxCache);
    rectangle._resetFxCacheAndState();
    expect(Object.hasOwn(rectangle, "_fxCache")).toBe(true);
    expect(rectangle._fxCache).not.toBe(group._fxCache);
    expect(group._fxCache).toBe(compound._fxCache);
  });
});

describe("_getFxCache", () => {
  it("draws the cached bitmap with Copy when the scale matches", () => {
    const { node, effects } = element(1);
    const bmp = bitmap(1, 200, 100);
    cache(node, effects[0] as Effect, bmp);
    const target = canvas(1, 200, 100);
    expect(node._getFxCache(target as unknown as PaintCanvas, effects[0] as Effect, null)).toBe(
      true,
    );
    expect(bmp.offset).toBe(target.getOffset());
    expect(target.calls).toEqual([["drawCanvas", bmp, 0, 0, 1, "copy"]]);
  });

  it("only answers, without drawing, when probing", () => {
    const { node, effects } = element(1);
    const bmp = bitmap(1, 200, 100);
    cache(node, effects[0] as Effect, bmp);
    const target = canvas(1, 200, 100);
    expect(
      node._getFxCache(target as unknown as PaintCanvas, effects[0] as Effect, null, true),
    ).toBe(true);
    expect(target.calls).toEqual([]);
  });

  it("puts the bitmap at the extents' top left when given extents", () => {
    const { node, effects } = element(1);
    const bmp = bitmap(1, 50, 50);
    cache(node, effects[0] as Effect, bmp);
    const target = canvas(1, 200, 100);
    // With extents the size isn't checked.
    expect(
      node._getFxCache(
        target as unknown as PaintCanvas,
        effects[0] as Effect,
        new Rect(5, 6, 7, 8),
      ),
    ).toBe(true);
    expect(bmp.offset?.getX()).toBe(5);
    expect(bmp.offset?.getY()).toBe(6);
  });

  it("draws a bitmap cached at twice the scale rescaled into the canvas", () => {
    const { node, effects, scene } = element(1);
    const bmp = bitmap(2, 400, 200);
    cache(node, effects[0] as Effect, bmp);
    // Offset (10, 20) and the default origin (the offset itself): source at 0, 0.
    const target = canvas(1, 150, 75, new Point(10, 20));
    expect(node._getFxCache(target as unknown as PaintCanvas, effects[0] as Effect, null)).toBe(
      true,
    );
    const draws = target.calls.filter((call) => call[0] === "drawImage");
    // Source: cached scale times the canvas size over the current scale.
    expect(draws).toEqual([["drawImage", bmp.canvasElement, 0, 0, 300, 150, 0, 0, 150, 75]]);
    expect(target._canvasContext.globalAlpha).toBe(1);
    expect(target._canvasContext.globalCompositeOperation).toBe("source-over");
    expect(target.calls.map((call) => call[0])).toEqual([
      "getTransform",
      "getTransform",
      "setTransform",
      "clear",
      "drawImage",
      "setTransform",
    ]);
    expect(node._fxCache).toHaveLength(1);
    expect(scene.destroyed).toEqual([]);
  });

  it("offsets the source rect by the origin and clips it to the bitmap", () => {
    const { node, effects } = element(1);
    const bmp = bitmap(2, 400, 200);
    cache(node, effects[0] as Effect, bmp);
    const target = canvas(1, 150, 75, new Point(110, 70));
    expect(
      node._getFxCache(
        target as unknown as PaintCanvas,
        effects[0] as Effect,
        new Rect(10, 20, 1, 1),
      ),
    ).toBe(true);
    // x = 2 * (110 - 10) = 200, y = 2 * (70 - 20) = 100, 300 x 150 clipped to 400 x 200.
    const draws = target.calls.filter((call) => call[0] === "drawImage");
    expect(draws).toEqual([["drawImage", bmp.canvasElement, 200, 100, 200, 100, 0, 0, 150, 75]]);
  });

  it("resets the cache when the scale changed by more than one step", () => {
    const { node, effects, scene } = element(1);
    const bmp = bitmap(4, 800, 400);
    cache(node, effects[0] as Effect, bmp);
    const target = canvas(1, 200, 100);
    expect(node._getFxCache(target as unknown as PaintCanvas, effects[0] as Effect, null)).toBe(
      false,
    );
    expect(node._fxCache).toEqual([]);
    expect(scene.destroyed).toEqual([bmp]);
    expect(target.calls).toEqual([]);
  });

  it("still answers a probe after more than one step", () => {
    const { node, effects } = element(1);
    cache(node, effects[0] as Effect, bitmap(4, 800, 400));
    const target = canvas(1, 200, 100);
    expect(
      node._getFxCache(target as unknown as PaintCanvas, effects[0] as Effect, null, true),
    ).toBe(true);
    expect(node._fxCache).toHaveLength(1);
  });

  it("resets the cache when zoomed in from the cached scale", () => {
    const { node, effects, scene } = element(1);
    const bmp = bitmap(1, 200, 100);
    cache(node, effects[0] as Effect, bmp);
    const target = canvas(2, 400, 200);
    expect(node._getFxCache(target as unknown as PaintCanvas, effects[0] as Effect, null)).toBe(
      false,
    );
    expect(node._fxCache).toEqual([]);
    expect(scene.destroyed).toEqual([bmp]);
  });

  it("resets the cache when the size is off by more than a pixel", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const { node, effects, scene } = element(1);
    const bmp = bitmap(1, 202, 100);
    cache(node, effects[0] as Effect, bmp);
    const target = canvas(1, 200, 100);
    expect(node._getFxCache(target as unknown as PaintCanvas, effects[0] as Effect, null)).toBe(
      false,
    );
    expect(log).toHaveBeenCalledWith("fx cache: size misfit");
    expect(node._fxCache).toEqual([]);
    expect(scene.destroyed).toEqual([bmp]);
  });

  it("keeps the cache when the size is off by one pixel", () => {
    const { node, effects } = element(1);
    cache(node, effects[0] as Effect, bitmap(1, 201, 99));
    const target = canvas(1, 200, 100);
    expect(node._getFxCache(target as unknown as PaintCanvas, effects[0] as Effect, null)).toBe(
      true,
    );
  });

  it("drops an entry whose dependency is no longer cached", () => {
    const { node, effects } = element(2);
    const [first, second] = effects as [Effect, Effect];
    cache(node, second, bitmap(1, 200, 100), [first]);
    const target = canvas(1, 200, 100);
    expect(node._getFxCache(target as unknown as PaintCanvas, second, null)).toBe(false);
    expect(node._fxCache).toEqual([]);
  });

  it("ignores an effect that is not cacheable", () => {
    const { node, effects } = element(1);
    cache(node, effects[0] as Effect, bitmap(1, 200, 100));
    vi.spyOn(effects[0] as Effect, "isCacheable").mockReturnValue(false);
    expect(
      node._getFxCache(canvas(1, 200, 100) as unknown as PaintCanvas, effects[0] as Effect, null),
    ).toBe(false);
  });
});

describe("_setFxCache", () => {
  it("keeps a persistent copy of the canvas and replaces an older entry", () => {
    const { node, effects, scene } = element(1);
    const effect = effects[0] as Effect;
    const target = canvas(1, 200, 100);
    node._setFxCache(target as unknown as PaintCanvas, effect, []);
    expect(target.calls).toEqual([
      ["clone", false, { renderPhaseDraw: true, dontCopyContents: false, persistent: true }],
    ]);
    expect(scene.added).toHaveLength(1);
    expect(node._fxCache).toEqual([{ bmp: scene.added[0], deps: [], fx: effect }]);
    node._setFxCache(target as unknown as PaintCanvas, effect, []);
    expect(node._fxCache).toHaveLength(1);
    expect(node._fxCache[0]?.bmp).toBe(scene.added[1]);
  });

  it("drops the entries that depend on the effect it caches anew", () => {
    const { node, effects, scene } = element(2);
    const [first, second] = effects as [Effect, Effect];
    const firstBitmap = bitmap(1, 200, 100);
    const secondBitmap = bitmap(1, 200, 100);
    cache(node, first, firstBitmap);
    cache(node, second, secondBitmap, [first]);
    node._setFxCache(canvas(1, 200, 100) as unknown as PaintCanvas, first, []);
    expect(node._fxCache.map((entry) => entry.fx)).toEqual([first]);
    expect(node._fxCache[0]?.bmp).toBe(scene.added[0]);
    expect(scene.destroyed).toEqual([secondBitmap]);
  });

  it("doesn't cache a clipped canvas", () => {
    const { node, effects } = element(1);
    const target = canvas(1, 200, 100);
    target.clipped = true;
    node._setFxCache(target as unknown as PaintCanvas, effects[0] as Effect, []);
    expect(node._fxCache).toEqual([]);
  });
});

/** Puts `node` into a group with one effect, both in `scene`. Returns the group. */
function inScene(node: Stylable, scene: Scene): Stylable {
  const group = new Group() as unknown as Stylable;
  group.getEffects()?.appendChild(new CacheTestEffect());
  setScene(group, null);
  setScene(node, null);
  (group as unknown as { appendChild(child: Node): void }).appendChild(node);
  setScene(group, scene);
  group._fxCache = [];
  setScene(node, scene);
  node._fxCache = [];
  return group;
}

describe("cache invalidation", () => {
  it("changing the first of two effects drops the second's entry too", () => {
    const { node, effects, scene } = element(2);
    const [first, second] = effects as [Effect, Effect];
    const firstBitmap = bitmap(1, 200, 100);
    const secondBitmap = bitmap(1, 200, 100);
    cache(node, first, firstBitmap);
    cache(node, second, secondBitmap, [first]);
    node._resetFxCacheAndState(first, true);
    expect(node._fxCache).toEqual([]);
    expect(scene.destroyed).toEqual([firstBitmap, secondBitmap]);
  });

  it("changing the second effect keeps the first's entry", () => {
    const { node, effects, scene } = element(2);
    const [first, second] = effects as [Effect, Effect];
    const firstBitmap = bitmap(1, 200, 100);
    const secondBitmap = bitmap(1, 200, 100);
    cache(node, first, firstBitmap);
    cache(node, second, secondBitmap, [first]);
    node._resetFxCacheAndState(second, true);
    expect(node._fxCache.map((entry) => entry.fx)).toEqual([first]);
    expect(scene.destroyed).toEqual([secondBitmap]);
  });

  it("resets an entry whose recorded dependencies differ", () => {
    const { node, effects, scene } = element(2);
    const [first, second] = effects as [Effect, Effect];
    const firstBitmap = bitmap(1, 200, 100);
    const secondBitmap = bitmap(1, 200, 100);
    cache(node, first, firstBitmap);
    cache(node, second, secondBitmap, []);
    node._reinvalidateFxDeps([first, second], []);
    // The second was cached without the first as its dependency.
    expect(node._fxCache.map((entry) => entry.fx)).toEqual([first]);
    expect(scene.destroyed).toEqual([secondBitmap]);
  });

  it("drops the entry of an effect that was removed", () => {
    const node = new Rectangle(0, 0, 100, 50) as Stylable;
    const effect = new CacheTestEffect();
    node.getEffects()?.appendChild(effect);
    node.getEffects()?.removeChild(effect);
    node.getEffects()?.appendChild(new CacheTestEffect());
    setScene(node, fakeScene());
    node._fxCache = [];
    cache(node, effect, bitmap(1, 200, 100));
    expect(node._getFxIdx(effect)).toBe(-1);
    expect(node._fxCache).toHaveLength(1);
    expect(node._getFxIdx(effect, true)).toBe(-1);
    expect(node._fxCache).toEqual([]);
  });

  it("resets the whole cache of the stylable parent in a scene", () => {
    const { node, effects, scene } = element(1);
    const group = inScene(node, scene);
    const groupBitmap = bitmap(1, 200, 100);
    const groupEffect = group.getEffects()?.getFirstChild() as Effect;
    group._fxCache = [{ bmp: groupBitmap as never, deps: [], fx: groupEffect }];
    const nodeBitmap = bitmap(1, 200, 100);
    cache(node, effects[0] as Effect, nodeBitmap);
    node._resetFxCacheAndState(effects[0] as Effect, true);
    expect(node._fxCache).toEqual([]);
    // The group's whole cache goes.
    expect(group._fxCache).toEqual([]);
    expect(scene.destroyed).toEqual([nodeBitmap, groupBitmap]);
  });

  it("climbs past parents that aren't stylable elements", () => {
    const { node, effects, scene } = element(1);
    const group = inScene(new Rectangle(0, 0, 1, 1) as Stylable, scene);
    const groupEffect = group.getEffects()?.getFirstChild() as Effect;
    const groupBitmap = bitmap(1, 1, 1);
    group._fxCache = [{ bmp: groupBitmap as never, deps: [], fx: groupEffect }];
    // A plain node between the element and the group.
    const between = new CacheTestEffect() as unknown as { _parent: unknown };
    between._parent = group;
    (node as unknown as { _parent: unknown })._parent = between;
    cache(node, effects[0] as Effect, bitmap(1, 1, 1));
    node._resetFxCacheAndState(effects[0] as Effect, true);
    expect(group._fxCache).toEqual([]);
    expect(scene.destroyed).toContain(groupBitmap);
  });

  it("doesn't reset an ancestor outside a scene or workspace", () => {
    const { node, effects, scene } = element(1);
    const group = inScene(node, scene);
    const groupEffect = group.getEffects()?.getFirstChild() as Effect;
    group._fxCache = [{ bmp: bitmap(1, 1, 1) as never, deps: [], fx: groupEffect }];
    setScene(group, null);
    cache(node, effects[0] as Effect, bitmap(1, 1, 1));
    node._resetFxCacheAndState(effects[0] as Effect, true);
    expect(node._fxCache).toEqual([]);
    expect(group._fxCache).toHaveLength(1);
  });

  it("doesn't climb when nothing was reset", () => {
    const { node, effects, scene } = element(1);
    const group = inScene(node, scene);
    const groupEffect = group.getEffects()?.getFirstChild() as Effect;
    group._fxCache = [{ bmp: bitmap(1, 1, 1) as never, deps: [], fx: groupEffect }];
    node._resetFxCacheAndState(effects[0] as Effect, true);
    expect(group._fxCache).toHaveLength(1);
  });

  it("resets everything without an effect, or with partial reset off", () => {
    const { node, effects, scene } = element(2);
    const [first, second] = effects as [Effect, Effect];
    cache(node, first, bitmap(1, 1, 1));
    cache(node, second, bitmap(1, 1, 1));
    node._resetFxCacheAndState();
    expect(node._fxCache).toEqual([]);
    expect(scene.destroyed).toHaveLength(2);
    const statics = ElementStylable as unknown as { _ENABLE_PARTIAL_RESET: boolean };
    statics._ENABLE_PARTIAL_RESET = false;
    try {
      cache(node, first, bitmap(1, 1, 1));
      cache(node, second, bitmap(1, 1, 1), [first]);
      node._resetFxCacheAndState(second, true);
      expect(node._fxCache).toEqual([]);
    } finally {
      statics._ENABLE_PARTIAL_RESET = true;
    }
  });
});

describe("trf changes", () => {
  const TRF = { trf: null };

  /**
   * A rectangle with `$trf` (2, 0, 0, 3, 4, 5) in a scene, under `parent`
   * (a plain container when not given), with a spy on the cache reset.
   */
  function child(parent?: Node) {
    const { node, scene } = element(1);
    node.$trf = new Transform(2, 0, 0, 3, 4, 5);
    const owner = (parent ?? new Group()) as Node & { _parent?: unknown };
    node._parent = owner as never;
    setScene(owner, scene);
    owner._parent = new Group() as never;
    const reset = vi.spyOn(node, "_resetFxCacheAndState").mockImplementation(() => {});
    return { node, reset };
  }

  function change(node: Stylable, value: unknown, properties = ["trf"]) {
    return node._handleGeometryChangeForProperties(
      NodeChange.BeforePropertiesChange,
      { properties, values: [value] },
      properties[0] === "trf" ? TRF : { [properties[0] as string]: null },
    );
  }

  it("resets for a scaled, rotated or removed transform", () => {
    for (const value of [
      new Transform(4, 0, 0, 3, 4, 5),
      new Transform(2, 1, 0, 3, 4, 5),
      new Transform(2, 0, 1, 3, 4, 5),
      new Transform(2, 0, 0, 1, 4, 5),
      null,
    ]) {
      const { node, reset } = child();
      change(node, value);
      expect(reset).toHaveBeenCalledTimes(1);
    }
  });

  it("resets when there was no transform before", () => {
    const { node, reset } = child();
    node.$trf = null;
    change(node, new Transform(2, 0, 0, 3, 9, 9));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("resets for any other geometry property", () => {
    const { node, reset } = child();
    change(node, true, ["uf"]);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("keeps the cache for a pure move inside a group", () => {
    const { node, reset } = child(new Group());
    change(node, new Transform(2, 0, 0, 3, 40, 50));
    expect(reset).not.toHaveBeenCalled();
  });

  it("resets for a pure move inside a compound shape", () => {
    const compound = new CompoundShape();
    expect(Node.getName(compound)).toBe("Compound Shape");
    const { node, reset } = child(compound);
    change(node, new Transform(2, 0, 0, 3, 40, 50));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("under another stylable element, resets a pure move only when the child covers it", () => {
    const parent = new Rectangle(0, 0, 10, 10) as Stylable;
    const { node, reset } = child(parent);
    parent._paintBBox = new Rect(0, 0, 10, 10);
    node._paintBBox = new Rect(0, 0, 5, 5);
    change(node, new Transform(2, 0, 0, 3, 40, 50));
    expect(reset).not.toHaveBeenCalled();
    node._paintBBox = new Rect(-1, -1, 12, 12);
    change(node, new Transform(2, 0, 0, 3, 40, 50));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("does nothing to the cache when the element isn't paintable", () => {
    const { node, reset } = child();
    node.setFlag(ElementFlag.NoPaint);
    reset.mockClear();
    change(node, null);
    expect(reset).not.toHaveBeenCalled();
  });
});

// Element.toBitmap's options (old chunk.vendor.js 5807-5874): scale
// factors or Lengths, the three fit modes, dpi, background, the paint
// configuration override and a throwaway canvas. The canvas is stubbed:
// the test records the size, origin and scale the old code would set.
// Expected values are worked out from the old function by hand.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Length } from "../math/length.ts";
import { Rect } from "../math/rect.ts";
import { Transform } from "../math/transform.ts";
import type { Bitmap } from "../paint/bitmap.ts";
import { PaintCanvas, type PaintStyle } from "../paint/paint-canvas.ts";
import type { PaintContext } from "../paint/paint-context.ts";
import { RenderScheduler } from "../paint/render-scheduler.ts";
import { ScenePaintConfiguration } from "../paint/scene-paint-configuration.ts";
import { Rectangle } from "./rectangle.ts";

interface Recorded {
  persistent: unknown;
  calls: unknown[][];
  context: PaintContext | null;
  dpi: unknown;
}

let recorded: Recorded;
let paintThrows = false;

beforeEach(() => {
  recorded = { persistent: undefined, calls: [], context: null, dpi: undefined };
  paintThrows = false;
  vi.spyOn(RenderScheduler, "getRenderer").mockImplementation(((
    _force?: boolean,
    _type?: string,
    _attributes?: unknown,
    persistent?: boolean,
  ) => {
    recorded.persistent = persistent;
    return { canvas: { width: 0, height: 0 } };
  }) as never);
  const proto = PaintCanvas.prototype;
  vi.spyOn(proto, "resize").mockImplementation((w: number, h: number) => {
    recorded.calls.push(["resize", w, h]);
  });
  vi.spyOn(proto, "prepare").mockImplementation(() => {
    recorded.calls.push(["prepare"]);
  });
  vi.spyOn(proto, "finish").mockImplementation(() => {
    recorded.calls.push(["finish"]);
  });
  vi.spyOn(proto, "fillCanvas").mockImplementation(
    (style?: PaintStyle | null, opacity?: number | null) => {
      recorded.calls.push(["fillCanvas", style, opacity]);
    },
  );
  vi.spyOn(proto, "setOrigin").mockImplementation((origin) => {
    recorded.calls.push(["setOrigin", origin.getX(), origin.getY()]);
  });
  vi.spyOn(proto, "setScale").mockImplementation((scale: number) => {
    recorded.calls.push(["setScale", scale]);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const bitmap = {
  setDPI(dpi: number) {
    recorded.dpi = dpi;
  },
} as unknown as Bitmap;

/** A rectangle whose painting is replaced by recording the context. */
function element(): Rectangle {
  const shape = new Rectangle();
  // Paint box 10, 20, 100 x 50.
  shape.setProperty("trf", new Transform(50, 0, 0, 25, 60, 45));
  shape._paintToBitmap = (context: PaintContext) => {
    recorded.context = context;
    if (paintThrows) throw new Error("paint failed");
    return bitmap;
  };
  return shape;
}

const AREA = new Rect(10, 20, 100, 50);

/** resize, setOrigin and setScale of the last call. */
function geometry(): unknown[] {
  return recorded.calls.filter((call) => call[0] !== "prepare" && call[0] !== "finish");
}

describe("Element.toBitmap", () => {
  it("renders the paint box at scale 1 by default, on a persistent canvas", () => {
    expect(element().toBitmap()).toBe(bitmap);
    expect(recorded.calls).toEqual([
      ["resize", 100, 50],
      ["prepare"],
      ["setOrigin", 10, 20],
      ["setScale", 1],
      ["finish"],
    ]);
    expect(recorded.persistent).toBe(true);
    expect(recorded.dpi).toBeUndefined();
    const config = recorded.context?.configuration as ScenePaintConfiguration;
    expect(config).toBeInstanceOf(ScenePaintConfiguration);
    expect(config.paintMode).toBe(ScenePaintConfiguration.PaintMode.Full);
    expect(config.paintSharp).toBe(false);
    expect(config.annotations).toBe(false);
    expect(config.clipDirty).toBe(false);
    expect(config.enableFxCache).toBe(false);
    expect(config.defaultEffectDetailLevel).toBe(1);
    expect(Rect.equals(config.clipArea as Rect, AREA)).toBe(true);
  });

  it("uses one scale for both axes and rounds the canvas size", () => {
    element().toBitmap(1.5, 1.5, 0, null, null, null, null, new Rect(0.5, 1, 33, 11));
    // 33 * 1.5 = 49.5 and 11 * 1.5 = 16.5 round up.
    expect(geometry()).toEqual([
      ["resize", 50, 17],
      ["setOrigin", 0.75, 1.5],
      ["setScale", 1.5],
    ]);
  });

  it("mode 0 fits: the smaller scale, canvas cut to it", () => {
    element().toBitmap(2, 3, 0, null, null, null, null, AREA);
    expect(geometry()).toEqual([
      ["resize", 200, 100],
      ["setOrigin", 20, 40],
      ["setScale", 2],
    ]);
    element().toBitmap(3, 2, null, null, null, null, null, AREA);
    expect(geometry().slice(3)).toEqual([
      ["resize", 200, 100],
      ["setOrigin", 20, 40],
      ["setScale", 2],
    ]);
  });

  it("mode 1 fills: the larger scale, canvas grown to it", () => {
    element().toBitmap(2, 3, 1, null, null, null, null, AREA);
    expect(geometry()).toEqual([
      ["resize", 300, 150],
      ["setOrigin", 30, 60],
      ["setScale", 3],
    ]);
    element().toBitmap(3, 2, 1, null, null, null, null, AREA);
    expect(geometry().slice(3)).toEqual([
      ["resize", 300, 150],
      ["setOrigin", 30, 60],
      ["setScale", 3],
    ]);
  });

  it("mode 2 fits and centers in the full canvas", () => {
    element().toBitmap(2, 3, 2, null, null, null, null, AREA);
    // Canvas 200 x 150, content 200 x 100: 25 down.
    expect(geometry()).toEqual([
      ["resize", 200, 150],
      ["setOrigin", 20, 15],
      ["setScale", 2],
    ]);
    element().toBitmap(3, 2, 2, null, null, null, null, AREA);
    // Canvas 300 x 100, content 200 x 100: 50 right.
    expect(geometry().slice(3)).toEqual([
      ["resize", 300, 100],
      ["setOrigin", -30, 40],
      ["setScale", 2],
    ]);
  });

  it("scales a Length to the area; a missing height stays 1 and fits", () => {
    element().toBitmap(new Length(400, Length.Unit.PT), null, 0, null, null, null, null, AREA);
    // x scale 4, y scale 1: mode 0 takes 1.
    expect(geometry()).toEqual([
      ["resize", 100, 50],
      ["setOrigin", 10, 20],
      ["setScale", 1],
    ]);
    element().toBitmap(
      new Length(200, Length.Unit.PT),
      new Length(100, Length.Unit.PT),
      0,
      null,
      null,
      null,
      null,
      AREA,
    );
    expect(geometry().slice(3)).toEqual([
      ["resize", 200, 100],
      ["setOrigin", 20, 40],
      ["setScale", 2],
    ]);
  });

  it("scales by dpi / 72 and writes the dpi into the bitmap", () => {
    element().toBitmap(1, 1, 0, null, null, 144, null, AREA);
    expect(geometry()).toEqual([
      ["resize", 200, 100],
      ["setOrigin", 20, 40],
      ["setScale", 2],
    ]);
    expect(recorded.dpi).toBe(144);
    // On top of a scale factor.
    element().toBitmap(1.5, 1.5, 0, null, null, 144, null, AREA);
    expect(geometry().slice(3)).toEqual([
      ["resize", 300, 150],
      ["setOrigin", 30, 60],
      ["setScale", 3],
    ]);
  });

  it("fills the background with its opacity after prepare, before the origin", () => {
    const background = "red" as unknown as PaintStyle;
    element().toBitmap(1, 1, 0, background, null, null, 0.5, AREA);
    expect(recorded.calls).toEqual([
      ["resize", 100, 50],
      ["prepare"],
      ["fillCanvas", background, 0.5],
      ["setOrigin", 10, 20],
      ["setScale", 1],
      ["finish"],
    ]);
  });

  it("applies the configuration override over the defaults", () => {
    element().toBitmap(
      1,
      1,
      0,
      null,
      { enableFxCache: true, annotations: true, extra: 7 },
      null,
      null,
      AREA,
    );
    const config = recorded.context?.configuration as unknown as Record<string, unknown>;
    expect(config.enableFxCache).toBe(true);
    expect(config.annotations).toBe(true);
    expect(config.extra).toBe(7);
    expect(config.paintSharp).toBe(false);
  });

  it("asks for a throwaway canvas only for persistent = false", () => {
    element().toBitmap(1, 1, 0, null, null, null, null, AREA, false);
    expect(recorded.persistent).toBe(false);
    element().toBitmap(1, 1, 0, null, null, null, null, AREA, true);
    expect(recorded.persistent).toBe(true);
  });

  it("finishes the canvas when painting throws", () => {
    paintThrows = true;
    expect(() => element().toBitmap(1, 1, 0, null, null, 144, null, AREA)).toThrow("paint failed");
    expect(recorded.calls.at(-1)).toEqual(["finish"]);
    expect(recorded.dpi).toBeUndefined();
  });
});
